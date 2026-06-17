import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeStyle } from '../utils/badgeHelper';

// --- Helper to Map User Role to Theme Color ---
function getUserTheme(user) {
  const badge = user.badge ? user.badge.toUpperCase().trim() : '';
  if (user.is_admin === 1 || badge === 'ADMIN' || badge === 'АДМИН' || badge === 'OWNER' || badge === 'СОЗДАТЕЛЬ') {
    return { color: '#ef4444', icon: 'fa-shield-halved', label: 'Администрация' };
  }
  if (badge === 'DEV' || badge === 'DEVELOPER' || badge === 'РАЗРАБОТЧИК') {
    return { color: '#3b82f6', icon: 'fa-code', label: 'Разработчик' };
  }
  if (badge === 'VIP' || badge === 'ВИП' || badge === 'GOLD' || badge === 'PREMIUM' || badge === 'PREM' || badge === 'ПРЕМИУМ') {
    return { color: '#f59e0b', icon: 'fa-gem', label: 'VIP' };
  }
  if (badge === 'YOUTUBE' || badge === 'YT' || badge === 'MEDIA') {
    return { color: '#ff0000', icon: 'fa-play', label: 'Медиа' };
  }
  if (badge === 'SPONSOR' || badge === 'СПОНСОР') {
    return { color: '#ec4899', icon: 'fa-heart', label: 'Спонсор' };
  }
  if (badge === 'HELPER' || badge === 'ХЕЛПЕР' || badge === 'MOD' || badge === 'MODER' || badge === 'МОДЕРАТОР') {
    return { color: '#8b5cf6', icon: 'fa-user-shield', label: 'Модерация' };
  }
  return { color: '#10b981', icon: 'fa-user', label: 'Игрок' };
}

// --- Minecraft Head Avatar (Canvas) ---
function MinecraftAvatar({ skinDataUrl, size = 36, authServerUrl, borderColor = 'rgba(167, 139, 250, 0.3)' }) {
  const canvasRef = useRef(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (!skinDataUrl || useFallback) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#71717a';
      ctx.font = `${size / 2.2}px Montserrat`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const s = img.width / 64;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
      ctx.drawImage(img, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
    };
    img.onerror = () => setUseFallback(true);

    if (skinDataUrl.startsWith('/')) {
      const base = authServerUrl || 'https://mcauth.diverlin.ru';
      img.src = `${base}${skinDataUrl}`;
    } else {
      img.src = skinDataUrl;
    }
  }, [skinDataUrl, size, useFallback, authServerUrl]);

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{
        borderRadius: '8px',
        imageRendering: 'pixelated',
        border: `1.5px solid ${borderColor}`,
        display: 'block',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
      }} />
  );
}

// --- Metrics Summary Card ---
function SummaryCard({ title, value, icon, color }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(10, 10, 16, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
      }}
    >
      <div>
        <span style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>{title}</span>
        <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', fontFamily: 'Montserrat' }}>{value}</span>
      </div>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: `${color}15`, border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: '14px' }} />
      </div>
    </motion.div>
  );
}

// --- Quick Copy UUID Button ---
function QuickCopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title="Копировать UUID" style={{
      background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
      color: copied ? '#34d399' : '#71717a',
      width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', transition: 'all 0.2s', flexShrink: 0
    }}>
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
    </button>
  );
}

export default function AdminPage({ profile, active, onProfileUpdate }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState(null); // User currently being edited
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form states
  const [badgeVal, setBadgeVal] = useState('');
  const [isAdminVal, setIsAdminVal] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [authServerUrl, setAuthServerUrl] = useState('https://mcauth.diverlin.ru');
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.getAdminUsers();
      if (res.success) {
        setUsers(res.users || []);
      } else {
        setError(res.error || 'Не удалось загрузить список пользователей');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchUsers();
    }
  }, [active]);

  useEffect(() => {
    if (window.electronAPI.getAuthServerUrl) {
      window.electronAPI.getAuthServerUrl().then(url => {
        if (url) setAuthServerUrl(url);
      });
    }
  }, []);

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setBadgeVal(user.badge || '');
    setIsAdminVal(user.is_admin === 1);
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await window.electronAPI.updateAdminUser(selectedUser.id, {
        is_admin: isAdminVal ? 1 : 0,
        badge: badgeVal.trim() || null
      });

      if (res.success) {
        // Update local state
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_admin: isAdminVal ? 1 : 0, badge: badgeVal.trim() || null } : u));
        
        // If the edited user is the current logged-in user, update the global profile state!
        if (selectedUser.id === profile.id) {
          if (onProfileUpdate) {
            onProfileUpdate({
              is_admin: isAdminVal ? 1 : 0,
              badge: badgeVal.trim() || null
            });
          }
        }
        
        handleCloseEdit();
      } else {
        alert(res.error || 'Ошибка при обновлении пользователя');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === profile.id) {
      alert('Вы не можете удалить самого себя!');
      return;
    }
    if (!confirm(`Вы действительно хотите удалить пользователя ${user.username}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await window.electronAPI.deleteAdminUser(user.id);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        alert(res.error || 'Ошибка при удалении пользователя');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUsername.trim() || !createPassword.trim()) {
      setCreateError('Заполните все поля');
      return;
    }
    if (createPassword.length < 4) {
      setCreateError('Пароль должен быть не менее 4 символов');
      return;
    }

    setActionLoading(true);
    setCreateError(null);
    try {
      const res = await window.electronAPI.customRegister(createUsername.trim(), createPassword);
      if (res.success) {
        await fetchUsers(); // Рефетч списка пользователей
        setCreateUsername('');
        setCreatePassword('');
        setShowCreateModal(false);
      } else {
        setCreateError(res.error || 'Ошибка создания пользователя');
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const totalCount = users.length;
  const adminCount = users.filter(u => u.is_admin === 1).length;
  const badgedCount = users.filter(u => u.badge).length;
  const regularCount = users.filter(u => !u.is_admin && !u.badge).length;

  // Filter users based on search query and category tab
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.uuid && u.uuid.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (listFilter === 'all') return true;
    if (listFilter === 'admins') return u.is_admin === 1;
    if (listFilter === 'badged') return !!u.badge;
    if (listFilter === 'citizens') return !u.is_admin && !u.badge;
    return true;
  });

  const glassCard = {
    background: 'rgba(10, 10, 16, 0.45)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '13px',
    color: '#fff',
    padding: '11px 15px',
    outline: 'none',
    fontFamily: 'Montserrat',
    fontSize: '13px',
    fontWeight: 600,
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#fff', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{
          fontSize: '26px', fontWeight: 900, color: '#fff',
          letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
          textShadow: '0 4px 14px rgba(0,0,0,0.6)',
          fontFamily: 'Montserrat'
        }}>
          Админ-панель
        </h1>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button 
            whileHover={{ scale: 1.04, boxShadow: '0 0 15px rgba(16,185,129,0.25)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setCreateError(null); setShowCreateModal(true); }}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
              color: '#fff', padding: '9px 16px', borderRadius: '12px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
            }}>
            <i className="fa-solid fa-user-plus" /> Создать игрока
          </motion.button>

          <button onClick={fetchUsers} disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', padding: '9px 15px', borderRadius: '12px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} /> Обновить
          </button>
        </div>
      </div>

      {/* Metrics Summary Row */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <SummaryCard title="Всего аккаунтов" value={totalCount} icon="fa-users" color="#3b82f6" />
          <SummaryCard title="Администрация" value={adminCount} icon="fa-shield-halved" color="#ef4444" />
          <SummaryCard title="С бэйджами" value={badgedCount} icon="fa-gem" color="#f59e0b" />
          <SummaryCard title="Обычные игроки" value={regularCount} icon="fa-user" color="#10b981" />
        </div>
      )}

      {/* Main Container */}
      <div style={{ ...glassCard, flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '15px' }}>
        
        {/* Search Bar + Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            position: 'relative', 
            transition: 'all 0.3s ease-in-out',
            borderRadius: '13px',
            boxShadow: searchFocused ? '0 0 20px rgba(167, 139, 250, 0.15)' : 'none'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#a78bfa' : '#71717a', fontSize: '14px', transition: 'color 0.2s' }} />
            <input 
              type="text" 
              placeholder="Поиск игрока по нику или UUID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ 
                ...inputStyle, 
                paddingLeft: '44px',
                border: searchFocused ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            />
          </div>

          {/* Quick Filters Row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'admins', 'badged', 'citizens'].map(f => {
              const labels = { all: 'Все', admins: 'Администрация', badged: 'С бэйджами', citizens: 'Без статуса' };
              const icons = { all: 'fa-globe', admins: 'fa-shield-halved', badged: 'fa-gem', citizens: 'fa-user' };
              const colors = { all: '#3b82f6', admins: '#ef4444', badged: '#f59e0b', citizens: '#10b981' };
              const active = listFilter === f;
              const activeColor = colors[f];
              
              return (
                <motion.button
                  key={f}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setListFilter(f)}
                  style={{
                    background: active ? `${activeColor}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? activeColor + '44' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? activeColor : '#a1a1aa',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'Montserrat',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className={`fa-solid ${icons[f]}`} style={{ fontSize: '10px' }} />
                  <span>{labels[f]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Users List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '15px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                style={{ width: '36px', height: '36px', border: '3px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
              <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600, fontFamily: 'Montserrat' }}>Загрузка списка пользователей...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '10px', color: '#ef4444' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '36px' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Montserrat' }}>{error}</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: '#71717a' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Montserrat' }}>Пользователи не найдены</span>
            </div>
          ) : (
            <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <AnimatePresence mode="popLayout">
                {filteredUsers.map(user => {
                  const theme = getUserTheme(user);
                  return (
                    <motion.div 
                      layout
                      key={user.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex', alignItems: 'center', justifySelf: 'stretch',
                        background: 'rgba(255, 255, 255, 0.015)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        padding: '10px 14px', borderRadius: '14px', gap: '14px',
                        transition: 'background 0.2s, border-color 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${theme.color}35`;
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                      }}
                    >
                      <MinecraftAvatar 
                        skinDataUrl={user.skin_url} 
                        size={36} 
                        authServerUrl={authServerUrl} 
                        borderColor={`${theme.color}55`}
                      />
                      
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {user.badge && (
                            <span style={getBadgeStyle(user.badge)}>
                              {user.badge}
                            </span>
                          )}
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>{user.username}</span>
                          <span style={{
                            fontSize: '8px', fontWeight: 800,
                            color: theme.color,
                            background: `${theme.color}15`,
                            border: `1px solid ${theme.color}25`,
                            padding: '1.5px 7px', borderRadius: '10px', textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {theme.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#52525b', fontFamily: 'monospace', marginTop: '2.5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          UUID: {user.uuid}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px', zIndex: 1 }}>
                        <QuickCopyButton text={user.uuid} />
                        
                        <button onClick={() => handleOpenEdit(user)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                            fontSize: '11px'
                          }} title="Редактировать">
                          <i className="fa-solid fa-pen" />
                        </button>
                        
                        <button onClick={() => handleDeleteUser(user)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)',
                            color: '#f87171', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                            fontSize: '11px'
                          }} title="Удалить">
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 8, 0.65)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            borderRadius: '24px'
          }}>
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleSaveUser}
              style={{
                ...glassCard, padding: '25px', width: '320px',
                background: 'rgba(15, 15, 22, 0.96)',
                border: '1px solid rgba(167, 139, 250, 0.25)',
                display: 'flex', flexDirection: 'column', gap: '15px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'Montserrat' }}>Редактирование</span>
                <span style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 700, fontFamily: 'Montserrat' }}>{selectedUser.username}</span>
              </div>

              {/* Badge Field */}
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px' }}>
                  Бэйдж (префикс перед ником)
                </label>
                <input 
                  type="text" 
                  placeholder="Например: VIP, Dev, Admin (пусто = без бэйджа)"
                  value={badgeVal}
                  onChange={(e) => setBadgeVal(e.target.value)}
                  style={inputStyle}
                  maxLength={12}
                />
              </div>

              {/* Admin Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, fontFamily: 'Montserrat' }}>Права администратора</span>
                  <span style={{ display: 'block', fontSize: '10px', color: '#71717a', marginTop: '2px' }}>Доступ в эту панель</span>
                </div>
                <label style={{
                  position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer'
                }}>
                  <input 
                    type="checkbox" 
                    checked={isAdminVal}
                    onChange={(e) => setIsAdminVal(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: isAdminVal ? '#10b981' : 'rgba(255,255,255,0.1)',
                    borderRadius: '24px', transition: '0.3s',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '16px', width: '16px', left: isAdminVal ? '24px' : '4px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                    }} />
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={handleCloseEdit} disabled={actionLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#a1a1aa', fontWeight: 700, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'Montserrat'
                  }}>
                  Отмена
                </button>
                <button type="submit" disabled={actionLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'Montserrat',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                  }}>
                  {actionLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 8, 0.65)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            borderRadius: '24px'
          }}>
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleCreateUser}
              style={{
                ...glassCard, padding: '25px', width: '320px',
                background: 'rgba(15, 15, 22, 0.96)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex', flexDirection: 'column', gap: '15px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'Montserrat' }}>Создание игрока</span>
                <i className="fa-solid fa-user-plus" style={{ color: '#10b981' }} />
              </div>

              {/* Username field */}
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px' }}>
                  Никнейм игрока
                </label>
                <input 
                  type="text" 
                  placeholder="Введите ник..."
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Password field */}
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px' }}>
                  Пароль
                </label>
                <input 
                  type="password" 
                  placeholder="Минимум 4 символа"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Error box */}
              {createError && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171',
                  borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={actionLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#a1a1aa', fontWeight: 700, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'Montserrat'
                  }}>
                  Отмена
                </button>
                <button type="submit" disabled={actionLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'Montserrat',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                  }}>
                  {actionLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
