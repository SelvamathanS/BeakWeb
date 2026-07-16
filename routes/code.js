// routes/code.js — JS Code Injection (eval) + Python exec
const express  = require('express');
const router   = express.Router();
const { exec } = require('child_process');

// ─── JS Code Injection: eval ──────────────────────────────────────────────────
router.post('/exec', (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'code is required' });

  let result = {
    code,
    output: null,
    error:  null,
    _warning: 'RCE: User-supplied code executed via eval()'
  };

  try {
    // INTENTIONALLY VULNERABLE: never use eval() with user input
    const output = eval(code); // eslint-disable-line no-eval
    result.output = String(output);
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── Python Code Injection ────────────────────────────────────────────────────
router.post('/exec/python', (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'code is required' });

  // INTENTIONALLY VULNERABLE: executes arbitrary Python code
  // Tries python3 first, falls back to python
  const safeCode = code.replace(/"/g, '\\"');
  const cmd      = `python3 -c "${safeCode}" 2>&1 || python -c "${safeCode}" 2>&1`;

  let result = {
    code,
    output: null,
    error:  null,
    _warning: 'RCE: User-supplied Python code executed via child_process.exec'
  };

  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err && !stdout) {
      result.error = err.message.includes('python') 
        ? 'Python not found on system PATH. Install Python 3 to use this feature.'
        : err.message;
    } else {
      result.output = stdout || stderr || '(no output)';
    }
    res.json(result);
  });
});
// ─── OS Command Injection (Ping) ────────────────────────────────────────────────
router.post('/exec/ping', (req, res) => {
  const { host } = req.body;

  if (!host) return res.status(400).json({ error: 'host is required' });

  // INTENTIONALLY VULNERABLE: Direct concatenation of user input to OS command
  const isWin = process.platform === 'win32';
  const cmd = isWin ? `ping -n 4 ${host}` : `ping -c 4 ${host}`;

  let result = {
    host,
    output: null,
    error:  null,
    _warning: 'RCE: User-supplied host is passed directly to the ping command'
  };

  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err && !stdout) {
      result.error = err.message;
    } else {
      result.output = stdout || stderr;
    }
    res.json(result);
  });
});

// ─── Admin endpoint (broken access control) ───────────────────────────────────
router.get('/api/admin', (req, res) => {
  // INTENTIONAL: no real server-side auth check — only JS guard on frontend
  const db = require('../database');
  const users    = db.prepare('SELECT * FROM users').all();
  const comments = db.prepare('SELECT * FROM comments').all();
  const products = db.prepare('SELECT * FROM products').all();

  res.json({
    _warning:        'Broken Access Control: No server-side authorization enforced',
    message:         'Welcome to the admin panel',
    server_version:  process.version,
    platform:        process.platform,
    cwd:             process.cwd(),
    env_keys:        Object.keys(process.env),
    users,
    comments,
    products,
    uptime:          process.uptime()
  });
});

module.exports = router;
