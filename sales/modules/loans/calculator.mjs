export function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const maxDays = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(d, maxDays);
  const finalDate = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), targetDay),
  );
  return finalDate.toISOString().slice(0, 10);
}

export function calculateLoan({
  invoiceTotal,
  downPayment = 0,
  interestRate = 12,
  tenureMonths = 12,
  startDate,
}) {
  const total = Number(invoiceTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Invalid invoice total for loan calculation.");
  }
  const dp = Number(downPayment || 0);
  if (!Number.isFinite(dp) || dp < 0) {
    throw new Error("Down payment cannot be negative.");
  }
  if (dp >= total) {
    throw new Error(
      "Down payment cannot equal or exceed total invoice amount when financing.",
    );
  }

  const principal = total - dp;
  const rate = Number(interestRate);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("Interest rate must be zero or positive.");
  }

  const months = Math.floor(Number(tenureMonths));
  if (!Number.isFinite(months) || months < 1 || months > 60) {
    throw new Error("Loan tenure must be between 1 and 60 months.");
  }

  const date = startDate || new Date().toISOString().slice(0, 10);
  const totalInterest = Math.round((principal * rate * months) / 1200);
  const totalPayable = principal + totalInterest;
  const baseEmi = Math.floor(totalPayable / months);
  const remainder = totalPayable - baseEmi * months;

  const installments = [];
  for (let i = 1; i <= months; i++) {
    const installmentAmount = baseEmi + (i === months ? remainder : 0);
    installments.push({
      installmentNumber: i,
      dueDate: addMonths(date, i),
      amount: installmentAmount,
      paidAmount: 0,
      status: "pending",
      paidDate: null,
    });
  }

  return {
    principal,
    downPayment: dp,
    interestRate: rate,
    tenureMonths: months,
    totalInterest,
    totalPayable,
    monthlyEmi: Math.round(totalPayable / months),
    installments,
  };
}
