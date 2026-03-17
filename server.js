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

// ── Duplicate Payments ──
app.get('/api/duplicate-payments', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const [dupes] = await db.query(
      'SELECT vendor, amount, payment_date FROM payments WHERE user_id = ? GROUP BY vendor, amount, payment_date HAVING COUNT(*) > 1',
      [userId]
    );
    const groups = [];
    for (const d of dupes) {
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
    // Keep first, delete the rest one by one
    for (let i = 1; i < rows.length; i++) {
      await db.query('DELETE FROM payments WHERE id = ?', [rows[i].id]);
    }
    res.json({ success: true });
  } catch(e) { res.json({ error: e.message }); }
});

// ── Duplicate Subscriptions ──
app.get('/api/duplicate-subscriptions', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.json({ error: 'Missing userId' });
  try {
    const [dupes] = await db.query(
      'SELECT vendor, amount FROM payments WHERE user_id = ? GROUP BY vendor, amount HAVING COUNT(*) > 1',
      [userId]
    );
    const groups = [];
    for (const d of dupes) {
      const [rows] = await db.query(
        'SELECT * FROM payments WHERE user_id = ? AND vendor = ? AND amount = ? ORDER BY payment_date',
        [userId, d.vendor, d.amount]
      );
      groups.push(rows);
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
    // Keep first, delete the rest one by one
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
