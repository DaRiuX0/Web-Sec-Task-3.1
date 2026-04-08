const { Database } = require('node-sqlite3-wasm');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'coupons.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount INTEGER NOT NULL,
    game TEXT NOT NULL,
    description TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    used_by INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    coupon_id INTEGER,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed admin and users
const adminPass = bcrypt.hashSync('admin123', 10);
const userPass = bcrypt.hashSync('user123', 10);

const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
insertUser.run(['admin', 'admin@steamcoupons.io', adminPass, 'admin']);
insertUser.run(['john_doe', 'john@example.com', userPass, 'user']);
insertUser.run(['jane_smith', 'jane@example.com', userPass, 'user']);
insertUser.finalize();

// Seed coupons
const insertCoupon = db.prepare("INSERT OR IGNORE INTO coupons (code, discount, game, description, expires_at) VALUES (?,?,?,?,?)");
const coupons = [
  ['STEAM-XMAS-2025', 75, 'Cyberpunk 2077', 'Holiday mega discount!', '2025-12-31'],
  ['VALVE-SUMMER-50', 50, 'Half-Life: Alyx', 'Summer sale special', '2025-08-15'],
  ['INDIE-BUNDLE-30', 30, 'Hollow Knight', 'Indie bundle deal', '2025-09-01'],
  ['NEW-RELEASE-20', 20, 'Baldurs Gate 3', 'New release discount', '2025-07-01'],
  ['WEEKEND-DEAL-40', 40, 'The Witcher 3', 'Weekend flash sale', '2025-06-30'],
  ['VIP-EXCLUSIVE-60', 60, 'Red Dead Redemption 2', 'VIP member exclusive', '2025-10-01'],
];
for (const c of coupons) insertCoupon.run(c);
insertCoupon.finalize();

console.log('✅ Database initialized');
module.exports = db;
