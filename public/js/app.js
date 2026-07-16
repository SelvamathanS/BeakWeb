/* =====================================================================
   Security Playground — app.js (Frontend)
   All vulnerability demos, API calls, DOM XSS, LocalStorage, etc.
   ===================================================================== */

'use strict';

// ─── Utilities ────────────────────────────────────────────────────────────────

function toast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function syntaxHighlight(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, match => {
    let cls = 'number';
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? 'key' : 'string';
    } else if (/true|false/.test(match)) {
      cls = 'bool';
    } else if (/null/.test(match)) {
      cls = 'null_v';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function showResponse(viewerId, status, data) {
  const viewer = document.getElementById(viewerId);
  if (!viewer) return;
  viewer.classList.add('visible');

  const statusEl = viewer.querySelector('.response-status-text');
  const bodyEl   = viewer.querySelector('.response-body');

  if (statusEl) {
    statusEl.className = `response-status-text status-${Math.floor(status / 100) * 100}`;
    statusEl.textContent = `HTTP ${status}`;
  }

  if (bodyEl) {
    try {
      bodyEl.innerHTML = syntaxHighlight(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch {
      bodyEl.textContent = String(data);
    }
  }
}

async function apiCall(method, url, body, viewerId) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(url, opts);
    const data = await res.json().catch(() => res.text());
    if (viewerId) showResponse(viewerId, res.status, data);
    return { status: res.status, data };
  } catch (err) {
    if (viewerId) showResponse(viewerId, 0, { error: err.message });
    return { status: 0, data: { error: err.message } };
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard!', 'success', 1500));
}

function setInputValue(inputId, value) {
  const el = document.getElementById(inputId);
  if (el) { el.value = value; toast('Payload loaded!', 'info', 1200); }
}

// ─── Expand panels ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.expand-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.toggle('open');
    });
  });

  // Payload click-to-fill
  document.querySelectorAll('.payload-code[data-target]').forEach(code => {
    code.addEventListener('click', () => {
      setInputValue(code.dataset.target, code.textContent);
    });
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.previousElementSibling?.textContent || btn.dataset.copy || '';
      copyToClipboard(text);
    });
  });

  // Sidebar navigation active state
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = document.getElementById(item.dataset.section);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Init all features
  initDomXSS();
  initCookieDisplay();
  initLocalStorage();
  initSessionStorage();
  loadComments();
  loadFiles();
  refreshAttempts();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REFLECTED XSS
// ═══════════════════════════════════════════════════════════════════════════════

window.doReflectedSearch = async function () {
  const q = document.getElementById('rxss-input').value;

  // Store last search in sessionStorage (intentional)
  sessionStorage.setItem('lastSearch', q);

  const { data } = await apiCall('GET', `/search?q=${encodeURIComponent(q)}`, null, 'rxss-response');

  const container = document.getElementById('rxss-results');
  if (!container) return;

  if (data.error) {
    container.innerHTML = `<div class="result-row"><span style="color:var(--critical)">${data.error}</span></div>`;
  } else if (data.results && data.results.length) {
    const rows = data.results.map(p =>
      `<div class="result-row">
        <span>${p.id}</span>
        <span class="result-name">${p.name}</span>
        <span class="result-price">$${p.price}</span>
        <span style="color:var(--text-muted)">${p.category}</span>
      </div>`
    ).join('');
    container.innerHTML = `
      <div class="result-row header"><span>#</span><span>Name</span><span>Price</span><span>Category</span></div>
      ${rows}
    `;
  } else {
    container.innerHTML = `<div class="result-row"><span style="color:var(--text-muted)">No results found</span></div>`;
  }

  document.getElementById('rxss-results-wrap').style.display = 'block';
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STORED XSS
// ═══════════════════════════════════════════════════════════════════════════════

window.postComment = async function () {
  const author  = document.getElementById('comment-author').value || 'Anonymous';
  const content = document.getElementById('comment-content').value;
  if (!content) return toast('Comment content is required', 'error');

  const { data } = await apiCall('POST', '/comment', { author, content }, 'sxss-response');

  if (data.success) {
    toast('Comment posted!', 'success');
    document.getElementById('comment-content').value = '';
    loadComments();
  }
};

async function loadComments() {
  const { data } = await apiCall('GET', '/comments');
  const feed = document.getElementById('comments-feed');
  if (!feed || !data.comments) return;

  feed.innerHTML = data.comments.map(c => `
    <div class="comment-item">
      <div class="comment-author">${c.author} <span style="color:var(--text-muted);font-weight:400">${c.created_at || ''}</span></div>
      <!-- INTENTIONAL: innerHTML used — renders stored XSS payloads -->
      <div class="comment-content" id="comment-${c.id}"></div>
    </div>
  `).join('');

  // INTENTIONALLY VULNERABLE: raw HTML from server injected into DOM
  data.comments.forEach(c => {
    const el = document.getElementById(`comment-${c.id}`);
    if (el) el.innerHTML = c.content; // XSS vulnerability
  });
}

window.clearComments = async function () {
  await apiCall('POST', '/comments/clear', {}, 'sxss-response');
  loadComments();
  toast('Comments cleared', 'info');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DOM XSS
// ═══════════════════════════════════════════════════════════════════════════════

function initDomXSS() {
  // INTENTIONALLY VULNERABLE: reads from location.hash and sets innerHTML
  function renderFromHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const el   = document.getElementById('dom-xss-output');
    if (el && hash) {
      el.innerHTML = hash; // DOM XSS
      document.getElementById('dom-xss-input').value = hash;
    }
  }

  window.addEventListener('hashchange', renderFromHash);
  renderFromHash();

  // Also read from ?domxss= query param
  const urlParam = new URLSearchParams(window.location.search).get('domxss');
  if (urlParam) {
    const el = document.getElementById('dom-xss-output');
    if (el) el.innerHTML = urlParam; // DOM XSS via query param
  }
}

window.triggerDomXSS = function () {
  const val = document.getElementById('dom-xss-input').value;
  const el  = document.getElementById('dom-xss-output');
  if (el) {
    el.innerHTML = val; // INTENTIONAL DOM XSS
    window.location.hash = encodeURIComponent(val);
  }
  showResponse('domxss-response', 200, {
    method:   'DOM Manipulation',
    source:   'User input (textarea)',
    sink:     'element.innerHTML = value',
    payload:  val,
    _warning: 'DOM XSS: No sanitization before innerHTML assignment'
  });
  document.getElementById('domxss-response').classList.add('visible');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4 & 5. SQL INJECTION + AUTH BYPASS
// ═══════════════════════════════════════════════════════════════════════════════

window.doLogin = async function () {
  const username = document.getElementById('sql-username').value;
  const password = document.getElementById('sql-password').value;
  const counter  = document.getElementById('attempt-counter');

  const { data } = await apiCall('POST', '/login', { username, password }, 'sql-response');

  if (counter) {
    counter.textContent = data.attempts || 0;
  }

  if (data.success) {
    toast(`✅ Logged in as ${data.user.username} (${data.user.role})`, 'success', 4000);
    if (data.user.role === 'admin') {
      toast('🔓 Admin access granted via SQL Injection!', 'error', 5000);
    }
    // Store in localStorage (intentional insecurity)
    localStorage.setItem('username', data.user.username);
    localStorage.setItem('role',     data.user.role);
    refreshLocalStorage();
  } else if (data.error) {
    toast(`SQL Error: ${data.error}`, 'error', 5000);
  } else {
    toast('Login failed', 'error');
  }
};

window.resetAttempts = async function () {
  await apiCall('POST', '/login/reset', {}, 'sql-response');
  document.getElementById('attempt-counter').textContent = '0';
  toast('Attempt counter reset', 'info');
};

async function refreshAttempts() {
  const { data } = await apiCall('GET', '/login/attempts');
  const counter = document.getElementById('attempt-counter');
  if (counter && data.attempts !== undefined) counter.textContent = data.attempts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SSRF
// ═══════════════════════════════════════════════════════════════════════════════

window.doSSRF = async function () {
  const url = document.getElementById('ssrf-url').value;
  if (!url) return toast('Enter a URL', 'error');
  toast('Fetching URL server-side...', 'info', 2000);
  await apiCall('POST', '/fetch', { url }, 'ssrf-response');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SSTI
// ═══════════════════════════════════════════════════════════════════════════════

window.doSSTI = async function () {
  const template = document.getElementById('ssti-template').value;
  const name     = document.getElementById('ssti-name').value || 'World';
  if (!template) return toast('Enter a template', 'error');
  await apiCall('POST', '/template', { template, name }, 'ssti-response');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PROTOTYPE POLLUTION
// ═══════════════════════════════════════════════════════════════════════════════

window.doProtoPollute = async function () {
  const raw = document.getElementById('proto-input').value;
  if (!raw) return toast('Enter JSON payload', 'error');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return toast('Invalid JSON', 'error');
  }

  const { data } = await apiCall('POST', '/settings', parsed, 'proto-response');

  if (data.polluted) {
    const polluted = data.polluted;
    if (polluted['Object.prototype.isAdmin'] || polluted['Object.prototype.role']) {
      toast('🎯 Prototype polluted! Object.prototype modified!', 'error', 5000);
    }
  }
};

window.resetProto = async function () {
  await apiCall('POST', '/settings/reset', {}, 'proto-response');
  toast('Prototype pollution cleaned up', 'success');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. JS CODE INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

window.execJS = async function () {
  const code = document.getElementById('js-code').value;
  if (!code) return toast('Enter JavaScript code', 'error');
  await apiCall('POST', '/exec', { code }, 'jsexec-response');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PYTHON CODE INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

window.execPython = async function () {
  const code = document.getElementById('python-code').value;
  if (!code) return toast('Enter Python code', 'error');
  await apiCall('POST', '/exec/python', { code }, 'pyexec-response');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SESSION HIJACKING
// ═══════════════════════════════════════════════════════════════════════════════

window.loadSession = async function () {
  const { data } = await apiCall('GET', '/session', null, 'session-response');
  if (data.sessionId) {
    document.getElementById('session-id-display').textContent = data.sessionId;
    toast('Session info loaded', 'info');
  }
};

window.replaceSession = async function () {
  const username = document.getElementById('hijack-username').value;
  const role     = document.getElementById('hijack-role').value;
  const userId   = document.getElementById('hijack-userid').value;

  const { data } = await apiCall('POST', '/session', { username, role, userId }, 'session-response');

  if (data.success) {
    toast(`Session replaced! Now impersonating: ${username} (${role})`, 'error', 4000);
    localStorage.setItem('username', username);
    refreshLocalStorage();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 13. COOKIES
// ═══════════════════════════════════════════════════════════════════════════════

function initCookieDisplay() {
  // Set some intentionally insecure cookies (no HttpOnly, no Secure)
  document.cookie = 'session_theme=dark; path=/';
  document.cookie = 'user_pref=remember_me=true; path=/';
  document.cookie = 'tracking_id=abc123xyz; path=/';

  refreshCookieDisplay();
}

function refreshCookieDisplay() {
  const el = document.getElementById('cookie-display');
  if (el) {
    el.textContent = document.cookie || '(no cookies accessible)';
  }
}

window.stealCookies = function () {
  // Cookie theft demo — accessible because no HttpOnly flag
  const cookies = document.cookie;
  document.getElementById('stolen-cookies').textContent = cookies;
  toast('🍪 Cookies read via document.cookie!', 'error', 3000);
  showResponse('cookie-response', 200, {
    method:   'document.cookie',
    cookies,
    _warning: 'Cookie Theft: No HttpOnly flag allows JS access to cookies'
  });
  document.getElementById('cookie-response').classList.add('visible');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 14 & 15. CLICKJACKING / XFS
// ═══════════════════════════════════════════════════════════════════════════════

window.loadIframe = function () {
  const url    = document.getElementById('iframe-url').value || window.location.href;
  const iframe = document.getElementById('clickjacking-iframe');
  if (iframe) {
    iframe.src = url;
    toast('iframe loaded — no X-Frame-Options set!', 'error', 3000);
  }
};

window.postMessageToFrame = function () {
  const msg    = document.getElementById('xfs-message').value || 'Hello from parent!';
  const iframe = document.getElementById('xfs-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(msg, '*'); // INTENTIONAL: wildcard origin
    document.getElementById('xfs-sent').textContent = msg;
    toast('Message sent to iframe (wildcard origin *)', 'error', 3000);
  }
};

window.addEventListener('message', (event) => {
  // INTENTIONAL: no origin check
  const el = document.getElementById('xfs-received');
  if (el) el.textContent = `From: ${event.origin} | Data: ${event.data}`;
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. FILE UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════

window.uploadFile = async function () {
  const fileInput = document.getElementById('file-input');
  if (!fileInput.files[0]) return toast('Select a file', 'error');

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res  = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    showResponse('upload-response', res.status, data);
    document.getElementById('upload-response').classList.add('visible');
    if (data.success) {
      toast(`✅ Uploaded: ${data.filename}`, 'success');
      loadFiles();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
};

async function loadFiles() {
  const { data } = await apiCall('GET', '/api/upload');
  const list = document.getElementById('file-list');
  if (!list || !data.files) return;

  if (data.files.length === 0) {
    list.innerHTML = '<div class="file-item" style="color:var(--text-muted)">No files uploaded yet</div>';
    return;
  }

  list.innerHTML = data.files.map(f => `
    <div class="file-item">
      <span class="file-icon">📄</span>
      <a class="file-name" href="${f.url}" target="_blank">${f.name}</a>
      <span class="file-size">${(f.size / 1024).toFixed(1)} KB</span>
      <button class="btn btn-ghost btn-sm" onclick="deleteFile('${f.name}')">🗑</button>
    </div>
  `).join('');
}

window.deleteFile = async function (name) {
  await apiCall('DELETE', `/upload/${name}`);
  loadFiles();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 18. JWT
// ═══════════════════════════════════════════════════════════════════════════════

window.generateJWT = async function () {
  const username = document.getElementById('jwt-username').value || 'user';
  const role     = document.getElementById('jwt-role').value || 'user';

  const { data } = await apiCall('POST', '/api/jwt', { username, role }, 'jwt-response');

  if (data.token) {
    // INTENTIONAL: Store JWT in localStorage (not secure storage)
    localStorage.setItem('jwt', data.token);
    localStorage.setItem('username', username);
    refreshLocalStorage();
    displayJWT(data.token);
    toast(`JWT generated and stored in localStorage!`, 'error', 4000);
  }
};

window.verifyJWT = async function () {
  const token = document.getElementById('jwt-token').value || localStorage.getItem('jwt');
  if (!token) return toast('No JWT token — generate one first', 'error');
  document.getElementById('jwt-token').value = token;
  await apiCall('POST', '/api/jwt/verify', { token }, 'jwt-response');
};

window.decodeJWT = async function () {
  const token = document.getElementById('jwt-token').value || localStorage.getItem('jwt');
  if (!token) return toast('No JWT token', 'error');
  await apiCall('POST', '/api/jwt/decode', { token }, 'jwt-response');
};

function displayJWT(token) {
  const parts = token.split('.');
  const el    = document.getElementById('jwt-display');
  if (el && parts.length === 3) {
    el.innerHTML = `<span class="jwt-header">${parts[0]}</span>.<span class="jwt-payload">${parts[1]}</span>.<span class="jwt-sig">${parts[2]}</span>`;
    document.getElementById('jwt-token').value = token;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 19. BROKEN ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

window.accessAdmin = async function () {
  // INTENTIONAL: Client-side "check" only — bypassed by calling API directly
  const storedRole = localStorage.getItem('role');
  if (storedRole !== 'admin') {
    toast('🔒 Client-side says: not admin... but trying API anyway!', 'error', 3000);
  }
  // Call the endpoint directly — no real server-side auth
  await apiCall('GET', '/api/admin', null, 'bac-response');
  toast('🔓 Admin data retrieved! Client-side JS check bypassed.', 'error', 4000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 20. IDOR
// ═══════════════════════════════════════════════════════════════════════════════

window.fetchProfile = async function () {
  const id = document.getElementById('idor-id').value || '1';
  await apiCall('GET', `/api/profile?id=${id}`, null, 'idor-response');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 21. CSRF
// ═══════════════════════════════════════════════════════════════════════════════

window.doCSRF = async function () {
  const amount = document.getElementById('csrf-amount').value || '1000';
  const to     = document.getElementById('csrf-to').value     || 'attacker';

  await apiCall('POST', '/transfer', { amount, to, from: 'victim' }, 'csrf-response');
  toast(`💸 Transfer of $${amount} to ${to} — no CSRF protection!`, 'error', 4000);
};

window.openCSRFDemo = function () {
  window.open('/csrf-demo', '_blank');
};

// ═══════════════════════════════════════════════════════════════════════════════
// 22. INFORMATION DISCLOSURE
// ═══════════════════════════════════════════════════════════════════════════════

window.fetchInfo = async function () {
  await apiCall('GET', '/api/info', null, 'info-response');
};

window.triggerError = async function () {
  const type = document.getElementById('error-type').value || 'reference';
  const { data } = await apiCall('GET', `/error?type=${type}`, null, 'error-response');
  if (data.stack) toast('Stack trace exposed in response!', 'error', 4000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

function initLocalStorage() {
  // Store intentionally insecure data
  if (!localStorage.getItem('theme'))    localStorage.setItem('theme',    'dark');
  if (!localStorage.getItem('username')) localStorage.setItem('username', 'guest');
  if (!localStorage.getItem('apiKey'))   localStorage.setItem('apiKey',   'sk-playground-insecure-key-demo-123');
  refreshLocalStorage();
}

function refreshLocalStorage() {
  const grid = document.getElementById('localstorage-grid');
  if (!grid) return;

  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items.push({ key, value: localStorage.getItem(key) });
  }

  grid.innerHTML = items.map(item => `
    <div class="storage-item">
      <div class="storage-key">${item.key}</div>
      <div class="storage-value">${item.value?.substring(0, 80)}${item.value?.length > 80 ? '...' : ''}</div>
    </div>
  `).join('');
}

// ─── SESSION STORAGE ─────────────────────────────────────────────────────────

function initSessionStorage() {
  sessionStorage.setItem('tempToken',    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.dGVtcC1ub3Qtc2VjdXJl.');
  sessionStorage.setItem('lastPage',     'dashboard');
  sessionStorage.setItem('debugMode',    'true');
  refreshSessionStorage();
}

function refreshSessionStorage() {
  const grid = document.getElementById('sessionstorage-grid');
  if (!grid) return;

  const items = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    items.push({ key, value: sessionStorage.getItem(key) });
  }

  grid.innerHTML = items.map(item => `
    <div class="storage-item">
      <div class="storage-key">${item.key}</div>
      <div class="storage-value">${item.value?.substring(0, 80)}${item.value?.length > 80 ? '...' : ''}</div>
    </div>
  `).join('');
}

window.refreshStorage = function () {
  refreshLocalStorage();
  refreshSessionStorage();
  refreshCookieDisplay();
  toast('Storage displays refreshed', 'info', 1500);
};

// ─── API DISCOVERY ────────────────────────────────────────────────────────────

window.fetchApiList = async function () {
  await apiCall('GET', '/api', null, 'apidisc-response');
};

// ─── PRODUCT SEARCH (SQLi) ────────────────────────────────────────────────────

window.searchProducts = async function () {
  const q = document.getElementById('product-search').value;
  await apiCall('GET', `/rest/products?q=${encodeURIComponent(q)}`, null, 'product-response');
};

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === '`') {
    window.fetchApiList();
    document.getElementById('apidisc-section')?.scrollIntoView({ behavior: 'smooth' });
  }
});
