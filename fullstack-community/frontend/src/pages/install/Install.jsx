import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../../api';
import { useSite } from '../../context/SiteContext';

const STEPS = ['环境检查', '站点信息', '管理员账号', '完成'];

export default function Install() {
  const navigate = useNavigate();
  const { refresh, installed } = useSite();

  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    siteName: '',
    siteDescription: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (installed === true) {
      navigate('/', { replace: true });
    }
  }, [installed, navigate]);

  if (installed === true) {
    return null;
  }

  const runCheck = () => {
    setChecking(true);
    setError('');
    api
      .get('/install/check')
      .then((res) => setChecks(res.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setChecking(false));
  };

  const goStep1 = () => {
    runCheck();
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const submit = () => {
    if (!form.siteName.trim()) return setError('请填写站点名称');
    if (!form.username.trim()) return setError('请填写管理员用户名');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('邮箱格式不正确');
    if (form.password.length < 6) return setError('密码至少需要 6 位');
    if (form.password !== form.confirm) return setError('两次输入的密码不一致');

    setInstalling(true);
    setError('');
    api
      .post('/install', {
        siteName: form.siteName,
        siteDescription: form.siteDescription,
        username: form.username,
        email: form.email,
        password: form.password,
      })
      .then(() => {
        setInstalling(false);
        setStep(3);
        refresh();
      })
      .catch((e) => {
        setInstalling(false);
        setError(errMsg(e));
      });
  };

  const goLogin = () => navigate('/login', { replace: true });

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="install-wrap">
      <div className="install-card card">
        <h1>安装向导</h1>
        <p className="subtitle">欢迎使用全栈 AI 社区，请按步骤完成初始配置</p>

        <div className="install-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`install-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="step-dot">{i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {step === 0 && (
          <div className="install-body">
            <p className="install-desc">
              安装程序将检查运行环境、写入站点配置，并创建管理员账号。完成后网站即可正常使用。
            </p>
            {checks && (
              <ul className="check-list">
                {checks.checks.map((c) => (
                  <li key={c.name}>
                    <span className={`check-flag ${c.ok ? 'ok' : 'bad'}`}>{c.ok ? '通过' : '未通过'}</span>
                    <span className="check-name">{c.name}</span>
                    <span className="check-detail">{c.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {checks && !checks.allPass && (
              <p className="install-hint">存在未通过的检查项，请先解决后再继续安装。</p>
            )}
            <div className="install-actions">
              <button className="btn btn-primary" onClick={goStep1} disabled={checking}>
                {checking ? '检查中…' : checks && checks.allPass ? '重新检查' : '开始检查'}
              </button>
              {checks && checks.allPass && (
                <button className="btn btn-primary" onClick={next}>
                  下一步
                </button>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="install-body">
            <div className="field">
              <label>站点名称</label>
              <input value={form.siteName} onChange={update('siteName')} placeholder="例如：全栈 AI 社区" maxLength={40} />
            </div>
            <div className="field">
              <label>站点描述</label>
              <textarea
                value={form.siteDescription}
                onChange={update('siteDescription')}
                placeholder="用一句话介绍你的社区"
                rows={3}
              />
            </div>
            <div className="install-actions">
              <button className="btn" onClick={back}>上一步</button>
              <button className="btn btn-primary" onClick={next}>下一步</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="install-body">
            <div className="field">
              <label>管理员用户名</label>
              <input value={form.username} onChange={update('username')} placeholder="2-20 个字符" />
            </div>
            <div className="field">
              <label>管理员邮箱</label>
              <input value={form.email} onChange={update('email')} placeholder="用于登录和找回" />
            </div>
            <div className="field">
              <label>密码</label>
              <input type="password" value={form.password} onChange={update('password')} placeholder="至少 6 位" />
            </div>
            <div className="field">
              <label>确认密码</label>
              <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="再次输入密码" />
            </div>
            <div className="install-actions">
              <button className="btn" onClick={back}>上一步</button>
              <button className="btn btn-primary" onClick={submit} disabled={installing}>
                {installing ? '安装中…' : '开始安装'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="install-body">
            <div className="install-done">
              <h2>安装完成</h2>
              <p>站点已配置完成，管理员账号已创建。现在可以登录并开始使用。</p>
            </div>
            <div className="install-actions">
              <button className="btn btn-primary" onClick={goLogin}>前往登录</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
