const db = require('./db');

function notify({ userId, actorId, type, postId = null, commentId = null, content = '' }) {
  if (!userId || !actorId || userId === actorId) return;
  db.prepare(
    'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, content) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, actorId, type, postId, commentId, String(content).slice(0, 200));
}

module.exports = { notify };
