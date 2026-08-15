import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { formatTime } from '../utils';

export default function Profile() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [listMode, setListMode] = useState(null);
  const [userList, setUserList] = useState([]);
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendship, setFriendship] = useState(null);

  const loadProfile = () => {
    setLoading(true);
    setError('');
    api
      .get(`/users/${id}`)
      .then((res) => {
        setProfile(res.data.user);
        setBio(res.data.user.bio || '');
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
    api
      .get('/posts', { params: { userId: id, pageSize: 50 } })
      .then((res) => setPosts(res.data.posts))
      .catch(() => {});
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const toggleFollow = async () => {
    if (!me) {
      navigate('/login');
      return;
    }
    setFollowBusy(true);
    try {
      const { data } = await api.post(`/users/${id}/follow`);
      setProfile((p) => ({
        ...p,
        isFollowing: data.following,
        followerCount: p.followerCount + (data.following ? 1 : -1),
      }));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setFollowBusy(false);
    }
  };

  const loadFriendship = async () => {
    if (!me || me.id === profile.id) {
      setFriendship(null);
      return;
    }
    try {
      const { data } = await api.get(`/friends/check/${id}`);
      setFriendship(data.relationship);
    } catch (err) {
      setFriendship(null);
    }
  };

  const sendFriendRequest = async () => {
    if (!me) {
      navigate('/login');
      return;
    }
    setFriendBusy(true);
    try {
      await api.post(`/friends/request/${id}`);
      setFriendship('pending_sent');
      alert(`已向 ${profile.username} 发送好友请求`);
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setFriendBusy(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!confirm('确定要取消好友请求吗？')) return;
    try {
      await api.post(`/friends/cancel/${id}`);
      setFriendship(null);
    } catch (err) {
      alert(errMsg(err));
    }
  };

  useEffect(() => {
    loadFriendship();
  }, [id, me]);

  const openList = async (mode) => {
    setListMode(mode);
    setUserList([]);
    try {
      const { data } = await api.get(`/users/${id}/${mode}`);
      setUserList(data.users);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const saveBio = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', { bio });
      setProfile((p) => ({ ...p, bio: data.user.bio }));
      updateUser({ ...me, bio: data.user.bio });
      setEditing(false);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state">加载中…</div>;
  if (error && !profile) return <div className="error-banner">{error}</div>;
  if (!profile) return null;

  const isMe = me && me.id === profile.id;

  return (
    <div>
      <div className="profile-header">
        <Avatar name={profile.username} color={profile.avatarColor} size="lg" />
        <div className="profile-info">
          <h1>
            {profile.username}
            {profile.role === 'admin' && <span className="role-badge admin" style={{ marginLeft: 8, verticalAlign: 'middle' }}>管理员</span>}
          </h1>
          {editing ? (
            <div className="edit-bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="介绍一下自己…"
                rows={3}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={saveBio} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button className="btn btn-sm" onClick={() => { setEditing(false); setBio(profile.bio || ''); }}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bio">{profile.bio || '这个人很懒，什么都没写。'}</div>
              {profile.friendCode && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  好友码: {profile.friendCode}
                </div>
              )}
              {isMe ? (
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setEditing(true)}>
                  编辑简介
                </button>
              ) : (
                <div className="actions-row" style={{ marginTop: 8 }}>
                  <button
                    className={`btn btn-sm ${profile.isFollowing ? '' : 'btn-primary'}`}
                    onClick={toggleFollow}
                    disabled={followBusy}
                  >
                    {profile.isFollowing ? '已关注' : '关注'}
                  </button>
                  <button className="btn btn-sm" onClick={() => navigate(`/chat?with=${profile.id}`)}>
                    私聊
                  </button>
                  {friendship === 'friends' ? (
                    <span className="btn btn-sm" style={{ opacity: 0.6, cursor: 'default' }}>好友</span>
                  ) : friendship === 'pending_sent' ? (
                    <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={cancelFriendRequest}>
                      已发送请求
                    </button>
                  ) : friendship === 'pending_received' ? (
                    <span className="btn btn-sm btn-primary" style={{ opacity: 0.6, cursor: 'default' }}>等待对方接受</span>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={sendFriendRequest}
                      disabled={friendBusy}
                    >
                      {friendBusy ? '处理中...' : '添加好友'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div className="follow-section">
            <button className="follow-link" onClick={() => openList('following')}>
              <strong>{profile.followingCount}</strong> 关注
            </button>
            <button className="follow-link" onClick={() => openList('followers')}>
              <strong>{profile.followerCount}</strong> 粉丝
            </button>
            <span className="follow-link">
              <strong>{profile.postCount}</strong> 帖子
            </span>
            <span className="follow-link">加入于 {formatTime(profile.createdAt)}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {listMode && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>{listMode === 'followers' ? '粉丝' : '关注'}</strong>
            <button className="btn btn-sm" onClick={() => setListMode(null)}>关闭</button>
          </div>
          {userList.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>暂无数据</div>
          ) : (
            userList.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <Avatar name={u.username} color={u.avatarColor} />
                <Link to={`/users/${u.id}`} style={{ fontWeight: 600 }}>{u.username}</Link>
                {u.bio && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.bio}</span>}
              </div>
            ))
          )}
        </div>
      )}

      <h2 style={{ fontSize: 18, margin: '16px 0' }}>TA 的帖子</h2>
      {posts.length === 0 ? (
        <div className="empty-state">还没有发布过帖子。</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
