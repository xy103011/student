import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import MarkdownEditor from '../components/MarkdownEditor';

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (editId) {
      api
        .get(`/posts/${editId}`)
        .then((res) => {
          const p = res.data.post;
          if (p.author.id !== user.id) {
            setError('无权编辑他人帖子');
            return;
          }
          setTitle(p.title);
          setContent(p.content);
          setTags((p.tags || []).join(', '));
        })
        .catch((err) => setError(errMsg(err)))
        .finally(() => setLoading(false));
    }
  }, [editId, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const tagList = tags
        .split(/[,，#\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = { title: title.trim(), content, tags: tagList };
      if (editId) {
        const { data } = await api.put(`/posts/${editId}`, payload);
        navigate(`/posts/${data.post.id}`);
      } else {
        const { data } = await api.post('/posts', payload);
        navigate(`/posts/${data.post.id}`);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="empty-state">加载中…</div>;

  return (
    <div className="auth-wrap" style={{ maxWidth: 720 }}>
      <div className="card auth-card">
        <h1>{editId ? '编辑帖子' : '发布帖子'}</h1>
        <p className="subtitle">支持 Markdown 语法：标题、列表、代码块、表格等</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>标题</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话说清楚主题" />
          </div>
          <div className="field">
            <label>内容</label>
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
          <div className="field">
            <label>标签</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用逗号或空格分隔，最多 5 个，如：AI编程, 大模型"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '提交中…' : editId ? '保存修改' : '发布'}
          </button>
        </form>
      </div>
    </div>
  );
}
