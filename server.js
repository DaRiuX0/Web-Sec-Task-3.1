const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'steamcoupons_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const authMiddleware = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

const adminMiddleware = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/dashboard');
  next();
};

// HOME
app.get('/', (req, res) => {
  const coupons = db.all("SELECT * FROM coupons WHERE is_active = 1 ORDER BY discount DESC LIMIT 6");
  res.render('home', { user: req.session.user || null, coupons });
});

// LOGIN GET
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

// ⚠️ VULNERABLE LOGIN — SQL Injection intentionally present for educational purposes
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 🔓 INTENTIONALLY VULNERABLE: raw string concat — never do this in production
  const query = `SELECT * FROM users WHERE username = '${username}'`;

  let user;
  try {
    user = db.get(query);
  } catch (e) {
    return res.render('login', { error: 'Database error: ' + e.message });
  }

  if (!user) {
    return res.render('login', { error: 'Invalid username or password.' });
  }

  const validPass = bcrypt.compareSync(password, user.password);
  const isInjection = username.includes("'") || username.includes('--') ||
                      username.toLowerCase().includes(' or ');

  if (!validPass && !isInjection) {
    return res.render('login', { error: 'Invalid username or password.' });
  }

  req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
  res.redirect('/dashboard');
});

// REGISTER
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register', { error: null, success: null });
});

app.post('/register', (req, res) => {
  const { username, email, password, confirm } = req.body;
  if (!username || !email || !password)
    return res.render('register', { error: 'All fields required.', success: null });
  if (password !== confirm)
    return res.render('register', { error: 'Passwords do not match.', success: null });
  if (password.length < 6)
    return res.render('register', { error: 'Password must be at least 6 characters.', success: null });

  const existing = db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
  if (existing)
    return res.render('register', { error: 'Username or email already taken.', success: null });

  const hashed = bcrypt.hashSync(password, 10);
  db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashed]);
  res.render('register', { error: null, success: 'Account created! You can now login.' });
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// DASHBOARD
app.get('/dashboard', authMiddleware, (req, res) => {
  const coupons = db.all("SELECT * FROM coupons WHERE is_active = 1 ORDER BY discount DESC");
  const claimedRows = db.all("SELECT coupon_id FROM user_coupons WHERE user_id = ?", [req.session.user.id]);
  const claimed = claimedRows.map(r => r.coupon_id);
  res.render('dashboard', { user: req.session.user, coupons, claimed });
});

app.post('/claim/:id', authMiddleware, (req, res) => {
  const couponId = parseInt(req.params.id);
  const userId = req.session.user.id;
  const already = db.get("SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?", [userId, couponId]);
  if (!already) {
    db.run("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)", [userId, couponId]);
    db.run("UPDATE coupons SET used_by = used_by + 1 WHERE id = ?", [couponId]);
  }
  res.redirect('/dashboard');
});

// ADMIN
app.get('/admin', adminMiddleware, (req, res) => {
  const coupons = db.all("SELECT * FROM coupons ORDER BY created_at DESC");
  const users = db.all("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC");
  const stats = {
    totalUsers:    db.get("SELECT COUNT(*) as c FROM users").c,
    totalCoupons:  db.get("SELECT COUNT(*) as c FROM coupons").c,
    totalClaims:   db.get("SELECT COUNT(*) as c FROM user_coupons").c,
    activeCoupons: db.get("SELECT COUNT(*) as c FROM coupons WHERE is_active = 1").c,
  };
  res.render('admin', { user: req.session.user, coupons, users, stats });
});

app.post('/admin/coupon/add', adminMiddleware, (req, res) => {
  const { code, discount, game, description, expires_at } = req.body;
  try {
    db.run("INSERT INTO coupons (code, discount, game, description, expires_at) VALUES (?,?,?,?,?)",
      [code, parseInt(discount), game, description, expires_at]);
  } catch(e) {}
  res.redirect('/admin');
});

app.post('/admin/coupon/toggle/:id', adminMiddleware, (req, res) => {
  const coupon = db.get("SELECT is_active FROM coupons WHERE id = ?", [req.params.id]);
  if (coupon) db.run("UPDATE coupons SET is_active = ? WHERE id = ?", [coupon.is_active ? 0 : 1, req.params.id]);
  res.redirect('/admin');
});

app.post('/admin/coupon/delete/:id', adminMiddleware, (req, res) => {
  db.run("DELETE FROM coupons WHERE id = ?", [req.params.id]);
  res.redirect('/admin');
});

app.listen(PORT, () => console.log(`🎮 SteamCoupons running on http://localhost:${PORT}`));
