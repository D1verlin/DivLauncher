import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../utils/i18n';
import { getAvatarUrl } from '../utils/pathUtils';

const AUTH_SERVER = 'https://mcauth.diverlin.ru';

async function apiRequest(method, path, body, token) {
  const res = await fetch(`${AUTH_SERVER}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function Avatar({ user, size = 36 }) {
  const rawSrc = user?.avatar_url || null;
  const src = rawSrc ? getAvatarUrl(rawSrc) : null;
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : 'linear-gradient(135deg, #a855f7, #3b82f6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
      fontFamily: 'Montserrat', border: '1px solid rgba(255,255,255,0.15)'
    }}>
      {src ? <img src={src} alt={user.username || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

export default function ChatPage({ profile }) {
  const { lang } = useTranslation();
  const isRu = lang === 'ru';

  const [token, setToken] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Inline view modes: 'chat' | 'new-chat' | 'create-group' | 'group-members'
  const [rightView, setRightView] = useState('chat');

  // Search & Group Form State
  const [allUsers, setAllUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  // Group Members List
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const sseRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Token initialization
  useEffect(() => {
    if (window.electronAPI?.getWebToken) {
      window.electronAPI.getWebToken().then(t => setToken(t || ''));
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest('GET', '/api/chat/conversations', null, token);
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Chat load error:', e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) loadConversations(); }, [token, loadConversations]);

  // Load users for search
  useEffect(() => {
    if (!token) return;
    apiRequest('GET', '/api/chat/users', null, token)
      .then(u => setAllUsers(Array.isArray(u) ? u : []))
      .catch(() => {
        if (window.electronAPI?.getUsers) {
          window.electronAPI.getUsers().then(users => setAllUsers(Array.isArray(users) ? users : []));
        }
      });
  }, [token]);

  // SSE real-time events
  useEffect(() => {
    if (!token) return;
    const url = `${AUTH_SERVER}/api/chat/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === 'new_message') {
          const msg = payload.message;
          if (msg.conversation_id === activeConvId) {
            setMessages(prev => [...prev, msg]);
            setTimeout(scrollToBottom, 50);
          }
          setConversations(prev => prev.map(c =>
            c.id === msg.conversation_id
              ? { ...c, last_message: msg.content, last_message_at: msg.sent_at }
              : c
          ));
        }
      } catch (_) {}
    };
    return () => es.close();
  }, [token, activeConvId]);

  // Load messages on conversation change
  useEffect(() => {
    if (!activeConvId || !token) return;
    apiRequest('GET', `/api/chat/messages/${activeConvId}`, null, token)
      .then(data => {
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(scrollToBottom, 50);
      })
      .catch(() => {});
  }, [activeConvId, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvId || sendingMsg) return;
    setSendingMsg(true);
    const content = inputText.trim();
    setInputText('');
    try {
      const msg = await apiRequest('POST', '/api/chat/messages', { conversation_id: activeConvId, content }, token);
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 50);
    } catch (e) { setInputText(content); }
    setSendingMsg(false);
  };

  const startDirectChat = async (userId) => {
    try {
      const res = await apiRequest('POST', '/api/chat/conversations/direct', { user_id: userId }, token);
      setSearchUser('');
      await loadConversations();
      setActiveConvId(res.id);
      setRightView('chat');
    } catch (_) {}
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      const res = await apiRequest('POST', '/api/chat/conversations/group', {
        name: groupName,
        member_ids: selectedGroupUsers
      }, token);
      setGroupName('');
      setSelectedGroupUsers([]);
      await loadConversations();
      setActiveConvId(res.id);
      setRightView('chat');
    } catch (_) {}
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId || !token) return;
    const confirmText = isRu ? 'Вы уверены, что хотите удалить этот чат?' : 'Are you sure you want to delete this chat?';
    if (!window.confirm(confirmText)) return;
    try {
      await apiRequest('DELETE', `/api/chat/conversations/${activeConvId}`, null, token);
      setActiveConvId(null);
      setMessages([]);
      setRightView('chat');
      await loadConversations();
    } catch (e) { console.error('Delete chat error:', e); }
  };

  const loadGroupMembers = async () => {
    if (!activeConvId || !token) return;
    setRightView('group-members');
    setMembersLoading(true);
    try {
      const data = await apiRequest('GET', `/api/chat/conversations/${activeConvId}/members`, null, token);
      setGroupMembers(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Members load error:', e); }
    setMembersLoading(false);
  };

  const handleKickMember = async (userId) => {
    if (!activeConvId || !token) return;
    try {
      await apiRequest('DELETE', `/api/chat/conversations/${activeConvId}/members/${userId}`, null, token);
      setGroupMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e) { console.error('Kick member error:', e); }
  };

  const filteredUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u =>
    u.id !== profile?.id &&
    u.username?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const convTitle = (conv) => {
    if (!conv) return '';
    if (conv.type === 'direct') return conv.other?.username || '?';
    return conv.name || (isRu ? 'Группа' : 'Group');
  };

  const panelStyle = {
    background: 'rgba(15, 15, 23, 0.65)',
    backdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  };

  return (
    <div style={{
      display: 'flex', height: '100%', width: '100%', overflow: 'hidden',
      padding: '20px', gap: '16px', boxSizing: 'border-box'
    }}>

      {/* ── Левая панель: список диалогов (Элегантный стеклянный стиль) ── */}
      <div style={{ ...panelStyle, width: '300px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '18px', margin: 0, fontFamily: 'Montserrat', letterSpacing: '0.5px' }}>
            {isRu ? 'Сообщения' : 'Messages'}
          </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setRightView('new-chat')}
              title={isRu ? 'Новое сообщение' : 'New Message'}
              style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: rightView === 'new-chat' ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: '#10b981', cursor: 'pointer', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = rightView === 'new-chat' ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.12)'}
            >
              <i className="fa-solid fa-plus" />
            </button>
            <button
              onClick={() => setRightView('create-group')}
              title={isRu ? 'Создать группу' : 'Create Group'}
              style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: rightView === 'create-group' ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.25)',
                color: '#a855f7', cursor: 'pointer', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = rightView === 'create-group' ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.12)'}
            >
              <i className="fa-solid fa-users" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#71717a', padding: '20px 0' }}>
              <i className="fa-solid fa-spinner fa-spin" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{isRu ? 'Загрузка...' : 'Loading...'}</span>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ color: '#71717a', fontSize: '13px', fontWeight: 600, textAlign: 'center', padding: '30px 0' }}>
              {isRu ? 'Нет диалогов. Нажмите + чтобы начать.' : 'No conversations. Click + to start.'}
            </div>
          ) : conversations.map(conv => {
            const isActive = activeConvId === conv.id && rightView === 'chat';
            return (
              <div key={conv.id}
                onClick={() => { setActiveConvId(conv.id); setRightView('chat'); }}
                style={{
                  background: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '14px', padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                {conv.type === 'direct'
                  ? <Avatar user={conv.other} size={38} />
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <i className="fa-solid fa-users" style={{ color: '#fff', fontSize: '15px' }} />
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Montserrat' }}>
                    {convTitle(conv)}
                  </p>
                  {conv.last_message && (
                    <p style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_message}
                    </p>
                  )}
                </div>
                {conv.last_message_at && (
                  <span style={{ color: '#71717a', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{formatTime(conv.last_message_at)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Правая панель: Содержимое ── */}
      <div style={{ ...panelStyle, flex: 1, minWidth: 0 }}>

        {/* РЕЖИМ: Новый личный диалог */}
        {rightView === 'new-chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <button onClick={() => setRightView('chat')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <i className="fa-solid fa-arrow-left" /> {isRu ? 'Назад' : 'Back'}
              </button>
              <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '16px', margin: 0, fontFamily: 'Montserrat' }}>
                {isRu ? 'Начать личный диалог' : 'Start Direct Chat'}
              </h3>
            </div>

            <input
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder={isRu ? 'Поиск игрока по имени...' : 'Search user by name...'}
              style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff', fontSize: '13px', outline: 'none' }}
            />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => (
                <div key={u.id}
                  onClick={() => startDirectChat(u.id)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <Avatar user={u} size={40} />
                  <div>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: 'Montserrat' }}>{u.username}</p>
                    <p style={{ color: u.current_activity === 'offline' ? '#71717a' : '#10b981', fontSize: '11px', fontWeight: 700, margin: '2px 0 0 0' }}>
                      {u.current_activity === 'offline' ? (isRu ? '● Офлайн' : '● Offline') : (isRu ? '● Онлайн' : '● Online')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* РЕЖИМ: Создание группового чата */}
        {rightView === 'create-group' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <button onClick={() => setRightView('chat')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <i className="fa-solid fa-arrow-left" /> {isRu ? 'Назад' : 'Back'}
              </button>
              <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '16px', margin: 0, fontFamily: 'Montserrat' }}>
                {isRu ? 'Создание группы' : 'Create Group'}
              </h3>
            </div>

            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder={isRu ? 'Название группы...' : 'Group name...'}
              style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: '#fff', fontSize: '13px', outline: 'none' }}
            />

            <p style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: 700, margin: 0, fontFamily: 'Montserrat' }}>
              {isRu ? 'Выберите участников группы:' : 'Select group members:'}
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(Array.isArray(allUsers) ? allUsers : []).filter(u => u.id !== profile?.id).map(u => {
                const selected = selectedGroupUsers.includes(u.id);
                return (
                  <div key={u.id}
                    onClick={() => setSelectedGroupUsers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    style={{
                      background: selected ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                      border: selected ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar user={u} size={36} />
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{u.username}</span>
                    </div>
                    {selected && <i className="fa-solid fa-check" style={{ color: '#a855f7', fontSize: '14px' }} />}
                  </div>
                );
              })}
            </div>

            <button
              onClick={createGroup} disabled={!groupName.trim() || selectedGroupUsers.length === 0}
              style={{
                background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', color: '#fff',
                borderRadius: '14px', padding: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                fontFamily: 'Montserrat', opacity: (!groupName.trim() || selectedGroupUsers.length === 0) ? 0.5 : 1, transition: 'all 0.2s'
              }}>
              {isRu ? 'Создать группу' : 'Create Group'}
            </button>
          </div>
        )}

        {/* РЕЖИМ: Просмотр и управление участниками группы */}
        {rightView === 'group-members' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <button onClick={() => setRightView('chat')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <i className="fa-solid fa-arrow-left" /> {isRu ? 'Назад к чату' : 'Back to chat'}
              </button>
              <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '16px', margin: 0, fontFamily: 'Montserrat' }}>
                {isRu ? 'Участники группы' : 'Group Members'} ({convTitle(activeConv)})
              </h3>
            </div>

            {membersLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#71717a', padding: '20px 0' }}>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>{isRu ? 'Загрузка участников...' : 'Loading members...'}</span>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupMembers.map(member => {
                  const isCreator = activeConv?.created_by === member.id;
                  const canKick = (activeConv?.created_by === profile?.id) && (member.id !== profile?.id);
                  return (
                    <div key={member.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px', padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar user={member} size={38} />
                        <div>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                            {member.username} {isCreator && <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 800 }}>({isRu ? 'Создатель' : 'Creator'})</span>}
                          </p>
                          <p style={{ color: member.current_activity === 'offline' ? '#71717a' : '#10b981', fontSize: '11px', fontWeight: 600, margin: '2px 0 0 0' }}>
                            {member.current_activity === 'offline' ? (isRu ? '● Офлайн' : '● Offline') : (isRu ? '● Онлайн' : '● Online')}
                          </p>
                        </div>
                      </div>
                      {canKick && (
                        <button
                          onClick={() => handleKickMember(member.id)}
                          title={isRu ? 'Исключить из группы' : 'Kick from Group'}
                          style={{
                            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', borderRadius: '8px', padding: '6px 12px',
                            cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Montserrat',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        >
                          {isRu ? 'Исключить' : 'Kick'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* РЕЖИМ: Обычная переписка */}
        {rightView === 'chat' && (
          activeConv ? (
            <>
              {/* Header диалога */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {activeConv.type === 'direct'
                    ? <Avatar user={activeConv.other} size={38} />
                    : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
                        <i className="fa-solid fa-users" style={{ color: '#fff', fontSize: '14px' }} />
                      </div>
                  }
                  <div>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: 0, fontFamily: 'Montserrat' }}>
                      {convTitle(activeConv)}
                    </p>
                    {activeConv.type === 'direct' && activeConv.other?.current_activity && (
                      <p style={{ color: activeConv.other.current_activity === 'offline' ? '#71717a' : '#10b981', fontSize: '11px', fontWeight: 700, margin: '2px 0 0 0' }}>
                        {activeConv.other.current_activity === 'offline' ? (isRu ? '● Офлайн' : '● Offline') : (isRu ? '● Онлайн' : '● Online')}
                      </p>
                    )}
                    {activeConv.type === 'group' && (
                      <p style={{ color: '#a855f7', fontSize: '11px', fontWeight: 700, margin: '2px 0 0 0' }}>
                        {isRu ? 'Групповой чат' : 'Group Chat'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Кнопки действий: Участники группы + Удалить чат */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeConv.type === 'group' && (
                    <button
                      onClick={loadGroupMembers}
                      title={isRu ? 'Участники группы' : 'Group Members'}
                      style={{
                        background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
                        color: '#a855f7', borderRadius: '10px', padding: '8px 12px',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Montserrat',
                        display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.12)'}
                    >
                      <i className="fa-solid fa-users" />
                      <span>{isRu ? 'Участники' : 'Members'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleDeleteConversation}
                    title={isRu ? 'Удалить чат' : 'Delete Chat'}
                    style={{
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171', borderRadius: '10px', padding: '8px 12px',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Montserrat',
                      display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>{isRu ? 'Удалить' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* Сообщения */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                {messages.map((msg) => {
                  const isMe = msg.sender_id === profile?.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-end' }}>
                      {!isMe && <Avatar user={{ username: msg.sender_name, avatar_url: msg.avatar_url }} size={30} />}
                      <div style={{
                        maxWidth: '68%',
                        background: isMe
                          ? 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))'
                          : 'rgba(255, 255, 255, 0.07)',
                        backdropFilter: isMe ? 'none' : 'blur(10px)',
                        border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '12px 16px', boxShadow: isMe ? '0 4px 14px rgba(37,99,235,0.3)' : '0 4px 14px rgba(0,0,0,0.2)'
                      }}>
                        {!isMe && (
                          <p style={{ color: '#c084fc', fontSize: '12px', fontWeight: 800, margin: '0 0 4px 0', fontFamily: 'Montserrat' }}>
                            {msg.sender_name}
                          </p>
                        )}
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 500, margin: 0, lineHeight: '1.5', wordBreak: 'break-word' }}>
                          {msg.content}
                        </p>
                        <p style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#71717a', fontSize: '10px', fontWeight: 700, margin: '6px 0 0 0', textAlign: isMe ? 'right' : 'left' }}>
                          {formatTime(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input отправки сообщений */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={isRu ? 'Написать сообщение...' : 'Type a message...'}
                  style={{
                    flex: 1, background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px', padding: '12px 16px', color: '#fff', fontSize: '13px',
                    fontFamily: 'inherit', outline: 'none'
                  }}
                />
                <button
                  onClick={sendMessage} disabled={!inputText.trim() || sendingMsg}
                  style={{
                    width: '46px', height: '46px', borderRadius: '16px', border: 'none',
                    background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    opacity: !inputText.trim() ? 0.4 : 1, flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
                  }}
                  onMouseEnter={e => { if (inputText.trim()) e.currentTarget.style.background = '#2563eb'; }}
                  onMouseLeave={e => { if (inputText.trim()) e.currentTarget.style.background = 'linear-gradient(135deg,#3b82f6,#2563eb)'; }}
                >
                  <i className="fa-solid fa-paper-plane" />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-regular fa-comment-dots" style={{ color: '#52525b', fontSize: '26px' }} />
              </div>
              <p style={{ color: '#71717a', fontWeight: 700, fontSize: '14px', textAlign: 'center', fontFamily: 'Montserrat' }}>
                {isRu ? 'Выберите диалог или нажмите + для создания' : 'Select a conversation or click + to start'}
              </p>
            </div>
          )
        )}
      </div>

    </div>
  );
}
