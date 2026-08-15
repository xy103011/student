import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { formatTime } from '../utils';

function privateRoom(a, b) {
  return `private:${Math.min(a, b)}:${Math.max(a, b)}`;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withId = searchParams.get('with');

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeRoom, setActiveRoom] = useState('public');
  const [activeUser, setActiveUser] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [creating, setCreating] = useState(false);

  const activeRoomRef = useRef('public');
  activeRoomRef.current = activeRoom;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async (room, isGroup = false) => {
    try {
      if (room === 'public') {
        const { data } = await api.get('/messages/history');
        setMessages(data?.messages || []);
      } else if (isGroup) {
        const { data } = await api.get('/messages/history', { params: { with: `group:${room}` } });
        setMessages(data?.messages || []);
      } else {
        const { data } = await api.get('/messages/history', { params: { with: room } });
        setMessages(data?.messages || []);
      }
    } catch (err) {
      console.error('loadHistory error:', err);
      setError(errMsg(err));
      setMessages([]);
    }
  };

  const loadConversations = () => {
    api.get('/messages/conversations').then((res) => {
      setConversations(res.data?.conversations || []);
    }).catch((err) => {
      console.error('loadConversations error:', err);
      setConversations([]);
    });
  };

  const loadGroups = () => {
    api.get('/groups').then((res) => {
      setGroups(res.data?.groups || []);
    }).catch((err) => {
      console.error('loadGroups error:', err);
      setGroups([]);
    });
  };

  const loadFriends = () => {
    api.get('/friends/me').then((res) => {
      setFriends(res.data?.friends || []);
    }).catch((err) => {
      console.error('loadFriends error:', err);
      setFriends([]);
    });
  };

  const switchRoom = async (room, isGroup = false) => {
    try {
      setActiveRoom(room);
      setError('');
      if (isGroup) {
        setActiveUser(null);
        setActiveGroup(room);
        const group = groups.find(g => g.id === room);
        if (group) setActiveGroup(group);
        await loadHistory(room, true);
        if (socket) {
          socket.emit('join_group', room);
        }
      } else {
        setActiveGroup(null);
        if (room === 'public') {
          setActiveUser(null);
        } else {
          try {
            const { data } = await api.get(`/users/${room}`);
            setActiveUser(data?.user || { id: room, username: `用户${room}` });
          } catch (e) {
            setActiveUser({ id: room, username: `用户${room}` });
          }
        }
        await loadHistory(room);
      }
      setInput('');
    } catch (err) {
      console.error('switchRoom error:', err);
      setError('加载聊天失败，请刷新重试');
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadConversations();
    loadGroups();
    loadFriends();
    loadHistory('public');

    const s = io('/', { auth: { token: localStorage.getItem('token') } });
    setSocket(s);

    s.on('online', (list) => setOnlineUsers(list));

    s.on('message', (msg) => {
      const room = activeRoomRef.current;
      const isPublic = msg.room === 'public';
      const isGroupMsg = msg.room.startsWith('group:');
      
      if (isGroupMsg) {
        const groupId = msg.room.replace('group:', '');
        if (room === groupId) {
          setMessages((prev) => [...prev, msg]);
        }
      } else if (isPublic) {
        if (room === 'public') {
          setMessages((prev) => [...prev, msg]);
        }
      } else {
        const isCurrent = room === privateRoom(user.id, msg.room?.replace('private:', '').split(':')[1]);
        if (isCurrent) {
          setMessages((prev) => [...prev, msg]);
        }
      }
      
      if (!isPublic && !isGroupMsg) loadConversations();
    });

    s.on('connect_error', () => {
      setError('聊天服务连接失败，请刷新重试');
      setConnecting(false);
    });
    s.on('connect', () => setConnecting(false));

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (withId && user) {
      switchRoom(parseInt(withId, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withId, user]);

  const sendMessage = (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;
    
    const payload = { content };
    if (activeRoom.startsWith('group:')) {
      payload.groupId = activeRoom.replace('group:', '');
      socket.emit('send_group_message', payload, (res) => {
        if (res && res.error) {
          setError(res.error);
        } else {
          setInput('');
        }
      });
    } else if (activeRoom !== 'public') {
      payload.recipientId = activeRoom;
      socket.emit('send_message', payload, (res) => {
        if (res && res.error) {
          setError(res.error);
        } else {
          setInput('');
        }
      });
    } else {
      socket.emit('send_message', payload, (res) => {
        if (res && res.error) {
          setError(res.error);
        } else {
          setInput('');
        }
      });
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/groups', {
        name: groupName,
        description: groupDesc,
        memberIds: selectedFriends,
      });
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedFriends([]);
      loadGroups();
      switchRoom(`group:${data.group.id}`, true);
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setCreating(false);
    }
  };

  const onlineOthers = onlineUsers.filter((u) => u.id !== user?.id);
  const title = activeRoom === 'public' 
    ? '公共聊天室' 
    : activeGroup 
      ? activeGroup.name 
      : activeUser?.username || '私聊';

  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <div className="chat-user-list">
          <div className="title">频道</div>
          <div
            className={`chat-user-item ${activeRoom === 'public' ? 'active' : ''}`}
            onClick={() => switchRoom('public')}
          >
            公共聊天室
          </div>
        </div>
        
        <div className="chat-user-list">
          <div className="title">群聊 ({groups.length})</div>
          <div
            className="chat-user-item create-group"
            onClick={() => setShowCreateGroup(!showCreateGroup)}
          >
            + 创建群聊
          </div>
          {groups.map(g => (
            <div
              key={g.id}
              className={`chat-user-item ${activeRoom === `group:${g.id}` ? 'active' : ''}`}
              onClick={() => switchRoom(`group:${g.id}`, true)}
            >
              <Avatar name={g.name} color={g.avatarColor} />
              <span>{g.name}</span>
              <span className="member-count">{g.memberCount}</span>
            </div>
          ))}
        </div>

        <div className="chat-user-list">
          <div className="title">私聊会话</div>
          {conversations.length === 0 && (
            <div className="chat-user-item" style={{ color: 'var(--text-muted)' }}>暂无会话</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.user.id}
              className={`chat-user-item ${activeRoom === c.user.id ? 'active' : ''}`}
              onClick={() => switchRoom(c.user.id)}
            >
              <Avatar name={c.user.username} color={c.user.avatarColor} />
              <span>{c.user.username}</span>
            </div>
          ))}
        </div>

        <div className="chat-user-list">
          <div className="title">好友 ({friends.length})</div>
          {friends.length === 0 ? (
            <div className="chat-user-item" style={{ color: 'var(--text-muted)' }}>暂无好友</div>
          ) : (
            friends.map(f => (
              <div
                key={f.id}
                className="chat-user-item"
                onClick={() => switchRoom(f.id)}
              >
                <Avatar name={f.username} color={f.avatarColor} />
                <span>{f.username}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat-panel">
        <div className="chat-header">{title}</div>
        {error && <div className="error-banner" style={{ margin: 8 }}>{error}</div>}
        {connecting && <div className="empty-state" style={{ padding: 8 }}>连接中...</div>}
        
        {/* 创建群聊表单 */}
        {showCreateGroup && (
          <div className="card" style={{ margin: 8, padding: 12 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>创建群聊</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="群聊名称"
                className="input"
              />
              <input
                type="text"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="群聊描述（可选）"
                className="input"
              />
              {friends.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>邀请好友：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {friends.map(f => (
                      <button
                        key={f.id}
                        className={`btn btn-sm ${selectedFriends.includes(f.id) ? 'btn-primary' : ''}`}
                        onClick={() => {
                          setSelectedFriends(prev =>
                            prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
                          );
                        }}
                      >
                        {f.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={createGroup} disabled={creating}>
                  {creating ? '创建中...' : '创建'}
                </button>
                <button className="btn" onClick={() => setShowCreateGroup(false)}>取消</button>
              </div>
            </div>
          </div>
        )}

        <div className="chat-messages">
          {messages.length === 0 && !connecting && (
            <div className="empty-state">暂无消息，来说点什么吧。</div>
          )}
          {messages.map((m) => {
            const own = m.sender && m.sender.id === user?.id;
            const isGroupMsg = m.room?.startsWith('group:');
            return (
              <div key={m.id} className={`chat-msg ${own ? 'own' : ''}`}>
                {!own && <Avatar name={m.sender?.username} color={m.sender?.avatarColor} />}
                <div>
                  {!own && (
                    <div className="chat-msg-meta">
                      {m.sender?.username}
                      {isGroupMsg && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> · 群聊</span>}
                      · {formatTime(m.createdAt)}
                    </div>
                  )}
                  <div className="chat-bubble">{m.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeRoom.startsWith('group:') ? '输入消息，回车发送…' : '输入消息，回车发送…'}
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || connecting}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
