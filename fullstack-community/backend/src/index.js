const http = require('http');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { PORT } = require('./config');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'fullstack-community-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

function cleanupLegacyDemoData() {
  db.prepare(
    "DELETE FROM users WHERE email IN ('admin@example.com', 'ai@example.com', 'algo@example.com')"
  ).run();
}

function ensureAdmin() {
  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
  if (adminCount === 0) {
    const first = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
    if (first) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(first.id);
    }
  }
}

cleanupLegacyDemoData();
ensureAdmin();

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
