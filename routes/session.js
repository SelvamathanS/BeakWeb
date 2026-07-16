// routes/session.js — Session Hijacking + JWT Weaknesses
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const db      = require('../database');

// INTENTIONAL: Weak JWT secret — easily brutable
const JWT_SECRET = 'secret123';

// ─── Session info ─────────────────────────────────────────────────────────────
router.get('/session', (req, res) => {
  res.json({
    sessionId:   req.sessionID,
    sessionData: req.session,
    cookies:     req.cookies,
    _warning:    'Session Hijacking: Session ID exposed, no HttpOnly/Secure flags'
  });
});

router.get('/api/session', (req, res) => {
  res.json({
    sessionId:   req.sessionID,
    userId:      req.session.userId   || null,
    username:    req.session.username || null,
    role:        req.session.role     || null,
    _warning:    'Session data exposed without authentication'
  });
});

// ─── Manual session replacement (session hijacking demo) ─────────────────────
router.post('/session', (req, res) => {
  const { sessionId, username, role, userId } = req.body;

  // INTENTIONAL: allows manually setting any session values
  if (username) req.session.username = username;
  if (role)     req.session.role     = role;
  if (userId)   req.session.userId   = userId;

  res.json({
    success:     true,
    newSession:  req.session,
    sessionId:   req.sessionID,
    _warning:    'Session Hijacking: Session values set without validation'
  });
});

// ─── JWT: Issue token ─────────────────────────────────────────────────────────
router.post('/api/jwt', (req, res) => {
  const { username, role } = req.body;
  const uname = username || req.session.username || 'anonymous';
  const urole = role     || req.session.role     || 'user';

  // INTENTIONAL: no expiration, weak secret, trusts caller-supplied role
  const token = jwt.sign(
    { username: uname, role: urole, admin: urole === 'admin' },
    JWT_SECRET
    // No expiresIn — intentional
  );

  res.json({
    token,
    decoded: jwt.decode(token),
    secret:  JWT_SECRET, // INTENTIONAL: exposing secret for demo
    _warning: 'JWT Weakness: Weak secret, no expiry, trusts caller-supplied role'
  });
});

// ─── JWT: Verify token ────────────────────────────────────────────────────────
router.post('/api/jwt/verify', (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'token is required' });

  let result = { valid: false, decoded: null, error: null };

  try {
    // INTENTIONAL: trusts payload data without additional validation
    result.decoded = jwt.verify(token, JWT_SECRET);
    result.valid   = true;
    result.message = result.decoded.role === 'admin'
      ? '🔓 ADMIN ACCESS GRANTED — JWT trusted blindly'
      : '✅ Token valid — user access';
  } catch (err) {
    result.error = err.message;
    // Try to decode without verification (shows header tampering)
    result.rawDecoded = jwt.decode(token);
  }

  res.json(result);
});

// ─── JWT: Decode without verification (none algorithm) ───────────────────────
router.post('/api/jwt/decode', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  res.json({
    decoded:  jwt.decode(token, { complete: true }),
    _warning: 'Decoded WITHOUT signature verification — algorithm confusion demo'
  });
});

module.exports = router;
