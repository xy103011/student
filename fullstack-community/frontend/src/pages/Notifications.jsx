import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import Avatar from '../components/Avatar';
import Pagination from '../components/Pagination';
import { formatTime } from '../utils';

function notifText(n) {
  switch (n.type) {
    case 'follow':
      return '关注了你';
    case 'like':
      return `赞了你的帖子《${n.content || '未命名'}》`;
    case 'comment':
      return '评论了你的帖子';
    case 'reply':
      return '回复了你的评论';
    default:
      return '与你互动';
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/notifications', { params: { page, pageSize: 20 } })
      .then((res) => {
        setItems(res.data.notifications);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const openNotif = async (n) => {
    if (!n.isRead) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch (e) {
        /* ignore */
      }
    }
    if (n.postId) {
      navigate(`/posts/${n.postId}`);
    } else if (n.type === 'follow' && n.actor) {
      navigate(`/users/${n.actor.id}`);
    }
  };

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div>
      <div className="home-header">
        <h2>通知</h2>
        <button className="btn btn-sm" onClick={markAll}>全部已读</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state">加载中…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">还没有通知。</div>
      ) : (
        <div className="card notif-list" style={{ padding: 0 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.isRead ? '' : 'unread'}`}
              onClick={() => openNotif(n)}
            >
              <Avatar name={n.actor?.username || '?'} color={n.actor?.avatarColor} />
              <div className="notif-body">
                <div>
                  <strong>{n.actor?.username || '系统'}</strong> {notifText(n)}
                </div>
                {n.content && n.type !== 'like' && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                    {n.content.length > 60 ? n.content.slice(0, 60) + '…' : n.content}
                  </div>
                )}
                <div className="time">{formatTime(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
