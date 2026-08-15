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

// GET /api/messages/history - 获取消息历史
router.get('/history', authRequired, (req, res) => {
  const withId = req.query.with;
  console.log('[Messages] Query with:', withId, 'type:', typeof withId);
  
  if (!withId) {
    // 获取公共消息
    const messages = db.prepare(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room = 'public'
       ORDER BY m.id DESC LIMIT 100`
    ).all().reverse();
    return res.json({ room: 'public', messages: messages.map(messageToJson) });
  }
  
  // 判断是群聊还是私聊
  if (String(withId).startsWith('group:')) {
    const groupId = parseInt(String(withId).replace('group:', ''), 10);
    console.log('[Messages] Group ID:', groupId);
    const messages = db.prepare(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room = ?
       ORDER BY m.id DESC LIMIT 100`
    ).all(`group:${groupId}`).reverse();
    return res.json({ room: `group:${groupId}`, messages: messages.map(messageToJson) });
  }
  
  if (String(withId).startsWith('private:')) {
    // 私聊消息：直接使用 room 查询
    const room = String(withId);
    console.log('[Messages] Private room query:', room);
    // 如果格式是 private:X，需要补全为 private:currentUser:X
    let queryRoom = room;
    if (room.match(/^private:\d+$/)) {
      // 格式是 private:userId，需要补全
      const userId = room.replace('private:', '');
      queryRoom = privateRoom(req.user.id, parseInt(userId, 10));
      console.log('[Messages] Expanded to:', queryRoom);
    }
    const messages = db.prepare(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room = ?
       ORDER BY m.id DESC LIMIT 200`
    ).all(queryRoom).reverse();
    return res.json({ room: queryRoom, messages: messages.map(messageToJson) });
  }
  
  // 兼容旧的数字格式，转换为 private:格式
  const targetId = parseInt(withId, 10);
  if (isNaN(targetId)) {
    console.log('[Messages] Invalid ID:', withId);
    return res.status(400).json({ error: '无效的用户 ID' });
  }
  
  const room = privateRoom(req.user.id, targetId);
  console.log('[Messages] Computing room:', room);
  const messages = db.prepare(
    `SELECT m.*, u.username, u.avatar_color FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.room = ?
     ORDER BY m.id DESC LIMIT 200`
  ).all(room).reverse();
  res.json({ room, messages: messages.map(messageToJson) });
});

// GET /api/messages/conversations - 获取私聊会话列表
router.get('/conversations', authRequired, (req, res) => {
  const rows = db.prepare(
    `SELECT CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END AS other_id,
            MAX(m.id) AS last_id
     FROM messages m
     WHERE m.room != 'public' AND NOT m.room LIKE 'group:%'
       AND (m.sender_id = ? OR m.recipient_id = ?)
     GROUP BY other_id 
     ORDER BY last_id DESC`
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

// POST /api/messages - 发送私聊消息
router.post('/', authRequired, (req, res) => {
  const { recipientId, content, groupId } = req.body;
  
  if (groupId) {
    // 群聊消息
    const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
    if (!group) return res.status(404).json({ error: '群聊不存在' });
    
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, req.user.id);
    if (!member) return res.status(403).json({ error: '你不在该群中' });
    
    const room = `group:${groupId}`;
    const info = db.prepare(
      'INSERT INTO messages (sender_id, recipient_id, room, content) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, null, room, content);
    
    const row = db.prepare(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    ).get(info.lastInsertRowid);
    
    return res.status(201).json({ message: messageToJson(row) });
  }
  
  if (!recipientId || !content) {
    return res.status(400).json({ error: '参数不完整' });
  }
  
  const target = db.prepare('SELECT id FROM users WHERE id = ? AND banned = 0').get(recipientId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.id === req.user.id) return res.status(400).json({ error: '不能给自己发消息' });
  
  const room = privateRoom(req.user.id, recipientId);
  const info = db.prepare(
    'INSERT INTO messages (sender_id, recipient_id, room, content) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, recipientId, room, content);
  
  const row = db.prepare(
    `SELECT m.*, u.username, u.avatar_color FROM messages m
     JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
  ).get(info.lastInsertRowid);
  
  res.status(201).json({ message: messageToJson(row) });
});

module.exports = router;
