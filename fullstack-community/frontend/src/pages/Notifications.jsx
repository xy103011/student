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
    case 'friend_request':
      return '请求添加你为好友';
    case 'friend_accepted':
      return '接受了你的好友请求';
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

  const handleFriendRequest = async (n, action) => {
    try {
      if (action === 'accept') {
        await api.post(`/friends/accept/${n.id}`);
        alert(`已接受 ${n.actor?.username} 的好友请求`);
      } else {
        await api.post(`/friends/decline/${n.id}`);
      }
      // 从列表中移除
      setItems((list) => list.filter((x) => x.id !== n.id));
      // 标记为已读
      if (!n.isRead) {
        await api.put(`/notifications/${n.id}/read`);
      }
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const openNotif = async (n) => {
    if (!n.isRead) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch (e) {
        /* ignore */
      }
    }
    // 好友请求通知不跳转，显示操作按钮
    if (n.type === 'friend_request' || n.type === 'friend_accepted') return;
    
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
        <div className="empty-state">加载中...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">还没有通知。</div>
      ) : (
        <div className="card notif-list" style={{ padding: 0 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.isRead ? '' : 'unread'}`}
              onClick={() => openNotif(n)}
              style={{ cursor: 'pointer' }}
            >
              <Avatar name={n.actor?.username || '?'} color={n.actor?.avatarColor} />
              <div className="notif-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{n.actor?.username || '系统'}</strong> {notifText(n)}
                  </div>
                  {n.type === 'friend_request' && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequest(n, 'accept');
                        }}
                      >
                        接受
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequest(n, 'decline');
                        }}
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                  {n.type === 'friend_accepted' && (
                    <Link
                      to={`/users/${n.actor?.id}`}
                      className="btn btn-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      查看主页
                    </Link>
                  )}
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
