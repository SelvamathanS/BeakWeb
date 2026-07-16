# 🛡️ Security Playground

> ⚠️ **INTENTIONALLY VULNERABLE APPLICATION — FOR LOCAL EDUCATIONAL USE ONLY**
> 
> **DO NOT deploy this application to any public server, cloud, or production environment.**
> This application contains intentional security vulnerabilities for educational purposes.

A comprehensive web security playground built with Node.js, Express, SQLite, and EJS.
Practice 24+ real-world web vulnerabilities in a safe, local environment.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Docker](#docker)
- [Vulnerability Index](#vulnerability-index)
- [API Endpoint List](#api-endpoint-list)
- [Burp Suite Setup](#burp-suite-setup)
- [Browser DevTools Guide](#browser-devtools-guide)
- [Learning Path](#learning-path)
- [Demo Users](#demo-users)
- [Tech Stack](#tech-stack)

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16+ (v20 recommended)
- npm
- Python 3 (optional — for Python code injection demo)

### Installation

```bash
# Clone or extract the project
cd security-playground

# Install dependencies
npm install

# Start the application
npm start
```

Visit: **http://localhost:3000**

The SQLite database is created automatically on first start with demo data.

---

## 🐳 Docker

```bash
# Start with Docker Compose
docker compose up

# With PHP service (for PHP code injection demo)
docker compose --profile php up

# Stop
docker compose down
```

The app binds to `127.0.0.1:3000` locally, or `0.0.0.0:3000` in Docker.

---

## 🎯 Vulnerability Index

| # | Vulnerability | Risk | OWASP | Endpoint(s) |
|---|--------------|------|-------|-------------|
| 1 | Reflected XSS | HIGH | A03:2021 | `GET /search?q=` |
| 2 | Stored XSS | HIGH | A03:2021 | `POST /comment` + `GET /comments` |
| 3 | DOM XSS | HIGH | A03:2021 | `location.hash`, `?domxss=` |
| 4 | SQL Injection | CRITICAL | A03:2021 | `POST /login`, `GET /rest/products?q=` |
| 5 | Auth Bypass | CRITICAL | A07:2021 | `POST /login` (SQLi) |
| 6 | SSRF | HIGH | A10:2021 | `POST /fetch` |
| 7 | SSTI (EJS) | CRITICAL | A03:2021 | `POST /template` |
| 8 | Prototype Pollution | MEDIUM | A08:2021 | `POST /settings` |
| 9 | JS Code Injection | CRITICAL | A03:2021 | `POST /exec` |
| 10 | Python Code Injection | CRITICAL | A03:2021 | `POST /exec/python` |
| 11 | Session Hijacking | HIGH | A07:2021 | `GET/POST /session` |
| 12 | Cookie Theft | MEDIUM | A07:2021 | `document.cookie` |
| 13 | Clickjacking | MEDIUM | A05:2021 | All pages (no X-Frame-Options) |
| 14 | Cross-Frame Scripting | MEDIUM | A05:2021 | postMessage wildcard |
| 15 | No Rate Limiting | MEDIUM | A04:2021 | `POST /login` |
| 16 | Unrestricted File Upload | HIGH | A04:2021 | `POST /upload` |
| 17 | JWT Weaknesses | HIGH | A07:2021 | `POST /api/jwt` |
| 18 | Broken Access Control | CRITICAL | A01:2021 | `GET /api/admin` |
| 19 | IDOR | HIGH | A01:2021 | `GET /api/profile?id=` |
| 20 | CSRF | MEDIUM | A01:2021 | `POST /transfer` |
| 21 | Information Disclosure | MEDIUM | A05:2021 | `GET /api/info`, headers |
| 22 | Error Exposure | MEDIUM | A09:2021 | `GET /error?type=` |
| 23 | Insecure Storage | LOW | A02:2021 | localStorage, sessionStorage |
| 24 | API Discovery | LOW | A09:2021 | `GET /api` |

---

## 📡 API Endpoint List

```
GET    /                          Dashboard (UI)
GET    /api                       API endpoint list

# Authentication & SQL Injection
POST   /login                     Vulnerable login (SQLi)
POST   /api/login                 JSON API login (SQLi)
GET    /login/attempts            Attempt counter
POST   /login/reset               Reset counter
POST   /logout                    Logout

# User / IDOR
GET    /api/users                 List all users (no auth)
GET    /profile?id=N              Get profile by ID (IDOR)
GET    /api/profile?id=N          JSON profile (IDOR)
GET    /api/whoami                Current session info

# Product Search (SQLi)
GET    /search?q=                 Product search (SQLi + XSS)
GET    /rest/products?q=          REST products (SQLi)
GET    /rest/user/login?username= User search (SQLi UNION demo)

# XSS
POST   /comment                   Post comment (Stored XSS)
GET    /comments                  Get comments (XSS output)
GET    /api/comments              JSON comments
DELETE /comment/:id               Delete comment
POST   /comments/clear            Clear all comments

# SSRF
POST   /fetch                     SSRF fetch endpoint
POST   /api/fetch                 SSRF alias

# SSTI
POST   /template                  EJS template injection
GET    /template                  Template hints

# Prototype Pollution
POST   /settings                  Merge settings (proto pollution)
GET    /settings                  Current settings
GET    /api/settings              JSON settings
POST   /settings/reset            Reset pollution

# Code Execution
POST   /exec                      JS eval()
POST   /exec/python               Python exec
GET    /api/admin                 Admin data (no auth)

# File Upload
POST   /upload                    Unrestricted upload
GET    /api/upload                List uploads
DELETE /upload/:filename          Delete upload

# Session & JWT
GET    /session                   Session info
POST   /session                   Manipulate session
GET    /api/session               JSON session
POST   /api/jwt                   Issue JWT (weak secret)
POST   /api/jwt/verify            Verify JWT (trusts payload)
POST   /api/jwt/decode            Decode without verification

# CSRF & Access Control
POST   /transfer                  CSRF demo action
GET    /api/admin                 Broken access control
GET    /csrf-demo                 CSRF attack demo page

# Information Disclosure
GET    /api/info                  Server info dump
GET    /error?type=               Error exposure demo
```

---

## 🎯 Burp Suite Configuration

1. **Start Burp Suite** and navigate to **Proxy → Options**
2. Set proxy listener: `127.0.0.1:8080`
3. In your browser, configure HTTP proxy: `127.0.0.1:8080`
4. Visit `http://localhost:3000`
5. Burp will intercept all requests

### Useful Burp Features for this app:
- **Repeater**: Replay and modify requests to `/login`, `/fetch`, `/template`
- **Intruder**: Brute-force login (no rate limit!)
- **Scanner**: Active scan the app for vulnerabilities
- **Decoder**: Decode/encode JWT tokens
- **Comparer**: Compare responses for blind SQLi

### Import API into Burp:
```
GET http://localhost:3000/api
```
Use the response to populate a Burp target scope.

---

## 🔍 Browser DevTools Guide

### Network Tab
- Watch all XHR requests to `/login`, `/search`, `/fetch`
- Modify request headers manually
- Replay requests with different payloads

### Application Tab
- **Cookies**: See all session cookies (notice: no HttpOnly!)
- **Local Storage**: View JWT, username, API key
- **Session Storage**: Temp token, debug flags

### Console Tab
```javascript
// Read all cookies (no HttpOnly protection)
document.cookie

// Read localStorage JWT
localStorage.getItem('jwt')

// XSS via DOM
document.body.innerHTML = '<img src=x onerror=alert(1)>'

// Prototype pollution check
({}).__proto__.isAdmin

// Fetch admin endpoint directly
fetch('/api/admin').then(r=>r.json()).then(console.log)
```

---

## 🗺️ Learning Path

### Beginner
1. **Reflected XSS** — Use the search box with `<script>alert(1)</script>`
2. **Stored XSS** — Post a comment with an XSS payload
3. **SQL Injection** — Login with `admin' --`
4. **IDOR** — Change `?id=1` to `?id=2` in profile API

### Intermediate
5. **DOM XSS** — Inject payload via `#` hash in URL
6. **CSRF** — Open the CSRF demo page and observe the request
7. **JWT** — Generate a token with `role: admin`, verify it
8. **Session Hijacking** — Use DevTools to read and replace session cookie
9. **File Upload** — Upload an HTML file, visit its URL

### Advanced
10. **SSRF** — Probe internal services via `/fetch`
11. **SSTI** — Use `<%= require('fs').readdirSync('.') %>` to list files
12. **Prototype Pollution** — POST `{"__proto__":{"isAdmin":true}}`
13. **JS Code Injection** — Execute `require('os').hostname()`
14. **UNION SQLi** — Extract all users via product search endpoint

---

## 👥 Demo Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| bender | bender | user |
| alice | alice | user |
| bob | bob | user |
| eve | password123 | user |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js v20 |
| Framework | Express.js 4 |
| Database | SQLite (better-sqlite3) |
| Template | EJS |
| Sessions | express-session |
| JWT | jsonwebtoken |
| File Upload | multer |
| HTTP Client | node-fetch |
| Frontend | Vanilla JS + CSS |

---

## ⚖️ Legal & Ethics

This application is for **authorized security testing and education only**.

- ✅ Run on your own machine
- ✅ Use in CTF challenges and security labs
- ✅ Teach web security concepts
- ❌ Do NOT deploy publicly
- ❌ Do NOT attack systems you don't own
- ❌ Do NOT use these techniques without authorization

---

*Security Playground v1.0.0 — Educational Use Only*
