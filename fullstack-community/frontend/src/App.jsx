import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Install from './pages/install/Install';
import { useAuth } from './context/AuthContext';
import { useSite } from './context/SiteContext';

export default function App() {
  const { loading } = useAuth();
  const { installed, site } = useSite();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (installed === false && location.pathname !== '/install') {
      navigate('/install', { replace: true });
    }
  }, [installed, location.pathname, navigate]);

  if (loading || installed === null) {
    return <div className="loading-screen">加载中…</div>;
  }

  if (location.pathname === '/install') {
    return (
      <div className="app">
        <main className="container">
          <Routes>
            <Route path="/install" element={<Install />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/users/:id" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <footer className="footer">{site.name} · 分享 · 交流 · 成长</footer>
    </div>
  );
}
