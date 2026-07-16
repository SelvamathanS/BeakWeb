// database.js — SQLite initialization and seed data
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ─── Create Tables ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    bio TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Seed Users ───────────────────────────────────────────────────────────────

const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (existingUsers.cnt === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, email, role, bio) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('admin',  'admin123',     'admin@playground.local',  'admin',  'Site administrator. Has access to all features.');
  insertUser.run('bender', 'bender',       'bender@playground.local', 'user',   'I am Bender. Please insert girder.');
  insertUser.run('alice',  'alice',        'alice@playground.local',  'user',   'Just a regular user exploring the platform.');
  insertUser.run('bob',    'bob',          'bob@playground.local',    'user',   'Bob is a developer interested in security.');
  insertUser.run('eve',    'password123',  'eve@playground.local',    'user',   'Security researcher and penetration tester.');
}

// ─── Seed Comments ────────────────────────────────────────────────────────────

const existingComments = db.prepare('SELECT COUNT(*) as cnt FROM comments').get();
if (existingComments.cnt === 0) {
  const insertComment = db.prepare('INSERT INTO comments (author, content) VALUES (?, ?)');
  insertComment.run('admin',  'Welcome to the Security Playground! This is an intentionally vulnerable application for learning purposes.');
  insertComment.run('alice',  'Great platform for learning about web security vulnerabilities!');
  insertComment.run('bender', 'I am 40% comments by volume.');
  insertComment.run('bob',    'Remember: never run this on a public server!');
}

// ─── Seed Products ────────────────────────────────────────────────────────────

const existingProducts = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (existingProducts.cnt === 0) {
  const insertProduct = db.prepare('INSERT INTO products (name, description, price, category) VALUES (?, ?, ?, ?)');
  insertProduct.run('Apple Juice',        '1 Liter of fresh squeezed apple juice',    1.99,  'Beverages');
  insertProduct.run('Banana Juice',       '1 Liter of delicious banana juice',        1.99,  'Beverages');
  insertProduct.run('Eggfruit Juice',     '0.5 Liter of creamy eggfruit juice',       8.99,  'Beverages');
  insertProduct.run('Raspberry Juice',    '0.75 Liter of fresh raspberry juice',      2.99,  'Beverages');
  insertProduct.run('Strawberry Juice',   '0.5 Liter of sweet strawberry juice',      3.99,  'Beverages');
  insertProduct.run('Lemon Juice',        '0.33 Liter of sour lemon juice',           0.99,  'Beverages');
  insertProduct.run('Coconut Juice',      '0.35 Liter of fresh coconut juice',        1.99,  'Beverages');
  insertProduct.run('Carrot Juice',       '1 Liter of healthy carrot juice',          2.99,  'Beverages');
  insertProduct.run('OWASP Juice',        'Secret admin-only product',               99.99,  'Secret');
}

module.exports = db;
