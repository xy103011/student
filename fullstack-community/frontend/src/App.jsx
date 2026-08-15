import { Routes, Route } from 'react-router-dom';
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
import { useAuth } from './context/AuthContext';

export default function App() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="loading-screen">加载中…</div>;
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
      <footer className="footer">全栈 AI 社区 · 分享 · 交流 · 成长</footer>
    </div>
  );
}
