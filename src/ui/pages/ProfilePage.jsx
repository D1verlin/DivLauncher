import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as skinview3d from 'skinview3d';
import { getBadgeStyle } from '../utils/badgeHelper';

// --- Minecraft Head Avatar (Canvas) ---
function MinecraftAvatar({ skinDataUrl, size = 48 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skinDataUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const s = img.width / 64;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      // Draw head base
      ctx.drawImage(img, 8*s, 8*s, 8*s, 8*s, 0, 0, size, size);
      // Draw head overlay
      ctx.drawImage(img, 40*s, 8*s, 8*s, 8*s, 0, 0, size, size);
    };
    img.src = skinDataUrl;
  }, [skinDataUrl, size]);

  if (!skinDataUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '12px',
        background: 'rgba(167,139,250,0.15)', border: '2px solid rgba(167,139,250,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: size / 2.2 }} />
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{
        borderRadius: '12px', imageRendering: 'pixelated',
        border: '2px solid rgba(16,185,129,0.4)', display: 'block'
      }} />
  );
}

// --- 3D Skin Viewer ---
function SkinViewer({ skinDataUrl, capeDataUrl, skinVariant }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: 210,
      height: 320
    });
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.5;
    viewer.zoom = 0.95;
    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.animation.speed = 0.5;
    viewer.renderer.setClearColor(0x000000, 0);
    viewerRef.current = viewer;
    return () => { viewer.dispose(); };
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;
    if (skinDataUrl) {
      viewerRef.current.loadSkin(skinDataUrl, { model: skinVariant }).catch(() => {});
    }
  }, [skinDataUrl, skinVariant]);

  useEffect(() => {
    if (!viewerRef.current) return;
    if (capeDataUrl) {
      viewerRef.current.loadCape(capeDataUrl).catch(() => {});
    } else {
      viewerRef.current.loadCape(null);
    }
  }, [capeDataUrl]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '14px' }} />;
}

// --- Info box ---
function InfoBox({ color = '#a1a1aa', icon = 'fa-solid fa-circle-info', children }) {
  return (
    <div style={{
      display: 'flex', gap: '9px', alignItems: 'flex-start', padding: '11px 14px',
      background: `${color}0c`, border: `1px solid ${color}22`, borderRadius: '11px',
    }}>
      <i className={icon} style={{ color, fontSize: '12px', marginTop: '1px', flexShrink: 0 }} />
      <span style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

// --- Animated Count / Odometer Component ---
function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; // 1 second
    const stepTime = 16; // 60 FPS
    const steps = duration / stepTime;
    const increment = value / steps;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function ProfilePage({ profile, isOwnProfile = true, onBack, onLogout, currentPack, modpacks = [] }) {
  const [skinUrl, setSkinUrl] = useState(null);
  const [capeUrl, setCapeUrl] = useState(null);
  const [skinVariant, setSkinVariant] = useState('classic'); // classic | slim
  
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null); 
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Bio states
  const [bioText, setBioText] = useState(profile.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioSaveLoading, setBioSaveLoading] = useState(false);

  // Password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null); // { type: 'success' | 'error', text: string }
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Calculate playtime stats
  const packStats = modpacks.map(pack => {
    const playtimeMs = parseInt(localStorage.getItem(`playtime_${pack.id}`) || '0', 10);
    return {
      id: pack.id,
      name: pack.name,
      icon: pack.icon,
      playtimeMs
    };
  });

  const serverPlaytimeSeconds = profile.stats?.playtime_seconds || 0;
  const hasServerStats = !!(profile.stats && (profile.stats.playtime_seconds > 0 || profile.stats.blocks_mined > 0 || profile.stats.mobs_killed > 0 || profile.stats.deaths > 0));

  const totalPlaytimeMs = isOwnProfile 
    ? (serverPlaytimeSeconds > 0 ? serverPlaytimeSeconds * 1000 : packStats.reduce((acc, curr) => acc + curr.playtimeMs, 0))
    : (serverPlaytimeSeconds * 1000);

  const totalPlaytimeHours = Math.floor(totalPlaytimeMs / 3600000);
  const totalPlaytimeMinutes = Math.floor((totalPlaytimeMs % 3600000) / 60000);

  // Calculate Rank based on playtime
  let playerRank = 'Новичок';
  let rankColor = '#a1a1aa';
  if (totalPlaytimeHours >= 50) {
    playerRank = 'Ветеран';
    rankColor = '#ef4444';
  } else if (totalPlaytimeHours >= 15) {
    playerRank = 'Мастер';
    rankColor = '#f59e0b';
  } else if (totalPlaytimeHours >= 3) {
    playerRank = 'Исследователь';
    rankColor = '#3b82f6';
  }

  // Load profile skin/cape data
  const loadSkinData = useCallback(async () => {
    if (!profile || !window.electronAPI.getSkinData) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getSkinData(profile.uuid);
      if (result.success && result.skinDataUrl) {
        setSkinUrl(result.skinDataUrl);
        setCapeUrl(result.capeDataUrl);
        setSkinVariant(result.model === 'slim' ? 'slim' : 'classic');
      } else {
        const steveResult = await window.electronAPI.getDefaultSkin();
        if (steveResult.success) {
          setSkinUrl(steveResult.skinDataUrl);
          setCapeUrl(null);
        }
      }
    } catch (e) {
      console.error('[ProfilePage] Error fetching skin data:', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadSkinData();
  }, [loadSkinData]);

  // Skin upload handler
  const handleUploadSkin = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadSkin(currentPack?.clientDir, profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: 'Скин успешно загружен на сервер!' });
        loadSkinData();
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || 'Ошибка загрузки скина' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Cape upload handler
  const handleUploadCape = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadCape(currentPack?.clientDir, profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: 'Плащ успешно загружен на сервер!' });
        loadSkinData();
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || 'Ошибка загрузки плаща' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Copy UUID
  const handleCopyUuid = () => {
    navigator.clipboard.writeText(profile.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  // Save Bio
  const handleSaveBio = async () => {
    setBioSaveLoading(true);
    try {
      const res = await window.electronAPI.updateBio(bioText.trim());
      if (res.success) {
        profile.bio = res.bio; // Update shared reference
        setIsEditingBio(false);
      } else {
        alert(res.error || 'Не удалось обновить статус');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBioSaveLoading(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 4) {
      setPasswordStatus({ type: 'error', text: 'Пароль должен быть не менее 4 символов' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await window.electronAPI.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPasswordStatus({ type: 'success', text: 'Пароль успешно изменен!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 3000);
      } else {
        setPasswordStatus({ type: 'error', text: res.error || 'Ошибка смены пароля' });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const glassCard = {
    background: 'rgba(10, 10, 16, 0.5)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '20px',
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    padding: '10px 14px',
    outline: 'none',
    fontFamily: 'Montserrat',
    fontSize: '12px',
    fontWeight: 600,
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isOwnProfile ? (
        <h1 style={{
          fontSize: '24px', fontWeight: 900, color: '#fff',
          letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px',
          textShadow: '0 4px 14px rgba(0,0,0,0.6)',
        }}>
          Личный кабинет
        </h1>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' }}>
          <motion.button
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'Montserrat',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-arrow-left" /> Назад
          </motion.button>
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}>
            Профиль игрока
          </h1>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* Left Column: 3D Skin viewer & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Skin card */}
          <div style={{ ...glassCard, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div style={{
              padding: '2px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(16,185,129,0.2))',
            }}>
              <div style={{
                background: 'radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.07) 0%, rgba(5,5,12,0.97) 70%)',
                borderRadius: '14px', overflow: 'hidden', width: '200px', height: '310px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                    style={{ width: '40px', height: '40px', border: '4px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
                ) : (
                  <SkinViewer skinDataUrl={skinUrl} capeDataUrl={capeUrl} skinVariant={skinVariant} />
                )}
              </div>
            </div>

            <div style={{
              width: '120px', height: '10px', marginTop: '-12px',
              background: 'radial-gradient(ellipse, rgba(167,139,250,0.4) 0%, transparent 70%)',
              filter: 'blur(4px)',
            }} />
          </div>

          {/* Upload card */}
          {isOwnProfile && (
            <div style={{ ...glassCard, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleUploadSkin}
                style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(124,58,237,0.08))',
                  border: '1px solid rgba(167,139,250,0.25)',
                  color: '#c4b5fd', padding: '11px', borderRadius: '11px',
                  cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                <i className="fa-solid fa-arrow-up-from-bracket" /> Загрузить скин
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleUploadCape}
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#34d399', padding: '11px', borderRadius: '11px',
                  cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                <i className="fa-solid fa-circle-chevron-up" /> Загрузить плащ
              </motion.button>

              {/* Constraints tooltip */}
              <span style={{ fontSize: '9px', color: '#52525b', textAlign: 'center', lineHeight: '1.4', marginTop: '2px' }}>
                PNG, скин 64x64 или 64x32
              </span>
            </div>
          )}
        </div>

        {/* Right Column: User details, Playtime, Security, Bio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* User Info Card */}
          <div style={{ ...glassCard, padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid rgba(167,139,250,0.2)' }}>
            <MinecraftAvatar skinDataUrl={skinUrl} size={54} />
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {profile.badge && (
                  <span style={getBadgeStyle(profile.badge)}>
                    {profile.badge}
                  </span>
                )}
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{profile.name}</span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: profile.is_admin ? '#10b981' : '#a78bfa',
                  background: profile.is_admin ? 'rgba(16,185,129,0.12)' : 'rgba(167,139,250,0.12)',
                  border: profile.is_admin ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(167,139,250,0.25)',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {profile.is_admin ? 'Админ' : 'Игрок'}
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: rankColor,
                  background: `${rankColor}12`,
                  border: `1px solid ${rankColor}25`,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {playerRank}
                </span>
              </div>
              
              {/* Clickable UUID field */}
              <div 
                onClick={handleCopyUuid}
                style={{ 
                  fontSize: '11px', color: '#71717a', marginTop: '6px', 
                  fontFamily: 'monospace', cursor: 'pointer', display: 'inline-flex', 
                  alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)',
                  padding: '2px 6px', borderRadius: '6px', transition: 'color 0.2s, background 0.2s'
                }}
                title="Нажмите, чтобы скопировать UUID"
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              >
                <span>UUID: {profile.uuid}</span>
                <i className="fa-solid fa-copy" style={{ fontSize: '10px' }} />
                
                <AnimatePresence>
                  {copiedUuid && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, marginLeft: '4px' }}
                    >
                      Скопировано!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {isOwnProfile && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onLogout}
                style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', padding: '10px 18px', borderRadius: '12px',
                  cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800,
                  fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                }}>
                <i className="fa-solid fa-right-from-bracket" /> Выйти
              </motion.button>
            )}
          </div>

          {/* Upload Status messages */}
          <AnimatePresence>
            {uploadStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  padding: '12px 14px', borderRadius: '12px', fontSize: '11px',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                  background: uploadStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  border: uploadStatus.type === 'error' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                  color: uploadStatus.type === 'error' ? '#f87171' : '#34d399',
                }}
              >
                <i className={`fa-solid ${uploadStatus.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`} />
                <span>{uploadStatus.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Bio / Custom Status Card */}
          <div style={{ ...glassCard, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <i className="fa-solid fa-quote-left" style={{ color: '#a78bfa', fontSize: '14px' }} />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px' }}>О себе / Статус</span>
              </div>
              {isOwnProfile && !isEditingBio && (
                <button 
                  onClick={() => setIsEditingBio(true)}
                  style={{
                    background: 'transparent', border: 'none', color: '#a78bfa',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Montserrat'
                  }}
                >
                  <i className="fa-solid fa-pencil" style={{ marginRight: '4px' }} /> Редактировать
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Расскажите о себе или напишите статус..." 
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  style={inputStyle}
                  maxLength={100}
                />
                <button 
                  onClick={handleSaveBio}
                  disabled={bioSaveLoading}
                  style={{
                    background: '#10b981', border: 'none', color: '#fff',
                    padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                  }}
                >
                  {bioSaveLoading ? '...' : 'ОК'}
                </button>
                <button 
                  onClick={() => { setIsEditingBio(false); setBioText(profile.bio || ''); }}
                  disabled={bioSaveLoading}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa',
                    padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700, fontFamily: 'Montserrat'
                  }}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <p style={{ margin: 0, color: profile.bio ? '#e4e4e7' : '#52525b', fontSize: '12px', fontStyle: profile.bio ? 'normal' : 'italic', lineHeight: 1.5 }}>
                {profile.bio || '«Статус пуст. Расскажите остальным игрокам, чем вы занимаетесь!»'}
              </p>
            )}
          </div>

          {/* Playtime & Game Stats Card */}
          <div style={{ ...glassCard, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <i className="fa-solid fa-chart-simple" style={{ color: '#3b82f6', fontSize: '14px' }} />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px' }}>Игровая статистика</span>
              </div>
              <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
                Всего наиграно: <strong style={{ color: '#3b82f6' }}><AnimatedNumber value={totalPlaytimeHours} /> ч {totalPlaytimeMinutes} мин</strong>
              </span>
            </div>

            {hasServerStats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: '14px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-cube" style={{ color: '#fbbf24', fontSize: '18px' }} />
                  <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>Блоков сломано</span>
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 800 }}><AnimatedNumber value={profile.stats.blocks_mined} /></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-skull" style={{ color: '#f87171', fontSize: '18px' }} />
                  <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>Моб-киллы</span>
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 800 }}><AnimatedNumber value={profile.stats.mobs_killed} /></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-heart-crack" style={{ color: '#ef4444', fontSize: '18px' }} />
                  <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>Смертей</span>
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 800 }}><AnimatedNumber value={profile.stats.deaths} /></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-trophy" style={{ color: '#fbbf24', fontSize: '18px' }} />
                  <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>Достижений</span>
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 800 }}>
                    <AnimatedNumber value={profile.stats.achievements_completed?.length || 0} />
                  </span>
                </div>
              </div>
            )}

            {hasServerStats && profile.stats.achievements_completed && profile.stats.achievements_completed.length > 0 && (
              <div style={{ marginTop: '0px' }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, outline: 'none', userSelect: 'none' }}>
                    Показать список достижений ({profile.stats.achievements_completed.length})
                  </summary>
                  <div style={{ 
                    display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', 
                    maxHeight: '100px', overflowY: 'auto', padding: '8px', 
                    background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {profile.stats.achievements_completed.map((ach, idx) => {
                      const formatAch = ach.replace('minecraft:', '').replace('story/', 'Сюжет: ').replace('nether/', 'Недры: ').replace('end/', 'Энд: ').replace('adventure/', 'Приключения: ').replace('husbandry/', 'Фермерство: ');
                      return (
                        <span key={idx} style={{ 
                          fontSize: '9px', background: 'rgba(59,130,246,0.12)', 
                          color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', 
                          padding: '2px 6px', borderRadius: '4px', fontWeight: 600
                        }}>
                          {formatAch}
                        </span>
                      );
                    })}
                  </div>
                </details>
              </div>
            )}

            {/* List of Modpacks and Playtime */}
            {isOwnProfile && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {packStats.map(pack => (
                  <div key={pack.id} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', 
                      background: 'rgba(255,255,255,0.02)', padding: '10px', 
                      borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' 
                    }}>
                    {pack.icon ? (
                      pack.icon.startsWith('fa-') ? (
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff' }}>
                          <i className={pack.icon} />
                        </div>
                      ) : (
                        <img src={pack.icon} alt={pack.name} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
                      )
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontWeight: 800 }}>
                        {pack.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pack.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>
                        Время: {Math.floor(pack.playtimeMs / 3600000)} ч {Math.floor((pack.playtimeMs % 3600000) / 60000)} м
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Password Card */}
          {isOwnProfile && (
            <div style={{ ...glassCard, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <i className="fa-solid fa-key" style={{ color: '#f59e0b', fontSize: '14px' }} />
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px' }}>Безопасность аккаунта</span>
                </div>
                <button 
                  onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordStatus(null); }}
                  style={{
                    background: showPasswordForm ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', 
                    border: `1px solid ${showPasswordForm ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, 
                    color: showPasswordForm ? '#f59e0b' : '#fff', padding: '6px 12px', borderRadius: '8px', 
                    cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Montserrat',
                    transition: 'all 0.2s'
                  }}
                >
                  {showPasswordForm ? 'Скрыть форму' : 'Сменить пароль'}
                </button>
              </div>

              <AnimatePresence>
                {showPasswordForm && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}
                    onSubmit={handleSavePassword}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '5px' }}>
                      <div>
                        <input 
                          type="password" 
                          placeholder="Текущий пароль" 
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <input 
                          type="password" 
                          placeholder="Новый пароль" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <input 
                          type="password" 
                          placeholder="Повторите новый" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button 
                        type="submit" 
                        disabled={passwordLoading}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff',
                          padding: '8px 20px', borderRadius: '10px', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                        }}
                      >
                        {passwordLoading ? 'Сохранение...' : 'Обновить пароль'}
                      </button>
                    </div>

                    {passwordStatus && (
                      <div style={{ 
                        padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        background: passwordStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                        border: passwordStatus.type === 'error' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(16,185,129,0.15)',
                        color: passwordStatus.type === 'error' ? '#f87171' : '#34d399'
                      }}>
                        {passwordStatus.text}
                      </div>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Sync warning */}
          <InfoBox color="#3b82f6" icon="fa-solid fa-info-circle">
            Скин и плащ синхронизируются с сервером авторизации и автоматически отображаются у всех игроков.
          </InfoBox>

        </div>
      </div>
    </div>
  );
}
