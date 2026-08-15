import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Pagination from '../components/Pagination';
import { formatTime } from '../utils';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role === 'admin') {
      api.get('/admin/stats').then((res) => setStats(res.data)).catch((err) => setError(errMsg(err)));
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return <div className="empty-state">需要管理员权限才能访问此页面。</div>;
  }

  return (
    <div className="admin-wrap">
      <div className="home-header">
        <h2>管理面板</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>概览</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>用户管理</button>
        <button className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>帖子管理</button>
      </div>

      {tab === 'stats' && <StatsPanel stats={stats} />}
      {tab === 'users' && <UsersPanel meId={user.id} />}
      {tab === 'posts' && <PostsPanel />}
    </div>
  );
}

function StatsPanel({ stats }) {
  if (!stats) return <div className="empty-state">加载中…</div>;
  const items = [
    { label: '注册用户', num: stats.userCount },
    { label: '帖子总数', num: stats.postCount },
    { label: '评论总数', num: stats.commentCount },
    { label: '点赞总数', num: stats.likeCount },
    { label: '聊天消息', num: stats.messageCount },
    { label: '封禁用户', num: stats.bannedCount },
    { label: '今日新用户', num: stats.todayUsers },
    { label: '今日新帖', num: stats.todayPosts },
  ];
  return (
    <div className="stat-grid">
      {items.map((it) => (
        <div key={it.label} className="stat-card">
          <div className="num">{it.num}</div>
          <div className="label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersPanel({ meId }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/admin/users', { params: { page, pageSize: 20, search } })
      .then((res) => {
        setUsers(res.data.users);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const act = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await fn();
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const ban = (u) => act(() => api.put(`/admin/users/${u.id}/ban`), `确定封禁「${u.username}」吗？`);
  const unban = (u) => act(() => api.put(`/admin/users/${u.id}/unban`));
  const setRole = (u, role) => act(() => api.put(`/admin/users/${u.id}/role`, { role }), `确定将「${u.username}」设为${role === 'admin' ? '管理员' : '普通用户'}吗？`);
  const del = (u) => act(() => api.delete(`/admin/users/${u.id}`), `确定删除用户「${u.username}」吗？其帖子与评论将一并删除，且无法恢复。`);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户名或邮箱"
        />
        <button className="btn btn-primary" onClick={() => { setPage(1); load(); }}>搜索</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state">加载中…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>帖子</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={u.username} color={u.avatarColor} />
                      <Link to={`/users/${u.id}`} style={{ fontWeight: 600 }}>{u.username}</Link>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role === 'admin' ? 'admin' : ''}`}>
                      {u.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td>{u.banned ? <span className="banned-text">已封禁</span> : '正常'}</td>
                  <td>{u.postCount}</td>
                  <td>{formatTime(u.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {u.id !== meId && (
                        <>
                          {u.banned ? (
                            <button className="btn btn-sm" onClick={() => unban(u)}>解封</button>
                          ) : (
                            <button className="btn btn-sm btn-danger" onClick={() => ban(u)}>封禁</button>
                          )}
                          {u.role === 'admin' ? (
                            <button className="btn btn-sm" onClick={() => setRole(u, 'user')}>撤销管理</button>
                          ) : (
                            <button className="btn btn-sm" onClick={() => setRole(u, 'admin')}>设为管理</button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => del(u)}>删除</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

function PostsPanel() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/admin/posts', { params: { page, pageSize: 20, search } })
      .then((res) => {
        setPosts(res.data.posts);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const del = async (p) => {
    if (!window.confirm(`确定删除帖子「${p.title}」吗？`)) return;
    try {
      await api.delete(`/admin/posts/${p.id}`);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索帖子标题或内容"
        />
        <button className="btn btn-primary" onClick={() => { setPage(1); load(); }}>搜索</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state">加载中…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>作者</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/posts/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link>
                  </td>
                  <td>{p.author.username}</td>
                  <td>{formatTime(p.createdAt)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => del(p)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
