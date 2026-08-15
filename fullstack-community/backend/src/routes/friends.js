const express = require('express');
const db = require('../db');
const { notify } = require('../notify');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function friendUser(u) {
  return { id: u.id, username: u.username, bio: u.bio, avatarColor: u.avatar_color };
}

// GET /api/friends/me - 我的好友列表
router.get('/me', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT u.id, u.username, u.bio, u.avatar_color FROM friendships f
     JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY f.created_at DESC`
  ).all(req.user.id);
  res.json({ friends: rows.map(friendUser) });
});

// GET /api/friends/incoming - 收到的好友请求
router.get('/incoming', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT fr.*, u.username, u.bio, u.avatar_color FROM friend_requests fr
     JOIN users u ON u.id = fr.from_user_id
     WHERE fr.to_user_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`
  ).all(req.user.id);
  res.json({ requests: rows });
});

// GET /api/friends/outgoing - 我发出的好友请求
router.get('/outgoing', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT fr.*, u.username, u.bio, u.avatar_color FROM friend_requests fr
     JOIN users u ON u.id = fr.to_user_id
     WHERE fr.from_user_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`
  ).all(req.user.id);
  res.json({ requests: rows });
});

// GET /api/friends/check/:targetId - 检查与某用户的好友关系
router.get('/check/:targetId', authRequired, (req, res) => {
  const targetId = parseInt(req.params.targetId, 10);
  if (targetId === req.user.id) return res.json({ relationship: 'self' });

  const isFriend = !!db.prepare(
    "SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
  ).get(req.user.id, targetId, targetId, req.user.id);
  if (isFriend) return res.json({ relationship: 'friends' });

  const pendingReqs = db.prepare(
    "SELECT id, from_user_id, to_user_id FROM friend_requests WHERE from_user_id = ? OR to_user_id = ? AND status = 'pending'"
  ).all(req.user.id, req.user.id);
  const fromPending = pendingReqs.find(r => r.to_user_id === targetId);
  const toPending = pendingReqs.find(r => r.from_user_id === targetId);

  if (fromPending) return res.json({ relationship: 'pending_sent' });
  if (toPending) return res.json({ relationship: 'pending_received' });

  res.json({ relationship: 'stranger' });
});

// POST /api/friends/request/:targetId - 发送好友请求
router.post('/request/:targetId', authRequired, (req, res) => {
  const targetId = parseInt(req.params.targetId, 10);
  if (targetId === req.user.id) return res.status(400).json({ error: '不能添加自己为好友' });

  const target = db.prepare('SELECT id, banned FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.banned) return res.status(400).json({ error: '该用户已被封禁' });

  const existing = db.prepare(
    "SELECT id, from_user_id, to_user_id FROM friend_requests WHERE from_user_id = ? OR to_user_id = ? AND status = 'pending'"
  ).all(req.user.id, req.user.id);
  if (existing.find(r => r.to_user_id === targetId)) {
    return res.status(400).json({ error: '已发送好友请求' });
  }
  if (existing.find(r => r.from_user_id === targetId)) {
    return res.status(400).json({ error: '对方已发送好友请求' });
  }

  const isFriend = !!db.prepare(
    "SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
  ).get(req.user.id, targetId, targetId, req.user.id);
  if (isFriend) return res.status(400).json({ error: '你们已经是好友' });

  db.prepare(
    "INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)"
  ).run(req.user.id, targetId);

  const actor = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
  notify({ userId: targetId, actorId: req.user.id, type: 'friend_request', content: `${actor.username} 请求添加你为好友` });

  res.json({ ok: true });
});

// POST /api/friends/accept/:requestId - 接受好友请求
router.post('/accept/:requestId', authRequired, (req, res) => {
  const reqId = parseInt(req.params.requestId, 10);
  const friendReq = db.prepare(
    "SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'"
  ).get(reqId, req.user.id);
  if (!friendReq) return res.status(404).json({ error: '请求不存在' });

  db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(reqId);

  db.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)"
  ).run(friendReq.from_user_id, friendReq.to_user_id);
  db.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)"
  ).run(friendReq.to_user_id, friendReq.from_user_id);

  const actor = db.prepare('SELECT username FROM users WHERE id = ?').get(friendReq.from_user_id);
  notify({ userId: friendReq.from_user_id, actorId: req.user.id, type: 'friend_accepted', content: `${actor.username} 接受了你的好友请求` });

  res.json({ ok: true });
});

// POST /api/friends/decline/:requestId - 拒绝好友请求
router.post('/decline/:requestId', authRequired, (req, res) => {
  const reqId = parseInt(req.params.requestId, 10);
  const friendReq = db.prepare(
    "SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'"
  ).get(reqId, req.user.id);
  if (!friendReq) return res.status(404).json({ error: '请求不存在' });

  db.prepare("UPDATE friend_requests SET status = 'declined' WHERE id = ?").run(reqId);
  res.json({ ok: true });
});

// POST /api/friends/cancel/:targetId - 取消好友请求
router.post('/cancel/:targetId', authRequired, (req, res) => {
  const targetId = parseInt(req.params.targetId, 10);
  const friendReq = db.prepare(
    "SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'"
  ).get(req.user.id, targetId);
  if (!friendReq) return res.status(404).json({ error: '没有找到待处理的请求' });

  db.prepare("UPDATE friend_requests SET status = 'cancelled' WHERE id = ?").run(friendReq.id);
  res.json({ ok: true });
});

// DELETE /api/friends/:friendId - 删除好友
router.delete('/:friendId', authRequired, (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  if (friendId === req.user.id) return res.status(400).json({ error: '不能删除自己' });

  db.prepare(
    "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
  ).run(req.user.id, friendId, friendId, req.user.id);

  db.prepare(
    "DELETE FROM friend_requests WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) AND status = 'pending'"
  ).run(req.user.id, friendId, friendId, req.user.id);

  res.json({ ok: true });
});

// GET /api/friends/search - 通过用户名或好友码搜索用户
router.get('/search', authRequired, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ users: [] });

  let rows;
  if (/^[A-Z0-9]{6}$/.test(q.toUpperCase())) {
    rows = db.prepare(
      'SELECT id, username, friend_code, bio, avatar_color FROM users WHERE friend_code = ? AND banned = 0'
    ).all(q.toUpperCase());
  } else {
    rows = db.prepare(
      "SELECT id, username, friend_code, bio, avatar_color FROM users WHERE username LIKE ? AND banned = 0 LIMIT 10"
    ).all(`%${q}%`);
  }

  res.json({ users: rows });
});

module.exports = router;
