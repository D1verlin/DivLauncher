import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as skinview3d from 'skinview3d';
import { getBadgeStyle, getBadgeText } from '../utils/badgeHelper';
import { useTranslation } from '../utils/i18n';

// Glass card styling helper
const glassCard = {
  background: 'rgba(18, 18, 26, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
};

// Preset background gradients
const PRESET_GRADIENTS = {
  'preset-1': 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3c 100%)',
  'preset-2': 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'preset-3': 'linear-gradient(135deg, #1a002c 0%, #4d0066 50%, #1a002c 100%)',
  'preset-4': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'preset-5': 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
  'preset-6': 'linear-gradient(135deg, #000000 0%, #434343 100%)',
};

// Available status Emojis
const EMOJI_LIST = ['🎮', '⚔️', '🛡️', '👑', '⚡', '🔥', '💎', '🚀', '⛏️', '🏹', '👾', '🌟', '🏆', '🎧', '💻', '☕'];

// Info Box Helper Component
function InfoBox({ children, color = '#a78bfa', icon = 'fa-solid fa-circle-info' }) {
  return (
    <div style={{
      background: `rgba(255, 255, 255, 0.03)`,
      border: `1px solid rgba(255, 255, 255, 0.06)`,
      borderRadius: '12px',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '11px',
      color: '#a1a1aa',
      fontWeight: 500,
      lineHeight: 1.4
    }}>
      <i className={icon} style={{ color, fontSize: '14px', flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

// Emoji Picker Component
function EmojiPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={pickerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {value || '🎮'}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '46px',
          left: 0,
          zIndex: 100,
          background: 'rgba(22, 22, 32, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          width: '160px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        }}>
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setIsOpen(false);
              }}
              style={{
                background: value === emoji ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: value === emoji ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Minecraft Head Avatar Component
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
      ctx.drawImage(img, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
      ctx.drawImage(img, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
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

// 3D Skin Viewer Component
function SkinViewer({ skinDataUrl, capeDataUrl, skinVariant, width = 150, height = 220, fillContainer = false, autoRotate = true, isWalking = true }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  // ResizeObserver for fillContainer mode
  useEffect(() => {
    if (!fillContainer || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current && viewerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          viewerRef.current.setSize(clientWidth, clientHeight);
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fillContainer]);

  // Create SkinViewer instance ONCE on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const initialW = (fillContainer && containerRef.current?.clientWidth) ? containerRef.current.clientWidth : width;
    const initialH = (fillContainer && containerRef.current?.clientHeight) ? containerRef.current.clientHeight : height;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: initialW || 300,
      height: initialH || 400
    });

    viewer.autoRotate = autoRotate;
    viewer.autoRotateSpeed = 0.6;
    viewer.zoom = fillContainer ? 0.9 : 0.95;
    if (isWalking) {
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.animation.speed = 0.5;
    } else {
      viewer.animation = null;
    }
    viewer.renderer.setClearColor(0x000000, 0);

    if (skinDataUrl) {
      viewer.loadSkin(skinDataUrl, { model: skinVariant }).catch(() => {});
    }
    if (capeDataUrl) {
      viewer.loadCape(capeDataUrl).catch(() => {});
    }

    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  // Sync fixed width/height when not in fillContainer mode
  useEffect(() => {
    if (viewerRef.current && !fillContainer) {
      viewerRef.current.setSize(width, height);
    }
  }, [width, height, fillContainer]);

  // Sync autoRotate
  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // Sync isWalking animation
  useEffect(() => {
    if (!viewerRef.current) return;
    if (isWalking) {
      viewerRef.current.animation = new skinview3d.WalkingAnimation();
      viewerRef.current.animation.speed = 0.5;
    } else {
      viewerRef.current.animation = null;
    }
  }, [isWalking]);

  // Sync skinDataUrl and skinVariant
  useEffect(() => {
    if (!viewerRef.current) return;
    if (skinDataUrl) {
      viewerRef.current.loadSkin(skinDataUrl, { model: skinVariant }).catch(() => {});
    }
  }, [skinDataUrl, skinVariant]);

  // Sync capeDataUrl
  useEffect(() => {
    if (!viewerRef.current) return;
    if (capeDataUrl) {
      viewerRef.current.loadCape(capeDataUrl).catch(() => {});
    } else {
      viewerRef.current.loadCape(null);
    }
  }, [capeDataUrl]);

  if (fillContainer) {
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '16px' }} />
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '14px' }} />;
}

// INLINE 2FA SETUP PAGE VIEW (No modal popups!)
function TwoFactorSetupView({ setupData, onBack, onComplete, lang }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const handleEnable = async () => {
    if (code.length !== 6) {
      setError(lang === 'ru' ? 'Введите 6-значный код' : 'Enter 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await window.electronAPI.enable2FA(setupData.secret, code.trim(), setupData.backupCodes);
      if (res.success) {
        onComplete();
      } else {
        setError(res.error || (lang === 'ru' ? 'Неверный код 2FA' : 'Invalid 2FA code'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-qrcode" style={{ color: '#c084fc', fontSize: '18px' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'ru' ? 'Настройка двухфакторной аутентификации (2FA)' : 'Setup Two-Factor Authentication (2FA)'}
          </h3>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#a1a1aa',
            padding: '6px 14px',
            borderRadius: '9px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'Montserrat',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fa-solid fa-arrow-left" />
          {lang === 'ru' ? 'Назад в настройки' : 'Back to Settings'}
        </motion.button>
      </div>

      {/* Step 1: Scan QR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 800 }}>
          1. {lang === 'ru' ? 'Отсканируйте QR-код в приложении аутентификации:' : 'Scan QR code in your authenticator app:'}
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {setupData.qrCodeUrl && (
            <img src={setupData.qrCodeUrl} alt="QR Code" style={{ width: '120px', height: '120px', borderRadius: '10px', background: '#fff', padding: '6px', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'ru' ? 'Ключ для ручного ввода:' : 'Manual Secret:'}
            </span>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#c084fc', wordBreak: 'break-all', background: 'rgba(0,0,0,0.4)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {setupData.secret}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={copySecret}
              style={{
                background: 'rgba(192, 132, 252, 0.12)',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                color: '#c084fc',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content'
              }}
            >
              <i className={`fa-solid ${copiedSecret ? 'fa-check' : 'fa-copy'}`} />
              {copiedSecret ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : (lang === 'ru' ? 'Скопировать ключ' : 'Copy key')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Step 2: Code Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 800 }}>
          2. {lang === 'ru' ? 'Введите 6-значный код подтверждения:' : 'Enter 6-digit verification code:'}
        </span>
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(192, 132, 252, 0.4)',
            borderRadius: '12px',
            color: '#fff',
            padding: '10px',
            fontSize: '20px',
            fontWeight: 900,
            letterSpacing: '8px',
            textAlign: 'center',
            outline: 'none',
            fontFamily: 'Montserrat'
          }}
        />
      </div>

      {/* Step 3: Backup Codes */}
      {setupData.backupCodes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 800 }}>
              3. {lang === 'ru' ? 'Сохраните резервные коды:' : 'Save backup codes:'}
            </span>
            <button
              onClick={copyBackupCodes}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#c084fc',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i className={`fa-solid ${copiedBackup ? 'fa-check' : 'fa-copy'}`} />
              {copiedBackup ? (lang === 'ru' ? 'Скопированы!' : 'Copied!') : (lang === 'ru' ? 'Скопировать все' : 'Copy all')}
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            background: 'rgba(0,0,0,0.4)',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {setupData.backupCodes.map((c, i) => (
              <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#e4e4e7', textAlign: 'center' }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleEnable}
          disabled={loading}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            border: 'none',
            color: '#fff',
            padding: '10px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '12px',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-shield-halved" />}
          {lang === 'ru' ? 'Подтвердить и включить 2FA' : 'Confirm & Enable 2FA'}
        </motion.button>
      </div>
    </div>
  );
}

// INLINE 2FA DISABLE PAGE VIEW (No modal popups!)
function TwoFactorDisableView({ onBack, onComplete, lang }) {
  const [authInput, setAuthInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisable = async () => {
    if (!authInput.trim()) {
      setError(lang === 'ru' ? 'Введите текущий пароль или 6-значный код' : 'Enter current password or 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isCode = /^\d{6}$/.test(authInput.trim());
      const res = await window.electronAPI.disable2FA(
        isCode ? null : authInput.trim(),
        isCode ? authInput.trim() : null
      );
      if (res.success) {
        onComplete();
      } else {
        setError(res.error || (lang === 'ru' ? 'Неверный пароль или код 2FA' : 'Invalid password or 2FA code'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-unlock" style={{ color: '#ef4444', fontSize: '18px' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'ru' ? 'Отключение двухфакторной аутентификации (2FA)' : 'Disable Two-Factor Authentication (2FA)'}
          </h3>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#a1a1aa',
            padding: '6px 14px',
            borderRadius: '9px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'Montserrat',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fa-solid fa-arrow-left" />
          {lang === 'ru' ? 'Назад в настройки' : 'Back to Settings'}
        </motion.button>
      </div>

      <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>
        {lang === 'ru' ? 'Для подтверждения отключения 2FA введите текущий пароль от аккаунта или 6-значный код из приложения:' : 'To confirm disabling 2FA, enter your account password or 6-digit app code:'}
      </span>

      <input
        type="password"
        placeholder={lang === 'ru' ? 'Пароль или 2FA код...' : 'Password or 2FA code...'}
        value={authInput}
        onChange={(e) => setAuthInput(e.target.value)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: '#fff',
          padding: '12px 14px',
          fontSize: '13px',
          fontWeight: 600,
          outline: 'none',
          fontFamily: 'Montserrat'
        }}
      />

      {error && (
        <div style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleDisable}
          disabled={loading}
          style={{
            flex: 1,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '10px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '12px',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash-can" />}
          {lang === 'ru' ? 'Отключить защиту 2FA' : 'Disable 2FA Protection'}
        </motion.button>
      </div>
    </div>
  );
}

// MAIN PROFILE PAGE COMPONENT
export default function ProfilePage({ profile: initialProfile, isOwnProfile = true, onBack, onLogout, currentPack, onProfileUpdate, showConfirm, showAlert }) {
  const { t, lang } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [authServerUrl, setAuthServerUrl] = useState('https://mcauth.diverlin.ru');
  const [skinUrl, setSkinUrl] = useState(null);
  const [capeUrl, setCapeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getAuthServerUrl) {
      window.electronAPI.getAuthServerUrl().then(url => {
        if (url) setAuthServerUrl(url.replace(/\/$/, ''));
      });
    }
  }, []);

  // Active view tab: 'style' | 'skin' | 'security' | '2fa_setup' | '2fa_disable'
  const [activeTab, setActiveTab] = useState('style');
  const [studioAutoRotate, setStudioAutoRotate] = useState(true);
  const [studioIsWalking, setStudioIsWalking] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Customization States
  const [bioText, setBioText] = useState(profile.bio || '');
  const [statusEmoji, setStatusEmoji] = useState(profile.status_emoji || '🎮');
  const [statusText, setStatusText] = useState(profile.status_text || '');
  const [profileBgType, setProfileBgType] = useState(profile.profile_bg_type || 'preset');
  const [profileBgValue, setProfileBgValue] = useState(profile.profile_bg_value || 'preset-1');
  const [avatarType, setAvatarType] = useState(profile.avatar_type || 'minecraft');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [avatarBorderColor, setAvatarBorderColor] = useState(profile.avatar_border_color || '#a78bfa');
  const [skinVariant, setSkinVariant] = useState(profile.skin_model || 'classic');

  // Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // 2FA Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!profile.two_factor_enabled);
  const [setupData, setSetupData] = useState(null);



  const handleStart2FA = async () => {
    try {
      const res = await window.electronAPI.setup2FA();
      if (res.success) {
        setSetupData(res);
        setActiveTab('2fa_setup');
      } else {
        showAlert(t('error'), res.error || 'Не удалось запросить секрет 2FA');
      }
    } catch (err) {
      showAlert(t('error'), err.message);
    }
  };

  // Sync profile update with local state
  useEffect(() => {
    setProfile(initialProfile);
    setBioText(initialProfile.bio || '');
    setStatusEmoji(initialProfile.status_emoji || '🎮');
    setStatusText(initialProfile.status_text || '');
    setProfileBgType(initialProfile.profile_bg_type || 'preset');
    setProfileBgValue(initialProfile.profile_bg_value || 'preset-1');
    setAvatarType(initialProfile.avatar_type || 'minecraft');
    setAvatarUrl(initialProfile.avatar_url || '');
    setSkinVariant(initialProfile.skin_model || 'classic');
    setTwoFactorEnabled(!!initialProfile.two_factor_enabled);
  }, [initialProfile]);

  const onProfileUpdateRef = useRef(onProfileUpdate);
  useEffect(() => {
    onProfileUpdateRef.current = onProfileUpdate;
  }, [onProfileUpdate]);

  // Refresh profile logic
  const fetchUpdatedProfile = useCallback(async () => {
    if (profile.isOffline) return;
    try {
      const url = await window.electronAPI.getAuthServerUrl();
      const cacheFile = await window.electronAPI.customCheckAuth();
      if (cacheFile && cacheFile.webToken && cacheFile.webToken !== 'offline' && !cacheFile.isOffline) {
        const targetUuid = profile.uuid;
        const response = await fetch(`${url}/api/profile?uuid=${targetUuid}`, {
          headers: { 'Authorization': `Bearer ${cacheFile.webToken}` }
        });
        if (response.ok) {
          const updated = await response.json();
          setProfile(updated);

          setBioText(updated.bio || '');
          setStatusEmoji(updated.status_emoji || '🎮');
          setStatusText(updated.status_text || '');
          setProfileBgType(updated.profile_bg_type || 'preset');
          setProfileBgValue(updated.profile_bg_value || 'preset-1');
          setAvatarType(updated.avatar_type || 'minecraft');
          setAvatarUrl(updated.avatar_url || '');
          setSkinVariant(updated.skin_model || 'classic');
          setTwoFactorEnabled(!!updated.two_factor_enabled);

          if (onProfileUpdateRef.current) {
            onProfileUpdateRef.current(updated);
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  }, [profile.uuid, profile.isOffline]);

  // Load profile skin/cape data
  const loadSkinData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const skinVal = profile.skin_url;
      const capeVal = profile.cape_url;
      if (skinVal) {
        const absoluteSkin = skinVal.startsWith('http') ? skinVal : (authServerUrl + skinVal);
        setSkinUrl(absoluteSkin);
      } else {
        const steveResult = await window.electronAPI.getDefaultSkin();
        if (steveResult.success) {
          setSkinUrl(steveResult.skinDataUrl);
        }
      }

      if (capeVal) {
        const absoluteCape = capeVal.startsWith('http') ? capeVal : (authServerUrl + capeVal);
        setCapeUrl(absoluteCape);
      } else {
        setCapeUrl(null);
      }
    } catch (e) {
      console.error('[ProfilePage] Error fetching skin data:', e);
    } finally {
      setLoading(false);
    }
  }, [profile.skin_url, profile.cape_url, authServerUrl]);

  useEffect(() => {
    fetchUpdatedProfile();
  }, [profile.uuid, fetchUpdatedProfile]);

  useEffect(() => {
    loadSkinData();
  }, [loadSkinData]);

  // Skin upload handler
  const handleUploadSkin = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadSkin(currentPack?.clientDir, profile.username || profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Скин успешно загружен на сервер!' : 'Skin uploaded successfully!' });
        const updatedFields = { skin_url: result.skinUrl };
        setProfile(prev => ({ ...prev, ...updatedFields }));
        if (onProfileUpdate) {
          onProfileUpdate(updatedFields);
        }
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || (lang === 'ru' ? 'Ошибка загрузки скина' : 'Skin upload error') });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Cape upload handler
  const handleUploadCape = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadCape(currentPack?.clientDir, profile.username || profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Плащ успешно загружен на сервер!' : 'Cape uploaded successfully!' });
        const updatedFields = { cape_url: result.capeUrl };
        setProfile(prev => ({ ...prev, ...updatedFields }));
        if (onProfileUpdate) {
          onProfileUpdate(updatedFields);
        }
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || (lang === 'ru' ? 'Ошибка загрузки плаща' : 'Cape upload error') });
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

  // Save customization changes
  const saveCustomization = async (fields) => {
    try {
      const res = await window.electronAPI.updateProfileCustomization(fields);
      if (res.success) {
        setProfile(prev => ({ ...prev, ...res.user }));
        if (onProfileUpdate) {
          onProfileUpdate(res.user);
        }
        return true;
      } else {
        showAlert(t('error'), res.error || 'Ошибка обновления кастомизации');
        return false;
      }
    } catch (err) {
      showAlert(t('error'), err.message);
      return false;
    }
  };

  // Handle Preset Background Selection
  const handleSelectPreset = async (presetId) => {
    setProfileBgType('preset');
    setProfileBgValue(presetId);
    await saveCustomization({ profile_bg_type: 'preset', profile_bg_value: presetId });
  };

  // Handle Custom Background Upload
  const handleUploadBackground = async () => {
    try {
      const res = await window.electronAPI.uploadBackground();
      if (res.success) {
        setProfileBgType('custom');
        setProfileBgValue(res.profile_bg_value);
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Фон профиля успешно обновлен!' : 'Profile background updated!' });
        if (onProfileUpdate) {
          onProfileUpdate({ profile_bg_type: 'custom', profile_bg_value: res.profile_bg_value });
        }
      } else if (res.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: res.error });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Handle Custom Avatar Upload
  const handleUploadAvatar = async () => {
    try {
      const res = await window.electronAPI.uploadAvatar();
      if (res.success) {
        setAvatarType('custom');
        setAvatarUrl(res.avatar_url);
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Аватар профиля успешно обновлен!' : 'Profile avatar updated!' });
        if (onProfileUpdate) {
          onProfileUpdate({ avatar_type: 'custom', avatar_url: res.avatar_url });
        }
      } else if (res.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: res.error });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Handle Avatar Type switch
  const handleSwitchAvatarType = async (type) => {
    setAvatarType(type);
    await saveCustomization({ avatar_type: type });
  };

  // Handle Skin model variant change (Classic vs Slim)
  const handleToggleSkinVariant = async () => {
    const nextVariant = skinVariant === 'classic' ? 'slim' : 'classic';
    setSkinVariant(nextVariant);
    await saveCustomization({ skin_model: nextVariant });
  };

  // Save status text and bio
  const handleSaveStatus = async () => {
    await saveCustomization({
      status_emoji: statusEmoji,
      status_text: statusText,
      bio: bioText,
      avatar_border_color: avatarBorderColor
    });
    setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Профиль успешно сохранен!' : 'Profile saved successfully!' });
  };

  // Handle Border Color selection
  const handleSelectBorderColor = async (color) => {
    setAvatarBorderColor(color);
    await saveCustomization({ avatar_border_color: color });
  };


  // Link/Unlink Google Auth
  const handleLinkGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await window.electronAPI.startGoogleAuth('link');
      if (result.success) {
        await fetchUpdatedProfile();
        setUploadStatus({ type: 'success', text: lang === 'ru' ? `Google аккаунт ${result.email} привязан!` : `Google account ${result.email} linked!` });
      } else {
        showAlert(t('error'), result.error || 'Ошибка привязки Google');
      }
    } catch (e) {
      showAlert(t('error'), e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    const confirmed = await showConfirm(
      lang === 'ru' ? 'Отвязать Google?' : 'Unlink Google?',
      lang === 'ru' ? 'Вы уверены, что хотите отвязать Google аккаунт?' : 'Are you sure you want to unlink Google account?'
    );
    if (!confirmed) return;
    setGoogleLoading(true);
    try {
      const result = await window.electronAPI.unlinkGoogle();
      if (result.success) {
        await fetchUpdatedProfile();
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Google аккаунт успешно отвязан!' : 'Google account unlinked!' });
      } else {
        showAlert(t('error'), result.error || 'Ошибка отвязки Google');
      }
    } catch (e) {
      showAlert(t('error'), e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 4) {
      setPasswordStatus({ type: 'error', text: lang === 'ru' ? 'Пароль должен быть не менее 4 символов' : 'Password must be at least 4 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: lang === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await window.electronAPI.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPasswordStatus({ type: 'success', text: lang === 'ru' ? 'Пароль успешно изменен!' : 'Password changed successfully!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', text: res.error || (lang === 'ru' ? 'Ошибка смены пароля' : 'Password change error') });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
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

  const currentBgStyle = profileBgType === 'preset'
    ? { background: PRESET_GRADIENTS[profileBgValue] || PRESET_GRADIENTS['preset-1'] }
    : { backgroundImage: `url(${profileBgValue.startsWith('/') ? authServerUrl + profileBgValue : profileBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  const finalAvatarUrl = avatarUrl.startsWith('/') ? authServerUrl + avatarUrl : avatarUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header section (FIXED AT TOP) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {!isOwnProfile && (
            <motion.button
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
              <i className="fa-solid fa-arrow-left" /> {t('mods_back') || 'Назад'}
            </motion.button>
          )}
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}>
            {isOwnProfile ? (isPreviewMode ? (lang === 'ru' ? 'Предпросмотр профиля' : 'Profile Preview') : (lang === 'ru' ? 'Личный кабинет' : 'Account Panel')) : (lang === 'ru' ? 'Профиль игрока' : 'Player Profile')}
          </h1>
        </div>

        {/* Eye Preview Toggle Button */}
        {isOwnProfile && (
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(167, 139, 250, 0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            style={{
              background: isPreviewMode
                ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.25))'
                : 'linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(124, 58, 237, 0.2))',
              border: isPreviewMode
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(167, 139, 250, 0.4)',
              color: isPreviewMode ? '#f87171' : '#c4b5fd',
              padding: '9px 18px',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 800,
              fontFamily: 'Montserrat',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
          >
            <i className={`fa-solid ${isPreviewMode ? 'fa-pen-to-square' : 'fa-eye'}`} />
            <span>
              {isPreviewMode
                ? (lang === 'ru' ? 'Вернуться к редактору' : 'Back to Editor')
                : (lang === 'ru' ? 'Глазами игроков' : 'View as Player')}
            </span>
          </motion.button>
        )}
      </div>

      {/* --- BODY AREA --- */}
      <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {(isOwnProfile && !isPreviewMode) ? (
          /* === OWN PROFILE: FULL WIDTH LAYOUT === */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflow: 'hidden' }}>

            {/* Compact Identity Banner */}
              <div style={{
                ...glassCard, ...currentBgStyle, position: 'relative',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                overflow: 'hidden', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                flexShrink: 0, minHeight: '84px'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.65) 100%)', zIndex: 1 }} />

                {/* Avatar */}
                <div style={{ zIndex: 2, flexShrink: 0 }}>
                  {avatarType === 'custom' && avatarUrl ? (
                    <img src={finalAvatarUrl} alt="Avatar" style={{
                      width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover',
                      border: `2px solid ${avatarBorderColor || profile.avatar_border_color || 'rgba(167,139,250,0.6)'}`
                    }} />
                  ) : (
                    <div style={{ border: `2px solid ${avatarBorderColor || profile.avatar_border_color || 'rgba(16,185,129,0.6)'}`, borderRadius: '14px', padding: '2px', background: 'rgba(0,0,0,0.4)' }}>
                      <MinecraftAvatar skinDataUrl={skinUrl} size={50} />
                    </div>
                  )}
                </div>

                {/* Name + Badge + Status */}
                <div style={{ zIndex: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {profile.badge && <span style={getBadgeStyle(profile.badge)}>{getBadgeText(profile.badge)}</span>}
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {profile.username || profile.name}
                    </span>
                    <span style={{
                      fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase',
                      color: profile.is_admin ? '#10b981' : '#a78bfa',
                      background: profile.is_admin ? 'rgba(16,185,129,0.2)' : 'rgba(167,139,250,0.2)',
                      border: profile.is_admin ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(167,139,250,0.4)'
                    }}>
                      {profile.is_admin ? (lang === 'ru' ? 'Администратор' : 'Administrator') : (lang === 'ru' ? 'Игрок' : 'Player')}
                    </span>
                  </div>
                  {(statusText || statusEmoji) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#e4e4e7', fontSize: '12px', fontWeight: 600 }}>
                      <span>{statusEmoji}</span><span>{statusText}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>
                      {lang === 'ru' ? 'Статус не установлен' : 'No status set'}
                    </span>
                  )}
                </div>

                {/* Right: UUID */}
                <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                  <div onClick={handleCopyUuid} style={{ fontSize: '9px', color: '#a1a1aa', fontFamily: 'monospace', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '7px' }}>
                    <i className={`fa-solid ${copiedUuid ? 'fa-check' : 'fa-copy'}`} style={{ color: copiedUuid ? '#34d399' : undefined }} />
                    {copiedUuid ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : (profile.uuid || '').replace(/-/g, '').substring(0, 16) + '...'}
                  </div>
                </div>
              </div>

              {/* Upload status notification */}
              <AnimatePresence>
                {uploadStatus && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px',
                      borderRadius: '10px', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                      background: uploadStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      border: uploadStatus.type === 'error' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                      color: uploadStatus.type === 'error' ? '#f87171' : '#34d399'
                    }}>
                    <i className={`fa-solid ${uploadStatus.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`} />
                    <span>{uploadStatus.text}</span>
                    <button onClick={() => setUploadStatus(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tabs Area */}
              {profile.isOffline ? (
                <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '14px', flexGrow: 1 }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-wifi" style={{ color: '#f59e0b', fontSize: '20px' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#fff', marginBottom: '6px' }}>
                      {lang === 'ru' ? 'Офлайн-режим' : 'Offline Mode'}
                    </div>
                    <div style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: 500, maxWidth: '280px' }}>
                      {lang === 'ru' ? 'Кастомизация профиля недоступна. Войдите с учётной записью сервера.' : 'Profile customization unavailable. Please login with a server account.'}
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={onLogout} style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                    padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Montserrat',
                    fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <i className="fa-solid fa-right-from-bracket" />
                    {lang === 'ru' ? 'Выйти в меню авторизации' : 'Return to Login Screen'}
                  </motion.button>
                </div>
              ) : (
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>

                  {/* Tab Navigation */}
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <button onClick={() => setActiveTab('style')} style={{
                      flex: 1, padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'style' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'style' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}>
                      <i className="fa-solid fa-palette" style={{ marginRight: '6px' }} />
                      {lang === 'ru' ? 'Стиль и статус' : 'Style & Status'}
                    </button>
                    <button onClick={() => setActiveTab('skin')} style={{
                      flex: 1, padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'skin' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'skin' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}>
                      <i className="fa-solid fa-shirt" style={{ marginRight: '6px' }} />
                      {lang === 'ru' ? 'Скин и плащ' : 'Skin & Cape'}
                    </button>
                    <button onClick={() => setActiveTab('security')} style={{
                      flex: 1, padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'security' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'security' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}>
                      <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }} />
                      {lang === 'ru' ? 'Безопасность' : 'Security'}
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div style={{ ...glassCard, padding: '18px', flexGrow: 1, overflowY: 'auto' }}>

                    {/* 2FA SETUP INLINE SUB-VIEW */}
                    {activeTab === '2fa_setup' && setupData && (
                      <TwoFactorSetupView
                        setupData={setupData}
                        onBack={() => setActiveTab('security')}
                        onComplete={() => {
                          setTwoFactorEnabled(true);
                          setActiveTab('security');
                          setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Двухфакторная аутентификация успешно включена!' : '2FA Protection enabled!' });
                        }}
                        lang={lang}
                      />
                    )}

                    {/* 2FA DISABLE INLINE SUB-VIEW */}
                    {activeTab === '2fa_disable' && (
                      <TwoFactorDisableView
                        onBack={() => setActiveTab('security')}
                        onComplete={() => {
                          setTwoFactorEnabled(false);
                          setActiveTab('security');
                          setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Двухфакторная аутентификация отключена' : '2FA Protection disabled' });
                        }}
                        lang={lang}
                      />
                    )}

                    {/* SKIN & CAPE STUDIO TAB */}
                    {activeTab === 'skin' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Studio Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                          <div>
                            <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 900, margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Montserrat' }}>
                              {lang === 'ru' ? 'Персонализация 3D скина и плаща' : '3D Skin & Cape Customization'}
                            </h3>
                            <p style={{ color: '#a1a1aa', fontSize: '11px', margin: 0, fontWeight: 500 }}>
                              {lang === 'ru' ? 'Управление 3D моделью персонажа, загрузка скинов (PNG) и плащей' : 'Manage your in-game 3D character model, skin PNG files and capes'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{
                              fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                              background: 'rgba(167, 139, 250, 0.12)', border: '1px solid rgba(167, 139, 250, 0.25)', color: '#c4b5fd',
                              textTransform: 'uppercase'
                            }}>
                              {skinVariant === 'classic' ? 'Steve (4px)' : 'Alex (3px)'}
                            </span>
                          </div>
                        </div>

                        {/* Studio Layout: 3D Canvas + Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', alignItems: 'start' }}>

                          {/* 3D Canvas Box */}
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{
                              width: '100%',
                              height: '250px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.09) 0%, transparent 75%)',
                              borderRadius: '12px',
                              overflow: 'hidden'
                            }}>
                              <SkinViewer
                                skinDataUrl={skinUrl}
                                capeDataUrl={capeUrl}
                                skinVariant={skinVariant}
                                width={180}
                                height={250}
                                autoRotate={studioAutoRotate}
                                isWalking={studioIsWalking}
                              />
                            </div>

                            {/* Studio Controls */}
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setStudioAutoRotate(!studioAutoRotate)}
                                style={{
                                  flex: 1,
                                  padding: '8px 6px',
                                  borderRadius: '9px',
                                  border: studioAutoRotate ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                  background: studioAutoRotate ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                                  color: studioAutoRotate ? '#c4b5fd' : '#71717a',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  fontFamily: 'Montserrat'
                                }}
                              >
                                <i className={`fa-solid ${studioAutoRotate ? 'fa-pause' : 'fa-play'}`} style={{ fontSize: '10px' }} />
                                {studioAutoRotate ? (lang === 'ru' ? 'Вращение' : 'Rotate') : (lang === 'ru' ? 'Пауза' : 'Pause')}
                              </motion.button>

                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setStudioIsWalking(!studioIsWalking)}
                                style={{
                                  flex: 1,
                                  padding: '8px 6px',
                                  borderRadius: '9px',
                                  border: studioIsWalking ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                  background: studioIsWalking ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                                  color: studioIsWalking ? '#34d399' : '#71717a',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  fontFamily: 'Montserrat'
                                }}
                              >
                                <i className="fa-solid fa-person-walking" style={{ fontSize: '10px' }} />
                                {studioIsWalking ? (lang === 'ru' ? 'Анимация' : 'Walking') : (lang === 'ru' ? 'Поза' : 'Pose')}
                              </motion.button>
                            </div>
                          </div>

                          {/* Control Cards */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* Model Type Selector */}
                            <div>
                              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                {lang === 'ru' ? 'Модель рук (Steve / Alex)' : 'Model Arm Variant'}
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <motion.div
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => skinVariant !== 'classic' && handleToggleSkinVariant()}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: skinVariant === 'classic' ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                    background: skinVariant === 'classic' ? 'rgba(167, 139, 250, 0.14)' : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px',
                                    background: skinVariant === 'classic' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.06)',
                                    color: skinVariant === 'classic' ? '#fff' : '#71717a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900
                                  }}>
                                    <i className="fa-solid fa-user-large" style={{ fontSize: '14px' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: skinVariant === 'classic' ? '#fff' : '#a1a1aa', fontFamily: 'Montserrat' }}>
                                      Classic (Steve)
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#71717a', marginTop: '1px' }}>4px стандартные руки</div>
                                  </div>
                                </motion.div>

                                <motion.div
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => skinVariant !== 'slim' && handleToggleSkinVariant()}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: skinVariant === 'slim' ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                    background: skinVariant === 'slim' ? 'rgba(167, 139, 250, 0.14)' : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px',
                                    background: skinVariant === 'slim' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.06)',
                                    color: skinVariant === 'slim' ? '#fff' : '#71717a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900
                                  }}>
                                    <i className="fa-solid fa-user-ninja" style={{ fontSize: '14px' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: skinVariant === 'slim' ? '#fff' : '#a1a1aa', fontFamily: 'Montserrat' }}>
                                      Slim (Alex)
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#71717a', marginTop: '1px' }}>3px тонкие руки</div>
                                  </div>
                                </motion.div>
                              </div>
                            </div>

                            {/* Skin Upload Card */}
                            <div style={{
                              padding: '14px 16px',
                              borderRadius: '14px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px', height: '42px', borderRadius: '12px',
                                  background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd'
                                }}>
                                  <i className="fa-solid fa-file-arrow-up" style={{ fontSize: '18px' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>
                                    {lang === 'ru' ? 'Загрузка скина (PNG)' : 'Upload Skin (PNG)'}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>
                                    Форматы 64x64 или 64x32 пикселя
                                  </div>
                                </div>
                              </div>

                              <motion.button
                                whileHover={{ scale: 1.03, boxShadow: '0 0 16px rgba(167,139,250,0.35)' }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleUploadSkin}
                                style={{
                                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '10px 16px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontFamily: 'Montserrat',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <i className="fa-solid fa-upload" />
                                {lang === 'ru' ? 'Обновить скин' : 'Upload Skin'}
                              </motion.button>
                            </div>

                            {/* Cape Upload Card */}
                            <div style={{
                              padding: '14px 16px',
                              borderRadius: '14px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px', height: '42px', borderRadius: '12px',
                                  background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399'
                                }}>
                                  <i className="fa-solid fa-vest-patches" style={{ fontSize: '18px' }} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>
                                    {lang === 'ru' ? 'Загрузка плаща (PNG)' : 'Upload Cape (PNG)'}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>
                                    Закрепляется за спиной 3D модели
                                  </div>
                                </div>
                              </div>

                              <motion.button
                                whileHover={{ scale: 1.03, boxShadow: '0 0 16px rgba(16,185,129,0.35)' }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleUploadCape}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '10px 16px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontFamily: 'Montserrat',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <i className="fa-solid fa-circle-chevron-up" />
                                {lang === 'ru' ? 'Загрузить плащ' : 'Upload Cape'}
                              </motion.button>
                            </div>

                            <InfoBox color="#a78bfa" icon="fa-solid fa-wand-magic-sparkles">
                              {lang === 'ru' ? 'Обновленные скины и плащи сохраняются на сервере и автоматически подключаются при запуске любых сборщиков Minecraft.' : 'Uploaded skins and capes instantly sync with auth server and apply to your launcher gameplay.'}
                            </InfoBox>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* STYLE TAB */}
                    {activeTab === 'style' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Background */}
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Фон профиля (Пресеты)' : 'Profile Background Presets'}
                          </h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {Object.keys(PRESET_GRADIENTS).map((key) => (
                              <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => handleSelectPreset(key)} style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                border: profileBgType === 'preset' && profileBgValue === key ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                                background: PRESET_GRADIENTS[key], cursor: 'pointer'
                              }} title={key} />
                            ))}
                          </div>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={handleUploadBackground} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '8px'
                          }}>
                            <i className="fa-solid fa-image" />
                            {lang === 'ru' ? 'Загрузить изображение / GIF' : 'Upload Image / GIF'}
                          </motion.button>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Avatar */}
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Аватар профиля и цвет рамки' : 'Profile Avatar & Border Color'}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => handleSwitchAvatarType('minecraft')} style={{
                                background: avatarType === 'minecraft' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${avatarType === 'minecraft' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                color: avatarType === 'minecraft' ? '#34d399' : '#a1a1aa',
                                padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat', transition: 'all 0.2s'
                              }}>Minecraft голова</button>
                              <button onClick={() => handleSwitchAvatarType('custom')} style={{
                                background: avatarType === 'custom' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${avatarType === 'custom' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                color: avatarType === 'custom' ? '#34d399' : '#a1a1aa',
                                padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat', transition: 'all 0.2s'
                              }}>Кастомная аватарка</button>
                            </div>
                            {avatarType === 'custom' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleUploadAvatar} style={{
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#fff', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer',
                                  fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                  <i className="fa-solid fa-user-tie" />
                                  {lang === 'ru' ? 'Загрузить аватарку' : 'Upload Avatar'}
                                </motion.button>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>PNG, JPG, GIF (макс. 2МБ)</span>
                              </div>
                            )}

                            {/* Color of Profile Avatar Border */}
                            <div style={{ marginTop: '4px' }}>
                              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                {lang === 'ru' ? 'Цвет рамки аватара' : 'Avatar Border Color'}
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {['#a78bfa', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#eab308'].map(color => (
                                  <motion.button
                                    key={color}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleSelectBorderColor(color)}
                                    style={{
                                      width: '28px', height: '28px', borderRadius: '50%',
                                      background: color,
                                      border: avatarBorderColor === color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                                      boxShadow: avatarBorderColor === color ? `0 0 10px ${color}` : 'none',
                                      cursor: 'pointer'
                                    }}
                                  />
                                ))}
                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                                  <input
                                    type="color"
                                    value={avatarBorderColor}
                                    onChange={(e) => handleSelectBorderColor(e.target.value)}
                                    style={{ width: '30px', height: '30px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                                  />
                                  <span style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace', fontWeight: 700 }}>{avatarBorderColor}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Status & Bio */}
                        <div style={{ position: 'relative' }}>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Статус и информация' : 'Status & Bio Information'}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                              <EmojiPicker value={statusEmoji} onChange={(emoji) => setStatusEmoji(emoji)} />
                              <input type="text" placeholder={lang === 'ru' ? 'Чем вы сейчас занимаетесь?' : 'What are you doing now?'}
                                value={statusText} onChange={(e) => setStatusText(e.target.value)} style={inputStyle} maxLength={50} />
                            </div>
                            <div style={{ zIndex: 1 }}>
                              <textarea placeholder={lang === 'ru' ? 'Расскажите о себе...' : 'Write bio description...'}
                                value={bioText} onChange={(e) => setBioText(e.target.value)}
                                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'Montserrat' }} maxLength={150} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveStatus} style={{
                                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', color: '#fff',
                                padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                              }}>
                                {lang === 'ru' ? 'Сохранить стиль и статус' : 'Save Style & Status'}
                              </motion.button>
                            </div>
                          </div>
                        </div>


                      </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* 2FA */}
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Двухфакторная аутентификация (2FA)' : 'Two-Factor Authentication (2FA)'}
                          </h3>
                          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-shield-halved" style={{ color: '#c084fc', fontSize: '16px' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>
                                    {lang === 'ru' ? 'Защита кодами TOTP' : 'TOTP Code Protection'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Google Authenticator, Authy, Yandex Key</span>
                                </div>
                              </div>
                              {twoFactorEnabled ? (
                                <span style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <i className="fa-solid fa-check" style={{ fontSize: '10px' }} />
                                  {lang === 'ru' ? 'Подключено' : 'Enabled'}
                                </span>
                              ) : (
                                <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <i className="fa-solid fa-lock" style={{ fontSize: '10px' }} />
                                  {lang === 'ru' ? 'Отключено' : 'Disabled'}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                              {twoFactorEnabled ? (
                                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('2fa_disable')} style={{
                                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
                                  padding: '7px 14px', borderRadius: '9px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                  <i className="fa-solid fa-unlock" />{lang === 'ru' ? 'Отключить 2FA' : 'Disable 2FA'}
                                </motion.button>
                              ) : (
                                <motion.button whileTap={{ scale: 0.98 }} onClick={handleStart2FA} style={{
                                  background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.35)', color: '#c084fc',
                                  padding: '7px 14px', borderRadius: '9px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                  <i className="fa-solid fa-shield-halved" />{lang === 'ru' ? 'Настроить 2FA' : 'Setup 2FA'}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Google Verification */}
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Google верификация' : 'Google Account Verification'}
                          </h3>
                          {profile.google_email ? (
                            <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                  <i className="fa-brands fa-google" />
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase' }}>Аккаунт верифицирован</div>
                                  <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginTop: '1px' }}>{profile.google_email}</div>
                                </div>
                              </div>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={handleUnlinkGoogle} disabled={googleLoading} style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171',
                                padding: '6px 12px', borderRadius: '8px', cursor: googleLoading ? 'wait' : 'pointer', fontFamily: 'Montserrat', fontSize: '10px', fontWeight: 800
                              }}>Отвязать</motion.button>
                            </div>
                          ) : (
                            <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                  <i className="fa-solid fa-circle-exclamation" />
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase' }}>Верификация отсутствует</div>
                                  <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginTop: '1px' }}>Привяжите Google для защиты аккаунта</div>
                                </div>
                              </div>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={handleLinkGoogle} disabled={googleLoading} style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff',
                                padding: '7px 12px', borderRadius: '8px', cursor: googleLoading ? 'wait' : 'pointer',
                                fontFamily: 'Montserrat', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px'
                              }}>
                                <i className="fa-brands fa-google" />Привязать
                              </motion.button>
                            </div>
                          )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Change Password */}
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'ru' ? 'Смена пароля лаунчера' : 'Change Launcher Password'}
                          </h3>
                          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                              <input type="password" placeholder={lang === 'ru' ? 'Текущий пароль' : 'Current Password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} style={inputStyle} required />
                              <input type="password" placeholder={lang === 'ru' ? 'Новый пароль' : 'New Password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} required />
                              <input type="password" placeholder={lang === 'ru' ? 'Повторите новый' : 'Confirm New'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={passwordLoading} style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff',
                                padding: '8px 20px', borderRadius: '10px', cursor: passwordLoading ? 'wait' : 'pointer',
                                fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                              }}>
                                {passwordLoading ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : (lang === 'ru' ? 'Обновить пароль' : 'Update Password')}
                              </motion.button>
                            </div>
                            {passwordStatus && (
                              <div style={{
                                padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                background: passwordStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                border: passwordStatus.type === 'error' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(16,185,129,0.15)',
                                color: passwordStatus.type === 'error' ? '#f87171' : '#34d399'
                              }}>{passwordStatus.text}</div>
                            )}
                          </form>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Logout */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={onLogout} style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                            padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Montserrat',
                            fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                          }}>
                            <i className="fa-solid fa-right-from-bracket" />
                            {lang === 'ru' ? 'Выйти из аккаунта' : 'Logout from Account'}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info Footer */}
              <div style={{ flexShrink: 0 }}>
                <InfoBox color="#3b82f6" icon="fa-solid fa-circle-info">
                  {lang === 'ru' ? 'Кастомизация вашего профиля мгновенно синхронизируется с сервером авторизации и видна другим игрокам в списке.' : 'Profile customization automatically synchronizes with the auth backend and is visible to other players.'}
                </InfoBox>
              </div>
            </div>
        ) : (
          /* ================= PUBLIC PLAYER PROFILE SHOWCASE ================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '24px',
            flexGrow: 1,
            alignItems: 'stretch',
            paddingBottom: '20px'
          }}>
            {/* LEFT COLUMN: Passport ID Card */}
            <div style={{
              ...glassCard,
              ...currentBgStyle,
              position: 'relative',
              borderRadius: '24px',
              border: 'none',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '30px'
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%)',
                zIndex: 1
              }} />

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {avatarType === 'custom' && avatarUrl ? (
                    <img
                      src={finalAvatarUrl}
                      alt="Avatar"
                      style={{
                        width: '80px', height: '80px', borderRadius: '20px',
                        objectFit: 'cover', border: `3px solid ${avatarBorderColor || profile.avatar_border_color || 'rgba(167, 139, 250, 0.8)'}`,
                      }}
                    />
                  ) : (
                    <div style={{ border: `3px solid ${avatarBorderColor || profile.avatar_border_color || 'rgba(16, 185, 129, 0.8)'}`, borderRadius: '18px', padding: '2px', background: 'rgba(0,0,0,0.4)' }}>
                      <MinecraftAvatar skinDataUrl={skinUrl} size={72} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {profile.badge && <span style={getBadgeStyle(profile.badge)}>{getBadgeText(profile.badge)}</span>}
                      <span style={{ fontSize: '26px', fontWeight: 900, color: '#fff' }}>
                        {profile.username || profile.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>
                      {profile.is_admin ? (lang === 'ru' ? 'Администратор сервера' : 'Server Administrator') : (lang === 'ru' ? 'Игрок сообщества' : 'Community Player')}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '24px', flexGrow: 1 }}>
                  {(statusText || statusEmoji) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                      <span>{statusEmoji}</span><span>{statusText}</span>
                    </div>
                  )}

                  {(bioText || profile.bio) && (
                    <div style={{ marginTop: '16px', color: '#d4d4d8', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '3px solid #a78bfa', paddingLeft: '12px' }}>
                      "{bioText || profile.bio}"
                    </div>
                  )}
                </div>


              </div>
            </div>

            {/* RIGHT COLUMN: 3D Skin Showcase */}
            <div style={{
              ...glassCard,
              padding: '0px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ width: '45px', height: '45px', border: '4px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
              ) : (
                <SkinViewer skinDataUrl={skinUrl} capeDataUrl={capeUrl} skinVariant={skinVariant} fillContainer={true} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
