import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Markdown from '../components/Markdown';
import { formatTime } from '../utils';

function buildTree(comments) {
  const top = [];
  const childrenMap = new Map();
  for (const c of comments) {
    if (c.parentId == null) {
      top.push(c);
    } else {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId).push(c);
    }
  }
  return { top, childrenMap };
}

function CommentItem({ comment, childrenMap, me, onReply, onDelete }) {
  const children = childrenMap.get(comment.id) || [];
  return (
    <div>
      <div className="comment">
        <Avatar name={comment.author.username} color={comment.author.avatarColor} />
        <div className="comment-body">
          <div className="comment-head">
            <Link to={`/users/${comment.author.id}`} className="name">{comment.author.username}</Link>
            <span>{formatTime(comment.createdAt)}</span>
            <button className="reply-btn" onClick={() => onReply(comment)}>回复</button>
            {me && me.id === comment.author.id && (
              <button className="reply-btn" style={{ color: 'var(--danger)' }} onClick={() => onDelete(comment)}>
                删除
              </button>
            )}
          </div>
          <div className="comment-content">
            <Markdown>{comment.content}</Markdown>
          </div>
        </div>
      </div>
      {children.length > 0 && (
        <div className="comment reply">
          <div style={{ flex: 1 }}>
            {children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                childrenMap={childrenMap}
                me={me}
                onReply={onReply}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { top, childrenMap } = useMemo(() => buildTree(comments), [comments]);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get(`/posts/${id}`)
      .then((res) => setPost(res.data.post))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
    api
      .get(`/posts/${id}/comments`)
      .then((res) => setComments(res.data.comments))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/posts/${id}/like`);
      setPost((p) => ({
        ...p,
        liked: data.liked,
        likeCount: p.likeCount + (data.liked ? 1 : -1),
      }));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const payload = { content };
      if (replyTo) payload.parentId = replyTo.id;
      const { data } = await api.post(`/posts/${id}/comments`, payload);
      setComments((c) => [...c, data.comment]);
      setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
      setContent('');
      setReplyTo(null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (comment) => {
    if (!window.confirm('确定删除这条评论吗？')) return;
    try {
      await api.delete(`/posts/${id}/comments/${comment.id}`);
      setComments((c) => c.filter((x) => x.id !== comment.id && x.parentId !== comment.id));
      setPost((p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
      if (replyTo && replyTo.id === comment.id) setReplyTo(null);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const deletePost = async () => {
    if (!window.confirm('确定删除这篇帖子吗？删除后无法恢复。')) return;
    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (loading) return <div className="empty-state">加载中…</div>;
  if (error && !post) return <div className="error-banner">{error}</div>;
  if (!post) return null;

  const isAuthor = user && post.author && user.id === post.author.id;

  return (
    <div className="post-detail">
      <div className="card">
        <div className="post-meta">
          <Avatar name={post.author?.username} color={post.author?.avatarColor} />
          <Link to={`/users/${post.author?.id}`} className="name">
            {post.author?.username}
          </Link>
          <span>·</span>
          <span>{formatTime(post.createdAt)}</span>
        </div>
        <h1 style={{ fontSize: 24, margin: '8px 0' }}>{post.title}</h1>
        {post.tags?.length > 0 && (
          <div className="tags">
            {post.tags.map((t) => (
              <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="tag">
                {t}
              </Link>
            ))}
          </div>
        )}
        <Markdown>{post.content}</Markdown>
        <div className="post-footer">
          <button className={`stat-btn ${post.liked ? 'active' : ''}`} onClick={toggleLike}>
            {post.liked ? '已赞' : '赞'} {post.likeCount}
          </button>
          <span>评论 {post.commentCount}</span>
          {isAuthor && (
            <span className="actions-row" style={{ marginLeft: 'auto' }}>
              <Link to={`/create?edit=${post.id}`} className="btn btn-sm">编辑</Link>
              <button className="btn btn-sm btn-danger" onClick={deletePost}>删除</button>
            </span>
          )}
        </div>
      </div>

      <div className="comments-section">
        <h3>评论（{comments.length}）</h3>
        {user ? (
          <form className="comment-form" onSubmit={submitComment}>
            <Avatar name={user.username} color={user.avatarColor} />
            <div style={{ flex: 1 }}>
              {replyTo && (
                <div className="replying-to">
                  回复 @{replyTo.author.username}
                  <button
                    type="button"
                    className="reply-btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => setReplyTo(null)}
                  >
                    取消
                  </button>
                </div>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你的评论…"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || !content.trim()}>
              {submitting ? '发送中…' : '发送'}
            </button>
          </form>
        ) : (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <Link to="/login" style={{ color: 'var(--primary)' }}>登录</Link> 后参与评论
          </div>
        )}

        {top.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            childrenMap={childrenMap}
            me={user}
            onReply={setReplyTo}
            onDelete={deleteComment}
          />
        ))}
        {top.length === 0 && <div className="empty-state" style={{ padding: '16px 0' }}>还没有评论。</div>}
      </div>
    </div>
  );
}
