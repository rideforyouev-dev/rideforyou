import { randomUUID } from "node:crypto";
import { fail, text, money } from "../../core/validation.mjs";
import { transaction } from "../../core/transactions.mjs";
import { calculateLoan } from "./calculator.mjs";

export function loanRoutes(db, app) {
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  app.post("/api/loans/calculate", (req, res) => {
    try {
      const {
        invoiceTotal,
        downPayment,
        interestRate,
        tenureMonths,
        startDate,
      } = req.body;
      const calc = calculateLoan({
        invoiceTotal: money(invoiceTotal, "invoice total"),
        downPayment: money(downPayment || 0, "down payment"),
        interestRate: Number(interestRate ?? 12),
        tenureMonths: Number(tenureMonths ?? 12),
        startDate: startDate ? String(startDate) : today(),
      });
      res.json(calc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/loans", (_req, res) => {
    const curDate = today();
    // Update overdue installments
    db.prepare(
      "UPDATE loan_installments SET status='overdue' WHERE due_date < ? AND status='pending'",
    ).run(curDate);

    const loans = db
      .prepare(
        `SELECT l.*, i.number as invoice_number, b.model, b.brand, b.vin,
          (SELECT COUNT(*) FROM loan_installments li WHERE li.loan_id=l.id AND li.status='overdue') as overdue_count,
          (SELECT MIN(li.due_date) FROM loan_installments li WHERE li.loan_id=l.id AND li.status IN ('pending', 'overdue', 'partially_paid')) as next_due_date
        FROM loans l
        LEFT JOIN invoices i ON i.id=l.invoice_id
        LEFT JOIN bikes b ON b.id=l.bike_id
        ORDER BY l.created DESC`,
      )
      .all();

    const stats = {
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => l.status === "active").length,
      completedLoans: loans.filter((l) => l.status === "completed").length,
      totalFinanced: loans.reduce((sum, l) => sum + l.principal, 0),
      totalCollected: loans.reduce((sum, l) => sum + l.total_paid, 0),
      totalBalance: loans
        .filter((l) => l.status === "active")
        .reduce((sum, l) => sum + l.balance, 0),
      overdueLoansCount: loans.filter((l) => Number(l.overdue_count) > 0).length,
    };

    res.json({ loans, stats });
  });

  app.get("/api/loans/:id", (req, res) => {
    const curDate = today();
    db.prepare(
      "UPDATE loan_installments SET status='overdue' WHERE due_date < ? AND status='pending'",
    ).run(curDate);

    const loan = db
      .prepare(
        `SELECT l.*, i.number as invoice_number, i.body as invoice_body, b.model, b.brand, b.vin
        FROM loans l
        LEFT JOIN invoices i ON i.id=l.invoice_id
        LEFT JOIN bikes b ON b.id=l.bike_id
        WHERE l.id=?`,
      )
      .get(req.params.id);

    if (!loan) return res.status(404).json({ error: "Loan account not found." });

    const installments = db
      .prepare(
        "SELECT * FROM loan_installments WHERE loan_id=? ORDER BY installment_number ASC",
      )
      .all(loan.id);

    const payments = db
      .prepare(
        "SELECT * FROM loan_payments WHERE loan_id=? ORDER BY payment_date DESC, created DESC",
      )
      .all(loan.id);

    res.json({ loan, installments, payments });
  });

  app.post("/api/loans/:id/payments", (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const payAmount = money(body.amount, "payment amount");
    if (payAmount <= 0) fail("Payment amount must be greater than zero.");

    const payMethod = text(body.method || "Cash", "payment method", 30);
    if (!["Cash", "UPI", "Bank transfer"].includes(payMethod)) {
      fail("Select a valid payment method (Cash, UPI, or Bank transfer).");
    }

    const payDate = text(body.paymentDate || today(), "payment date", 10);
    const reference = text(body.reference || "", "reference", 100, false);
    const notes = text(body.notes || "", "notes", 500, false);

    const result = transaction(db, () => {
      const loan = db.prepare("SELECT * FROM loans WHERE id=?").get(id);
      if (!loan) fail("Loan not found.", 404);
      if (loan.status === "completed") {
        fail("This loan is already completed and fully paid.");
      }
      if (payAmount > loan.balance) {
        fail(
          `Payment amount cannot exceed the remaining loan balance of ₹${(loan.balance / 100).toFixed(2)}.`,
        );
      }

      const paymentId = randomUUID();
      const now = new Date().toISOString();

      // Allocate to installments (oldest unpaid first, or specific installment if requested)
      let remainingToAllocate = payAmount;
      const targetInstallmentId = body.installmentId
        ? String(body.installmentId)
        : null;

      let installmentsToUpdate = [];
      if (targetInstallmentId) {
        const inst = db
          .prepare("SELECT * FROM loan_installments WHERE id=? AND loan_id=?")
          .get(targetInstallmentId, id);
        if (inst) installmentsToUpdate = [inst];
      }
      if (!installmentsToUpdate.length) {
        installmentsToUpdate = db
          .prepare(
            `SELECT * FROM loan_installments 
             WHERE loan_id=? AND status IN ('pending', 'overdue', 'partially_paid') 
             ORDER BY installment_number ASC`,
          )
          .all(id);
      }

      for (const inst of installmentsToUpdate) {
        if (remainingToAllocate <= 0) break;
        const instDue = inst.amount - inst.paid_amount;
        const alloc = Math.min(remainingToAllocate, instDue);
        const newPaid = inst.paid_amount + alloc;
        const newStatus =
          newPaid >= inst.amount
            ? "paid"
            : newPaid > 0
              ? "partially_paid"
              : inst.status;

        db.prepare(
          "UPDATE loan_installments SET paid_amount=?, status=?, paid_date=? WHERE id=?",
        ).run(newPaid, newStatus, newStatus === "paid" ? payDate : null, inst.id);

        remainingToAllocate -= alloc;
      }

      db.prepare(
        "INSERT INTO loan_payments(id, loan_id, installment_id, amount, method, payment_date, reference, notes, created) VALUES(?,?,?,?,?,?,?,?,?)",
      ).run(
        paymentId,
        id,
        targetInstallmentId || null,
        payAmount,
        payMethod,
        payDate,
        reference,
        notes,
        now,
      );

      const newTotalPaid = loan.total_paid + payAmount;
      const newBalance = loan.balance - payAmount;
      const newStatus = newBalance <= 0 ? "completed" : "active";

      db.prepare(
        "UPDATE loans SET total_paid=?, balance=?, status=?, updated=? WHERE id=?",
      ).run(newTotalPaid, newBalance, newStatus, now, id);

      return {
        paymentId,
        totalPaid: newTotalPaid,
        balance: newBalance,
        status: newStatus,
      };
    });

    res.json({ ok: true, ...result });
  });
}
