import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Avatar from '../components/Avatar';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const searchUsers = async () => {
    if (!searchQ.trim()) {
      setUsers([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get('/users', { params: { q: searchQ.trim() } });
      setUsers(data.users || []);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <div className="empty-state">加载中...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>用户</h1>

      {/* 搜索 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            placeholder="搜索用户名或好友码..."
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={searchUsers} disabled={searching}>
            {searching ? '搜索中...' : '搜索'}
          </button>
          {searchQ && (
            <button className="btn btn-sm" onClick={() => { setSearchQ(''); loadUsers(); }}>
              重置
            </button>
          )}
        </div>
      </div>

      {/* 用户列表 */}
      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state">
            {searchQ ? '未找到匹配的用户' : '暂无用户'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <Link to={`/users/${u.id}`} style={{ textDecoration: 'none' }}>
                  <Avatar name={u.username} color={u.avatarColor || u.avatar_color} />
                </Link>
                <Link to={`/users/${u.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    好友码: {u.friendCode || u.friend_code}
                  </div>
                </Link>
                {u.role === 'admin' && (
                  <span className="role-badge admin" style={{ fontSize: 11, padding: '2px 6px' }}>管理员</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
