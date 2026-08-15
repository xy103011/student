const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function notificationToJson(n) {
  const actor = n.actor_id
    ? db.prepare('SELECT id, username, avatar_color FROM users WHERE id = ?').get(n.actor_id)
    : null;
  return {
    id: n.id,
    type: n.type,
    content: n.content,
    postId: n.post_id,
    commentId: n.comment_id,
    isRead: !!n.is_read,
    createdAt: n.created_at,
    actor: actor ? { id: actor.id, username: actor.username, avatarColor: actor.avatar_color } : null,
  };
}

router.get('/', authRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const total = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?').get(req.user.id).c;
  const rows = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'
  ).all(req.user.id, pageSize, (page - 1) * pageSize);
  res.json({
    notifications: rows.map(notificationToJson),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
});

router.get('/unread-count', authRequired, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id);
  res.json({ count: row.c });
});

router.put('/:id/read', authRequired, (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
    .get(parseInt(req.params.id, 10), req.user.id);
  if (!n) return res.status(404).json({ error: '通知不存在' });
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(n.id);
  res.json({ ok: true });
});

router.put('/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
