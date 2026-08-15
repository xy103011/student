import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Markdown from './Markdown';
import { formatTime } from '../utils';

export default function PostCard({ post, onToggleLike, onTagClick }) {
  const likeCount = post.likeCount ?? 0;
  return (
    <article className="card post-card">
      <div className="post-meta">
        <Avatar name={post.author?.username} color={post.author?.avatarColor} />
        <Link to={`/users/${post.author?.id}`} className="name">
          {post.author?.username}
        </Link>
        <span>·</span>
        <span>{formatTime(post.createdAt)}</span>
      </div>
      <Link to={`/posts/${post.id}`}>
        <h2 className="post-title">{post.title}</h2>
      </Link>
      {post.tags?.length > 0 && (
        <div className="tags">
          {post.tags.map((t) => (
            <button key={t} className="tag" onClick={(e) => { e.preventDefault(); onTagClick && onTagClick(t); }}>
              {t}
            </button>
          ))}
        </div>
      )}
      <Link to={`/posts/${post.id}`}>
        <div className="post-content clamp">
          <Markdown>{post.content}</Markdown>
        </div>
      </Link>
      <div className="post-footer">
        <button
          className={`stat-btn ${post.liked ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); onToggleLike && onToggleLike(post); }}
        >
          {post.liked ? '已赞' : '赞'} {likeCount}
        </button>
        <span>评论 {post.commentCount ?? 0}</span>
      </div>
    </article>
  );
}
