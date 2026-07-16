// routes/redirect.js — Open Redirect
const express = require('express');
const router  = express.Router();

// ─── Open Redirect ──────────────────────────────────────────────────────────
router.get('/redirect', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  // INTENTIONALLY VULNERABLE: Unvalidated redirect
  // The application redirects to any user-supplied URL without checking the domain.
  res.redirect(url);
});

module.exports = router;
