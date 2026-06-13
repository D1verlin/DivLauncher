import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as skinview3d from 'skinview3d';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Профиль', icon: 'fa-solid fa-circle-user',    color: '#a78bfa' },
  { id: 'game',    label: 'Игра',    icon: 'fa-solid fa-gamepad',         color: '#10b981' },
  { id: 'java',    label: 'Java',    icon: 'fa-solid fa-mug-hot',         color: '#ef4444' },
  { id: 'network', label: 'Сеть',   icon: 'fa-solid fa-tower-broadcast',  color: '#3b82f6' },
  { id: 'misc',    label: 'Прочее', icon: 'fa-solid fa-gear',             color: '#f59e0b' },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(10, 10, 16, 0.5)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  borderRadius: '20px',
};

const glassInput = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '13px',
  color: '#fff',
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block',
  color: '#52525b',
  fontSize: '10px',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: '8px',
  letterSpacing: '1.6px',
};

// ─── Confirm Modal (заменяет window.confirm, который не работает в Electron без frame) ──

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 16 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{ ...glassCard, padding: '26px', maxWidth: '380px', width: '90%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '15px' }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: '14px', marginBottom: '2px' }}>{title}</p>
            <p style={{ color: '#71717a', fontWeight: 600, fontSize: '12px' }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '11px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#a1a1aa', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 700, fontSize: '13px',
            }}>
            Отмена
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '11px',
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.14)',
              color: '#f87171', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '13px',
            }}>
            Сбросить
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Section({ title, icon, color, children }) {
  return (
    <div style={{ ...glassCard, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: `${color}18`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={icon} style={{ color, fontSize: '12px' }} />
        </div>
        <span style={{ color: '#e4e4e7', fontWeight: 800, fontSize: '12px' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>{children}</div>
    </div>
  );
}

function Field({ label, children, row = false }) {
  if (row) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        {children}
      </div>
    );
  }
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, color = '#10b981' }) {
  return (
    <motion.div onClick={() => onChange(!value)} whileTap={{ scale: 0.9 }}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: value ? color : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.25s',
        boxShadow: value ? `0 0 10px ${color}50` : 'none',
      }}>
      <motion.div animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{ width: '18px', height: '18px', borderRadius: '9px', background: '#fff',
                 position: 'absolute', top: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
    </motion.div>
  );
}

function SegmentControl({ value, options, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)',
      padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <motion.button key={opt.value} onClick={() => onChange(opt.value)}
            whileHover={{ scale: active ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: active ? `${opt.color}1e` : 'transparent',
              color: active ? opt.color : '#52525b',
              fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              transition: 'all 0.2s', outline: active ? `1px solid ${opt.color}35` : 'none',
            }}>
            <i className={opt.icon} style={{ fontSize: '12px' }} />
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function PresetBtn({ active, color, onClick, children }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={onClick}
      style={{
        background: active ? `${color}1e` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
        color: active ? color : '#3f3f46', padding: '5px 11px', borderRadius: '8px',
        cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
        transition: 'all 0.18s',
      }}>
      {children}
    </motion.button>
  );
}

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

// ─── Status Toast ─────────────────────────────────────────────────────────────

function StatusToast({ status }) {
  // status: null | { type: 'loading'|'success'|'error', text: string }
  const colors = { loading: '#f59e0b', success: '#10b981', error: '#ef4444' };
  const icons  = { loading: 'fa-solid fa-circle-notch', success: 'fa-solid fa-circle-check', error: 'fa-solid fa-circle-xmark' };
  if (!status) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        color: colors[status.type], fontSize: '11px', fontWeight: 700,
      }}
    >
      <motion.i className={icons[status.type]}
        animate={status.type === 'loading' ? { rotate: 360 } : {}}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ fontSize: '12px' }}
      />
      {status.text}
    </motion.div>
  );
}

// ─── Minecraft Avatar (Canvas) ────────────────────────────────────────────────

function MinecraftAvatar({ skinDataUrl, size = 44 }) {
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
      ctx.drawImage(img, 8*s, 8*s, 8*s, 8*s, 0, 0, size, size);
      ctx.drawImage(img, 40*s, 8*s, 8*s, 8*s, 0, 0, size, size);
    };
    img.src = skinDataUrl;
  }, [skinDataUrl, size]);

  if (!skinDataUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '10px',
        background: 'rgba(167,139,250,0.15)', border: '2px solid rgba(167,139,250,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: size / 2.5 }} />
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ borderRadius: '10px', imageRendering: 'pixelated',
               border: '2px solid rgba(16,185,129,0.4)', display: 'block' }} />
  );
}

// ─── 3D Skin Viewer ───────────────────────────────────────────────────────────

function SkinViewer({ skinDataUrl }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new skinview3d.SkinViewer({ canvas: canvasRef.current, width: 190, height: 290 });
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.6;
    viewer.zoom = 0.88;
    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.animation.speed = 0.6;
    viewer.renderer.setClearColor(0x000000, 0);
    viewerRef.current = viewer;
    return () => { viewer.dispose(); };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !skinDataUrl) return;
    viewerRef.current.loadSkin(skinDataUrl).catch(() => {});
  }, [skinDataUrl]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '10px' }} />;
}

// ─── Microsoft Login Card ─────────────────────────────────────────────────────

function MicrosoftCard({ profile, loading, loadingSkin, onLogin, onLogout }) {
  if (profile) {
    return (
      <div style={{
        ...glassCard, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <MinecraftAvatar skinDataUrl={profile.skinDataUrl} size={44} />
          <div style={{
            position: 'absolute', bottom: '-3px', right: '-3px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: '#10b981', border: '2px solid rgba(10,10,16,0.9)',
          }} />
        </div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: '14px', marginBottom: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.name}
          </p>
          <p style={{ color: loadingSkin ? '#f59e0b' : '#10b981', fontSize: '10px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {loadingSkin ? '⟳ Загрузка скина...' : '✓ Xbox Live · Подключён'}
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onLogout}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', padding: '8px 12px', borderRadius: '9px',
            cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800,
            fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          }}>
          <i className="fa-solid fa-right-from-bracket" /> Выйти
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onLogin}
      disabled={loading}
      style={{
        width: '100%', padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.13), rgba(37,99,235,0.08))',
        border: '1px solid rgba(59,130,246,0.28)', borderRadius: '13px',
        cursor: loading ? 'wait' : 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '13px',
        color: loading ? '#52525b' : '#60a5fa',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        transition: 'color 0.2s',
      }}>
      {loading ? (
        <>
          <motion.i className="fa-solid fa-circle-notch"
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
          Подключение к Xbox...
        </>
      ) : (
        <>
          <i className="fa-solid fa-right-to-bracket" style={{ fontSize: '14px' }} />
          Войти через Xbox Live
        </>
      )}
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage({ currentPack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [showConfirm, setShowConfirm] = useState(false);

  // Skin
  const [defaultSkinUrl, setDefaultSkinUrl] = useState(null);
  const [skinUrl,   setSkinUrl]   = useState(localStorage.getItem('launcher_skin_url')  || '');
  const [skinName,  setSkinName]  = useState(localStorage.getItem('launcher_skin_name') || 'Steve (по умолчанию)');
  const [offlineSkinUrl, setOfflineSkinUrl] = useState(
    (localStorage.getItem('launcher_offline_skin') || '').startsWith('data:') 
      ? localStorage.getItem('launcher_offline_skin') 
      : ''
  );
  const [offlineSkinName, setOfflineSkinName] = useState(localStorage.getItem('launcher_offline_skin_name') || '');
  const [skinVariant, setSkinVariant] = useState('classic'); // classic | slim

  // Profile
  const [authMode,  setAuthMode]  = useState(localStorage.getItem('launcher_auth_mode') || 'offline');
  const [username,  setUsername]  = useState(localStorage.getItem('launcher_username')  || '');
  const [offlineUsername, setOfflineUsername] = useState(localStorage.getItem('launcher_offline_username') || '');
  const [msProfile, setMsProfile] = useState(null);   // { name, uuid, skinDataUrl, accessToken }
  const [msLoading,     setMsLoading]     = useState(false);
  const [msLoadingSkin, setMsLoadingSkin] = useState(false);
  const [msError,       setMsError]       = useState('');

  // Skin upload status
  const [uploadStatus, setUploadStatus] = useState(null); // null | { type, text }
  const [skinSaved,    setSkinSaved]    = useState(false);

  // Game
  const [ram,        setRam]       = useState(localStorage.getItem('launcher_ram')        || '4');
  const [winWidth,   setWinWidth]  = useState(localStorage.getItem('launcher_win_width')  || '1280');
  const [winHeight,  setWinHeight] = useState(localStorage.getItem('launcher_win_height') || '720');
  const [fullscreen, setFullscreen] = useState(localStorage.getItem('launcher_fullscreen') === 'true');

  // Java
  const [clientJava, setClientJava] = useState(localStorage.getItem('launcher_client_java') || '');
  const [serverJava, setServerJava] = useState(localStorage.getItem('launcher_server_java') || '');

  // UI
  const [animatedBg, setAnimatedBg] = useState(localStorage.getItem('launcher_animated_bg') !== 'false');

  // Network
  const [mode, setMode] = useState(localStorage.getItem('launcher_mode') || 'host');
  const [ip,   setIp]   = useState(localStorage.getItem('launcher_server_ip') || '');

  const fileInputRef = useRef(null);
  const importRef    = useRef(null);

  const activeSkinUrl = authMode === 'offline' 
    ? (offlineSkinUrl || defaultSkinUrl) 
    : (skinUrl || defaultSkinUrl);

  // ── Загрузить скин через IPC (main process) ──────────────────────────────
  const loadSkinViaIPC = useCallback(async (uuid, name) => {
    if (!window.electronAPI?.getSkinData) return;
    setMsLoadingSkin(true);
    try {
      const result = await window.electronAPI.getSkinData(uuid);
      if (result.success) {
        setMsProfile(prev => prev ? { ...prev, skinDataUrl: result.skinDataUrl } : prev);
      }
    } catch {}
    finally { setMsLoadingSkin(false); }
  }, []);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Дефолтный скин Стива
    if (window.electronAPI?.getDefaultSkin) {
      window.electronAPI.getDefaultSkin()
        .then(res => { if (res?.success) setDefaultSkinUrl(res.skinDataUrl); })
        .catch(() => {});
    }

    // 2. Тихая проверка сессии Microsoft
    if (window.electronAPI?.checkMicrosoftAuth) {
      window.electronAPI.checkMicrosoftAuth()
        .then(profile => {
          if (profile) {
            setMsProfile({ name: profile.name, uuid: profile.uuid,
                           skinDataUrl: null, accessToken: profile.accessToken });
            setUsername(profile.name);
            loadSkinViaIPC(profile.uuid, profile.name);
          }
        })
        .catch(() => {});
    }
  }, [loadSkinViaIPC]);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('launcher_auth_mode',   authMode);
    localStorage.setItem('launcher_username',    username);
    localStorage.setItem('launcher_offline_username', offlineUsername);
    localStorage.setItem('launcher_skin_url',    skinUrl);
    localStorage.setItem('launcher_skin_name',   skinName);
    localStorage.setItem('launcher_offline_skin', offlineSkinUrl);
    localStorage.setItem('launcher_offline_skin_name', offlineSkinName);
    localStorage.setItem('launcher_ram',         ram);
    localStorage.setItem('launcher_win_width',   winWidth);
    localStorage.setItem('launcher_win_height',  winHeight);
    localStorage.setItem('launcher_fullscreen',  String(fullscreen));
    localStorage.setItem('launcher_client_java', clientJava);
    localStorage.setItem('launcher_server_java', serverJava);
    localStorage.setItem('launcher_mode',        mode);
    localStorage.setItem('launcher_server_ip',   ip);
    
    window.dispatchEvent(new Event('settings-changed'));
  }, [authMode, username, offlineUsername, skinUrl, skinName, offlineSkinUrl, offlineSkinName, ram, winWidth, winHeight,
      fullscreen, clientJava, serverJava, mode, ip]);

  // ── Sync Microsoft skin on mount ───────────────────────────────────────
  useEffect(() => {
    if (authMode === 'microsoft' && msProfile && !msProfile.skinDataUrl) {
      loadSkinViaIPC(msProfile.uuid, msProfile.name);
    }
  }, [authMode, msProfile, loadSkinViaIPC]);

  // ── Confirm Offline Skin ──────────────────────────────────────────────────
  const [isCheckingSkin, setIsCheckingSkin] = useState(false);
  const handleConfirmOfflineSkin = async () => {
    if (!offlineUsername || offlineUsername.length < 3) return;
    setIsCheckingSkin(true);
    try {
      const res = await window.electronAPI.checkOfflineSkin(offlineUsername);
      if (res && res.success && res.skinDataUrl) {
        setOfflineSkinUrl(res.skinDataUrl);
        setOfflineSkinName('Скин с сервера');
      } else {
        setOfflineSkinUrl('');
        setOfflineSkinName('');
      }
    } catch (e) {
      setOfflineSkinUrl('');
      setOfflineSkinName('');
    } finally {
      setIsCheckingSkin(false);
    }
  };

  // ── Microsoft Login ───────────────────────────────────────────────────────
  const handleMsLogin = async () => {
    if (!window.electronAPI?.loginMicrosoft) return;
    setMsLoading(true); setMsError('');
    try {
      const result = await window.electronAPI.loginMicrosoft();
      if (result.success) {
        setMsProfile({ name: result.name, uuid: result.uuid,
                       skinDataUrl: null, accessToken: result.accessToken });
        setUsername(result.name);
        await loadSkinViaIPC(result.uuid, result.name);
      } else {
        setMsError(result.error || 'Ошибка входа');
      }
    } catch (e) { setMsError(e.message); }
    finally { setMsLoading(false); }
  };

  const handleMsLogout = async () => {
    if (window.electronAPI?.logoutMicrosoft) await window.electronAPI.logoutMicrosoft();
    setMsProfile(null);
    setUsername('');
    setSkinUrl('');
    setSkinName('Steve (по умолчанию)');
  };

  // ── Загрузить скин на Microsoft (Mojang API) ──────────────────────────────
  const handleUploadToMojang = async () => {
    if (!window.electronAPI?.uploadMojangSkin || !msProfile?.accessToken || !skinUrl) return;
    setUploadStatus({ type: 'loading', text: 'Загрузка на Microsoft...' });
    try {
      const result = await window.electronAPI.uploadMojangSkin(
        skinUrl, msProfile.accessToken, skinVariant
      );
      if (result.success) {
        setUploadStatus({ type: 'success', text: 'Скин обновлён на Microsoft!' });
      } else {
        setUploadStatus({ type: 'error', text: result.error || 'Ошибка загрузки' });
      }
    } catch (e) {
      setUploadStatus({ type: 'error', text: e.message });
    }
    setTimeout(() => setUploadStatus(null), 5000);
  };

  // ── Загрузить скин на свой Cloudflare (для пиратов) ─────────────────────
  const handleUploadToCloudflare = async () => {
    const targetUsername = authMode === 'offline' ? offlineUsername : username;
    if (!window.electronAPI?.uploadCloudflareSkin || !targetUsername || !skinUrl) {
      setUploadStatus({ type: 'error', text: 'Введите никнейм и выберите скин' });
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }
    setUploadStatus({ type: 'loading', text: 'Загрузка на сервер...' });
    try {
      const result = await window.electronAPI.uploadCloudflareSkin(skinUrl, targetUsername);
      if (result.success) {
        setUploadStatus({ type: 'success', text: 'Скин загружен в Cloudflare!' });
        
        // Refresh skin data as base64 to avoid 10013
        if (authMode === 'offline') {
          const checkRes = await window.electronAPI.checkOfflineSkin(targetUsername);
          if (checkRes && checkRes.success && checkRes.skinDataUrl) {
            setOfflineSkinUrl(checkRes.skinDataUrl);
          }
        }
      } else {
        setUploadStatus({ type: 'error', text: result.error || 'Ошибка загрузки' });
      }
    } catch (e) {
      setUploadStatus({ type: 'error', text: e.message });
    }
    setTimeout(() => setUploadStatus(null), 5000);
  };

  // ── Skin upload (файл) ────────────────────────────────────────────────────
  const handleSkinUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setSkinUrl(dataUrl);
      setSkinName(file.name);
      // Сохранить в папку сборки для CustomSkinLoader
      if (window.electronAPI?.saveSkinFile && username && currentPack?.clientDir) {
        const result = await window.electronAPI.saveSkinFile(
          dataUrl, username, currentPack.clientDir
        );
        if (result.success) {
          if (authMode === 'offline') {
            setOfflineSkinUrl(dataUrl);
            setOfflineSkinName(file.name);
          }
          setSkinSaved(true);
          setTimeout(() => setSkinSaved(false), 3000);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Export / Import ───────────────────────────────────────────────────────
  const handleExport = () => {
    const data = { authMode, username, ram, winWidth, winHeight, fullscreen, clientJava, serverJava, mode, ip };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'divlauncher-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.authMode !== undefined)   setAuthMode(d.authMode);
        if (d.username)                 setUsername(d.username);
        if (d.ram)                      setRam(d.ram);
        if (d.winWidth)                 setWinWidth(d.winWidth);
        if (d.winHeight)                setWinHeight(d.winHeight);
        if (d.fullscreen !== undefined) setFullscreen(d.fullscreen);
        if (d.clientJava !== undefined) setClientJava(d.clientJava);
        if (d.serverJava !== undefined) setServerJava(d.serverJava);
        if (d.mode)                     setMode(d.mode);
        if (d.ip !== undefined)         setIp(d.ip);
      } catch {}
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab: Профиль
  // ═══════════════════════════════════════════════════════════════════════════
  const renderProfile = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '214px 1fr', gap: '14px' }}>

      {/* ── 3D viewer panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ ...glassCard, padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '11px' }}>

          {/* Glow ring + viewer */}
          <div style={{
            padding: '2px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(16,185,129,0.2))',
          }}>
            <div style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.07) 0%, rgba(5,5,12,0.97) 70%)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <SkinViewer skinDataUrl={activeSkinUrl} />
            </div>
          </div>

          {/* Floor glow */}
          <div style={{
            width: '100px', height: '10px', marginTop: '-10px',
            background: 'radial-gradient(ellipse, rgba(167,139,250,0.4) 0%, transparent 70%)',
            filter: 'blur(4px)',
          }} />

          {/* Skin name chip */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px', padding: '5px 10px', maxWidth: '186px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <i className="fa-solid fa-shirt" style={{ color: '#a78bfa', fontSize: '10px', flexShrink: 0 }} />
            <span style={{ color: '#71717a', fontSize: '10px', fontWeight: 700,
                           overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {skinName}
            </span>
          </div>

          {/* Skin variant (classic / slim) */}
          <div style={{ width: '100%' }}>
            <label style={{ ...labelStyle, textAlign: 'center', display: 'block', marginBottom: '6px' }}>
              Тип модели
            </label>
            <SegmentControl
              value={skinVariant} onChange={setSkinVariant}
              options={[
                { value: 'classic', label: 'Стив',  icon: 'fa-solid fa-person',       color: '#a78bfa' },
                { value: 'slim',    label: 'Алекс', icon: 'fa-solid fa-person-walking', color: '#10b981' },
              ]}
            />
          </div>

          {/* Upload */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 16px rgba(167,139,250,0.3)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(167,139,250,0.16), rgba(124,58,237,0.1))',
              border: '1px solid rgba(167,139,250,0.35)',
              color: '#c4b5fd', padding: '9px 14px', borderRadius: '11px',
              cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}>
            <i className="fa-solid fa-arrow-up-from-bracket" style={{ fontSize: '11px' }} />
            Загрузить скин
          </motion.button>
          <input ref={fileInputRef} type="file" accept=".png" style={{ display: 'none' }} onChange={handleSkinUpload} />

          {/* Upload to Microsoft — видна только для лицензии */}
          <AnimatePresence>
            {authMode === 'microsoft' && msProfile && skinUrl && (
              <motion.div key="ms-upload" initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 14px rgba(16,185,129,0.2)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleUploadToMojang}
                  disabled={uploadStatus?.type === 'loading'}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.09))',
                    border: '1px solid rgba(16,185,129,0.32)',
                    color: uploadStatus?.type === 'loading' ? '#52525b' : '#34d399',
                    padding: '9px 14px', borderRadius: '11px',
                    cursor: uploadStatus?.type === 'loading' ? 'wait' : 'pointer',
                    fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '11px' }} />
                  Применить на Microsoft
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload to Cloudflare — видна только для пиратов */}
          <AnimatePresence>
            {authMode === 'offline' && username && skinUrl && (
              <motion.div key="cf-upload" initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 14px rgba(245,158,11,0.2)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleUploadToCloudflare}
                  disabled={uploadStatus?.type === 'loading'}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.09))',
                    border: '1px solid rgba(245,158,11,0.32)',
                    color: uploadStatus?.type === 'loading' ? '#52525b' : '#fbbf24',
                    padding: '9px 14px', borderRadius: '11px',
                    cursor: uploadStatus?.type === 'loading' ? 'wait' : 'pointer',
                    fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '11px' }} />
                  Загрузить на сервер
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Общий Status Toast (для обоих загрузчиков) */}
          <AnimatePresence>
            {uploadStatus && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '4px' }}>
                <StatusToast status={uploadStatus} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Сохранено */}
          <AnimatePresence>
            {skinSaved && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
                <i className="fa-solid fa-circle-check" /> Скин сохранён в сборке
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset skin */}
          <AnimatePresence>
            {skinUrl && (
              <motion.button
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={() => { setSkinUrl(''); setSkinName('Steve (по умолчанию)'); }}
                style={{
                  width: '100%', background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                  padding: '7px 12px', borderRadius: '9px', cursor: 'pointer',
                  fontFamily: 'Montserrat', fontWeight: 700, fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                <i className="fa-solid fa-trash" style={{ fontSize: '10px' }} /> Сбросить скин
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Account settings ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Section title="Тип аккаунта" icon="fa-solid fa-shield-halved" color="#a78bfa">
          <SegmentControl value={authMode} onChange={setAuthMode}
            options={[
              { value: 'offline',   label: 'Пиратский', icon: 'fa-solid fa-skull-crossbones', color: '#f59e0b' },
              { value: 'microsoft', label: 'Xbox Live',  icon: 'fa-solid fa-certificate',      color: '#10b981' },
            ]}
          />
        </Section>

        {/* Offline */}
        <AnimatePresence mode="popLayout">
          {authMode === 'offline' && (
            <motion.div key="offline" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Section title="Никнейм" icon="fa-solid fa-user-tag" color="#f59e0b">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.input
                    whileHover={{ borderColor: 'rgba(245,158,11,0.4)' }}
                    whileFocus={{ borderColor: 'rgba(245,158,11,0.65)', boxShadow: '0 0 0 3px rgba(245,158,11,0.1)' }}
                    type="text" value={offlineUsername} onChange={e => setOfflineUsername(e.target.value)}
                    placeholder="Введите никнейм" spellCheck="false" maxLength={16} style={{ ...glassInput, flex: 1 }} />
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 12px rgba(245,158,11,0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmOfflineSkin}
                    disabled={isCheckingSkin}
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))',
                      border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d',
                      padding: '0 16px', borderRadius: '12px', cursor: 'pointer',
                      fontFamily: 'Montserrat', fontWeight: 700, fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                    {isCheckingSkin ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-check" /> Подтвердить</>}
                  </motion.button>
                </div>
                <InfoBox color="#f59e0b" icon="fa-solid fa-triangle-exclamation">
                  В пиратском режиме другие игроки видят дефолтный скин Mojang. Для отображения
                  вашего скина на сервере установите мод{' '}
                  <strong style={{ color: '#fbbf24' }}>SkinsRestorer</strong> или{' '}
                  <strong style={{ color: '#fbbf24' }}>CustomSkinLoader</strong>.
                </InfoBox>
                {skinUrl && (
                  <InfoBox color="#10b981" icon="fa-solid fa-folder-open">
                    Скин сохранён в папку сборки. CustomSkinLoader подхватит его при следующем запуске.
                  </InfoBox>
                )}
              </Section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Microsoft */}
        <AnimatePresence mode="popLayout">
          {authMode === 'microsoft' && (
            <motion.div key="ms" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Section title="Xbox Live" icon="fa-solid fa-certificate" color="#10b981">
                <MicrosoftCard
                  profile={msProfile} loading={msLoading} loadingSkin={msLoadingSkin}
                  onLogin={handleMsLogin} onLogout={handleMsLogout}
                />
                {msError && <InfoBox color="#ef4444" icon="fa-solid fa-circle-xmark">{msError}</InfoBox>}
                {msProfile && (
                  <InfoBox color="#10b981" icon="fa-solid fa-circle-info">
                    Загрузите свой скин и нажмите «Применить на Microsoft» — скин сразу обновится
                    в вашем аккаунте Xbox и будет виден всем игрокам на лицензионных серверах.
                  </InfoBox>
                )}
                {!msProfile && !msLoading && (
                  <InfoBox color="#3b82f6">
                    После входа никнейм и скин подтянутся автоматически из аккаунта Xbox Live.
                  </InfoBox>
                )}
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab: Игра
  // ═══════════════════════════════════════════════════════════════════════════
  const renderGame = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section title="Оперативная память" icon="fa-solid fa-memory" color="#10b981">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={labelStyle}>Объём ОЗУ</label>
            <motion.span key={ram} initial={{ scale: 1.35, color: '#fff' }} animate={{ scale: 1, color: '#10b981' }}
              style={{ fontWeight: 900, fontSize: '22px', textShadow: '0 0 14px rgba(16,185,129,0.5)', fontFamily: 'Montserrat' }}>
              {ram} ГБ
            </motion.span>
          </div>
          <input type="range" min="2" max="16" step="1" value={ram}
            onChange={e => setRam(e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {['2','4','6','8','12','16'].map(v => (
              <PresetBtn key={v} active={ram === v} color="#10b981" onClick={() => setRam(v)}>{v} ГБ</PresetBtn>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Окно Minecraft" icon="fa-solid fa-display" color="#60a5fa">
        <Field label="Полноэкранный режим" row>
          <Toggle value={fullscreen} onChange={setFullscreen} color="#60a5fa" />
        </Field>
        <AnimatePresence>
          {!fullscreen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: '8px', alignItems: 'end' }}>
                <Field label="Ширина (px)">
                  <motion.input whileHover={{ borderColor: 'rgba(96,165,250,0.4)' }}
                    whileFocus={{ borderColor: 'rgba(96,165,250,0.65)', boxShadow: '0 0 0 3px rgba(96,165,250,0.1)' }}
                    type="number" value={winWidth} onChange={e => setWinWidth(e.target.value)}
                    placeholder="1280" style={glassInput} />
                </Field>
                <div style={{ color: '#3f3f46', fontWeight: 900, fontSize: '18px', paddingBottom: '10px', textAlign: 'center' }}>×</div>
                <Field label="Высота (px)">
                  <motion.input whileHover={{ borderColor: 'rgba(96,165,250,0.4)' }}
                    whileFocus={{ borderColor: 'rgba(96,165,250,0.65)', boxShadow: '0 0 0 3px rgba(96,165,250,0.1)' }}
                    type="number" value={winHeight} onChange={e => setWinHeight(e.target.value)}
                    placeholder="720" style={glassInput} />
                </Field>
              </div>
              <div>
                <label style={labelStyle}>Быстрый выбор</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{l:'1280×720',w:'1280',h:'720'},{l:'1920×1080',w:'1920',h:'1080'},{l:'2560×1440',w:'2560',h:'1440'}].map(r => (
                    <PresetBtn key={r.l} active={winWidth===r.w && winHeight===r.h} color="#60a5fa"
                      onClick={() => { setWinWidth(r.w); setWinHeight(r.h); }}>{r.l}</PresetBtn>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab: Java
  // ═══════════════════════════════════════════════════════════════════════════
  const renderJava = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section title="Java для клиента" icon="fa-solid fa-mug-hot" color="#ef4444">
        <Field label="Путь к Java 17 (Клиент)">
          <motion.input whileHover={{ borderColor: 'rgba(239,68,68,0.4)' }}
            whileFocus={{ borderColor: 'rgba(239,68,68,0.65)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }}
            type="text" value={clientJava} onChange={e => setClientJava(e.target.value)}
            placeholder="Оставьте пустым для авто-загрузки (Рекомендуется)" spellCheck="false" style={glassInput} />
        </Field>
        <InfoBox color="#ef4444">При пустом поле Java 17 скачается автоматически при первом запуске.</InfoBox>
      </Section>
      <Section title="Java для сервера" icon="fa-solid fa-server" color="#f43f5e">
        <Field label="Путь к Java 17 (Сервер)">
          <motion.input whileHover={{ borderColor: 'rgba(244,63,94,0.4)' }}
            whileFocus={{ borderColor: 'rgba(244,63,94,0.65)', boxShadow: '0 0 0 3px rgba(244,63,94,0.1)' }}
            type="text" value={serverJava} onChange={e => setServerJava(e.target.value)}
            placeholder="Оставьте пустым для авто-загрузки (Рекомендуется)" spellCheck="false" style={glassInput} />
        </Field>
      </Section>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab: Сеть
  // ═══════════════════════════════════════════════════════════════════════════
  const renderNetwork = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section title="Режим подключения" icon="fa-solid fa-tower-broadcast" color="#3b82f6">
        <SegmentControl value={mode} onChange={setMode}
          options={[
            { value: 'host',    label: 'Я хост',       icon: 'fa-solid fa-house-signal',    color: '#3b82f6' },
            { value: 'connect', label: 'Подключиться', icon: 'fa-solid fa-plug-circle-bolt', color: '#8b5cf6' },
          ]}
        />
        <AnimatePresence mode="popLayout">
          {mode === 'connect' && (
            <motion.div key="ip" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <Field label="IP адрес сервера">
                <motion.input whileHover={{ borderColor: 'rgba(59,130,246,0.4)' }}
                  whileFocus={{ borderColor: 'rgba(59,130,246,0.65)', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
                  type="text" value={ip} onChange={e => setIp(e.target.value)}
                  placeholder="Например: 26.15.112.5" style={glassInput} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        {mode === 'host' && (
          <InfoBox color="#3b82f6">Сервер запустится на вашем компьютере. Дайте друзьям свой IP-адрес для подключения.</InfoBox>
        )}
      </Section>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab: Прочее
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMisc = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section title="Интерфейс" icon="fa-solid fa-palette" color="#14b8a6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-film" style={{ color: '#14b8a6' }}></i>
              <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'Montserrat' }}>Анимированный фон (видео)</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={animatedBg} onChange={(e) => {
                setAnimatedBg(e.target.checked);
                localStorage.setItem('launcher_animated_bg', e.target.checked);
                window.dispatchEvent(new Event('settings-changed'));
              }} style={{ display: 'none' }} />
              <div style={{ width: '40px', height: '20px', background: animatedBg ? '#14b8a6' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', transition: '0.3s' }}>
                <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: animatedBg ? '22px' : '2px', transition: '0.3s' }} />
              </div>
            </label>
          </div>
          <InfoBox color="#14b8a6" icon="fa-solid fa-circle-info">
            Изменение применяется мгновенно. Отключите, если лаунчер тормозит.
          </InfoBox>
        </div>
      </Section>
      <Section title="Профиль настроек" icon="fa-solid fa-floppy-disk" color="#f59e0b">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleExport}
            style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)',
              color: '#fbbf24', padding: '14px', borderRadius: '12px', cursor: 'pointer',
              fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            <i className="fa-solid fa-file-export" /> Экспорт
          </motion.button>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)',
                color: '#818cf8', padding: '14px', borderRadius: '12px',
                fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              <i className="fa-solid fa-file-import" /> Импорт
            </motion.div>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
        <InfoBox color="#f59e0b">Скин и аккаунт Xbox не включаются в экспорт.</InfoBox>
      </Section>

      <Section title="Сброс" icon="fa-solid fa-rotate-left" color="#ef4444">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowConfirm(true)}
          style={{
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', padding: '13px', borderRadius: '11px', cursor: 'pointer',
            fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <i className="fa-solid fa-trash-can" /> Сбросить все настройки
        </motion.button>
      </Section>
    </div>
  );

  const tabContent = { profile: renderProfile, game: renderGame, java: renderJava, network: renderNetwork, misc: renderMisc };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Custom confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            title="Сбросить настройки?"
            message="Все настройки будут удалены. Это действие нельзя отменить."
            onConfirm={handleReset}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 2px' }}>
        {/* Header + Tab Bar */}
        <div style={{ flexShrink: 0, marginBottom: '16px' }}>
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px',
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}>
            Настройки
          </h1>
          <div style={{
            display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)',
            padding: '4px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: active ? 1 : 1.03 }} whileTap={{ scale: 0.96 }}
                  style={{
                    position: 'relative', flex: 1, padding: '9px 6px',
                    borderRadius: '11px', border: 'none', cursor: 'pointer', background: 'transparent',
                    color: active ? tab.color : '#3f3f46',
                    fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    transition: 'color 0.2s', zIndex: 1,
                  }}>
                  {active && (
                    <motion.div layoutId="tabHL"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '11px',
                        background: `${tab.color}14`, border: `1px solid ${tab.color}32`,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 35 }} />
                  )}
                  <i className={tab.icon} style={{ fontSize: '11px', position: 'relative' }} />
                  <span style={{ position: 'relative' }}>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tab content — CSS opacity animation, NO framer-motion → backdrop-filter работает */}
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '16px', paddingRight: '2px' }}>
          <div key={activeTab} className="tab-enter">
            {tabContent[activeTab]?.()}
          </div>
        </div>
      </div>
    </>
  );
}