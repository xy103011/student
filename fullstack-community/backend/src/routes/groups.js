const express = require('express');
const db = require('../db');
const { notify } = require('../notify');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function groupToJson(g, viewerId = null) {
  const memberCount = db.prepare('SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?').get(g.id).c;
  const isMember = viewerId ? !!db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(g.id, viewerId) : false;
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    avatarColor: g.avatar_color,
    creatorId: g.creator_id,
    memberCount,
    isMember,
    createdAt: g.created_at,
  };
}

function memberToJson(m) {
  return {
    id: m.user_id,
    username: m.username,
    avatarColor: m.avatar_color,
    role: m.role,
  };
}

// GET /api/groups - 我加入的群聊列表
router.get('/', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT g.*, u.username as creator_name FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     JOIN users u ON u.id = g.creator_id
     WHERE gm.user_id = ?
     ORDER BY g.created_at DESC`
  ).all(req.user.id);
  res.json({ groups: rows.map(g => groupToJson(g, req.user.id)) });
});

// POST /api/groups - 创建群聊
router.post('/', authRequired, (req, res) => {
  const { name, description, memberIds } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '群聊名称不能为空' });
  }
  if (String(name).length > 50) {
    return res.status(400).json({ error: '群聊名称不能超过 50 个字符' });
  }

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  const info = db.prepare(
    'INSERT INTO groups (name, description, creator_id, avatar_color) VALUES (?, ?, ?, ?)'
  ).run(String(name).trim(), String(description || '').slice(0, 200), req.user.id, avatarColor);

  const groupId = info.lastInsertRowid;

  // 添加创建者为成员
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(groupId, req.user.id, 'admin');

  // 添加其他成员
  if (memberIds && Array.isArray(memberIds)) {
    for (const userId of memberIds) {
      if (userId !== req.user.id) {
        db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(groupId, userId, 'member');
      }
    }
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  res.status(201).json({ group: groupToJson(group, req.user.id) });
});

// GET /api/groups/:id - 群聊详情
router.get('/:id', authRequired, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!group) return res.status(404).json({ error: '群聊不存在' });

  const members = db.prepare(
    `SELECT gm.user_id, gm.role, u.username, u.avatar_color FROM group_members gm
     JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY gm.role DESC, gm.created_at ASC`
  ).all(group.id);

  const isMember = !!db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group.id, req.user.id);

  res.json({
    group: groupToJson(group, req.user.id),
    members: members.map(memberToJson),
    isMember,
  });
});

// POST /api/groups/:id/join - 加入群聊
router.post('/:id/join', authRequired, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: '群聊不存在' });

  const existing = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
  if (existing) return res.status(400).json({ error: '你已经是群成员' });

  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(groupId, req.user.id, 'member');
  res.json({ ok: true });
});

// POST /api/groups/:id/invite - 邀请用户
router.post('/:id/invite', authRequired, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: '请指定用户 ID' });

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: '群聊不存在' });

  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
  if (!member || member.role !== 'admin') return res.status(403).json({ error: '只有群主可以邀请成员' });

  const existing = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  if (existing) return res.status(400).json({ error: '该用户已在群中' });

  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(groupId, userId, 'member');

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  notify({ userId, actorId: req.user.id, type: 'group_invite', content: `${group.name} 邀请你加入群聊` });

  res.json({ ok: true });
});

// POST /api/groups/:id/kick - 踢出成员
router.post('/:id/kick', authRequired, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: '请指定用户 ID' });
  if (userId === req.user.id) return res.status(400).json({ error: '不能踢出自己' });

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: '群聊不存在' });

  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
  if (!member || member.role !== 'admin') return res.status(403).json({ error: '只有群主可以踢出成员' });

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  res.json({ ok: true });
});

// DELETE /api/groups/:id - 解散群聊
router.delete('/:id', authRequired, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: '群聊不存在' });

  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
  if (!member || member.role !== 'admin') return res.status(403).json({ error: '只有群主可以解散群聊' });

  db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  res.json({ ok: true });
});

// POST /api/groups/:id/leave - 退出群聊
router.post('/:id/leave', authRequired, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
  if (!member) return res.status(404).json({ error: '你不在该群中' });

  if (member.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM group_members WHERE group_id = ? AND role = 'admin'").get(groupId).c;
    if (adminCount <= 1) {
      return res.status(400).json({ error: '群主不能退出，请先转让群主或解散群聊' });
    }
  }

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
