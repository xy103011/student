const express = require('express');
const db = require('../db');
const { notify } = require('../notify');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function profileOf(user, viewerId = null) {
  const followerCount = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(user.id).c;
  const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(user.id).c;
  let isFollowing = false;
  if (viewerId && viewerId !== user.id) {
    isFollowing = !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND followee_id = ?')
      .get(viewerId, user.id);
  }
  return {
    id: user.id,
    username: user.username,
    friendCode: user.friend_code,
    bio: user.bio,
    avatarColor: user.avatar_color,
    role: user.role,
    banned: user.banned,
    createdAt: user.created_at,
    followerCount,
    followingCount,
    postCount,
    isFollowing,
  };
}

function userBrief(u) {
  return { id: u.id, username: u.username, bio: u.bio, avatarColor: u.avatar_color, friendCode: u.friend_code };
}

router.get('/:id', optionalAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, bio, avatar_color, role, banned, created_at, friend_code FROM users WHERE id = ?'
  ).get(parseInt(req.params.id, 10));
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: profileOf(user, req.user ? req.user.id : null) });
});

router.put('/me', authRequired, (req, res) => {
  const { bio } = req.body || {};
  const safeBio = typeof bio === 'string' ? bio.slice(0, 200) : '';
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(safeBio, req.user.id);
  const user = db.prepare(
    'SELECT id, username, bio, avatar_color, role, banned, created_at, friend_code FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ user: profileOf(user, req.user.id) });
});

router.post('/:id/follow', authRequired, (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: '不能关注自己' });
  }
  const target = db.prepare('SELECT id, banned FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.banned) return res.status(400).json({ error: '该用户已被封禁' });

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND followee_id = ?')
    .get(req.user.id, targetId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    return res.json({ following: false });
  }
  db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, targetId);
  notify({ userId: targetId, actorId: req.user.id, type: 'follow' });
  res.json({ following: true });
});

router.get('/:id/followers', (req, res) => {
  const rows = db.prepare(
    `SELECT u.id, u.username, u.bio, u.avatar_color FROM follows f
     JOIN users u ON u.id = f.follower_id WHERE f.followee_id = ? ORDER BY f.created_at DESC`
  ).all(parseInt(req.params.id, 10));
  res.json({ users: rows.map(userBrief) });
});

router.get('/:id/following', (req, res) => {
  const rows = db.prepare(
    `SELECT u.id, u.username, u.bio, u.avatar_color FROM follows f
     JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY f.created_at DESC`
  ).all(parseInt(req.params.id, 10));
  res.json({ users: rows.map(userBrief) });
});

// GET /api/users - 搜索用户（通过用户名或好友码）
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ users: [] });
  let rows;
  if (/^[A-Z0-9]{6}$/.test(q.toUpperCase())) {
    rows = db.prepare(
      'SELECT id, username, friend_code, bio, avatar_color, banned, role FROM users WHERE friend_code = ?'
    ).all(q.toUpperCase());
  } else {
    rows = db.prepare(
      "SELECT id, username, friend_code, bio, avatar_color, banned, role FROM users WHERE username LIKE ? LIMIT 20"
    ).all(`%${q}%`);
  }
  res.json({ users: rows.map(u => ({
    id: u.id, username: u.username, friendCode: u.friend_code,
    bio: u.bio, avatarColor: u.avatar_color, banned: u.banned, role: u.role,
  })) });
});

module.exports = router;
