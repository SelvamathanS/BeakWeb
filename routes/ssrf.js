// routes/ssrf.js — Server-Side Request Forgery
const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');

// ─── SSRF: Fetch arbitrary URL server-side ────────────────────────────────────
router.post('/fetch', async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required' });

  // INTENTIONALLY VULNERABLE: no URL validation, no blocklist
  let result = {
    url,
    status:  null,
    headers: {},
    body:    null,
    error:   null,
    _warning: 'SSRF: Server fetches any URL without validation'
  };

  try {
    const response = await fetch(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'SecurityPlayground/1.0 SSRF-Demo' }
    });

    result.status  = response.status;
    result.headers = Object.fromEntries(response.headers.entries());
    const text     = await response.text();
    result.body    = text.substring(0, 4000); // cap at 4KB for display
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

// ─── API alias ────────────────────────────────────────────────────────────────
router.post('/api/fetch', async (req, res) => {
  req.url = '/fetch';
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let result = { url, status: null, body: null, error: null };

  try {
    const response = await fetch(url, { timeout: 5000 });
    result.status  = response.status;
    result.body    = (await response.text()).substring(0, 2000);
  } catch (err) {
    result.error = err.message;
  }

  res.json(result);
});

module.exports = router;
