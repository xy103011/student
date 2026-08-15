const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { getJwtSecret } = require('./config');

function privateRoom(a, b) {
  return `private:${Math.min(a, b)}:${Math.max(a, b)}`;
}

function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' }, path: '/socket.io' });

  const onlineUsers = new Map(); // userId -> { socketId, username, avatarColor }

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

    socket.join('public');
    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      username: user.username,
      avatarColor: user.avatar_color,
    });
    socket.emit('online', onlineList());
    socket.broadcast.emit('online', onlineList());

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
        socket.emit('message', msg);
        const targetSocket = onlineUsers.get(recipientId);
        if (targetSocket) io.to(targetSocket.socketId).emit('message', msg);
      }
      cb && cb({ ok: true, message: msg });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('online', onlineList());
    });
  });

  return io;
}

module.exports = { initSocket, privateRoom };
