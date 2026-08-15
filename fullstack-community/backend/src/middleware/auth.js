const jwt = require('jsonwebtoken');
const db = require('../db');
const { getJwtSecret } = require('../config');

function parseToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function authRequired(req, res, next) {
  const token = parseToken(req);
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function optionalAuth(req, res, next) {
  const token = parseToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, getJwtSecret());
      req.user = { id: payload.id, username: payload.username };
    } catch (e) {
      /* 忽略无效 token */
    }
  }
  next();
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    const user = db.prepare('SELECT role, banned FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.banned) return res.status(403).json({ error: '账号已被封禁' });
    if (user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
    next();
  });
}

function assertActive(userId) {
  const user = db.prepare('SELECT banned FROM users WHERE id = ?').get(userId);
  return !user || !user.banned;
}

module.exports = { authRequired, optionalAuth, adminRequired, assertActive };
