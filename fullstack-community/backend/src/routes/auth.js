const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatarColor: user.avatar_color,
    role: user.role,
    banned: user.banned,
    createdAt: user.created_at,
  };
}

router.post('/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱、密码不能为空' });
  }
  if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 20) {
    return res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: '密码至少需要 6 位' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username.trim(), email.trim());
  if (exists) {
    return res.status(409).json({ error: '用户名或邮箱已被注册' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const role = totalUsers === 0 ? 'admin' : 'user';
  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash, avatar_color, role) VALUES (?, ?, ?, ?, ?)'
  ).run(username.trim(), email.trim(), hash, color, role);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { account, password } = req.body || {};
  if (!account || !password) {
    return res.status(400).json({ error: '请输入账号和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(account, account);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  if (user.banned) {
    return res.status(403).json({ error: '该账号已被封禁' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
