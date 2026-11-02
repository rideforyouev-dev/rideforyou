import { mkdirSync } from "node:fs";
import path from "node:path";
import { transaction } from "../../core/transactions.mjs";

export function upgradeLoans(db, { backupPath } = {}) {
  if (db.prepare("SELECT 1 FROM app_meta WHERE key='loans-v1'").get()) return;
  if (backupPath) {
    mkdirSync(path.dirname(backupPath), { recursive: true });
    db.prepare("VACUUM INTO ?").run(backupPath);
    console.log(
      "Loans upgrade: database snapshot saved on persistent storage.",
    );
  }
  transaction(db, () => {
    db.exec(`CREATE TABLE loans(
      id TEXT PRIMARY KEY,
      invoice_id TEXT UNIQUE REFERENCES invoices(id),
      bike_id TEXT REFERENCES bikes(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('ride_for_you', 'external')),
      vendor_name TEXT NOT NULL,
      file_reference TEXT,
      principal INTEGER NOT NULL CHECK(principal > 0),
      down_payment INTEGER NOT NULL CHECK(down_payment >= 0),
      down_payment_method TEXT NOT NULL DEFAULT 'UPI',
      interest_rate REAL NOT NULL DEFAULT 0,
      tenure_months INTEGER NOT NULL DEFAULT 0,
      monthly_emi INTEGER NOT NULL DEFAULT 0,
      total_interest INTEGER NOT NULL DEFAULT 0,
      total_payable INTEGER NOT NULL CHECK(total_payable >= principal),
      total_paid INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'defaulted', 'closed')),
      notes TEXT,
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    );
    CREATE TABLE loan_installments(
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK(amount > 0),
      paid_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partially_paid', 'overdue')),
      paid_date TEXT,
      UNIQUE(loan_id, installment_number)
    );
    CREATE TABLE loan_payments(
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      installment_id TEXT REFERENCES loan_installments(id),
      amount INTEGER NOT NULL CHECK(amount > 0),
      method TEXT NOT NULL CHECK(method IN ('Cash', 'UPI', 'Bank transfer')),
      payment_date TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      created TEXT NOT NULL
    );
    CREATE INDEX idx_loans_status ON loans(status, created);
    CREATE INDEX idx_loan_installments_due ON loan_installments(loan_id, due_date, status);`);
    db.prepare("INSERT INTO app_meta VALUES('loans-v1','enabled')").run();
  });
}
