import assert from "node:assert/strict";
import { calculateLoan } from "../modules/loans/calculator.mjs";

export async function loanChecks(req, dbPath) {
  const json = async (url, method = "GET", body, expected = 200) => {
    const r = await req(url, method, body);
    const data = await r.json();
    assert.equal(
      r.status,
      expected,
      `Expected ${expected} from ${method} ${url}, got ${r.status}: ${JSON.stringify(data)}`,
    );
    return data;
  };

  // 1. Calculator Unit Tests
  assert.throws(
    () =>
      calculateLoan({
        invoiceTotal: 5000000,
        downPayment: 5000000,
      }),
    /Down payment cannot equal or exceed/,
  );

  const calc = calculateLoan({
    invoiceTotal: 8000000, // ₹80,000
    downPayment: 2000000, // ₹20,000
    interestRate: 12, // 12% p.a.
    tenureMonths: 6, // 6 months
    startDate: "2026-05-15",
  });
  assert.equal(calc.principal, 6000000); // ₹60,000
  // Interest: 60,000 * 12% * (6/12) = ₹3,600 = 360000 paise
  assert.equal(calc.totalInterest, 360000);
  assert.equal(calc.totalPayable, 6360000);
  assert.equal(calc.installments.length, 6);
  // Sum of installments must match totalPayable to the exact paisa
  const sum = calc.installments.reduce((acc, inst) => acc + inst.amount, 0);
  assert.equal(sum, calc.totalPayable);
  assert.equal(calc.installments[0].dueDate, "2026-06-15");
  assert.equal(calc.installments[5].dueDate, "2026-11-15");

  // Preview API calculation
  const previewCalc = await json("/loans/calculate", "POST", {
    invoiceTotal: 80000,
    downPayment: 20000,
    interestRate: 12,
    tenureMonths: 6,
    startDate: "2026-05-15",
  });
  assert.equal(previewCalc.principal, 6000000);
  assert.equal(previewCalc.totalInterest, 360000);

  // 2. Add inventory for test sales
  await json("/bikes", "POST", {
    brand: "Aventose",
    model: "M100",
    vin: "LNTESTVIN001",
    cost: "45000",
    price: "75000",
    battery: "BATLN001",
    motor: "MOTLN001",
    controller: "CTRLN001",
    charger: "CHRLN001",
  });
  await json("/bikes", "POST", {
    brand: "Aventose",
    model: "M200",
    vin: "LNTESTVIN002",
    cost: "50000",
    price: "85000",
    battery: "BATLN002",
    motor: "MOTLN002",
    controller: "CTRLN002",
    charger: "CHRLN002",
  });
  const state = await json("/state");
  const bike1 = state.bikes.find((b) => b.vin === "LNTESTVIN001");
  const bike2 = state.bikes.find((b) => b.vin === "LNTESTVIN002");
  assert(bike1 && bike2);

  // 3. Issue External Financed Sale
  const externalSalePayload = {
    requestKey: "test-loan-external-1",
    customerState: "36",
    placeOfSupply: "36",
    priceMode: "exclusive",
    name: "Ramesh Kumar",
    phone: "+91 98765 00001",
    address: "Banjara Hills, Hyderabad",
    date: "2026-05-10",
    method: "Loan / Finance",
    lines: [
      {
        id: bike1.id,
        price: 75000,
        components: {
          battery: "BATLN001",
          motor: "MOTLN001",
          controller: "CTRLN001",
          charger: "CHRLN001",
        },
      },
    ],
    loan: {
      providerType: "external",
      vendorName: "Bajaj Finserv",
      fileReference: "BJ-HYD-5501",
      downPayment: 25000, // ₹25,000
      downPaymentMethod: "UPI",
      notes: "Pre-approved loan",
    },
  };

  const extPreview = await json("/invoices/preview", "POST", externalSalePayload);
  assert(extPreview.invoice.loan);
  assert.equal(extPreview.invoice.loan.vendorName, "Bajaj Finserv");

  const extIssued = await json("/invoices", "POST", {
    ...externalSalePayload,
    issueConfirmed: true,
    previewHash: extPreview.previewHash,
  });
  assert(extIssued.id);

  // Check Loans list includes external loan
  const loansList1 = await json("/loans");
  const extLoan = loansList1.loans.find((l) => l.invoice_id === extIssued.id);
  assert(extLoan);
  assert.equal(extLoan.provider_type, "external");
  assert.equal(extLoan.vendor_name, "Bajaj Finserv");
  assert.equal(extLoan.file_reference, "BJ-HYD-5501");
  assert.equal(extLoan.down_payment, 2500000);

  // 4. Issue "Ride For You Loan" (In-house financing)
  const rfySalePayload = {
    requestKey: "test-loan-rfy-1",
    customerState: "36",
    placeOfSupply: "36",
    priceMode: "exclusive",
    name: "Suresh Reddy",
    phone: "+91 98765 00002",
    address: "Madhapur, Hyderabad",
    date: "2026-05-15",
    method: "Loan / Finance",
    lines: [
      {
        id: bike2.id,
        price: 85000,
        components: {
          battery: "BATLN002",
          motor: "MOTLN002",
          controller: "CTRLN002",
          charger: "CHRLN002",
        },
      },
    ],
    loan: {
      providerType: "ride_for_you",
      vendorName: "Ride For You",
      downPayment: 30000, // ₹30,000 down payment
      downPaymentMethod: "Bank transfer",
      interestRate: 10, // 10% p.a.
      tenureMonths: 6,
      firstEmiDate: "2027-01-15",
      notes: "Dealership in-house financing",
    },
  };

  const rfyPreview = await json("/invoices/preview", "POST", rfySalePayload);
  assert(rfyPreview.invoice.loan);
  assert.equal(rfyPreview.invoice.loan.providerType, "ride_for_you");

  const rfyIssued = await json("/invoices", "POST", {
    ...rfySalePayload,
    issueConfirmed: true,
    previewHash: rfyPreview.previewHash,
  });
  assert(rfyIssued.id);

  // 5. Query Loan Details & Installments
  const loansList2 = await json("/loans");
  const rfyLoan = loansList2.loans.find((l) => l.invoice_id === rfyIssued.id);
  assert(rfyLoan);
  assert.equal(rfyLoan.provider_type, "ride_for_you");
  assert.equal(rfyLoan.vendor_name, "Ride For You");
  assert.equal(rfyLoan.status, "active");

  const loanDetails = await json(`/loans/${rfyLoan.id}`);
  assert.equal(loanDetails.installments.length, 6);
  assert.equal(loanDetails.payments.length, 0);
  assert.equal(loanDetails.installments[0].status, "pending");

  // 6. Record Monthly EMI Payments
  const emi1 = loanDetails.installments[0];
  const pay1Res = await json(`/loans/${rfyLoan.id}/payments`, "POST", {
    installmentId: emi1.id,
    amount: emi1.amount / 100, // in rupees
    method: "UPI",
    paymentDate: "2027-01-14",
    reference: "UPIPAY001",
    notes: "1st EMI received on time",
  });
  assert.equal(pay1Res.ok, true);
  assert.equal(pay1Res.totalPaid, emi1.amount);

  const loanAfterPay1 = await json(`/loans/${rfyLoan.id}`);
  assert.equal(loanAfterPay1.installments[0].status, "paid");
  assert.equal(loanAfterPay1.payments.length, 1);
  assert.equal(loanAfterPay1.loan.status, "active");

  // Attempt overpayment
  await json(
    `/loans/${rfyLoan.id}/payments`,
    "POST",
    {
      amount: 999999, // way exceeds remaining balance
      method: "Cash",
    },
    400,
  );

  // Pay off the remaining balance
  const remainingBal = loanAfterPay1.loan.balance;
  const payFinalRes = await json(`/loans/${rfyLoan.id}/payments`, "POST", {
    amount: remainingBal / 100,
    method: "Bank transfer",
    paymentDate: "2026-07-01",
    reference: "FULLSETTLE01",
    notes: "Customer settled remaining loan early",
  });
  assert.equal(payFinalRes.status, "completed");
  assert.equal(payFinalRes.balance, 0);

  const loanCompleted = await json(`/loans/${rfyLoan.id}`);
  assert.equal(loanCompleted.loan.status, "completed");

  // 7. Deletion Guard: Deleting invoice with loan payments must be blocked
  const deleteReview = await json(`/invoices/${rfyIssued.id}/delete-review`);
  assert.equal(deleteReview.canDelete, false);
  assert(deleteReview.blockers.some((b) => b.includes("loan EMI payments")));

  console.log(
    "PASS: Loan financing, in-house Ride For You EMI calculation, monthly tracking, payment reconciliation, and audit safeguards.",
  );
}
