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
  const [activeRoom, setActiveRoom] = useState('public');
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);

  const activeRoomRef = useRef('public');
  activeRoomRef.current = activeRoom;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async (room) => {
    try {
      if (room === 'public') {
        const { data } = await api.get('/messages/history');
        setMessages(data.messages);
      } else {
        const { data } = await api.get('/messages/history', { params: { with: room } });
        setMessages(data.messages);
      }
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const loadConversations = () => {
    api.get('/messages/conversations').then((res) => setConversations(res.data.conversations)).catch(() => {});
  };

  const switchRoom = async (room) => {
    setActiveRoom(room);
    setError('');
    if (room === 'public') {
      setActiveUser(null);
    } else {
      try {
        const { data } = await api.get(`/users/${room}`);
        setActiveUser(data.user);
      } catch (e) {
        setActiveUser({ id: room, username: `用户${room}` });
      }
    }
    await loadHistory(room);
    setInput('');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadConversations();
    loadHistory('public');

    const s = io('/', { auth: { token: localStorage.getItem('token') } });
    setSocket(s);

    s.on('online', (list) => setOnlineUsers(list));

    s.on('message', (msg) => {
      const room = activeRoomRef.current;
      const isPublic = msg.room === 'public';
      const isCurrent =
        (room === 'public' && isPublic) ||
        (room !== 'public' && msg.room === privateRoom(user.id, room));
      if (isCurrent) {
        setMessages((prev) => [...prev, msg]);
      }
      if (!isPublic) loadConversations();
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
    if (activeRoom !== 'public') payload.recipientId = activeRoom;
    socket.emit('send_message', payload, (res) => {
      if (res && res.error) {
        setError(res.error);
      } else {
        setInput('');
      }
    });
  };

  const onlineOthers = onlineUsers.filter((u) => u.id !== user?.id);
  const title = activeRoom === 'public' ? '公共聊天室' : `与 ${activeUser?.username || '用户'} 私聊`;

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
          <div className="title">在线用户（{onlineOthers.length}）</div>
          {onlineOthers.length === 0 && (
            <div className="chat-user-item" style={{ color: 'var(--text-muted)' }}>暂无在线用户</div>
          )}
          {onlineOthers.map((u) => (
            <div
              key={u.id}
              className={`chat-user-item ${activeRoom === u.id ? 'active' : ''}`}
              onClick={() => switchRoom(u.id)}
            >
              <Avatar name={u.username} color={u.avatarColor} />
              <span>{u.username}</span>
              <span className="online-dot" />
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
      </div>

      <div className="chat-panel">
        <div className="chat-header">{title}</div>
        {error && <div className="error-banner" style={{ margin: 8 }}>{error}</div>}
        {connecting && <div className="empty-state" style={{ padding: 8 }}>连接中…</div>}
        <div className="chat-messages">
          {messages.length === 0 && !connecting && (
            <div className="empty-state">暂无消息，来说点什么吧。</div>
          )}
          {messages.map((m) => {
            const own = m.sender && m.sender.id === user?.id;
            return (
              <div key={m.id} className={`chat-msg ${own ? 'own' : ''}`}>
                {!own && <Avatar name={m.sender?.username} color={m.sender?.avatarColor} />}
                <div>
                  {!own && (
                    <div className="chat-msg-meta">
                      {m.sender?.username} · {formatTime(m.createdAt)}
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
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || connecting}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
