const express = require('express');
const db = require('../db');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

router.use(adminRequired);

router.get('/stats', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments').get().c;
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes').get().c;
  const messageCount = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  const bannedCount = db.prepare('SELECT COUNT(*) AS c FROM users WHERE banned = 1').get().c;
  const todayUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE date(created_at) = date('now')").get().c;
  const todayPosts = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE date(created_at) = date('now')").get().c;
  res.json({ userCount, postCount, commentCount, likeCount, messageCount, bannedCount, todayUsers, todayPosts });
});

router.get('/users', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = (req.query.search || '').trim();

  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE username LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params).c;
  const rows = db.prepare(
    `SELECT * FROM users ${where} ORDER BY id ASC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);

  const users = rows.map((u) => {
    const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(u.id).c;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      bio: u.bio,
      avatarColor: u.avatar_color,
      role: u.role,
      banned: u.banned,
      createdAt: u.created_at,
      postCount,
    };
  });
  res.json({ users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
});

router.put('/users/:id/ban', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: '不能封禁自己' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  db.prepare('UPDATE users SET banned = 1 WHERE id = ?').run(id);
  res.json({ ok: true, banned: true });
});

router.put('/users/:id/unban', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  db.prepare('UPDATE users SET banned = 0 WHERE id = ?').run(id);
  res.json({ ok: true, banned: false });
});

router.put('/users/:id/role', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const role = req.body && req.body.role;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: '角色只能是 admin 或 user' });
  }
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: '不能取消自己的管理员权限' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  res.json({ ok: true, role });
});

router.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: '不能删除自己' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.delete('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.delete('/comments/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  if (!comment) return res.status(404).json({ error: '评论不存在' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.get('/posts', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = (req.query.search || '').trim();
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE title LIKE ? OR content LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM posts ${where}`).get(...params).c;
  const rows = db.prepare(
    `SELECT p.*, u.username, u.avatar_color FROM posts p
     JOIN users u ON u.id = p.user_id ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);
  res.json({
    posts: rows.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.created_at,
      author: { id: p.user_id, username: p.username, avatarColor: p.avatar_color },
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
});

module.exports = router;
