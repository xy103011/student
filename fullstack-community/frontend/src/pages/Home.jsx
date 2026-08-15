import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';

const TABS = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '最热' },
  { key: 'follow', label: '关注' },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tag') || '';

  const [tab, setTab] = useState('latest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ posts: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = { page, pageSize: 10 };
    if (search) params.search = search;
    if (tag) params.tag = tag;
    if (tab === 'hot') params.sort = 'hot';

    const url = tab === 'follow' ? '/posts/feed' : '/posts';
    api
      .get(url, { params })
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err) => {
        if (active) setError(errMsg(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, tag, tab, page]);

  const switchTab = (key) => {
    setTab(key);
    setPage(1);
    setError('');
  };

  const toggleLike = async (post) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/posts/${post.id}/like`);
      setData((d) => ({
        ...d,
        posts: d.posts.map((p) =>
          p.id === post.id
            ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
            : p
        ),
      }));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const onTagClick = (t) => {
    setSearchParams({ tag: t });
  };

  const clearFilter = () => {
    setSearchParams({});
  };

  const filterLabel = tag ? `标签「${tag}」` : search ? `搜索「${search}」` : null;

  return (
    <div>
      <div className="home-header">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {filterLabel && (
          <button className="btn btn-sm" onClick={clearFilter}>清除筛选</button>
        )}
      </div>

      {tab === 'follow' && !user && (
        <div className="empty-state" style={{ padding: '16px 0' }}>
          <Link to="/login" style={{ color: 'var(--primary)' }}>登录</Link> 后查看关注动态
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">加载中…</div>
      ) : data.posts.length === 0 ? (
        <div className="empty-state">
          {tab === 'follow' ? '关注的人还没有发帖，去关注一些用户吧。' : '暂无帖子，快来发布第一篇吧。'}
        </div>
      ) : (
        data.posts.map((p) => (
          <PostCard key={p.id} post={p} onToggleLike={toggleLike} onTagClick={onTagClick} />
        ))
      )}

      <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
    </div>
  );
}
