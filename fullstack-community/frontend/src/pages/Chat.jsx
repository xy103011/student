import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { formatTime } from '../utils';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withId = searchParams.get('with');

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [creating, setCreating] = useState(false);
  
  // 当前激活的聊天类型：'public' | 'private:'+userId | 'group:'+groupId
  const [activeRoom, setActiveRoom] = useState('public');
  const [activeUser, setActiveUser] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);

  const activeRoomRef = useRef('public');
  activeRoomRef.current = activeRoom;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async (room, isGroup = false) => {
    try {
      setError('');
      let url = '/messages/history';
      let params = {};
      
      if (isGroup) {
        params.with = `group:${room}`;
      } else if (room !== 'public') {
        params.with = room;
      }
      
      console.log('[Chat] loadHistory:', url, params);
      const { data } = await api.get(url, { params });
      console.log('[Chat] History loaded:', data?.messages?.length || 0, 'messages');
      setMessages(data?.messages || []);
    } catch (err) {
      console.error('[Chat] loadHistory error:', err);
      setError(errMsg(err) || '加载消息失败');
      setMessages([]);
    }
  };

  const loadConversations = () => {
    api.get('/messages/conversations').then((res) => {
      setConversations(res.data?.conversations || []);
    }).catch((err) => {
      console.error('[Chat] loadConversations error:', err);
      setConversations([]);
    });
  };

  const loadGroups = () => {
    api.get('/groups').then((res) => {
      setGroups(res.data?.groups || []);
    }).catch((err) => {
      console.error('[Chat] loadGroups error:', err);
      setGroups([]);
    });
  };

  const loadFriends = () => {
    api.get('/friends/me').then((res) => {
      setFriends(res.data?.friends || []);
    }).catch((err) => {
      console.error('[Chat] loadFriends error:', err);
      setFriends([]);
    });
  };

  const switchRoom = async (room, isGroup = false) => {
    try {
      console.log('[Chat] switchRoom called:', room, 'isGroup:', isGroup);
      
      setActiveRoom(room);
      setError('');
      activeRoomRef.current = room;
      setInput('');
      
      if (isGroup) {
        setActiveUser(null);
        // 从 groups 列表中查找群聊信息
        const group = groups.find(g => g.id === room);
        console.log('[Chat] Found group:', group);
        setActiveGroup(group || { id: room, name: `群聊${room}` });
        
        await loadHistory(room, true);
        
        if (socket && socket.connected) {
          socket.emit('join_group', room, (res) => {
            console.log('[Chat] join_group response:', res);
          });
        } else {
          console.warn('[Chat] Socket not connected');
        }
      } else {
        setActiveGroup(null);
        if (room === 'public') {
          setActiveUser(null);
          await loadHistory('public');
        } else {
          try {
            const { data } = await api.get(`/users/${room}`);
            console.log('[Chat] User data:', data);
            setActiveUser(data?.user || { id: room, username: `用户${room}` });
            await loadHistory(room);
          } catch (e) {
            console.error('[Chat] Failed to load user:', e);
            setActiveUser({ id: room, username: `用户${room}` });
            await loadHistory(room);
          }
        }
      }
    } catch (err) {
      console.error('[Chat] switchRoom error:', err);
      setError('加载聊天失败，请刷新重试');
    }
  };

  // 初始化 Socket 连接和数据加载
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    console.log('[Chat] Component mounted, user:', user?.username);
    
    loadConversations();
    loadGroups();
    loadFriends();
    loadHistory('public');

    const s = io('/', { auth: { token: localStorage.getItem('token') } });
    setSocket(s);

    s.on('connect', () => {
      console.log('[Chat] Socket connected');
      setConnecting(false);
      s.emit('online');
    });

    s.on('disconnect', () => {
      console.log('[Chat] Socket disconnected');
      setConnecting(true);
    });

    s.on('online', (list) => {
      console.log('[Chat] Online users:', list);
      setOnlineUsers(list);
    });

    s.on('message', (msg) => {
      console.log('[Chat] Received message:', msg);
      const room = activeRoomRef.current;
      const isPublic = msg.room === 'public';
      const isGroupMsg = msg.room?.startsWith('group:');
      const isPrivateMsg = msg.room?.startsWith('private:');
      
      if (isPublic && room === 'public') {
        setMessages((prev) => [...prev, msg]);
      } else if (isGroupMsg) {
        const groupId = msg.room.replace('group:', '');
        if (room === `group:${groupId}`) {
          setMessages((prev) => [...prev, msg]);
        }
      } else if (isPrivateMsg) {
        // 私聊消息：检查是否是当前对话
        const parts = msg.room.replace('private:', '').split(':');
        const otherUserId = parts[1];
        if (room === `private:${otherUserId}` || room === otherUserId) {
          setMessages((prev) => [...prev, msg]);
          loadConversations();
        }
      }
    });

    s.on('connect_error', (err) => {
      console.error('[Chat] Socket connection error:', err);
      setError('聊天服务连接失败，请刷新重试');
      setConnecting(false);
    });

    return () => {
      console.log('[Chat] Cleaning up socket');
      s.disconnect();
    };
  }, []);

  // 处理 URL 参数中的 with 参数
  useEffect(() => {
    if (withId && user) {
      console.log('[Chat] URL with parameter:', withId);
      const id = parseInt(withId, 10);
      if (!isNaN(id)) {
        switchRoom(id);
      }
    }
  }, [withId, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !socket || !user) return;
    
    try {
      if (activeRoom.startsWith('group:')) {
        // 群聊消息
        const groupId = activeRoom.replace('group:', '');
        socket.emit('send_group_message', { groupId, content }, (res) => {
          if (res && res.error) {
            setError(res.error);
          } else {
            setInput('');
          }
        });
      } else if (activeRoom.startsWith('private:')) {
        // 私聊消息
        const recipientId = activeRoom.replace('private:', '');
        socket.emit('send_message', { recipientId, content }, (res) => {
          if (res && res.error) {
            setError(res.error);
          } else {
            setInput('');
          }
        });
      } else {
        // 公共消息
        socket.emit('send_message', { content }, (res) => {
          if (res && res.error) {
            setError(res.error);
          } else {
            setInput('');
          }
        });
      }
    } catch (err) {
      console.error('[Chat] sendMessage error:', err);
      setError(errMsg(err) || '发送失败');
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
      switchRoom(data.group.id, true);
    } catch (err) {
      console.error('[Chat] createGroup error:', err);
      setError(errMsg(err) || '创建群聊失败');
    } finally {
      setCreating(false);
    }
  };

  const onlineOthers = onlineUsers.filter((u) => u.id !== user?.id);
  
  // 计算标题
  let title = '公共聊天室';
  if (activeRoom.startsWith('group:')) {
    const group = groups.find(g => g.id === activeRoom.replace('group:', ''));
    title = group?.name || `群聊${activeRoom.replace('group:', '')}`;
  } else if (activeRoom.startsWith('private:')) {
    const userId = activeRoom.replace('private:', '');
    title = activeUser?.username || `用户${userId}`;
  }

  console.log('[Chat] Render:', {
    activeRoom,
    activeUser,
    activeGroup,
    messagesCount: messages.length,
    groupsCount: groups.length,
    friendsCount: friends.length,
    conversationsCount: conversations.length,
    connecting
  });

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
              onClick={() => switchRoom(g.id, true)}
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
              className={`chat-user-item ${activeRoom === `private:${c.user.id}` ? 'active' : ''}`}
              onClick={() => switchRoom(`private:${c.user.id}`)}
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
                onClick={() => switchRoom(`private:${f.id}`)}
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
            placeholder="输入消息，回车发送…"
            disabled={connecting}
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || connecting}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
