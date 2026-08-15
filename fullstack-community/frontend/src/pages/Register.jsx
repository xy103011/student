import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>注册</h1>
        <p className="subtitle">加入全栈 AI 社区，分享你的想法</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>用户名</label>
            <input value={form.username} onChange={set('username')} placeholder="2-20 个字符" />
          </div>
          <div className="field">
            <label>邮箱</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>密码</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="至少 6 位" />
          </div>
          <div className="field">
            <label>确认密码</label>
            <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="再次输入密码" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '注册中…' : '注册'}
          </button>
        </form>
        <div className="auth-switch">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
}
