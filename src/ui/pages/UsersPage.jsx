import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeStyle, getBadgeText, getUserTheme } from '../utils/badgeHelper';
import { useTranslation } from '../utils/i18n';

// --- Minecraft Head Avatar ---
function MinecraftAvatar({ skinDataUrl, size = 56, authServerUrl, borderColor = 'rgba(167, 139, 250, 0.3)' }) {
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
        borderRadius: '14px',
        imageRendering: 'pixelated',
        border: `2px solid ${borderColor}`,
        display: 'block',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }} />
  );
}

// --- Player Card ---
function PlayerCard({ user, authServerUrl, onViewProfile, index, lang }) {
  const theme = getUserTheme(user, lang);

  // Stagger transition details
  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.03
      }
    }
  };

  const buttonVariants = {
    initial: { opacity: 0, y: 10, scale: 0.9 },
    hover: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 200, damping: 12 }
    }
  };

  const glowVariants = {
    initial: { opacity: 0.3, scale: 0.9 },
    hover: { 
      opacity: 0.8, 
      scale: 1.15,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={() => onViewProfile && onViewProfile(user)}
      style={{
        background: 'rgba(20, 20, 30, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        height: '270px',
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${theme.color}55`;
        e.currentTarget.style.boxShadow = `0 12px 30px ${theme.color}18, inset 0 0 12px ${theme.color}08`;
        e.currentTarget.style.background = 'rgba(20, 20, 30, 0.65)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.2)';
        e.currentTarget.style.background = 'rgba(20, 20, 30, 0.35)';
      }}
    >
      {/* Glow effect matching group theme */}
      <motion.div
        variants={glowVariants}
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          background: `radial-gradient(circle, ${theme.color}25 0%, transparent 70%)`,
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          filter: 'blur(15px)',
          zIndex: 0
        }}
      />

      {/* Decorative Top Accent Light */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${theme.color}, transparent)`,
        opacity: 0.7
      }} />

      {/* Avatar Area with Glow Frame */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <MinecraftAvatar 
          skinDataUrl={user.skin_url} 
          size={64} 
          authServerUrl={authServerUrl} 
          borderColor={`${theme.color}66`}
        />
      </div>

      {/* User Content */}
      <div style={{ textAlign: 'center', width: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Badge */}
        {user.badge && (
          <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <span style={getBadgeStyle(user.badge)}>{getBadgeText(user.badge)}</span>
          </div>
        )}
        
        {/* Username */}
        <div style={{
          fontSize: '15px', 
          fontWeight: 800, 
          color: '#fff',
          fontFamily: 'Montserrat',
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          letterSpacing: '0.3px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
        }}>
          {user.username}
        </div>

        {/* Group / Role Tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          marginTop: '6px',
          fontSize: '9px', fontWeight: 800,
          color: theme.color,
          background: `${theme.color}15`,
          border: `1px solid ${theme.color}25`,
          padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase',
          letterSpacing: '0.6px'
        }}>
          <i className={`fa-solid ${theme.icon}`} style={{ fontSize: '9px' }} />
          {theme.label}
        </div>
      </div>

      {/* Bio status (shortened) */}
      <div style={{ 
        width: '100%', 
        zIndex: 1, 
        minHeight: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {user.bio ? (
          <p style={{
            margin: 0, 
            color: '#a1a1aa', 
            fontSize: '10px', 
            lineHeight: '1.4',
            textAlign: 'center', 
            overflow: 'hidden', 
            display: '-webkit-box',
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical',
            maxWidth: '100%',
            fontStyle: 'italic'
          }}>
            «{user.bio}»
          </p>
        ) : (
          <span style={{ fontSize: '9.5px', color: '#52525b', fontStyle: 'italic' }}>
            {lang === 'ru' ? 'Нет статуса' : 'No status'}
          </span>
        )}
      </div>

      {/* Slide-up Action Button on Hover */}
      <motion.div
        variants={buttonVariants}
        style={{
          width: '100%',
          background: `linear-gradient(135deg, ${theme.color}25, ${theme.color}12)`,
          border: `1px solid ${theme.color}35`,
          color: '#fff',
          padding: '7px 12px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 800,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: `0 4px 10px ${theme.color}12`,
          fontFamily: 'Montserrat',
          zIndex: 1,
          marginTop: 'auto'
        }}
      >
        <span>{lang === 'ru' ? 'Профиль' : 'Profile'}</span>
        <i className="fa-solid fa-arrow-right-to-bracket" style={{ fontSize: '10px' }} />
      </motion.div>
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

  const glassCard = {
    background: 'rgba(10, 10, 16, 0.45)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#fff', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{
            fontSize: '26px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
            fontFamily: 'Montserrat'
          }}>
            {lang === 'ru' ? 'Игроки' : 'Players'}
          </h1>
          {!loading && !error && (
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', display: 'block' }}>
              {lang === 'ru' ? 'Найдено:' : 'Found:'} <strong style={{ color: '#a78bfa' }}>{filteredUsers.length}</strong> {lang === 'ru' ? (filteredUsers.length === 1 ? 'игрок' : 'игроков') : (filteredUsers.length === 1 ? 'player' : 'players')}
            </span>
          )}
        </div>

        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
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
            transition: 'background-color 0.2s, border-color 0.2s'
          }}>
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} /> 
          <span>{lang === 'ru' ? 'Обновить' : 'Refresh'}</span>
        </motion.button>
      </div>

      {/* Main Glass Panel */}
      <div style={{ ...glassCard, flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '20px' }}>

        {/* Search Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search Input Container */}
          <div style={{ 
            position: 'relative', 
            transition: 'all 0.3s ease-in-out',
            borderRadius: '14px',
            boxShadow: searchFocused ? '0 0 20px rgba(167, 139, 250, 0.15)' : 'none',
          }}>
            <i 
              className="fa-solid fa-magnifying-glass" 
              style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: searchFocused ? '#a78bfa' : '#71717a', 
                fontSize: '14px',
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
                background: 'rgba(255, 255, 255, 0.03)',
                border: searchFocused ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                color: '#fff',
                padding: '12px 16px 12px 44px',
                outline: 'none',
                fontFamily: 'Montserrat',
                fontSize: '13px',
                fontWeight: 600,
                width: '100%',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s, background-color 0.3s'
              }}
            />
          </div>
        </div>

        {/* Users Grid Area */}
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
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
              }}>
                <i className="fa-solid fa-user-slash" style={{ fontSize: '32px', color: '#71717a' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#a1a1aa', fontFamily: 'Montserrat', display: 'block', marginBottom: '4px' }}>
                  {lang === 'ru' ? 'Игроки не найдены' : 'No players found'}
                </span>
                <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 600 }}>
                  {lang === 'ru' ? 'Попробуйте изменить параметры поиска или фильтр' : 'Try changing the search terms or filter'}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              layout
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '16px',
                padding: '2px'
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
    </div>
  );
}
