const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { getJwtSecret } = require('./config');

function privateRoom(a, b) {
  return `private:${Math.min(a, b)}:${Math.max(a, b)}`;
}

function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' }, path: '/socket.io' });

  const onlineUsers = new Map();

  function onlineList() {
    return Array.from(onlineUsers.values()).map((u) => ({
      id: u.userId,
      username: u.username,
      avatarColor: u.avatarColor,
    }));
  }

  function broadcastOnline() {
    io.emit('online', onlineList());
  }

  function serializeMessage(m) {
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

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, getJwtSecret());
      socket.user = { id: payload.id, username: payload.username };
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const user = db.prepare('SELECT id, username, avatar_color, banned FROM users WHERE id = ?').get(userId);
    
    if (!user || user.banned) {
      socket.emit('error', { message: '账号不可用' });
      socket.disconnect(true);
      return;
    }

    // 加入公共聊天室
    socket.join('public');
    
    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      username: user.username,
      avatarColor: user.avatar_color,
    });
    
    socket.emit('online', onlineList());
    socket.broadcast.emit('online', onlineList());

    console.log(`User ${userId} connected, total online: ${onlineUsers.size}`);

    socket.on('send_message', (data, cb) => {
      const content = (data && data.content ? String(data.content) : '').trim();
      if (!content) return cb && cb({ error: '消息不能为空' });
      if (content.length > 1000) return cb && cb({ error: '消息过长' });

      let room = 'public';
      let recipientId = null;
      
      if (data && data.recipientId) {
        recipientId = parseInt(data.recipientId, 10);
        if (!recipientId || recipientId === userId) return cb && cb({ error: '无效的接收者' });
        const target = db.prepare('SELECT id, banned FROM users WHERE id = ?').get(recipientId);
        if (!target) return cb && cb({ error: '接收者不存在' });
        if (target.banned) return cb && cb({ error: '接收者不可用' });
        room = privateRoom(userId, recipientId);
      }

      const info = db.prepare(
        'INSERT INTO messages (sender_id, recipient_id, room, content) VALUES (?, ?, ?, ?)'
      ).run(userId, recipientId, room, content);
      
      const row = db.prepare(
        `SELECT m.*, u.username, u.avatar_color FROM messages m
         JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
      ).get(info.lastInsertRowid);
      
      const msg = serializeMessage(row);

      if (room === 'public') {
        io.to('public').emit('message', msg);
      } else {
        // 私聊：只发送给当前用户和接收者
        socket.emit('message', msg);
        const targetSocket = onlineUsers.get(recipientId);
        if (targetSocket) {
          io.to(targetSocket.socketId).emit('message', msg);
        }
      }
      
      console.log(`Message sent: room=${room}, sender=${userId}, recipient=${recipientId}`);
      cb && cb({ ok: true, message: msg });
    });

    socket.on('join_group', (groupId, cb) => {
      const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
      if (!group) return cb && cb({ error: '群聊不存在' });
      
      const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
      if (!member) return cb && cb({ error: '你不在该群中' });
      
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group ${groupId}`);
      cb && cb({ ok: true });
    });

    socket.on('send_group_message', (data, cb) => {
      const content = (data && data.content ? String(data.content) : '').trim();
      if (!content) return cb && cb({ error: '消息不能为空' });
      if (content.length > 1000) return cb && cb({ error: '消息过长' });

      const groupId = parseInt(data.groupId, 10);
      if (!groupId) return cb && cb({ error: '无效的群聊 ID' });

      const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
      if (!group) return cb && cb({ error: '群聊不存在' });

      const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
      if (!member) return cb && cb({ error: '你不在该群中' });

      const room = `group:${groupId}`;
      const info = db.prepare(
        'INSERT INTO messages (sender_id, recipient_id, room, content) VALUES (?, ?, ?, ?)'
      ).run(userId, null, room, content);
      
      const row = db.prepare(
        `SELECT m.*, u.username, u.avatar_color FROM messages m
         JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
      ).get(info.lastInsertRowid);
      
      const msg = serializeMessage(row);

      io.to(room).emit('message', msg);
      console.log(`Group message sent: room=${room}, sender=${userId}`);
      cb && cb({ ok: true, message: msg });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('online', onlineList());
      console.log(`User ${userId} disconnected, total online: ${onlineUsers.size}`);
    });
  });

  return io;
}

module.exports = { initSocket, privateRoom };
