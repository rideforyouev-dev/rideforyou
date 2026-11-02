import { esc, cash, field, select, area, panel, today, showFormError } from "../../shared/ui.mjs";

export async function loanScreen(ctx) {
  const { state, route, shell, heading, api, load, toast, error } = ctx;
  const current = () => location.hash.slice(1) === route;

  try {
    const [, id, action] = route.split("/");

    if (id) {
      return renderLoanDetail(ctx, id);
    }

    const data = await api("/loans");
    if (!current()) return;

    const { loans, stats } = data;

    shell(
      heading(
        "LOAN & EMI MANAGEMENT",
        "Vehicle finance & monthly repayments.",
        "Track customer down payments, external financers, and in-house Ride For You EMIs.",
        '<a href="#invoices/new"><button class="primary">+ New Financed Sale ↗</button></a>',
      ) +
        `<div class="stats">
          <div class="stat"><small>Active loans</small><strong>${String(stats.activeLoans).padStart(2, "0")}</strong><em>${stats.completedLoans} completed accounts</em></div>
          <div class="stat"><small>Total financed</small><strong>${cash(stats.totalFinanced)}</strong><em>Dealership & vendor principal</em></div>
          <div class="stat"><small>Total collected</small><strong>${cash(stats.totalCollected)}</strong><em>EMI & down payments</em></div>
          <div class="stat"><small>Outstanding balance</small><strong>${cash(stats.totalBalance)}</strong><em>Active loan dues</em></div>
          <div class="stat"><small>Overdue accounts</small><strong>${String(stats.overdueLoansCount).padStart(2, "0")}</strong><em>Needs payment follow-up</em></div>
        </div>
        <div class="search">
          <input id="loansearch" placeholder="Search customer, phone, invoice #, VIN or financier…" aria-label="Search loans">
          <select id="loanstatus">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue dues</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <section class="panel" id="loantable"></section>`,
      route,
    );

    const searchInput = document.querySelector("#loansearch");
    const statusSelect = document.querySelector("#loanstatus");

    function renderTable() {
      const q = (searchInput.value || "").toLowerCase().trim();
      const filter = statusSelect.value;

      const filtered = loans.filter((l) => {
        const matchesQ =
          !q ||
          [l.customer_name, l.customer_phone, l.invoice_number, l.vin, l.vendor_name, l.file_reference]
            .filter(Boolean)
            .some((val) => String(val).toLowerCase().includes(q));

        if (!matchesQ) return false;
        if (filter === "overdue") return Number(l.overdue_count) > 0;
        if (filter) return l.status === filter;
        return true;
      });

      const container = document.querySelector("#loantable");
      if (!filtered.length) {
        container.innerHTML = `<div class="empty"><b>No loans found.</b><p>Create an invoice with financing to start tracking customer EMIs.</p></div>`;
        return;
      }

      container.innerHTML = `
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice & Vehicle</th>
                <th>Financier</th>
                <th>Principal</th>
                <th>EMI / Month</th>
                <th>Paid / Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((l) => {
                  const isRfy = l.provider_type === "ride_for_you";
                  const statusBadge =
                    l.status === "completed"
                      ? '<span class="tag">Completed</span>'
                      : Number(l.overdue_count) > 0
                        ? '<span class="tag deleted-tag">Overdue</span>'
                        : '<span class="tag active-tag">Active</span>';

                  return `
                  <tr>
                    <td>
                      <b>${esc(l.customer_name)}</b>
                      <small>${esc(l.customer_phone)}</small>
                    </td>
                    <td>
                      <b>${esc(l.invoice_number || "Invoice")}</b>
                      <small>${esc(l.brand || "")} ${esc(l.model || "")} · ${esc(l.vin || "")}</small>
                    </td>
                    <td>
                      <span class="tag ${isRfy ? "active-tag" : ""}">${esc(l.vendor_name)}</span>
                      <small>${isRfy ? `${l.tenure_months} mo @ ${l.interest_rate}%` : esc(l.file_reference || "External")}</small>
                    </td>
                    <td>${cash(l.principal)}</td>
                    <td>${isRfy && l.monthly_emi ? cash(l.monthly_emi) : "—"}</td>
                    <td>
                      <div><b>${cash(l.total_paid)}</b></div>
                      <small class="muted">Bal: ${cash(l.balance)}</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                      <a href="#loans/${l.id}">View & Collect ↗</a>
                    </td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;
    }

    searchInput.oninput = renderTable;
    statusSelect.onchange = renderTable;
    renderTable();
  } catch (err) {
    error(err);
  }
}

async function renderLoanDetail(ctx, id) {
  const { shell, heading, api, toast, error, route } = ctx;

  const data = await api(`/loans/${id}`);
  const { loan: l, installments, payments } = data;
  const isRfy = l.provider_type === "ride_for_you";

  shell(
    heading(
      "LOAN ACCOUNT",
      esc(l.customer_name),
      `Phone: ${esc(l.customer_phone)} · Invoice ${esc(l.invoice_number || "")}`,
      '<a href="#loans">← Back to Loans</a>',
    ) +
      `<div class="stats">
        <div class="stat"><small>Financed principal</small><strong>${cash(l.principal)}</strong><em>Down payment: ${cash(l.down_payment)}</em></div>
        <div class="stat"><small>Total payable</small><strong>${cash(l.total_payable)}</strong><em>${isRfy ? `Includes ${cash(l.total_interest)} interest` : "Excl. vendor interest"}</em></div>
        <div class="stat"><small>Total paid</small><strong>${cash(l.total_paid)}</strong><em>Received to date</em></div>
        <div class="stat"><small>Remaining balance</small><strong>${cash(l.balance)}</strong><em>${l.status === "completed" ? "Fully settled" : "Due balance"}</em></div>
        <div class="stat"><small>Status</small><strong>${esc(l.status.toUpperCase())}</strong><em>${isRfy ? `${l.tenure_months} installments` : esc(l.vendor_name)}</em></div>
      </div>

      <div class="split">
        <div>
          ${
            isRfy
              ? `<section class="panel">
                  <div class="panelhead">
                    <h2>Monthly EMI Repayment Schedule</h2>
                    ${l.status !== "completed" ? `<button id="btn-collect-emi" class="primary">+ Record EMI Payment</button>` : ""}
                  </div>
                  <div class="panelbody">
                    <div class="scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Due Date</th>
                            <th>Scheduled EMI</th>
                            <th>Paid Amount</th>
                            <th>Paid Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${installments
                            .map((inst) => {
                              const badge =
                                inst.status === "paid"
                                  ? '<span class="tag">Paid</span>'
                                  : inst.status === "overdue"
                                    ? '<span class="tag deleted-tag">Overdue</span>'
                                    : inst.status === "partially_paid"
                                      ? '<span class="tag active-tag">Partial</span>'
                                      : '<span class="tag">Pending</span>';

                              return `
                              <tr>
                                <td><b>M${inst.installment_number}</b></td>
                                <td>${esc(inst.due_date)}</td>
                                <td><b>${cash(inst.amount)}</b></td>
                                <td>${inst.paid_amount ? cash(inst.paid_amount) : "—"}</td>
                                <td>${esc(inst.paid_date || "—")}</td>
                                <td>${badge}</td>
                              </tr>`;
                            })
                            .join("")}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>`
              : `<section class="panel">
                  <div class="panelhead"><h2>External Finance Information</h2></div>
                  <div class="panelbody">
                    <div class="formgrid">
                      <div><small>Financier Name</small><br><b>${esc(l.vendor_name)}</b></div>
                      <div><small>Loan Reference / File #</small><br><b>${esc(l.file_reference || "Not recorded")}</b></div>
                      <div><small>Down Payment Mode</small><br><b>${esc(l.down_payment_method || "UPI")}</b></div>
                      <div><small>Agreement Notes</small><br><p class="muted">${esc(l.notes || "None")}</p></div>
                    </div>
                  </div>
                </section>`
          }

          <section class="panel">
            <div class="panelhead"><h2>Payment Receipts Log</h2></div>
            <div class="panelbody">
              ${
                payments.length
                  ? `<div class="scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Payment Mode</th>
                            <th>Reference</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${payments
                            .map(
                              (p) => `
                            <tr>
                              <td>${esc(p.payment_date)}</td>
                              <td><b>${cash(p.amount)}</b></td>
                              <td><span class="tag">${esc(p.method)}</span></td>
                              <td>${esc(p.reference || "—")}</td>
                              <td>${esc(p.notes || "—")}</td>
                            </tr>`,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>`
                  : `<p class="muted">No payments recorded yet.</p>`
              }
            </div>
          </section>
        </div>

        <aside class="commerce-side">
          <section class="panel">
            <div class="panelhead"><h2>Vehicle Details</h2></div>
            <div class="panelbody">
              <div><small>Vehicle</small><br><b>${esc(l.brand || "")} ${esc(l.model || "")}</b></div>
              <div style="margin-top:8px"><small>Chassis / VIN</small><br><code>${esc(l.vin || "")}</code></div>
              <div style="margin-top:8px"><small>Invoice Number</small><br><b>${esc(l.invoice_number || "")}</b></div>
              <hr style="margin:12px 0;border:0;border-top:1px solid #e1e7e1">
              <div><small>Financier</small><br><b>${esc(l.vendor_name)}</b> (${isRfy ? "In-House" : "External"})</div>
              ${isRfy ? `<div style="margin-top:8px"><small>Interest Rate</small><br><b>${l.interest_rate}% p.a.</b></div>` : ""}
              ${isRfy ? `<div style="margin-top:8px"><small>Tenure</small><br><b>${l.tenure_months} months</b></div>` : ""}
            </div>
          </section>
        </aside>
      </div>

      <div id="emi-modal-wrap" hidden></div>`,
    route,
  );

  const collectBtn = document.querySelector("#btn-collect-emi");
  if (collectBtn) {
    collectBtn.onclick = () => {
      openEmiModal(ctx, l, installments);
    };
  }
}

function openEmiModal(ctx, loan, installments) {
  const { api, toast, error } = ctx;
  const wrap = document.querySelector("#emi-modal-wrap");

  const unpaid = installments.filter((i) => i.status !== "paid");
  const nextInst = unpaid[0] || installments[0];
  const suggestedAmount = nextInst ? (nextInst.amount - nextInst.paid_amount) / 100 : loan.balance / 100;

  wrap.innerHTML = `
    <div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div class="panel" style="width:480px;max-width:95vw;background:#fff;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.18);">
        <div class="panelhead">
          <h2>Record Monthly EMI Payment</h2>
          <button type="button" id="close-modal" class="textbtn">✕</button>
        </div>
        <form id="emipayform" class="panelbody">
          <div id="modal-error"></div>
          <div class="formgrid">
            <div class="field">
              <label for="installmentId">Installment</label>
              <select id="installmentId" name="installmentId">
                ${installments
                  .map(
                    (i) =>
                      `<option value="${i.id}" ${i.id === nextInst?.id ? "selected" : ""}>Month ${i.installmentNumber || i.installment_number} (Due: ${i.dueDate || i.due_date}) · ${cash(i.amount)} [${i.status}]</option>`,
                  )
                  .join("")}
              </select>
            </div>
            ${field("Payment Amount (₹) *", "amount", suggestedAmount, 'required type="number" min="0.01" step="0.01"')}
            ${select("Payment Method *", "method", ["Cash", "UPI", "Bank transfer"].map((x) => [x, x]), "UPI", true)}
            ${field("Payment Date *", "paymentDate", today(), `required type="date" max="${today()}"`)}
            ${field("Transaction / Receipt Ref", "reference", "", 'maxlength="100" placeholder="e.g. UPI Ref / Bank Txn ID"')}
            ${area("Notes / Remarks", "notes", "", 500)}
          </div>
          <div class="formfooter" style="margin-top:16px;display:flex;justify-content:flex-end;gap:12px">
            <button type="button" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="primary">Record Payment →</button>
          </div>
        </form>
      </div>
    </div>`;

  wrap.hidden = false;

  const close = () => {
    wrap.hidden = true;
    wrap.innerHTML = "";
  };

  wrap.querySelector("#close-modal").onclick = close;
  wrap.querySelector("#btn-cancel-modal").onclick = close;

  wrap.querySelector("#emipayform").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;

    try {
      const form = e.target;
      const payload = {
        installmentId: form.installmentId.value,
        amount: Number(form.amount.value),
        method: form.method.value,
        paymentDate: form.paymentDate.value,
        reference: form.reference.value,
        notes: form.notes.value,
      };

      await api(`/loans/${loan.id}/payments`, "POST", payload);
      toast("EMI payment recorded successfully.");
      close();
      await renderLoanDetail(ctx, loan.id);
    } catch (err) {
      const errEl = wrap.querySelector("#modal-error");
      if (errEl) {
        errEl.className = "error";
        errEl.textContent = err.message;
      }
      btn.disabled = false;
    }
  };
}
