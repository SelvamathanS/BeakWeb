// routes/csrf.js — CSRF, Clickjacking, Broken Access Control, Info Disclosure
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// ─── CSRF: Sensitive action with no CSRF token ────────────────────────────────
router.post('/transfer', (req, res) => {
  const { amount, to, from } = req.body;

  // INTENTIONAL: no CSRF token check, no SameSite cookie, no Origin validation
  res.json({
    success:  true,
    transfer: { from: from || req.session.username || 'current_user', to, amount },
    message:  `Transfer of $${amount} to ${to} completed`,
    _warning: 'CSRF: No token verification, no SameSite cookie protection'
  });
});

// ─── Broken Access Control: Admin panel (client-side only guard) ──────────────
router.get('/api/admin', (req, res) => {
  // INTENTIONAL: no server-side authorization check
  // Frontend JS checks, but this endpoint is open to anyone
  const users    = db.prepare('SELECT * FROM users').all();
  const comments = db.prepare('SELECT * FROM comments').all();

  res.json({
    _warning:    'Broken Access Control: Endpoint accessible without real auth',
    adminData:   { users, comments },
    serverInfo:  {
      nodeVersion: process.version,
      platform:    process.platform,
      pid:         process.pid,
      uptime:      Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage()
    }
  });
});

// ─── Information Disclosure ───────────────────────────────────────────────────
router.get('/api/info', (req, res) => {
  res.json({
    application:   'Security Playground v1.0.0',
    version:       '1.0.0',
    nodeVersion:   process.version,
    expressVersion: require('../node_modules/express/package.json').version,
    ejsVersion:     require('../node_modules/ejs/package.json').version,
    platform:       process.platform,
    arch:           process.arch,
    pid:            process.pid,
    cwd:            process.cwd(),
    uptime:         process.uptime(),
    env:            process.env.NODE_ENV || 'development',
    dbPath:         require('path').join(process.cwd(), 'database.db'),
    _warning:       'Information Disclosure: Tech stack, versions, and paths exposed'
  });
});

// ─── Error handling demo ──────────────────────────────────────────────────────
router.get('/error', (req, res) => {
  const { type } = req.query;

  if (type === 'reference') {
    const x = undefinedVariable; // ReferenceError
  } else if (type === 'type') {
    null.property; // TypeError
  } else if (type === 'sql') {
    db.prepare("SELECT * FROM nonexistent_table").all();
  } else if (type === 'json') {
    JSON.parse('{ invalid json }');
  } else {
    throw new Error('Generic intentional error: Stack trace exposed to client\n    at ErrorDemo (/routes/csrf.js:60)\n    at Layer.handle (/node_modules/express/lib/router/layer.js:95)');
  }
});

// ─── CSRF demo HTML form (renders a cross-origin form demo) ──────────────────
router.get('/csrf-demo', (req, res) => {
  const port   = process.env.PORT || 3000;
  const target = `http://localhost:${port}/transfer`;

  res.send(`
<!DOCTYPE html>
<html>
<head><title>CSRF Demo Page</title></head>
<body style="background:#111;color:#eee;font-family:sans-serif;padding:2rem">
  <h1>⚠️ CSRF Attack Demo</h1>
  <p>This page simulates a malicious website performing a CSRF attack.</p>
  <p>When you click the button, a POST request is sent to <code>${target}</code>
     without any CSRF token.</p>
  <form action="${target}" method="POST">
    <input type="hidden" name="to"     value="attacker" />
    <input type="hidden" name="amount" value="9999" />
    <input type="hidden" name="from"   value="victim" />
    <button type="submit"
      style="background:#e53935;color:#fff;padding:1rem 2rem;border:none;border-radius:8px;cursor:pointer;font-size:1rem">
      Click here for free prize 🎁
    </button>
  </form>
  <p style="margin-top:2rem;opacity:.6">
    In a real attack this form would be hidden or auto-submitted via JavaScript.
  </p>
</body>
</html>`);
});

module.exports = router;
