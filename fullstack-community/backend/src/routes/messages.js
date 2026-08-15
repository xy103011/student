const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function privateRoom(a, b) {
  return `private:${Math.min(a, b)}:${Math.max(a, b)}`;
}

function messageToJson(m) {
  return {
    id: m.id,
    room: m.room,
    content: m.content,
    createdAt: m.created_at,
    recipientId: m.recipient_id,
    sender: m.username
      ? { id: m.sender_id, username: m.username, avatarColor: m.avatar_color }
      : { id: m.sender_id },
  };
}

function selectMessages(where, params, limit = 50) {
  return db.prepare(
    `SELECT m.*, u.username, u.avatar_color FROM messages m
     JOIN users u ON u.id = m.sender_id
     ${where} ORDER BY m.id DESC LIMIT ?`
  ).all(...params, limit).reverse();
}

router.get('/history', authRequired, (req, res) => {
  const withUserId = req.query.with ? parseInt(req.query.with, 10) : null;
  if (withUserId) {
    const other = db.prepare('SELECT id FROM users WHERE id = ?').get(withUserId);
    if (!other) return res.status(404).json({ error: '用户不存在' });
    const room = privateRoom(req.user.id, withUserId);
    const messages = selectMessages('WHERE m.room = ?', [room], 200);
    return res.json({ room, messages: messages.map(messageToJson) });
  }
  const messages = selectMessages("WHERE m.room = 'public'", [], 100);
  res.json({ room: 'public', messages: messages.map(messageToJson) });
});

router.get('/conversations', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END AS other_id,
            MAX(m.id) AS last_id
     FROM messages m
     WHERE m.room != 'public' AND (m.sender_id = ? OR m.recipient_id = ?)
     GROUP BY other_id ORDER BY last_id DESC`
  ).all(req.user.id, req.user.id, req.user.id);

  const conversations = [];
  for (const r of rows) {
    const u = db.prepare('SELECT id, username, avatar_color FROM users WHERE id = ?').get(r.other_id);
    if (!u) continue;
    const last = db.prepare(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    ).get(r.last_id);
    conversations.push({
      user: { id: u.id, username: u.username, avatarColor: u.avatar_color },
      lastMessage: last ? messageToJson(last) : null,
    });
  }
  res.json({ conversations });
});

module.exports = router;
