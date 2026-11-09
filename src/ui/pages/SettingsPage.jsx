import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

// ─── СТИЛИ КОНТЕЙНЕРА И СТЕКЛА ────────────────────────────────────────────────
const pageContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  background: 'transparent',
  border: 'none',
  padding: '0 4px 12px 4px',
  boxSizing: 'border-box'
};

const settingCardStyle = {
  background: 'rgba(20, 20, 28, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  borderRadius: '16px',
  padding: '20px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  boxSizing: 'border-box'
};

const glassInput = {
  background: 'rgba(20, 20, 28, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  borderRadius: '12px',
  color: '#fff',
  padding: '11px 14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  color: '#ffffff',
  fontSize: '13.5px',
  fontWeight: 700,
  marginBottom: '4px',
  fontFamily: 'Montserrat'
};

const descStyle = {
  display: 'block',
  color: '#71717a',
  fontSize: '11.5px',
  fontWeight: 500,
  lineHeight: 1.5,
  fontFamily: 'Montserrat'
};

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, color = '#10b981' }) {
  return (
    <motion.div 
      onClick={() => onChange(!value)} 
      whileTap={{ opacity: 0.85 }}
      style={{
        width: '42px', 
        height: '24px', 
        borderRadius: '12px',
        cursor: 'pointer', 
        position: 'relative', 
        flexShrink: 0,
        background: value ? color : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.25s',
        boxShadow: value ? `0 0 12px ${color}50` : 'none',
      }}
    >
      <motion.div 
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{ 
          width: '18px', 
          height: '18px', 
          borderRadius: '9px', 
          background: '#fff',
          position: 'absolute', 
          top: '2px', 
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)' 
        }} 
      />
    </motion.div>
  );
}

// ─── TOGGLE ROW (Как в референсе "Действия и оповещения") ─────────────────────
function ToggleRow({ title, desc, value, onChange, color = '#10b981' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'Montserrat' }}>
          {title}
        </span>
        {desc && <span style={descStyle}>{desc}</span>}
      </div>
      <Toggle value={value} onChange={onChange} color={color} />
    </div>
  );
}

// ─── PRESET BUTTON ────────────────────────────────────────────────────────────
function PresetBtn({ active, color, onClick, children }) {
  return (
    <motion.button 
      whileTap={{ opacity: 0.85 }} 
      onClick={onClick}
      style={{
        background: active ? `${color}25` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#ffffff' : '#71717a', 
        padding: '6px 12px', 
        borderRadius: '9px',
        cursor: 'pointer', 
        fontFamily: 'Montserrat', 
        fontWeight: 700, 
        fontSize: '11px',
        transition: 'all 0.18s ease',
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── INFO BOX ─────────────────────────────────────────────────────────────────
function InfoBox({ color = '#a1a1aa', icon = 'fa-solid fa-circle-info', children }) {
  return (
    <div style={{
      display: 'flex', 
      gap: '10px', 
      alignItems: 'flex-start', 
      padding: '12px 14px',
      background: `${color}10`, 
      border: `1px solid ${color}28`, 
      borderRadius: '12px',
      marginTop: '4px'
    }}>
      <i className={icon} style={{ color, fontSize: '13px', marginTop: '1px', flexShrink: 0 }} />
      <span style={{ color: '#a1a1aa', fontSize: '11.5px', fontWeight: 500, lineHeight: 1.5, fontFamily: 'Montserrat' }}>
        {children}
      </span>
    </div>
  );
}

// ─── 2FA SETUP MODAL ──────────────────────────────────────────────────────────
function TwoFactorSetupModal({ setupData, onClose, onComplete, lang }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleEnable = async () => {
    if (!code || code.trim().length !== 6) {
      setError(lang === 'ru' ? 'Введите 6-значный код из приложения' : 'Enter 6-digit code from app');
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'rgba(18, 18, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          padding: '26px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-qrcode" style={{ color: '#c084fc', fontSize: '20px' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'Montserrat' }}>
              {lang === 'ru' ? 'Настройка 2FA' : 'Setup 2FA'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '16px' }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, fontFamily: 'Montserrat' }}>
            1. {lang === 'ru' ? 'Отсканируйте QR-код в приложении аутентификации:' : 'Scan QR code in your authenticator app:'}
          </span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            {setupData.qrCodeUrl ? (
              <img src={setupData.qrCodeUrl} alt="QR Code" style={{ width: '120px', height: '120px', borderRadius: '10px', background: '#fff', padding: '6px' }} />
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Montserrat' }}>
                {lang === 'ru' ? 'Секретный ключ:' : 'Manual Secret:'}
              </span>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#c084fc', wordBreak: 'break-all', background: 'rgba(0,0,0,0.4)', padding: '7px 9px', borderRadius: '8px' }}>
                {setupData.secret}
              </div>
              <motion.button
                whileTap={{ opacity: 0.85 }}
                onClick={copySecret}
                style={{
                  background: 'rgba(192, 132, 252, 0.12)',
                  border: '1px solid rgba(192, 132, 252, 0.3)',
                  color: '#c084fc',
                  padding: '6px 12px',
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
                {copiedSecret ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : (lang === 'ru' ? 'Скопировать' : 'Copy')}
              </motion.button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, fontFamily: 'Montserrat' }}>
            2. {lang === 'ru' ? 'Введите 6-значный код из приложения:' : 'Enter 6-digit code from app:'}
          </span>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ ...glassInput, textAlign: 'center', fontSize: '18px', letterSpacing: '6px', fontWeight: 800 }}
          />
        </div>

        {error && (
          <div style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#a1a1aa',
              padding: '11px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <motion.button
            whileTap={{ opacity: 0.85 }}
            onClick={handleEnable}
            disabled={loading}
            style={{
              flex: 1.2,
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '11px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {loading ? (lang === 'ru' ? 'Проверка...' : 'Verifying...') : (lang === 'ru' ? 'Подтвердить 2FA' : 'Enable 2FA')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── 2FA DISABLE MODAL ────────────────────────────────────────────────────────
function TwoFactorDisableModal({ onClose, onComplete, lang }) {
  const [authInput, setAuthInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisable = async () => {
    if (!authInput) {
      setError(lang === 'ru' ? 'Введите пароль или код' : 'Enter password or code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await window.electronAPI.disable2FA(authInput);
      if (res.success) {
        onComplete();
      } else {
        setError(res.error || (lang === 'ru' ? 'Неверный пароль или код' : 'Invalid password or code'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'rgba(18, 18, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-unlock" style={{ color: '#ef4444', fontSize: '18px' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, fontFamily: 'Montserrat' }}>
              {lang === 'ru' ? 'Отключение 2FA' : 'Disable 2FA'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '16px' }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, fontFamily: 'Montserrat' }}>
          {lang === 'ru' ? 'Для подтверждения введите пароль или 6-значный код 2FA:' : 'Enter your password or 6-digit code to confirm:'}
        </span>

        <input
          type="password"
          placeholder={lang === 'ru' ? 'Пароль или 2FA код...' : 'Password or code...'}
          value={authInput}
          onChange={(e) => setAuthInput(e.target.value)}
          style={glassInput}
        />

        {error && (
          <div style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#a1a1aa',
              padding: '11px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <motion.button
            whileTap={{ opacity: 0.85 }}
            onClick={handleDisable}
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '11px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {loading ? (lang === 'ru' ? 'Отключение...' : 'Disabling...') : (lang === 'ru' ? 'Отключить' : 'Disable')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── CONFIRM RESET MODAL ──────────────────────────────────────────────────────
function ConfirmResetModal({ onConfirm, onCancel, lang }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'rgba(20, 16, 20, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '18px'
          }}>
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
              {lang === 'ru' ? 'Сброс всех настроек' : 'Reset All Settings'}
            </h4>
            <span style={{ fontSize: '11.5px', color: '#a1a1aa' }}>
              {lang === 'ru' ? 'Это действие вернёт лаунчер к заводским параметрам.' : 'This will restore all default launcher settings.'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#a1a1aa', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
            }}
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1.2, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
            }}
          >
            {lang === 'ru' ? 'Сбросить всё' : 'Reset All'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ НАСТРОЕК ─────────────────────────────────────
export default function SettingsPage({ currentPack }) {
  const { lang, setLang, t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 2FA Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [setupData, setSetupData] = useState(null);

  // Password Change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Interface Settings
  const DEFAULT_MENU_CONFIG = { builds: true, client: true, server: true, users: true, chat: true, profile: true };
  const getInitialMenuConfig = () => {
    try {
      const saved = localStorage.getItem('launcher_menu_config');
      return saved ? { ...DEFAULT_MENU_CONFIG, ...JSON.parse(saved) } : DEFAULT_MENU_CONFIG;
    } catch (_) {
      return DEFAULT_MENU_CONFIG;
    }
  };
  const [accentColor, setAccentColor] = useState(localStorage.getItem('launcher_accent_color') || '#3b82f6');
  const [menuConfig, setMenuConfig] = useState(getInitialMenuConfig);
  const [animatedBg, setAnimatedBg] = useState(localStorage.getItem('launcher_animated_bg') !== 'false');

  // Game Settings
  const [ram, setRam] = useState(localStorage.getItem('launcher_ram') || '4');
  const [maxRam, setMaxRam] = useState(16);
  const [buildsDir, setBuildsDir] = useState(localStorage.getItem('launcher_builds_dir') || '');
  const [defaultBuildsDir, setDefaultBuildsDir] = useState('');
  const [winWidth, setWinWidth] = useState(localStorage.getItem('launcher_win_width') || '1280');
  const [winHeight, setWinHeight] = useState(localStorage.getItem('launcher_win_height') || '720');
  const [fullscreen, setFullscreen] = useState(localStorage.getItem('launcher_fullscreen') === 'true');

  // Java Settings
  const [clientJava, setClientJava] = useState(localStorage.getItem('launcher_client_java') || '');
  const [serverJava, setServerJava] = useState(localStorage.getItem('launcher_server_java') || '');

  // Network Settings
  const [mode, setMode] = useState(localStorage.getItem('launcher_mode') || 'host');
  const [ip, setIp] = useState(localStorage.getItem('launcher_server_ip') || '');
  const importRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI?.customCheckAuth) {
      window.electronAPI.customCheckAuth().then(prof => {
        if (prof && prof.two_factor_enabled) {
          setTwoFactorEnabled(true);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getBuildsDir) {
        window.electronAPI.getBuildsDir().then(dir => setBuildsDir(dir || ''));
      }
      if (window.electronAPI.getDefaultBuildsDir) {
        window.electronAPI.getDefaultBuildsDir().then(dir => setDefaultBuildsDir(dir || ''));
      }
      if (window.electronAPI.getSystemMemory) {
        window.electronAPI.getSystemMemory().then(sysMem => {
          if (sysMem && sysMem > 2) {
            const calculatedMax = Math.max(2, Math.min(64, sysMem - 1));
            setMaxRam(calculatedMax);
            const currentRamNum = parseInt(ram, 10);
            if (currentRamNum > calculatedMax) {
              setRam(String(calculatedMax));
            }
          }
        });
      }
    }
  }, [ram]);

  // Сохранение при изменении
  useEffect(() => {
    localStorage.setItem('launcher_ram', ram);
    localStorage.setItem('launcher_win_width', winWidth);
    localStorage.setItem('launcher_win_height', winHeight);
    localStorage.setItem('launcher_fullscreen', String(fullscreen));
    localStorage.setItem('launcher_client_java', clientJava);
    localStorage.setItem('launcher_server_java', serverJava);
    localStorage.setItem('launcher_mode', mode);
    localStorage.setItem('launcher_server_ip', ip);
    window.dispatchEvent(new Event('settings-changed'));
  }, [ram, winWidth, winHeight, fullscreen, clientJava, serverJava, mode, ip]);

  const handleSaveExplicit = () => {
    localStorage.setItem('launcher_ram', ram);
    localStorage.setItem('launcher_win_width', winWidth);
    localStorage.setItem('launcher_win_height', winHeight);
    localStorage.setItem('launcher_fullscreen', String(fullscreen));
    localStorage.setItem('launcher_client_java', clientJava);
    localStorage.setItem('launcher_server_java', serverJava);
    localStorage.setItem('launcher_mode', mode);
    localStorage.setItem('launcher_server_ip', ip);
    localStorage.setItem('launcher_menu_config', JSON.stringify(menuConfig));
    localStorage.setItem('launcher_accent_color', accentColor);
    localStorage.setItem('launcher_animated_bg', String(animatedBg));
    window.dispatchEvent(new Event('settings-changed'));

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2200);
  };

  const handleBrowseBuildsDir = async () => {
    if (window.electronAPI?.selectFolder) {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        const saved = await window.electronAPI.setBuildsDir(selected);
        setBuildsDir(saved);
        localStorage.setItem('launcher_builds_dir', saved);
      }
    }
  };

  const handleResetBuildsDir = async () => {
    if (window.electronAPI?.getDefaultBuildsDir) {
      const def = await window.electronAPI.getDefaultBuildsDir();
      const saved = await window.electronAPI.setBuildsDir(def);
      setBuildsDir(saved);
      localStorage.setItem('launcher_builds_dir', saved);
    }
  };

  const handleStart2FA = async () => {
    try {
      const res = await window.electronAPI.setup2FA();
      if (res.success) {
        setSetupData(res);
        setShow2FASetupModal(true);
      } else {
        alert(res.error || (lang === 'ru' ? 'Не удалось запросить секрет 2FA' : 'Failed to setup 2FA'));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError(lang === 'ru' ? 'Заполните все поля' : 'Fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(lang === 'ru' ? 'Новые пароли не совпадают' : 'New passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setPwdError(lang === 'ru' ? 'Пароль должен быть не менее 4 символов' : 'Password must be at least 4 chars');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await window.electronAPI.changePassword(oldPassword, newPassword);
      if (res.success || res.message) {
        setPwdSuccess(lang === 'ru' ? 'Пароль успешно изменен' : 'Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(res.error || (lang === 'ru' ? 'Не удалось изменить пароль' : 'Failed to change password'));
      }
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAccentChange = (color) => {
    setAccentColor(color);
    localStorage.setItem('launcher_accent_color', color);
    window.dispatchEvent(new Event('settings-changed'));
  };

  const handleToggleMenuItem = (key) => {
    const updated = { ...menuConfig, [key]: !menuConfig[key] };
    setMenuConfig(updated);
    localStorage.setItem('launcher_menu_config', JSON.stringify(updated));
    window.dispatchEvent(new Event('settings-changed'));
  };

  const handleExport = () => {
    const data = { ram, winWidth, winHeight, fullscreen, clientJava, serverJava, mode, ip, menuConfig, accentColor, animatedBg };
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
        if (d.ram)                      setRam(d.ram);
        if (d.winWidth)                 setWinWidth(d.winWidth);
        if (d.winHeight)                setWinHeight(d.winHeight);
        if (d.fullscreen !== undefined) setFullscreen(d.fullscreen);
        if (d.clientJava !== undefined) setClientJava(d.clientJava);
        if (d.serverJava !== undefined) setServerJava(d.serverJava);
        if (d.mode)                     setMode(d.mode);
        if (d.ip !== undefined)         setIp(d.ip);
        if (d.accentColor)              handleAccentChange(d.accentColor);
        if (d.animatedBg !== undefined) {
          setAnimatedBg(d.animatedBg);
          localStorage.setItem('launcher_animated_bg', String(d.animatedBg));
        }
        if (d.menuConfig) {
          setMenuConfig(d.menuConfig);
          localStorage.setItem('launcher_menu_config', JSON.stringify(d.menuConfig));
        }
      } catch {}
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // ── СПИСОК ВКЛАДОК САЙДБАРА ────────────────────────────────────────────────
  const TABS = [
    { id: 'general',   label: lang === 'ru' ? 'Общие'         : 'General',   icon: 'fa-solid fa-sliders',         color: '#10b981' },
    { id: 'game',      label: lang === 'ru' ? 'Игра'          : 'Game',      icon: 'fa-solid fa-gamepad',         color: '#3b82f6' },
    { id: 'interface', label: lang === 'ru' ? 'Интерфейс'     : 'Interface', icon: 'fa-solid fa-palette',         color: '#a855f7' },
    { id: 'java',      label: 'Java',                                        icon: 'fa-solid fa-mug-hot',         color: '#ef4444' },
    { id: 'network',   label: lang === 'ru' ? 'Сеть'          : 'Network',   icon: 'fa-solid fa-tower-broadcast',  color: '#06b6d4' },
    { id: 'security',  label: lang === 'ru' ? 'Безопасность'  : 'Security',  icon: 'fa-solid fa-shield-halved',   color: '#ec4899' },
    { id: 'misc',      label: lang === 'ru' ? 'Данные и сброс': 'Data & Reset', icon: 'fa-solid fa-rotate-left', color: '#f59e0b' },
  ];

  const ACCENT_COLORS = [
    { id: '#10b981', name: lang === 'ru' ? 'Изумрудный' : 'Emerald' },
    { id: '#3b82f6', name: lang === 'ru' ? 'Сапфировый' : 'Sapphire' },
    { id: '#a855f7', name: lang === 'ru' ? 'Аметистовый' : 'Amethyst' },
    { id: '#f59e0b', name: lang === 'ru' ? 'Янтарный' : 'Amber' },
    { id: '#ef4444', name: lang === 'ru' ? 'Рубиновый' : 'Ruby' },
    { id: '#06b6d4', name: lang === 'ru' ? 'Бирюзовый' : 'Cyan' },
    { id: '#ec4899', name: lang === 'ru' ? 'Розовый' : 'Rose' },
  ];

  const MENU_ITEMS = [
    { id: 'server',  label: lang === 'ru' ? 'Сервер'  : 'Server',  icon: 'fa-server',      color: '#3b82f6' },
    { id: 'users',   label: lang === 'ru' ? 'Игроки'  : 'Users',   icon: 'fa-users',       color: '#6366f1' },
    { id: 'chat',    label: lang === 'ru' ? 'Чат'     : 'Chat',    icon: 'fa-comments',    color: '#22d3ee' },
    { id: 'profile', label: lang === 'ru' ? 'Профиль' : 'Profile', icon: 'fa-circle-user', color: '#a78bfa' },
  ];

  return (
    <>
      <AnimatePresence>
        {showConfirm && (
          <ConfirmResetModal
            lang={lang}
            onConfirm={handleReset}
            onCancel={() => setShowConfirm(false)}
          />
        )}
        {show2FASetupModal && setupData && (
          <TwoFactorSetupModal
            setupData={setupData}
            lang={lang}
            onClose={() => setShow2FASetupModal(false)}
            onComplete={() => {
              setTwoFactorEnabled(true);
              setShow2FASetupModal(false);
            }}
          />
        )}
        {show2FADisableModal && (
          <TwoFactorDisableModal
            lang={lang}
            onClose={() => setShow2FADisableModal(false)}
            onComplete={() => {
              setTwoFactorEnabled(false);
              setShow2FADisableModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <div style={pageContainerStyle} className="tab-enter">
        {/* ─── ШАПКА В ОДНУ СТРОКУ (КАК В РЕФЕРЕНСЕ) ────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              color: '#ffffff',
              fontFamily: 'Montserrat'
            }}>
              {t('settings_title')}
            </h2>
            <p style={{
              margin: '3px 0 0 0',
              fontSize: '11.5px',
              color: '#71717a',
              fontFamily: 'Montserrat',
              fontWeight: 500
            }}>
              {lang === 'ru' 
                ? 'Настройка поведения программы, параметров движка и интерфейса' 
                : 'Configure application behavior, engine settings and appearance'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveExplicit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '10px 22px',
              borderRadius: '12px',
              background: isSaved ? 'rgba(16, 185, 129, 0.18)' : '#ffffff',
              border: isSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid #ffffff',
              color: isSaved ? '#34d399' : '#0a0a0f',
              fontFamily: 'Montserrat',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: isSaved ? '0 0 16px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(0, 0, 0, 0.25)'
            }}
          >
            <i className={isSaved ? "fa-solid fa-check" : "fa-solid fa-floppy-disk"} />
            <span>{isSaved ? (lang === 'ru' ? 'Сохранено ✓' : 'Saved ✓') : (lang === 'ru' ? 'Сохранить настройки' : 'Save Settings')}</span>
          </motion.button>
        </div>

        {/* ─── ДВУХКОЛОНОЧНАЯ СТРУКТУРА ────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '22px',
          flexGrow: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Левая колонка: Вертикальный Сайдбар вкладок */}
          <div style={{
            width: '210px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto',
            paddingRight: '2px'
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: active ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                    background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: active ? '#ffffff' : '#a1a1aa',
                    fontFamily: 'Montserrat',
                    fontSize: '13px',
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#a1a1aa';
                    }
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: active ? `${tab.color}25` : 'rgba(255, 255, 255, 0.04)',
                    border: active ? `1px solid ${tab.color}50` : '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? tab.color : '#71717a',
                    fontSize: '12px',
                    flexShrink: 0,
                    transition: 'all 0.18s ease'
                  }}>
                    <i className={tab.icon} />
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Правая колонка: Прокручиваемый контент активной вкладки */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '6px'
          }}>
            {/* ── ВКЛАДКА: ОБЩИЕ ── */}
            {activeTab === 'general' && (
              <>
                {/* Карточка 1: Язык интерфейса */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_lang')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Выберите предпочитаемый язык отображения приложения' : 'Select preferred application display language'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', width: 'fit-content' }}>
                    <button
                      onClick={() => setLang('ru')}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: lang === 'ru' ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                        border: lang === 'ru' ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: lang === 'ru' ? '#0a0a0f' : '#a1a1aa',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '11px', background: lang === 'ru' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px' }}>RU</span>
                      Русский
                    </button>
                    <button
                      onClick={() => setLang('en')}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: lang === 'en' ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                        border: lang === 'en' ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: lang === 'en' ? '#0a0a0f' : '#a1a1aa',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '11px', background: lang === 'en' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px' }}>EN</span>
                      English
                    </button>
                  </div>
                </div>

                {/* Карточка 2: Папка сохранения сборок */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{lang === 'ru' ? 'Папка для сборок' : 'Builds Folder'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Куда будут устанавливаться игровые клиенты и сохраняться данные модов' : 'Directory where game clients and mod data will be installed'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={buildsDir}
                      style={{ ...glassInput, flex: 1, cursor: 'default' }}
                    />
                    <motion.button
                      whileTap={{ opacity: 0.85 }}
                      onClick={handleBrowseBuildsDir}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        borderRadius: '12px',
                        padding: '11px 16px',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Montserrat'
                      }}
                    >
                      <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                      {lang === 'ru' ? 'Обзор' : 'Browse'}
                    </motion.button>
                    {defaultBuildsDir && buildsDir !== defaultBuildsDir && (
                      <motion.button
                        whileTap={{ opacity: 0.85 }}
                        onClick={handleResetBuildsDir}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#a1a1aa',
                          borderRadius: '12px',
                          padding: '11px 14px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Montserrat'
                        }}
                      >
                        {lang === 'ru' ? 'Сбросить' : 'Reset'}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Карточка 3: Действия и анимации (по референсу) */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{lang === 'ru' ? 'Действия и анимации' : 'Actions & Animations'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Параметры графических эффектов и фонового воспроизведения' : 'Configure visual effects and background playback'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <ToggleRow
                      title={lang === 'ru' ? 'Анимированный видео-фон' : 'Animated Video Background'}
                      desc={lang === 'ru' ? 'Воспроизводить живые видео-обои сборок на главной странице' : 'Play live video wallpapers for modpacks on the home page'}
                      value={animatedBg}
                      onChange={(val) => {
                        setAnimatedBg(val);
                        localStorage.setItem('launcher_animated_bg', String(val));
                        window.dispatchEvent(new Event('settings-changed'));
                      }}
                      color="#10b981"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: ИГРА ── */}
            {activeTab === 'game' && (
              <>
                {/* Карточка 1: Оперативная память (RAM) */}
                <div style={settingCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={labelStyle}>{t('settings_ram')}</span>
                      <span style={descStyle}>{lang === 'ru' ? 'Количество оперативной памяти, выделяемой для игры' : 'Memory allocation dedicated for running Minecraft'}</span>
                    </div>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '18px',
                      color: '#10b981',
                      fontFamily: 'Montserrat',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {ram} {lang === 'ru' ? 'ГБ' : 'GB'}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="2"
                    max={maxRam}
                    step="1"
                    value={ram}
                    onChange={e => setRam(e.target.value)}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#10b981' }}
                  />

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['2','4','6','8','12','16','24','32','48','64'].filter(v => parseInt(v, 10) <= maxRam).map(v => (
                      <PresetBtn key={v} active={ram === v} color="#10b981" onClick={() => setRam(v)}>
                        {v} {lang === 'ru' ? 'ГБ' : 'GB'}
                      </PresetBtn>
                    ))}
                  </div>
                </div>

                {/* Карточка 2: Разрешение игрового окна */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_window')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Разрешение и режим отображения клиента игры при запуске' : 'Display mode and default resolution when launching game'}</span>
                  </div>

                  <ToggleRow
                    title={t('settings_fullscreen')}
                    desc={lang === 'ru' ? 'Запускать игру сразу на весь экран монитора' : 'Launch game directly in fullscreen mode'}
                    value={fullscreen}
                    onChange={setFullscreen}
                    color="#60a5fa"
                  />

                  {!fullscreen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px', color: '#a1a1aa' }}>{t('settings_width')}</label>
                          <input
                            type="number"
                            value={winWidth}
                            onChange={e => setWinWidth(e.target.value)}
                            placeholder="1280"
                            style={glassInput}
                          />
                        </div>
                        <div style={{ color: '#52525b', fontWeight: 800, fontSize: '16px', textAlign: 'center', marginTop: '16px' }}>×</div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px', color: '#a1a1aa' }}>{t('settings_height')}</label>
                          <input
                            type="number"
                            value={winHeight}
                            onChange={e => setWinHeight(e.target.value)}
                            placeholder="720"
                            style={glassInput}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[{l:'1280×720',w:'1280',h:'720'},{l:'1920×1080',w:'1920',h:'1080'},{l:'2560×1440',w:'2560',h:'1440'}].map(r => (
                          <PresetBtn key={r.l} active={winWidth===r.w && winHeight===r.h} color="#60a5fa" onClick={() => { setWinWidth(r.w); setWinHeight(r.h); }}>
                            {r.l}
                          </PresetBtn>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: ИНТЕРФЕЙС ── */}
            {activeTab === 'interface' && (
              <>
                {/* Карточка 1: Акцентный цвет */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{lang === 'ru' ? 'Акцентный цвет темы' : 'Theme Accent Color'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Основной цвет акцентов для активных кнопок и элементов лаунчера' : 'Main highlight color for buttons, badges and switches'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {ACCENT_COLORS.map(c => (
                      <motion.button
                        key={c.id}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleAccentChange(c.id)}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: c.id,
                          border: accentColor === c.id ? '3px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          boxShadow: accentColor === c.id ? `0 0 16px ${c.id}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {accentColor === c.id && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '14px' }} />}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Карточка 2: Настройка бокового меню */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{lang === 'ru' ? 'Настройка бокового меню' : 'Sidebar Menu Navigation'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Включение и отключение отображения разделов на левой панели' : 'Show or hide specific page icons in the launcher sidebar'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {MENU_ITEMS.map(item => {
                      const isEnabled = menuConfig[item.id] !== false;
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '8px',
                              background: `${item.color}20`, border: `1px solid ${item.color}40`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: item.color, fontSize: '13px'
                            }}>
                              <i className={`fa-solid ${item.icon}`} />
                            </div>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px', fontFamily: 'Montserrat' }}>
                              {item.label}
                            </span>
                          </div>
                          <Toggle
                            value={isEnabled}
                            onChange={() => handleToggleMenuItem(item.id)}
                            color="#10b981"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: JAVA ── */}
            {activeTab === 'java' && (
              <>
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_java_client')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Путь к исполняемому файлу javaw.exe для запуска игры' : 'Path to javaw executable for game client'}</span>
                  </div>
                  <input
                    type="text"
                    value={clientJava}
                    onChange={e => setClientJava(e.target.value)}
                    placeholder={t('settings_java_placeholder')}
                    spellCheck="false"
                    style={glassInput}
                  />
                  <InfoBox color="#ef4444">{t('settings_java_info')}</InfoBox>
                </div>

                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_java_server')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Путь к Java для локального запуска сервера' : 'Path to Java executable for running local servers'}</span>
                  </div>
                  <input
                    type="text"
                    value={serverJava}
                    onChange={e => setServerJava(e.target.value)}
                    placeholder={t('settings_java_placeholder')}
                    spellCheck="false"
                    style={glassInput}
                  />
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: СЕТЬ ── */}
            {activeTab === 'network' && (
              <>
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_network_mode')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Выберите роль лаунчера при игре по локальной сети' : 'Select client network mode for local multiplayer'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setMode('host')}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: mode === 'host' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: mode === 'host' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: mode === 'host' ? '#60a5fa' : '#a1a1aa'
                      }}
                    >
                      <i className="fa-solid fa-house-signal" />
                      {t('settings_mode_host')}
                    </button>
                    <button
                      onClick={() => setMode('connect')}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: mode === 'connect' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: mode === 'connect' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: mode === 'connect' ? '#c084fc' : '#a1a1aa'
                      }}
                    >
                      <i className="fa-solid fa-plug-circle-bolt" />
                      {t('settings_mode_connect')}
                    </button>
                  </div>

                  {mode === 'connect' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      <label style={{ ...labelStyle, fontSize: '11px', color: '#a1a1aa' }}>{t('settings_server_ip')}</label>
                      <input
                        type="text"
                        value={ip}
                        onChange={e => setIp(e.target.value)}
                        placeholder={t('settings_ip_placeholder')}
                        style={glassInput}
                      />
                    </div>
                  )}

                  {mode === 'host' && (
                    <InfoBox color="#3b82f6">{t('settings_host_info')}</InfoBox>
                  )}
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: БЕЗОПАСНОСТЬ ── */}
            {activeTab === 'security' && (
              <>
                {/* Двухфакторная аутентификация */}
                <div style={settingCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={labelStyle}>{lang === 'ru' ? 'Двухфакторная аутентификация (2FA)' : 'Two-Factor Authentication (2FA)'}</span>
                      <span style={descStyle}>{lang === 'ru' ? 'Дополнительный уровень защиты аккаунта одноразовыми кодами' : 'Enhanced security with authenticator app passcodes'}</span>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      fontFamily: 'Montserrat',
                      background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: twoFactorEnabled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: twoFactorEnabled ? '#10b981' : '#71717a'
                    }}>
                      {twoFactorEnabled ? (lang === 'ru' ? 'ВКЛЮЧЕНА' : 'ENABLED') : (lang === 'ru' ? 'ОТКЛЮЧЕНА' : 'DISABLED')}
                    </span>
                  </div>

                  <div>
                    {twoFactorEnabled ? (
                      <motion.button
                        whileTap={{ opacity: 0.85 }}
                        onClick={() => setShow2FADisableModal(true)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'Montserrat'
                        }}
                      >
                        <i className="fa-solid fa-unlock" />
                        {lang === 'ru' ? 'Отключить 2FA' : 'Disable 2FA'}
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ opacity: 0.85 }}
                        onClick={handleStart2FA}
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'Montserrat'
                        }}
                      >
                        <i className="fa-solid fa-shield-halved" />
                        {lang === 'ru' ? 'Настроить 2FA' : 'Enable 2FA'}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Смена пароля */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{lang === 'ru' ? 'Смена пароля' : 'Change Password'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Обновление пароля вашей учетной записи DivLauncher' : 'Update your account access password'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <input
                      type="password"
                      placeholder={lang === 'ru' ? 'Старый пароль' : 'Old password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      style={glassInput}
                    />
                    <input
                      type="password"
                      placeholder={lang === 'ru' ? 'Новый пароль' : 'New password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={glassInput}
                    />
                    <input
                      type="password"
                      placeholder={lang === 'ru' ? 'Подтвердите пароль' : 'Confirm password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={glassInput}
                    />
                  </div>

                  {pwdError && (
                    <div style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-triangle-exclamation" /> {pwdError}
                    </div>
                  )}
                  {pwdSuccess && (
                    <div style={{ color: '#34d399', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-circle-check" /> {pwdSuccess}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ opacity: 0.85 }}
                    onClick={handleChangePassword}
                    disabled={pwdLoading}
                    style={{
                      width: 'fit-content',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#ffffff',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat'
                    }}
                  >
                    {pwdLoading ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : (lang === 'ru' ? 'Обновить пароль' : 'Update Password')}
                  </motion.button>
                </div>
              </>
            )}

            {/* ── ВКЛАДКА: ДАННЫЕ И СБРОС ── */}
            {activeTab === 'misc' && (
              <>
                {/* Карточка: Экспорт и импорт */}
                <div style={settingCardStyle}>
                  <div>
                    <span style={labelStyle}>{t('settings_profile_config')}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Резервное копирование и перенос настроек лаунчера в файл JSON' : 'Backup or restore launcher settings via JSON config file'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button
                      whileTap={{ opacity: 0.85 }}
                      onClick={handleExport}
                      style={{
                        background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        color: '#fbbf24',
                        padding: '11px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className="fa-solid fa-file-export" />
                      {t('settings_export')}
                    </motion.button>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <motion.div
                        whileTap={{ opacity: 0.85 }}
                        style={{
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.3)',
                          color: '#818cf8',
                          padding: '11px 18px',
                          borderRadius: '10px',
                          fontFamily: 'Montserrat',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <i className="fa-solid fa-file-import" />
                        {t('settings_import')}
                      </motion.div>
                      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                    </label>
                  </div>
                </div>

                {/* Карточка: Опасная зона (Сброс) */}
                <div style={{ ...settingCardStyle, border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)' }}>
                  <div>
                    <span style={{ ...labelStyle, color: '#f87171' }}>{lang === 'ru' ? 'Опасная зона' : 'Danger Zone'}</span>
                    <span style={descStyle}>{lang === 'ru' ? 'Полный сброс всех сохраненных локально данных и возврат к начальному состоянию' : 'Clear all local storage and revert settings to factory defaults'}</span>
                  </div>
                  <motion.button
                    whileTap={{ opacity: 0.85 }}
                    onClick={() => setShowConfirm(true)}
                    style={{
                      width: 'fit-content',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      padding: '11px 20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fa-solid fa-trash-can" />
                    {t('settings_reset_all')}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
