// routes/sql.js — SQL Injection via product search
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// ─── SQLi: Product search ─────────────────────────────────────────────────────
router.get('/search', (req, res) => {
  const q = req.query.q || '';

  // INTENTIONALLY VULNERABLE: string concatenation in SQL query
  const query = `SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;
  let result  = { query, results: [], error: null };

  try {
    result.results = db.prepare(query).all();
  } catch (err) {
    // INTENTIONAL: expose raw SQL error
    result.error = err.message;
  }

  res.json(result);
});

// ─── SQLi: REST API product list ──────────────────────────────────────────────
router.get('/rest/products', (req, res) => {
  const q = req.query.q || '';

  // INTENTIONALLY VULNERABLE
  const query = `SELECT id, name, description, price, category FROM products WHERE name LIKE '%${q}%'`;
  let result  = { query, results: [], error: null, total: 0 };

  try {
    result.results = db.prepare(query).all();
    result.total   = result.results.length;
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── SQLi: User search (Union injection demo) ─────────────────────────────────
router.get('/rest/user/login', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.json({
      hint: 'Pass ?username= to search. Try UNION injection.',
      example: `/rest/user/login?username=' UNION SELECT id,username,password,email,role,bio FROM users--`
    });
  }

  // INTENTIONALLY VULNERABLE
  const query = `SELECT id, username, email, role FROM users WHERE username = '${username}'`;
  let result  = { query, results: [], error: null };

  try {
    result.results = db.prepare(query).all();
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

module.exports = router;
