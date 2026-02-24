const API = 'http://127.0.0.1:8080/api';

// ── Hero hide on scroll ─────────────────────────────────────────────────────
const hero = document.getElementById('hero');
let lastY = 0;
if (hero) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > 80 && y > lastY) hero.classList.add('hidden');
    else if (y < 50) hero.classList.remove('hidden');
    lastY = y;
  });
}

// ── Utility: render a results table ────────────────────────────────────────
function renderTable(containerId, columns, rows) {
  const box = document.getElementById(containerId);
  if (!box) return;
  if (!rows || rows.length === 0) {
    box.innerHTML = `<span class="badge ok">No issues found</span>`;
    return;
  }
  let html = `<table><thead><tr>`;
  columns.forEach(c => html += `<th>${c.header}</th>`);
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>`;
    columns.forEach(c => {
      const v = typeof c.value === 'function' ? c.value(r) : r[c.value];
      html += `<td>${v ?? ''}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  box.innerHTML = html;
}

// ── Helper: get logged-in userId ───────────────────────────────────────────
function getUserId() {
  return localStorage.getItem('spendguard_userId');
}

// ── Duplicate Payments ─────────────────────────────────────────────────────
const btnPayments = document.getElementById('btnPayments');
if (btnPayments) {
  btnPayments.addEventListener('click', async () => {
    const res = await fetch(`${API}/payments/duplicates?userId=${getUserId()}`);
    const data = await res.json();
    const rows = [];
    data.forEach((group, idx) => {
      group.forEach(p => rows.push({
        group: `#${idx + 1}`,
        id: p.id,
        vendor: p.vendor,
        invoice: p.invoiceNumber || '',
        amount: `$${Number(p.amount).toFixed(2)}`,
        date: p.paidDate
      }));
    });
    renderTable('paymentsResults', [
      { header: 'Group',      value: 'group' },
      { header: 'Payment ID', value: 'id' },
      { header: 'Vendor',     value: 'vendor' },
      { header: 'Invoice #',  value: 'invoice' },
      { header: 'Amount',     value: 'amount' },
      { header: 'Paid Date',  value: 'date' }
    ], rows);
  });
}

// ── Duplicate Subscriptions ────────────────────────────────────────────────
const btnSubs = document.getElementById('btnSubs');
if (btnSubs) {
  btnSubs.addEventListener('click', async () => {
    const res = await fetch(`${API}/subscriptions/duplicates?userId=${getUserId()}`);
    const groups = await res.json();
    const rows = [];
    groups.forEach((group, idx) => {
      group.forEach(s => rows.push({
        group: `#${idx + 1}`,
        id: s.id,
        service: s.serviceName,
        vendor: s.vendor || '',
        start: s.startDate,
        end: s.endDate || '',
        status: s.status,
        cost: `$${Number(s.cost).toFixed(2)}`,
        users: s.userCount
      }));
    });
    renderTable('subsResults', [
      { header: 'Group',   value: 'group' },
      { header: 'Sub ID',  value: 'id' },
      { header: 'Service', value: 'service' },
      { header: 'Vendor',  value: 'vendor' },
      { header: 'Start',   value: 'start' },
      { header: 'End',     value: 'end' },
      { header: 'Status',  value: 'status' },
      { header: 'Cost',    value: 'cost' },
      { header: 'Users',   value: 'users' }
    ], rows);
  });
}

// ── Contract Violations ────────────────────────────────────────────────────
const btnViolations = document.getElementById('btnViolations');
if (btnViolations) {
  btnViolations.addEventListener('click', async () => {
    const res = await fetch(`${API}/contracts/violations?userId=${getUserId()}`);
    const data = await res.json();
    renderTable('contractsResults', [
      { header: 'Contract',     value: r => `${r.contractName} (${r.vendor})` },
      { header: 'Max Amount',   value: r => `$${Number(r.maxAmount).toFixed(2)}` },
      { header: 'Actual Total', value: r => `$${Number(r.actualTotal).toFixed(2)}` },
      { header: 'Over By',      value: r => `$${Number(r.overBy).toFixed(2)}` }
    ], data);
  });
}

// ── Contract Version Compare ───────────────────────────────────────────────
const btnCompare = document.getElementById('btnCompare');
if (btnCompare) {
  btnCompare.addEventListener('click', async () => {
    const id   = document.getElementById('contractId').value.trim();
    const oldV = document.getElementById('oldVersion').value.trim();
    const newV = document.getElementById('newVersion').value.trim();
    if (!id || !oldV || !newV) {
      alert('Please enter Contract ID, Old Version, and New Version.');
      return;
    }
    const res  = await fetch(`${API}/contracts/compare?contractId=${id}&oldVersion=${oldV}&newVersion=${newV}&userId=${getUserId()}`);
    const data = await res.json();
    const rows = [];
    if (data.error) {
      rows.push({ field: 'Error', value: data.error });
    } else {
      rows.push({ field: 'Contract ID',    value: data.contractId });
      rows.push({ field: 'Compared',       value: `${data.oldVersion} → ${data.newVersion}` });
      rows.push({ field: 'Terms Changed',  value: data.diffs.termsChanged ? 'Yes' : 'No' });
      rows.push({ field: 'Old Total',      value: `$${Number(data.diffs.oldTotal).toFixed(2)}` });
      rows.push({ field: 'New Total',      value: `$${Number(data.diffs.newTotal).toFixed(2)}` });
      rows.push({ field: 'Δ Total',        value: `$${Number(data.diffs.totalChangedBy).toFixed(2)}` });
    }
    const box = document.getElementById('contractsResults');
    box.innerHTML = `<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${
      rows.map(r => `<tr><td>${r.field}</td><td>${r.value}</td></tr>`).join('')
    }</tbody></table>`;
  });
}
