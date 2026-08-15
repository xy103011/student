import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { account, password });
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
        <h1>登录</h1>
        <p className="subtitle">欢迎回到全栈 AI 社区</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>用户名或邮箱</label>
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="请输入用户名或邮箱" />
          </div>
          <div className="field">
            <label>密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
        <div className="auth-switch">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
        <div className="auth-switch" style={{ marginTop: 8, fontSize: 12 }}>
          演示账号：admin@example.com / demo123456
        </div>
      </div>
    </div>
  );
}
