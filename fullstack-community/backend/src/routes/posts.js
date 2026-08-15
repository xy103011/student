const express = require('express');
const db = require('../db');
const { notify } = require('../notify');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  }
  if (typeof tags === 'string') {
    return tags.split(/[,，#\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 5);
  }
  return [];
}

function postToJson(post, viewerId = null) {
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(post.id).c;
  const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(post.id).c;
  let liked = false;
  if (viewerId) {
    liked = !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, viewerId);
  }
  const author = db.prepare('SELECT id, username, bio, avatar_color FROM users WHERE id = ?').get(post.user_id);
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags: post.tags ? post.tags.split(',') : [],
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    likeCount,
    commentCount,
    liked,
    author: author
      ? { id: author.id, username: author.username, bio: author.bio, avatarColor: author.avatar_color }
      : null,
  };
}

function buildListQuery({ page, pageSize, tag, search, userId, sort }) {
  const conditions = [];
  const params = [];
  if (tag) {
    conditions.push('(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)');
    params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`);
  }
  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let orderBy = 'created_at DESC, id DESC';
  if (sort === 'hot') {
    orderBy = `(SELECT COUNT(*) FROM likes l WHERE l.post_id = posts.id)
      + (SELECT COUNT(*) FROM comments c WHERE c.post_id = posts.id) * 2 DESC, created_at DESC`;
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM posts ${where}`).get(...params).c;
  const rows = db.prepare(
    `SELECT * FROM posts ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);
  return { rows, total };
}

function sendList(res, { rows, total, page, pageSize }, viewerId) {
  res.json({
    posts: rows.map((p) => postToJson(p, viewerId)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
}

router.get('/', optionalAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const tag = (req.query.tag || '').trim();
  const search = (req.query.search || '').trim();
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const sort = req.query.sort === 'hot' ? 'hot' : 'latest';
  const result = buildListQuery({ page, pageSize, tag, search, userId, sort });
  sendList(res, { ...result, page, pageSize }, req.user ? req.user.id : null);
});

router.get('/feed', authRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const search = (req.query.search || '').trim();
  const tag = (req.query.tag || '').trim();

  const conditions = ['(user_id = ? OR user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?) OR user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?))'];
  const params = [req.user.id, req.user.id, req.user.id];
  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    conditions.push('(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)');
    params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM posts ${where}`).get(...params).c;
  const rows = db.prepare(
    `SELECT * FROM posts ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);
  sendList(res, { rows, total, page, pageSize }, req.user.id);
});

router.get('/:id', optionalAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  res.json({ post: postToJson(post, req.user ? req.user.id : null) });
});

router.post('/', authRequired, (req, res) => {
  const { title, content, tags } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  if (String(title).trim().length > 120) {
    return res.status(400).json({ error: '标题不能超过 120 个字符' });
  }
  const tagStr = normalizeTags(tags).join(',');
  const info = db.prepare('INSERT INTO posts (user_id, title, content, tags) VALUES (?, ?, ?, ?)')
    .run(req.user.id, String(title).trim(), String(content), tagStr);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ post: postToJson(post, req.user.id) });
});

router.put('/:id', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: '无权编辑他人帖子' });

  const { title, content, tags } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  const tagStr = normalizeTags(tags).join(',');
  db.prepare("UPDATE posts SET title = ?, content = ?, tags = ?, updated_at = datetime('now') WHERE id = ?")
    .run(String(title).trim(), String(content), tagStr, post.id);
  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id);
  res.json({ post: postToJson(updated, req.user.id) });
});

router.delete('/:id', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: '无权删除他人帖子' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ ok: true });
});

router.post('/:id/like', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(post.id, req.user.id);
  notify({
    userId: post.user_id,
    actorId: req.user.id,
    type: 'like',
    postId: post.id,
    content: post.title,
  });
  res.json({ liked: true });
});

function commentToJson(c) {
  return {
    id: c.id,
    content: c.content,
    parentId: c.parent_id,
    createdAt: c.created_at,
    author: { id: c.user_id, username: c.username, avatarColor: c.avatar_color },
  };
}

router.get('/:id/comments', (req, res) => {
  const rows = db.prepare(
    `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.avatar_color
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`
  ).all(parseInt(req.params.id, 10));
  res.json({ comments: rows.map(commentToJson) });
});

router.post('/:id/comments', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const { content, parentId } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  if (String(content).length > 2000) {
    return res.status(400).json({ error: '评论不能超过 2000 个字符' });
  }

  let parent = null;
  let resolvedParentId = null;
  if (parentId) {
    parent = db.prepare('SELECT * FROM comments WHERE id = ? AND post_id = ?')
      .get(parseInt(parentId, 10), post.id);
    if (!parent) return res.status(404).json({ error: '要回复的评论不存在' });
    resolvedParentId = parent.id;
  }

  const info = db.prepare('INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)')
    .run(post.id, req.user.id, resolvedParentId, String(content).trim());
  const c = db.prepare(
    `SELECT c.id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.avatar_color
     FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`
  ).get(info.lastInsertRowid);

  if (parent) {
    notify({
      userId: parent.user_id,
      actorId: req.user.id,
      type: 'reply',
      postId: post.id,
      commentId: parent.id,
      content: String(content).trim(),
    });
  } else {
    notify({
      userId: post.user_id,
      actorId: req.user.id,
      type: 'comment',
      postId: post.id,
      content: String(content).trim(),
    });
  }

  res.status(201).json({ comment: commentToJson(c) });
});

function deleteCommentTree(id) {
  const children = db.prepare('SELECT id FROM comments WHERE parent_id = ?').all(id);
  for (const child of children) deleteCommentTree(child.id);
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
}

router.delete('/:id/comments/:commentId', authRequired, (req, res) => {
  const c = db.prepare('SELECT * FROM comments WHERE id = ? AND post_id = ?')
    .get(parseInt(req.params.commentId, 10), parseInt(req.params.id, 10));
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.user_id !== req.user.id) return res.status(403).json({ error: '无权删除他人评论' });
  deleteCommentTree(c.id);
  res.json({ ok: true });
});

module.exports = router;
