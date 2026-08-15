import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSite } from '../context/SiteContext';
import Avatar from './Avatar';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { site } = useSite();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    const fetchUnread = () => {
      api
        .get('/notifications/unread-count')
        .then((res) => setUnread(res.data.count))
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, [user]);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/?search=${encodeURIComponent(keyword.trim())}`);
  };

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">{site.name}</Link>
        <form className="nav-search" onSubmit={onSearch}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子…"
          />
          <button type="submit" className="btn">搜索</button>
        </form>
        <div className="nav-actions">
          <button className="btn btn-sm" onClick={toggle} title="切换主题">
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
          <Link className="btn btn-sm" to="/chat">聊天</Link>
          {user ? (
            <>
              <Link className="btn btn-sm" to="/notifications" style={{ position: 'relative' }}>
                通知
                {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
              </Link>
              <Link to="/create" className="btn btn-primary">发布帖子</Link>
              {user.role === 'admin' && <Link to="/admin" className="btn btn-sm">管理</Link>}
              <Link to={`/users/${user.id}`} title="个人主页">
                <Avatar name={user.username} color={user.avatarColor} />
              </Link>
              <button className="btn btn-sm" onClick={onLogout}>退出</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn">登录</Link>
              <Link to="/register" className="btn btn-primary">注册</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
