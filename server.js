const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const db = mysql.createPool({
  host: 'localhost', user: 'root',
  password: 'root',
  database: 'spendguard_db'
});

// ── Helpers ──
function parseDate(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) return new Date(parts[2], parts[0]-1, parts[1]);
  return new Date(str);
}

function daysApart(d1, d2) {
  return Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
}
// A vendor is a subscription if its name contains any of these keywords
const SUB_KEYWORDS = [".com", ".net", ".io", ".org", ".co", "subscription", "monthly", "annually", "annual", "weekly", "recurring", "membership", "premium", "plus", "pro"];
function isSubscriptionVendor(vendor) {
  var v = vendor.toLowerCase();
  return SUB_KEYWORDS.some(function(k) { return v.includes(k); });
}

function isRecurring(dates) {
  const uniqueDates = [...new Set(dates)].map(d => parseDate(d)).filter(d => d).sort((a,b) => a-b);
  if (uniqueDates.length < 2) return false;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const diff = daysApart(uniqueDates[i+1], uniqueDates[i]);
    if (
      (diff >= 5   && diff <= 9)   ||  // weekly
      (diff >= 25  && diff <= 35)  ||  // monthly
      (diff >= 85  && diff <= 95)  ||  // quarterly
      (diff >= 355 && diff <= 375)     // annual
    ) return true;
  }
  return false;
}

// ── Auth ──
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.json({ error: 'Username and password required' });
  try {
    const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (rows.length) return res.json({ error: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const [r] = await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email||'', hashed]);
    res.json({ id: r.insertId, username, success: true });
  } catch(e) { res.json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: 'Username and password required' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.json({ error: 'Invalid username or password' });
    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password).catch(() => false) || password === user.password;
    if (!match) return res.json({ error: 'Invalid username or password' });
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch(e) { res.json({ error: e.message }); }
});

app.post('/api/delete-account', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    await db.query('DELETE FROM payments  WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM contracts WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users     WHERE id = ?',      [userId]);
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

// ── Transactions ──
app.post('/api/save-transactions', async (req, res) => {
  const { userId, transactions } = req.body;
  if (!userId || !transactions) return res.json({ error: 'Missing data' });
  try {
    await db.query('DELETE FROM payments WHERE user_id = ?', [userId]);
    let saved = 0;
    for (const t of transactions) {
      if (!t.vendor || !t.amount) continue;
      await db.query(
        'INSERT INTO payments (user_id, vendor, amount, payment_date, source) VALUES (?, ?, ?, ?, ?)',
        [userId, t.vendor, t.amount, t.rawDate || null, 'pdf']
      );
      saved++;
    }
    res.json({ success: true, saved });
  } catch(e) { res.json({ error: e.message }); }
});

// ── Build subscription vendor set for a user ──
// Returns a Set of "vendor|amount" keys that are detected as subscriptions
async function getSubscriptionKeys(userId) {
  const [combos] = await db.query(
    'SELECT vendor, amount FROM payments WHERE user_id = ? GROUP BY vendor, amount HAVING COUNT(*) > 1',
    [userId]
  );
  const subKeys = new Set();
  for (const c of combos) {
    // Always a subscription if vendor has .com
    if (isSubscriptionVendor(c.vendor)) {
      subKeys.add(c.vendor + '|' + c.amount);
      continue;
    }
    // Otherwise check if dates are recurring
    const [rows] = await db.query(
      'SELECT payment_date FROM payments WHERE user_id = ? AND vendor = ? AND amount = ?',
      [userId, c.vendor, c.amount]
    );
    const dates = rows.map(r => r.payment_date);
    if (isRecurring(dates)) {
      subKeys.add(c.vendor + '|' + c.amount);
    }
  }
  return subKeys;
}

// ── Duplicate Payments ──
// Same vendor + same amount + same date, AND the vendor is NOT a subscription
app.get('/api/duplicate-payments', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const subKeys = await getSubscriptionKeys(userId);
    const [dupes] = await db.query(
      'SELECT vendor, amount, payment_date FROM payments WHERE user_id = ? GROUP BY vendor, amount, payment_date HAVING COUNT(*) > 1',
      [userId]
    );
    const groups = [];
    for (const d of dupes) {
      const key = d.vendor + '|' + d.amount;
      if (subKeys.has(key)) continue; // skip — this is a subscription
      const [rows] = await db.query(
        'SELECT * FROM payments WHERE user_id = ? AND vendor = ? AND amount = ? AND payment_date = ?',
        [userId, d.vendor, d.amount, d.payment_date]
      );
      groups.push(rows);
    }
    res.json(groups);
  } catch(e) { res.json({ error: e.message }); }
});

app.post('/api/remove-duplicate-payment', async (req, res) => {
  const { userId, vendor, amount, date } = req.body;
  if (!userId || !vendor) return res.json({ error: 'Missing data' });
  try {
    const [rows] = await db.query(
      'SELECT id FROM payments WHERE user_id = ? AND vendor = ? AND amount = ? AND payment_date = ? ORDER BY id ASC',
      [userId, vendor, amount, date]
    );
    for (let i = 1; i < rows.length; i++) {
      await db.query('DELETE FROM payments WHERE id = ?', [rows[i].id]);
    }
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

// ── Duplicate Subscriptions ──
// Same vendor + same amount with recurring date pattern OR .com vendor, appearing more than once
app.get('/api/duplicate-subscriptions', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const [combos] = await db.query(
      'SELECT vendor, amount FROM payments WHERE user_id = ? GROUP BY vendor, amount HAVING COUNT(*) > 1',
      [userId]
    );
    const groups = [];
    for (const c of combos) {
      const [rows] = await db.query(
        'SELECT * FROM payments WHERE user_id = ? AND vendor = ? AND amount = ? ORDER BY payment_date ASC',
        [userId, c.vendor, c.amount]
      );
      const dates = rows.map(r => r.payment_date);
      const uniqueDates = [...new Set(dates)];

      // Include if .com vendor OR recurring date pattern
      if (isSubscriptionVendor(c.vendor) || (uniqueDates.length >= 2 && isRecurring(uniqueDates))) {
        groups.push(rows);
      }
    }
    res.json(groups);
  } catch(e) { res.json({ error: e.message }); }
});

app.post('/api/remove-duplicate-subscription', async (req, res) => {
  const { userId, vendor, amount } = req.body;
  if (!userId || !vendor) return res.json({ error: 'Missing data' });
  try {
    const [rows] = await db.query(
      'SELECT id FROM payments WHERE user_id = ? AND vendor = ? AND amount = ? ORDER BY id ASC',
      [userId, vendor, amount]
    );
    for (let i = 1; i < rows.length; i++) {
      await db.query('DELETE FROM payments WHERE id = ?', [rows[i].id]);
    }
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

// ── Contracts ──
app.post('/api/save-contract', async (req, res) => {
  const { userId, vendor, maxAmount } = req.body;
  if (!userId || !vendor || !maxAmount) return res.json({ error: 'Missing fields' });
  try {
    await db.query(
      'INSERT INTO contracts (user_id, vendor, vendor_name, max_amount, budget_limit, actual_total) VALUES (?, ?, ?, ?, ?, 0)',
      [userId, vendor, vendor, maxAmount, maxAmount]
    );
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

app.get('/api/contract-violations', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const [contracts] = await db.query('SELECT * FROM contracts WHERE user_id = ?', [userId]);
    const results = [];
    for (const c of contracts) {
      const vendorName = c.vendor || c.vendor_name;
      const maxAmt     = parseFloat(c.max_amount || c.budget_limit);
      const [rows]     = await db.query(
        'SELECT SUM(amount) as total FROM payments WHERE user_id = ? AND vendor LIKE ?',
        [userId, '%' + vendorName + '%']
      );
      const total = parseFloat(rows[0].total) || 0;
      results.push({
        vendor: vendorName, maxAmount: maxAmt, actualTotal: total,
        isViolation: total > maxAmt,
        overBy: Math.max(0, total - maxAmt)
      });
    }
    res.json(results);
  } catch(e) { res.json({ error: e.message }); }
});

app.get('/api/get-contracts', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const [rows] = await db.query('SELECT * FROM contracts WHERE user_id = ?', [userId]);
    const results = rows.map(c => ({
      vendor: c.vendor || c.vendor_name,
      maxAmount: parseFloat(c.max_amount || c.budget_limit)
    }));
    res.json(results);
  } catch(e) { res.json({ error: e.message }); }
});

app.post('/api/remove-contract', async (req, res) => {
  const { userId, vendor } = req.body;
  if (!userId || !vendor) return res.json({ error: 'Missing data' });
  try {
    await db.query('DELETE FROM contracts WHERE user_id = ? AND (vendor = ? OR vendor_name = ?)', [userId, vendor, vendor]);
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

app.listen(3000, () => console.log('SpendGuard running on http://localhost:3000'));
