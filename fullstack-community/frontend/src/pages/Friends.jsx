import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { formatTime } from '../utils';

export default function Friends() {
  const { user: me, updateUser } = useAuth();
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFriends = () => {
    setLoading(true);
    Promise.all([
      api.get('/friends/me').then(r => setFriends(r.data.friends)),
      api.get('/friends/incoming').then(r => setIncoming(r.data.requests)),
      api.get('/friends/outgoing').then(r => setOutgoing(r.data.requests)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const searchUsers = async () => {
    if (!searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get('/friends/search', { params: { q: searchQ.trim() } });
      setSearchResults(data.users.filter(u => u.id !== me.id));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetId, targetUsername) => {
    try {
      await api.post(`/friends/request/${targetId}`);
      alert(`${targetUsername} 已收到你的好友请求`);
      setSearchQ('');
      setSearchResults([]);
      loadFriends();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const acceptRequest = async (requestId, actorUsername) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      alert(`你已成为 ${actorUsername} 的好友`);
      loadFriends();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const declineRequest = async (requestId, actorUsername) => {
    if (!confirm(`拒绝 ${actorUsername} 的好友请求？`)) return;
    try {
      await api.post(`/friends/decline/${requestId}`);
      loadFriends();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const cancelRequest = async (targetId, targetUsername) => {
    if (!confirm(`取消对 ${targetUsername} 的好友请求？`)) return;
    try {
      await api.post(`/friends/cancel/${targetId}`);
      loadFriends();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const deleteFriend = async (friendId, friendUsername) => {
    if (!confirm(`确定要删除 ${friendUsername} 吗？`)) return;
    try {
      await api.delete(`/friends/${friendId}`);
      loadFriends();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  if (loading) return <div className="empty-state">加载中...</div>;
  if (error && !friends.length) return <div className="error-banner">{error}</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>好友</h1>

      {/* 添加好友 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>添加好友</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            placeholder="输入用户名或好友码..."
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={searchUsers} disabled={searching}>
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {searchResults.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <Avatar name={u.username} color={u.avatar_color} />
              <div style={{ flex: 1 }}>
                <Link to={`/users/${u.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {u.username}
                </Link>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  好友码: {u.friend_code}
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => sendRequest(u.id, u.username)}
              >
                添加
              </button>
            </div>
          ))}
          {searchResults.length === 0 && searching && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>搜索中...</div>
          )}
          {searchResults.length === 0 && !searching && searchQ && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>未找到匹配的用户</div>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${activeTab === 'friends' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          我的好友 ({friends.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'incoming' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          收到的请求 ({incoming.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'outgoing' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          发出的请求 ({outgoing.length})
        </button>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'friends' && (
        <div className="card">
          {friends.length === 0 ? (
            <div className="empty-state">还没有好友，快去添加吧</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {friends.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/users/${f.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                    <Avatar name={f.username} color={f.avatarColor} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.username}</div>
                      {f.bio && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.bio}</div>}
                    </div>
                  </Link>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteFriend(f.id, f.username)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'incoming' && (
        <div className="card">
          {incoming.length === 0 ? (
            <div className="empty-state">没有新的好友请求</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {incoming.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/users/${r.from_user_id}`} style={{ textDecoration: 'none' }}>
                    <Avatar name={r.username} color={r.avatar_color} />
                  </Link>
                  <div style={{ flex: 1 }}>
                    <Link to={`/users/${r.from_user_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {r.username}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.created_at && `来自 ${formatTime(r.created_at)}`}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => acceptRequest(r.id, r.username)}>接受</button>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => declineRequest(r.id, r.username)}>拒绝</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div className="card">
          {outgoing.length === 0 ? (
            <div className="empty-state">没有已发出的好友请求</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {outgoing.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/users/${r.to_user_id}`} style={{ textDecoration: 'none' }}>
                    <Avatar name={r.username} color={r.avatar_color} />
                  </Link>
                  <div style={{ flex: 1 }}>
                    <Link to={`/users/${r.to_user_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {r.username}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      等待对方接受
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancelRequest(r.to_user_id, r.username)}>取消</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
