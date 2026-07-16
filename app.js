// app.js — Main Express application entry point
// ⚠️  INTENTIONALLY VULNERABLE — FOR EDUCATIONAL USE ON LOCALHOST ONLY ⚠️

const express        = require('express');
const session        = require('express-session');
const cookieParser   = require('cookie-parser');
const path           = require('path');
const fs             = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Ensure uploads directory exists ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// INTENTIONAL: Static assets + uploaded files served directly
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// INTENTIONAL: Weak session config — no secure flag, no HttpOnly on cookie
app.use(session({
  secret:            'supersecretweakkey123',  // Intentionally weak
  resave:            true,
  saveUninitialized: true,
  cookie: {
    httpOnly: false,   // INTENTIONAL: allows JS to read session cookie
    secure:   false,   // INTENTIONAL: no HTTPS requirement
    sameSite: false,   // INTENTIONAL: allows cross-site requests (CSRF)
    maxAge:   24 * 60 * 60 * 1000
  }
}));

// ─── Intentionally missing security headers ────────────────────────────────────
// No helmet(), no X-Frame-Options, no CSP, no X-Content-Type-Options
// This enables Clickjacking, XSS, MIME-sniffing attacks

// INTENTIONAL: Expose server info via headers
app.use((req, res, next) => {
  res.setHeader('X-Powered-By',           'Security-Playground/1.0 Node.js Express EJS SQLite');
  res.setHeader('X-App-Version',          '1.0.0');
  res.setHeader('Server',                 'SecurityPlayground/1.0 (Educational)');
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Custom-Header');
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/sql'));
app.use('/', require('./routes/xss'));
app.use('/', require('./routes/ssrf'));
app.use('/', require('./routes/ssti'));
app.use('/', require('./routes/prototype'));
app.use('/', require('./routes/code'));
app.use('/', require('./routes/upload'));
app.use('/', require('./routes/session'));
app.use('/', require('./routes/csrf'));

// ─── Main dashboard ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('index', {
    title:    'Security Playground',
    port:     PORT,
    username: req.session.username || null,
    role:     req.session.role     || null
  });
});

// ─── API Discovery endpoint list ─────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name:      'Security Playground API',
    version:   '1.0.0',
    endpoints: [
      { method: 'POST', path: '/login',           vuln: 'SQL Injection, Auth Bypass, No Rate Limit' },
      { method: 'POST', path: '/api/login',        vuln: 'SQL Injection JSON API' },
      { method: 'GET',  path: '/api/users',         vuln: 'IDOR — lists all users without auth' },
      { method: 'GET',  path: '/profile?id=',       vuln: 'IDOR — no ownership check' },
      { method: 'GET',  path: '/api/profile?id=',   vuln: 'IDOR JSON API' },
      { method: 'GET',  path: '/search?q=',         vuln: 'SQL Injection + Reflected XSS' },
      { method: 'GET',  path: '/rest/products?q=',  vuln: 'SQL Injection' },
      { method: 'GET',  path: '/rest/user/login',   vuln: 'SQL Injection — UNION demo' },
      { method: 'POST', path: '/comment',           vuln: 'Stored XSS' },
      { method: 'GET',  path: '/comments',          vuln: 'Stored XSS output' },
      { method: 'GET',  path: '/api/comments',      vuln: 'Stored XSS JSON' },
      { method: 'POST', path: '/fetch',             vuln: 'SSRF' },
      { method: 'POST', path: '/template',          vuln: 'SSTI (EJS)' },
      { method: 'POST', path: '/settings',          vuln: 'Prototype Pollution' },
      { method: 'GET',  path: '/api/settings',      vuln: 'Prototype Pollution output' },
      { method: 'POST', path: '/exec',              vuln: 'JavaScript RCE (eval)' },
      { method: 'POST', path: '/exec/python',       vuln: 'Python RCE (child_process)' },
      { method: 'POST', path: '/upload',            vuln: 'Unrestricted File Upload' },
      { method: 'GET',  path: '/api/upload',        vuln: 'Directory listing' },
      { method: 'GET',  path: '/session',           vuln: 'Session Hijacking' },
      { method: 'POST', path: '/session',           vuln: 'Session Manipulation' },
      { method: 'POST', path: '/api/jwt',           vuln: 'Weak JWT — no expiry, weak secret' },
      { method: 'POST', path: '/api/jwt/verify',    vuln: 'JWT blindly trusted' },
      { method: 'POST', path: '/api/jwt/decode',    vuln: 'JWT decoded without verification' },
      { method: 'POST', path: '/transfer',          vuln: 'CSRF' },
      { method: 'GET',  path: '/api/admin',         vuln: 'Broken Access Control' },
      { method: 'GET',  path: '/api/info',          vuln: 'Information Disclosure' },
      { method: 'GET',  path: '/error',             vuln: 'Error Handling / Stack Trace Exposure' },
      { method: 'GET',  path: '/csrf-demo',         vuln: 'CSRF Demo Page' },
    ]
  });
});

// ─── Global error handler (INTENTIONAL: exposes stack trace) ─────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error:      err.message,
    stack:      err.stack,           // INTENTIONAL: stack trace in response
    type:       err.constructor.name,
    _warning:   'Error Handling: Full stack trace exposed in response'
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:  'Route not found',
    path:   req.path,
    method: req.method,
    hint:   'Visit /api for a full list of endpoints'
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ⚠️  SECURITY PLAYGROUND — INTENTIONALLY VULNERABLE APP  ⚠️   ║
║  FOR LOCAL EDUCATIONAL USE ONLY — DO NOT EXPOSE TO INTERNET   ║
╚════════════════════════════════════════════════════════════════╝

  🌐  Dashboard:  http://localhost:${PORT}
  📡  API Index:  http://localhost:${PORT}/api
  📂  Uploads:    http://localhost:${PORT}/uploads

  ⚠️  This application contains intentional security vulnerabilities.
  ⚠️  Run only on localhost. Never deploy to a public server.
`);
});

module.exports = app;
