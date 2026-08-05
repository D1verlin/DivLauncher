import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeStyle, getBadgeText } from '../utils/badgeHelper';
import { useTranslation } from '../utils/i18n';

// --- Minecraft Head Avatar ---
function MinecraftAvatar({ skinDataUrl, size = 56, authServerUrl }) {
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
        imageRendering: 'pixelated',
        display: 'block'
      }} />
  );
}

// --- Player Card ---
function PlayerCard({ user, authServerUrl, onViewProfile, index, lang }) {
  const avatarBorder = user.avatar_border_color || '#a78bfa';

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 140,
        damping: 18,
        delay: Math.min(index * 0.025, 0.25)
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.98 }}
      onClick={() => onViewProfile && onViewProfile(user)}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '22px',
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.25s ease',
        boxSizing: 'border-box',
        height: '245px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.35)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* 1. Avatar Container (68x68 Box) */}
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '18px',
        border: `3px solid ${avatarBorder}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        flexShrink: 0
      }}>
        {user.avatar_type === 'custom' && user.avatar_url ? (
          <img 
            src={user.avatar_url.startsWith('/') ? (authServerUrl || 'https://mcauth.diverlin.ru') + user.avatar_url : user.avatar_url} 
            alt="Avatar" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <MinecraftAvatar 
            skinDataUrl={user.skin_url} 
            size={62} 
            authServerUrl={authServerUrl} 
          />
        )}
      </div>

      {/* 2. User Info Block */}
      <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        {/* Badge (Only rendered if present, no extra gap for users without badges) */}
        {user.badge && (
          <span style={getBadgeStyle(user.badge)}>{getBadgeText(user.badge)}</span>
        )}
        
        {/* Username */}
        <div style={{
          fontSize: '15px', 
          fontWeight: 900, 
          color: '#fff',
          fontFamily: 'Montserrat',
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          letterSpacing: '0.3px',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.6)',
          lineHeight: '20px'
        }}>
          {user.username}
        </div>

        {/* Role Tag & Activity Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: user.is_admin ? '#10b981' : '#a78bfa',
            background: user.is_admin ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.15)',
            border: user.is_admin ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(167,139,250,0.3)',
            padding: '2px 8px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {user.is_admin ? (lang === 'ru' ? 'Администратор' : 'Administrator') : (lang === 'ru' ? 'Игрок' : 'Player')}
          </span>

          {/* Activity Status Pill */}
          {user.current_activity === 'playing' ? (
            <span style={{
              fontSize: '9px', fontWeight: 800, color: '#c084fc',
              background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.35)',
              padding: '2px 8px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px',
              maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }} title={user.current_game ? `Играет в ${user.current_game}` : 'В игре'}>
              <i className="fa-solid fa-gamepad" style={{ fontSize: '9px' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.current_game ? `${lang === 'ru' ? 'Играет в ' : 'Playing '}${user.current_game}` : (lang === 'ru' ? 'В игре' : 'In game')}
              </span>
            </span>
          ) : user.current_activity === 'online' || user.current_activity === 'launcher' ? (
            <span style={{
              fontSize: '9px', fontWeight: 800, color: '#34d399',
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
              padding: '2px 8px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <i className="fa-solid fa-circle" style={{ fontSize: '5px', color: '#10b981' }} />
              {lang === 'ru' ? 'В сети' : 'Online'}
            </span>
          ) : (
            <span style={{
              fontSize: '9px', fontWeight: 700, color: '#a1a1aa',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '2px 8px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <i className="fa-solid fa-circle" style={{ fontSize: '5px', color: '#71717a' }} />
              {lang === 'ru' ? 'Офлайн' : 'Offline'}
            </span>
          )}
        </div>
      </div>

      {/* 3. Status Message */}
      <div style={{ 
        width: '100%', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {user.status_text ? (
          <div style={{
            color: '#e4e4e7', 
            fontSize: '10.5px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            maxWidth: '100%',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px 8px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{ fontSize: '12px' }}>{user.status_emoji || '🎮'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.status_text}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '10px', color: '#52525b', fontStyle: 'italic' }}>
            {lang === 'ru' ? 'Без статуса' : 'No status'}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// --- Users Page ---
export default function UsersPage({ onViewProfile, active }) {
  const { lang } = useTranslation();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authServerUrl, setAuthServerUrl] = useState('https://mcauth.diverlin.ru');
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.getUsers();
      if (res.success) {
        setUsers(res.users || []);
      } else {
        setError(res.error || (lang === 'ru' ? 'Не удалось загрузить список игроков' : 'Failed to load players list'));
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

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#fff', position: 'relative' }}>
      
      {/* Header: Title on left, Search in middle, Refresh button on right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Title & Count */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
            fontFamily: 'Montserrat'
          }}>
            {lang === 'ru' ? 'Игроки' : 'Players'}
          </h1>
          {!loading && !error && (
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <strong style={{ color: '#a78bfa' }}>{filteredUsers.length}</strong> {lang === 'ru' ? (filteredUsers.length === 1 ? 'игрок' : 'игроков') : (filteredUsers.length === 1 ? 'player' : 'players')}
            </span>
          )}
        </div>

        {/* Search Input in Middle */}
        <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
          <i 
            className="fa-solid fa-magnifying-glass" 
            style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: searchFocused ? '#a78bfa' : '#71717a', 
              fontSize: '13px',
              transition: 'color 0.3s'
            }} 
          />
          <input
            type="text"
            placeholder={lang === 'ru' ? 'Поиск игрока по нику...' : 'Search player by nickname...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ 
              background: 'rgba(255, 255, 255, 0.04)',
              border: searchFocused ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              color: '#fff',
              padding: '10px 16px 10px 42px',
              outline: 'none',
              fontFamily: 'Montserrat',
              fontSize: '12px',
              fontWeight: 600,
              width: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.25s ease'
            }}
          />
        </div>

        {/* Refresh Button on Right */}
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={fetchUsers} 
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff', 
            padding: '10px 18px', 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontSize: '12px', 
            fontWeight: 800, 
            fontFamily: 'Montserrat',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            transition: 'all 0.2s'
          }}>
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} /> 
          <span>{lang === 'ru' ? 'Обновить' : 'Refresh'}</span>
        </motion.button>
      </div>

      {/* Main Grid Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              style={{ width: '38px', height: '38px', border: '3px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600, fontFamily: 'Montserrat' }}>{lang === 'ru' ? 'Загрузка списка игроков...' : 'Loading players list...'}</span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#ef4444' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '38px', opacity: 0.8 }} />
            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Montserrat' }}>{error}</span>
            <button onClick={fetchUsers} style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat', marginTop: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}>
              {lang === 'ru' ? 'Повторить попытку' : 'Retry'}
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#52525b' }}
          >
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-user-slash" style={{ fontSize: '32px', color: '#71717a' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#a1a1aa', fontFamily: 'Montserrat', display: 'block', marginBottom: '4px' }}>
                {lang === 'ru' ? 'Игроки не найдены' : 'No players found'}
              </span>
              <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>
                {lang === 'ru' ? 'Попробуйте изменить параметры поиска' : 'Try changing the search query'}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            layout
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: '18px',
              padding: '10px 4px 24px 4px'
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, idx) => (
                <PlayerCard
                  key={user.username}
                  user={user}
                  authServerUrl={authServerUrl}
                  onViewProfile={onViewProfile}
                  index={idx}
                  lang={lang}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
