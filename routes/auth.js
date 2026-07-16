// routes/auth.js — SQLi login, IDOR profile, no rate limiting
const express = require('express');
const router = express.Router();
const db = require('../database');

// In-memory attempt counter (per IP, no real rate limiting — intentional)
const attemptCounts = {};

// ─── SQL Injection vulnerable login ──────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  attemptCounts[ip] = (attemptCounts[ip] || 0) + 1;

  // INTENTIONALLY VULNERABLE: direct string concatenation — DO NOT do this in real code
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  let result = { success: false, user: null, query, attempts: attemptCounts[ip], error: null };

  try {
    const user = db.prepare(query).get();
    if (user) {
      req.session.userId   = user.id;
      req.session.username = user.username;
      req.session.role     = user.role;
      result.success = true;
      result.user    = { id: user.id, username: user.username, role: user.role, email: user.email };
    }
  } catch (err) {
    // INTENTIONAL: expose raw error for educational purposes
    result.error = err.message;
  }

  res.json(result);
});

// ─── JSON API login (also injectable) ────────────────────────────────────────
router.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  attemptCounts[ip] = (attemptCounts[ip] || 0) + 1;

  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  let result  = { success: false, user: null, query, attempts: attemptCounts[ip], error: null };

  try {
    const user = db.prepare(query).get();
    if (user) {
      req.session.userId   = user.id;
      req.session.username = user.username;
      req.session.role     = user.role;
      result.success = true;
      result.user    = { id: user.id, username: user.username, role: user.role, email: user.email };
    }
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── Get attempt count ────────────────────────────────────────────────────────
router.get('/login/attempts', (req, res) => {
  res.json({ attempts: attemptCounts[req.ip] || 0, ip: req.ip });
});

// ─── Reset attempt counter ────────────────────────────────────────────────────
router.post('/login/reset', (req, res) => {
  attemptCounts[req.ip] = 0;
  res.json({ message: 'Counter reset', attempts: 0 });
});

// ─── IDOR: List all users (no auth) ──────────────────────────────────────────
router.get('/api/users', (req, res) => {
  // INTENTIONAL: returns all user data with no authentication
  const users = db.prepare('SELECT * FROM users').all();
  res.json({ users, _warning: 'This endpoint has no authentication — IDOR vulnerability' });
});

// ─── IDOR: Get profile by id (no ownership check) ────────────────────────────
router.get('/profile', (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ error: 'Missing ?id= parameter. Try /profile?id=1' });

  // INTENTIONAL: no check that logged-in user owns this profile
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.json({ error: `No user found with id=${id}` });

  res.json({ user, _warning: 'No ownership validation — IDOR vulnerability' });
});

router.get('/api/profile', (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ error: 'Missing ?id= parameter', hint: 'Try ?id=1 through ?id=5' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.json({ error: `No user found with id=${id}` });

  res.json({ user, _warning: 'IDOR: No ownership validation' });
});

// ─── Get session info ─────────────────────────────────────────────────────────
router.get('/api/whoami', (req, res) => {
  res.json({
    loggedIn:  !!req.session.userId,
    userId:    req.session.userId   || null,
    username:  req.session.username || null,
    role:      req.session.role     || null,
    sessionId: req.sessionID
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

module.exports = router;
