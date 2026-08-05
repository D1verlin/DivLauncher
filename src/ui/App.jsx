import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClientPage from './pages/ClientPage';
import ServerPage from './pages/ServerPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import UsersPage from './pages/UsersPage';
import BuildsPage from './pages/BuildsPage';
import CreatePackPage from './pages/CreatePackPage';
import ModsPage from './pages/ModsPage';
import ImportExportPage from './pages/ImportExportPage';
import OfficialBuildManagerPage from './pages/OfficialBuildManagerPage';
import InitialPathModal from './components/InitialPathModal';
import { getSafeBgUrl, DEFAULT_BG } from './utils/pathUtils';
import { useTranslation } from './utils/i18n';
import { setLoadedBadges } from './utils/badgeHelper';

const MODPACKS_URL = "https://mc.diverlin.ru/DivLauncher/modpacks.json";
const MAX_SERVER_LOG_LINES = 500;

// --- КАСТОМНЫЙ CONFIRM-МОДАЛ ---
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 16 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          background: 'rgba(10, 10, 16, 0.92)', backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '90%',
          boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '16px' }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: '15px', margin: '0 0 4px 0' }}>{title}</p>
            <p style={{ color: '#71717a', fontWeight: 600, fontSize: '12px', margin: 0 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onCancel}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: '12px', padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            {t('cancel')}
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm}
            style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#fff', borderRadius: '12px', padding: '11px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
            {t('confirm')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- КАСТОМНЫЙ ALERT-МОДАЛ (С ПРИВЯЗКОЙ ТИПА: success | error | warning | info) ---
function AlertModal({ title, message, type: explicitType, onClose }) {
  const { lang } = useTranslation();

  // Auto-detect modal type based on title/message if not explicitly passed
  let type = explicitType;
  if (!type || type === 'auto') {
    const tLower = (title || '').toLowerCase();
    const mLower = (message || '').toLowerCase();
    if (
      tLower.includes('успешно') || tLower.includes('success') ||
      tLower.includes('создан') || tLower.includes('сохранено') ||
      tLower.includes('восстановлена') || tLower.includes('удален') ||
      tLower.includes('готово') || mLower.includes('успешно') ||
      mLower.includes('success')
    ) {
      type = 'success';
    } else if (tLower.includes('внимание') || tLower.includes('warning') || tLower.includes('предупреждение')) {
      type = 'warning';
    } else if (tLower.includes('инфо') || tLower.includes('info')) {
      type = 'info';
    } else {
      type = 'error';
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'fa-circle-check',
          iconColor: '#34d399',
          iconBg: 'rgba(16, 185, 129, 0.14)',
          iconBorder: '1px solid rgba(16, 185, 129, 0.35)',
          modalBorder: '1px solid rgba(16, 185, 129, 0.28)',
          glow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(16, 185, 129, 0.15)',
          buttonBg: 'linear-gradient(135deg, #10b981, #059669)',
          buttonBorder: 'none',
        };
      case 'warning':
        return {
          icon: 'fa-triangle-exclamation',
          iconColor: '#fbbf24',
          iconBg: 'rgba(245, 158, 11, 0.14)',
          iconBorder: '1px solid rgba(245, 158, 11, 0.35)',
          modalBorder: '1px solid rgba(245, 158, 11, 0.28)',
          glow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
          buttonBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          buttonBorder: 'none',
        };
      case 'info':
        return {
          icon: 'fa-circle-info',
          iconColor: '#60a5fa',
          iconBg: 'rgba(59, 130, 246, 0.14)',
          iconBorder: '1px solid rgba(59, 130, 246, 0.35)',
          modalBorder: '1px solid rgba(59, 130, 246, 0.28)',
          glow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(59, 130, 246, 0.15)',
          buttonBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          buttonBorder: 'none',
        };
      case 'error':
      default:
        return {
          icon: 'fa-circle-xmark',
          iconColor: '#f87171',
          iconBg: 'rgba(239, 68, 68, 0.14)',
          iconBorder: '1px solid rgba(239, 68, 68, 0.35)',
          modalBorder: '1px solid rgba(239, 68, 68, 0.28)',
          glow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
          buttonBg: 'rgba(255, 255, 255, 0.08)',
          buttonBorder: '1px solid rgba(255, 255, 255, 0.12)',
        };
    }
  };

  const styleConfig = getTypeStyles();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 16 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          background: 'rgba(10, 10, 16, 0.94)', backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)', border: styleConfig.modalBorder,
          borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '90%',
          boxShadow: styleConfig.glow,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
            background: styleConfig.iconBg, border: styleConfig.iconBorder,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`fa-solid ${styleConfig.icon}`} style={{ color: styleConfig.iconColor, fontSize: '20px' }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: '15px', margin: '0 0 4px 0', fontFamily: 'Montserrat' }}>{title}</p>
            <p style={{ color: '#a1a1aa', fontWeight: 600, fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{message}</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          style={{ width: '100%', background: styleConfig.buttonBg, border: styleConfig.buttonBorder, color: '#fff', borderRadius: '12px', padding: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {lang === 'ru' ? 'Понятно' : 'OK'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// --- КОМПОНЕНТ АВТООБНОВЛЕНИЯ (Глассморфизм) ---
function UpdateNotification() {
  const { lang } = useTranslation();
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateAvailable((event, v) => {
      setVersion(v || (lang === 'ru' ? 'новую версию' : 'new version'));
      setStatus('downloading');
      setProgress(0);
    });

    window.electronAPI.onUpdateProgress((event, percent) => {
      setProgress(percent);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setStatus('downloaded');
    });

    return () => {
      window.electronAPI.removeAllListeners?.('update-available');
      window.electronAPI.removeAllListeners?.('update-progress');
      window.electronAPI.removeAllListeners?.('update-downloaded');
    };
  }, [lang]);

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            position: 'absolute',
            top: '50px',
            right: '20px',
            zIndex: 9999,
            width: '320px',
            background: 'rgba(15, 15, 20, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: status === 'downloaded' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
              color: status === 'downloaded' ? '#10b981' : '#3b82f6', 
              width: '40px', height: '40px', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' 
            }}>
              <i className={`fa-solid ${status === 'downloaded' ? 'fa-check' : 'fa-cloud-arrow-down'}`}></i>
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 800 }}>
                {status === 'downloaded' ? (lang === 'ru' ? 'Обновление готово!' : 'Update ready!') : (lang === 'ru' ? 'Загрузка обновления...' : 'Downloading update...')}
              </h4>
              <p style={{ margin: '4px 0 0 0', color: '#a1a1aa', fontSize: '12px', fontWeight: 600 }}>
                {lang === 'ru' ? 'Версия' : 'Version'} {version}
              </p>
            </div>
          </div>

          {status === 'downloading' ? (
            <div style={{ marginTop: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', color: '#e4e4e7', fontWeight: 700 }}>
                <span>{lang === 'ru' ? 'Скачивание файлов' : 'Downloading files'}</span>
                <span style={{ color: '#3b82f6' }}>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${progress}%` }} 
                  transition={{ ease: "linear", duration: 0.3 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '10px', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }} 
                />
              </div>
            </div>
          ) : (
            <motion.button
              whileHover={{ boxShadow: '0 5px 15px rgba(16, 185, 129, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.electronAPI.restartAndInstall()}
              style={{
                marginTop: '5px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                border: 'none', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                textTransform: 'uppercase', letterSpacing: '1px'
              }}
            >
              <i className="fa-solid fa-arrows-rotate"></i> {lang === 'ru' ? 'Перезапустить' : 'Restart'}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ВЕРХНЯЯ ПАНЕЛЬ С КНОПКАМИ (Отображается везде)
const TopBar = () => (
  <div style={{ height: '40px', WebkitAppRegion: 'drag', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 15px', position: 'absolute', top: 0, right: 0, left: 0, zIndex: 100 }}>
    <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: '15px' }}>
      <button onClick={() => window.electronAPI.minimizeWindow()} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: '18px' }}><i className="fa-solid fa-minus h-minimize"></i></button>
      <button onClick={() => window.electronAPI.closeWindow()} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: '18px' }}><i className="fa-solid fa-xmark h-close"></i></button>
    </div>
  </div>
);

// --- АНИМАЦИЯ СТРАНИЦ ---
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
};

// --- ОСНОВНОЕ ПРИЛОЖЕНИЕ ---
export default function App() {
  const { lang, t } = useTranslation();
  const [currentPage, setCurrentPage] = useState('builds');
  const [viewedProfile, setViewedProfile] = useState(null);
  const [editingPack, setEditingPack] = useState(null);
  const [modpacks, setModpacks] = useState([]);
  const [currentPack, setCurrentPack] = useState(null);
  const [loadingError, setLoadingError] = useState(null); 
  const [showInitialPathModal, setShowInitialPathModal] = useState(false);

  useEffect(() => {
    const buildsDir = localStorage.getItem('launcher_builds_dir');
    if (!buildsDir) {
      setShowInitialPathModal(true);
    }
  }, []);
  
  const [appVersion, setAppVersion] = useState('0.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [serverLogs, setServerLogs] = useState(lang === 'ru' ? 'Ожидание загрузки сборок...\n' : 'Waiting for builds to load...\n');
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPlayers, setServerPlayers] = useState([]);

  // Animated background toggle
  const [animatedBg, setAnimatedBg] = useState(localStorage.getItem('launcher_animated_bg') !== 'false');

  // Auth States
  const [profile, setProfile] = useState(null);
  const [profileCache, setProfileCache] = useState({});
  const [authLoading, setAuthLoading] = useState(true);
  const [badges, setBadges] = useState([]);

  // --- CLIENT GAME EXECUTION LIFTED STATE & EFFECTS ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [clientStatus, setClientStatus] = useState('');
  const [clientConsoleLogs, setClientConsoleLogs] = useState([]);
  const [runningPackId, setRunningPackId] = useState(null);
  const [playtime, setPlaytime] = useState(0);

  const currentPackRef = useRef(currentPack);
  const runningPackIdRef = useRef(null);
  const isLaunchingRef = useRef(false);
  const fullLogsRef = useRef([]);
  const sessionStartRef = useRef(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    currentPackRef.current = currentPack;
  }, [currentPack]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    runningPackIdRef.current = runningPackId;
  }, [runningPackId]);

  useEffect(() => {
    isLaunchingRef.current = isLaunching;
  }, [isLaunching]);

  // Load playtime when pack selection or running pack changes
  useEffect(() => {
    if (currentPack) {
      if (runningPackId && currentPack.id === runningPackId) {
        // Keeps the dynamic counter intact if selecting the active pack
      } else {
        const savedTime = parseInt(localStorage.getItem(`playtime_${currentPack.id}`) || '0', 10);
        setPlaytime(savedTime);
      }
    }
  }, [currentPack, runningPackId]);

  // Initialize status for non-running packs or when currentPack changes
  useEffect(() => {
    if (!runningPackId && currentPack) {
      const installedVersion = localStorage.getItem(`installed_v_${currentPack.id}`);
      const isZipPack = currentPack.useZip && currentPack.packVersion;
      const needsInstall = isZipPack && !installedVersion;
      const needsUpdate = isZipPack && installedVersion && (currentPack.packVersion !== installedVersion);
      
      let initialStatus = t('client_ready');
      if (needsInstall) initialStatus = `${t('client_needs_install')}${currentPack.packVersion}`;
      else if (needsUpdate) initialStatus = `${t('client_needs_update')}${currentPack.packVersion}`;
      
      setClientStatus(initialStatus);
      setClientConsoleLogs([]);
      setDownloadProgress(0);
    }
  }, [currentPack, runningPackId, lang, t]);

  // Auto-save playtime interval
  useEffect(() => {
    let interval;
    if (isPlaying && runningPackId && sessionStartRef.current) {
      interval = setInterval(() => {
        if (!sessionStartRef.current || typeof sessionStartRef.current !== 'number') {
          console.error("sessionStartRef is invalid:", sessionStartRef.current);
          return;
        }

        const now = Date.now();
        const playedMs = now - sessionStartRef.current;

        // Prevent invalid time jumps
        if (playedMs <= 0 || playedMs > 24 * 60 * 60 * 1000) {
          console.warn("Discarding invalid playtime delta:", playedMs);
          sessionStartRef.current = now;
          return;
        }

        const saved = parseInt(localStorage.getItem(`playtime_${runningPackId}`) || '0', 10);
        const newTotal = saved + playedMs;
        
        localStorage.setItem(`playtime_${runningPackId}`, newTotal);

        if (currentPackRef.current && currentPackRef.current.id === runningPackId) {
          setPlaytime(newTotal);
        }

        sessionStartRef.current = now;
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, runningPackId]);

  // Register Electron client lifecycle listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    if (window.electronAPI.onDownloadProgress) {
      window.electronAPI.onDownloadProgress((event, percent) => {
        setDownloadProgress(percent);
        setClientStatus(`${t('client_updating')} (${percent}%)`);
      });
    }

    if (window.electronAPI.onUpdateDone) {
      window.electronAPI.onUpdateDone(() => {
        if (currentPackRef.current) {
          localStorage.setItem(`installed_v_${currentPackRef.current.id}`, currentPackRef.current.packVersion);
          setIsUpdating(false);
          setClientStatus(lang === 'ru' ? 'Сборка успешно установлена!' : 'Modpack installed successfully!');
        }
      });
    }

    window.electronAPI.onProgress((event, msg) => {
      if (msg.startsWith('[LOG]')) {
        const cleanMsg = msg.replace('[LOG]', '').trim();
        if (cleanMsg) {
          const lines = cleanMsg.split('\n').map(l => l.trim()).filter(l => l);
          fullLogsRef.current.push(...lines);
          setClientConsoleLogs(prev => [...prev, ...lines].slice(-6));

          if (isLaunchingRef.current) {
            setIsLaunching(false);
            setIsPlaying(true);
            setClientStatus(t('client_playing'));
            sessionStartRef.current = Date.now();

            if (currentPackRef.current && window.electronAPI.setDiscordPlaying) {
              window.electronAPI.setDiscordPlaying(currentPackRef.current.name, profileRef.current?.name, !!profileRef.current?.isOffline, lang);
            }
            updateOnlineActivity('playing', currentPackRef.current ? currentPackRef.current.name : 'Minecraft');
          }
        }
        return;
      }

      setClientStatus(msg);
      if (msg.includes('Запуск Minecraft...') || msg.includes('Launching Minecraft...')) {
        setClientConsoleLogs(lang === 'ru' 
          ? ["Инициализация движка...", "Передача управления Java..."] 
          : ["Initializing engine...", "Handing over to Java..."]
        );
      }
    });

    window.electronAPI.onError((event, msg) => {
      setClientStatus(`${t('error')}: ${msg}`);
      fullLogsRef.current.push(`[ERROR] ${lang === 'ru' ? 'Ошибка запуска' : 'Launch error'}: ${msg}`);
      setIsLaunching(false);
      setIsPlaying(false);
      setIsUpdating(false);
      updateOnlineActivity('online', null);
    });

    window.electronAPI.onClosed(() => {
      if (sessionStartRef.current && runningPackIdRef.current) {
        if (typeof sessionStartRef.current === 'number' && sessionStartRef.current > 0) {
          const now = Date.now();
          const playedMs = now - sessionStartRef.current;
          
          if (playedMs > 0 && playedMs <= 24 * 60 * 60 * 1000) {
            const saved = parseInt(localStorage.getItem(`playtime_${runningPackIdRef.current}`) || '0', 10);
            const newTotal = saved + playedMs;
            localStorage.setItem(`playtime_${runningPackIdRef.current}`, newTotal);
            if (currentPackRef.current && currentPackRef.current.id === runningPackIdRef.current) {
              setPlaytime(newTotal);
            }
          }
        }
        sessionStartRef.current = null;
      }

      setClientStatus(t('client_closed'));
      setIsLaunching(false);
      setIsPlaying(false);
      setIsUpdating(false);
      setClientConsoleLogs([]);
      setRunningPackId(null);

      if (window.electronAPI.setDiscordIdle) {
        window.electronAPI.setDiscordIdle(profileRef.current?.name, !!profileRef.current?.isOffline, lang);
      }
      updateOnlineActivity('online', null);
    });

    return () => {
      window.electronAPI.removeAllListeners?.('download-progress');
      window.electronAPI.removeAllListeners?.('update-done');
      window.electronAPI.removeAllListeners?.('launch-progress');
      window.electronAPI.removeAllListeners?.('launch-error');
      window.electronAPI.removeAllListeners?.('launch-closed');
    };
  }, [lang, t]);

  const handleLaunchGame = (pack, options) => {
    setIsLaunching(true);
    setIsPlaying(false);
    setRunningPackId(pack.id);
    setClientStatus(t('client_launching'));
    fullLogsRef.current = [t('client_launching')];
    setClientConsoleLogs([t('client_launching')]);
    window.electronAPI.launchGame(options);
  };

  const handleKillGame = () => {
    window.electronAPI.killGame();
  };

  const handleUpdatePack = (pack) => {
    setIsUpdating(true);
    setRunningPackId(pack.id);
    const installedVersion = localStorage.getItem(`installed_v_${pack.id}`);
    const needsInstall = pack.useZip && !installedVersion;
    setClientStatus(needsInstall ? t('client_updating') : t('client_launching'));
    window.electronAPI.updatePack(pack);
  };

  const handleExportLogs = () => {
    if (fullLogsRef.current.length === 0) return;
    const blob = new Blob([fullLogsRef.current.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_log_${currentPackRef.current?.id || 'game'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- МОДАЛЬНЫЕ ОКНА (замена confirm/alert) ---
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [alertModal, setAlertModal] = useState(null);     // { title, message }



  const showConfirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmModal({ title, message, onConfirm: () => { setConfirmModal(null); resolve(true); }, onCancel: () => { setConfirmModal(null); resolve(false); } });
    });
  }, []);

  const showAlert = useCallback((title, message, type) => {
    setAlertModal({ title, message, type, onClose: () => setAlertModal(null) });
  }, []);

  const handleLogout = async () => {
    if (window.electronAPI?.customLogout) {
      await window.electronAPI.customLogout();
    }
    setProfile(null);
    localStorage.removeItem('launcher_username');
    setCurrentPage('client');
  };

  useEffect(() => {
    if (window.electronAPI?.customCheckAuth) {
      window.electronAPI.customCheckAuth()
        .then(prof => {
          if (prof) {
            if (prof.logs && Array.isArray(prof.logs)) {
              prof.logs.forEach(l => console.log("%c[MAIN] " + l, "color: #3b82f6; font-weight: 500;"));
            }
            const mappedProf = {
              ...prof,
              name: prof.name
            };
            setProfile(mappedProf);
            setProfileCache(prev => ({ ...prev, [prof.uuid]: mappedProf }));
            localStorage.setItem('launcher_username', prof.name);
          }
        })
        .catch(err => console.error("Session check error:", err))
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const updateOnlineActivity = useCallback(async (activity, gameName = null) => {
    try {
      if (!window.electronAPI?.updateProfileCustomization) return;
      if (profileRef.current?.isOffline) return;
      await window.electronAPI.updateProfileCustomization({
        current_activity: activity,
        current_game: gameName
      });
    } catch (e) {
      console.error('Failed to update online activity:', e);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.setDiscordIdle) {
      if (profile) {
        window.electronAPI.setDiscordIdle(profile.name, !!profile.isOffline, lang);
      } else {
        window.electronAPI.setDiscordIdle(null, false, lang);
      }
    }
    if (profile && !profile.isOffline) {
      updateOnlineActivity('online', null);
    }
  }, [profile, lang, updateOnlineActivity]);

  const fetchBadges = useCallback(() => {
    if (window.electronAPI?.getBadges) {
      window.electronAPI.getBadges().then(res => {
        if (res.success && Array.isArray(res.badges)) {
          setBadges(res.badges);
          setLoadedBadges(res.badges);
        }
      }).catch(err => console.error("Failed to fetch badges:", err));
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [profile, fetchBadges]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setAnimatedBg(localStorage.getItem('launcher_animated_bg') !== 'false');
    };
    window.addEventListener('settings-changed', handleSettingsUpdate);
    return () => window.removeEventListener('settings-changed', handleSettingsUpdate);
  }, []);

  const fetchModpacks = () => {
    setLoadingError(null);
    if (profile?.isOffline) {
      if (window.electronAPI && window.electronAPI.getCustomPacks) {
        window.electronAPI.getCustomPacks()
          .then(localData => {
            if (localData.length > 0) {
              setModpacks(localData);
              const savedPackId = localStorage.getItem('launcher_last_pack');
              const lastPack = localData.find(p => p.id === savedPackId);
              const packToSelect = lastPack || localData[0];
              setCurrentPack(packToSelect);
              setServerLogs(lang === 'ru' ? `Оффлайн. Выбрана локальная сборка: ${packToSelect.name}.\n` : `Offline. Local pack selected: ${packToSelect.name}.\n`);
            } else {
              setModpacks([]);
              setCurrentPack(null);
              setCurrentPage('builds');
            }
          })
          .catch(() => {
            setModpacks([]);
            setCurrentPack(null);
            setCurrentPage('builds');
          });
      } else {
        setModpacks([]);
        setCurrentPack(null);
        setCurrentPage('builds');
      }
      return;
    }

    fetch(`${MODPACKS_URL}?t=${new Date().getTime()}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then(async remoteData => {
        let localData = [];
        if (window.electronAPI && window.electronAPI.getCustomPacks) {
          try {
            localData = await window.electronAPI.getCustomPacks();
          } catch (e) {
            console.error("Failed to load local custom packs:", e);
          }
        }
        const combinedData = [...remoteData, ...localData];
        setModpacks(combinedData);
        if (combinedData.length > 0) {
          const savedPackId = localStorage.getItem('launcher_last_pack');
          const lastPack = combinedData.find(p => p.id === savedPackId);
          const packToSelect = lastPack || combinedData[0];

          setCurrentPack(packToSelect);
          setServerLogs(lang === 'ru' ? `Выбрана сборка: ${packToSelect.name}. Сервер готов к запуску...\n` : `Pack selected: ${packToSelect.name}. Server ready to launch...\n`);
        } else {
          setCurrentPage('builds');
        }
      })
      .catch(err => {
        if (window.electronAPI && window.electronAPI.getCustomPacks) {
          window.electronAPI.getCustomPacks()
            .then(localData => {
              if (localData.length > 0) {
                setModpacks(localData);
                const savedPackId = localStorage.getItem('launcher_last_pack');
                const lastPack = localData.find(p => p.id === savedPackId);
                const packToSelect = lastPack || localData[0];
                setCurrentPack(packToSelect);
                setServerLogs(lang === 'ru' ? `Оффлайн. Выбрана локальная сборка: ${packToSelect.name}.\n` : `Offline. Local pack selected: ${packToSelect.name}.\n`);
              } else {
                setCurrentPage('builds');
              }
            })
            .catch(() => {
              setCurrentPage('builds');
            });
        } else {
          setLoadingError(err.message);
        }
      });
  };

  const handleCreateCustomPack = async (newPack) => {
    if (window.electronAPI && window.electronAPI.saveCustomPack) {
      const result = await window.electronAPI.saveCustomPack(newPack);
      if (result.success) {
        fetchModpacks();
        setCurrentPack(newPack);
        localStorage.setItem('launcher_last_pack', newPack.id);
        setServerLogs(lang === 'ru' ? `Создана и выбрана сборка: ${newPack.name}...\n` : `Pack created and selected: ${newPack.name}...\n`);
      } else {
        showAlert(lang === 'ru' ? 'Ошибка сохранения' : 'Save Error', result.error || (lang === 'ru' ? 'Не удалось сохранить сборку.' : 'Failed to save the pack.'));
      }
    }
  };

  const handleDeleteCustomPack = async (id) => {
    if (window.electronAPI && window.electronAPI.deleteCustomPack) {
      const confirmed = await showConfirm(
        lang === 'ru' ? 'Удалить сборку?' : 'Delete Pack?',
        lang === 'ru' ? 'Все файлы и моды этой сборки будут безвозвратно удалены!' : 'All files and mods for this pack will be permanently deleted!'
      );
      if (confirmed) {
        const result = await window.electronAPI.deleteCustomPack(id);
        if (result.success) {
          const remainingPacks = modpacks.filter(p => p.id !== id);
          if (remainingPacks.length > 0) {
            const nextPack = remainingPacks[0];
            setCurrentPack(nextPack);
            localStorage.setItem('launcher_last_pack', nextPack.id);
          } else {
            setCurrentPack(null);
          }
          fetchModpacks();
        } else {
          showAlert(lang === 'ru' ? 'Ошибка удаления' : 'Delete Error', result.error || (lang === 'ru' ? 'Не удалось удалить сборку.' : 'Failed to delete the pack.'));
        }
      }
    }
  };

  const handlePackUpdate = (updatedPack) => {
    setCurrentPack(updatedPack);
    setModpacks(prev => prev.map(p => p.id === updatedPack.id ? updatedPack : p));
  };


  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => setAppVersion(v));
    }

    // Ограничиваем лог последними MAX_SERVER_LOG_LINES строками во избежание утечки памяти
    const serverLogHandler = (e, data) => setServerLogs(prev => {
      const lines = (prev + data).split('\n');
      return lines.slice(-MAX_SERVER_LOG_LINES).join('\n');
    });
    const serverStatusHandler = (e, status) => setIsServerRunning(status === 'starting');
    const serverPlayersHandler = (e, playerList) => setServerPlayers(playerList);

    window.electronAPI.onServerLog(serverLogHandler);
    window.electronAPI.onServerStatus(serverStatusHandler);
    window.electronAPI.onServerPlayers(serverPlayersHandler);

    return () => {
      window.electronAPI.removeAllListeners?.('server-log');
      window.electronAPI.removeAllListeners?.('server-status');
      window.electronAPI.removeAllListeners?.('server-players');
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchModpacks();
    }
  }, [profile, authLoading]);

  const handleManualUpdate = () => {
    setIsCheckingUpdate(true);
    if (window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates();
    }
    setTimeout(() => setIsCheckingUpdate(false), 2000); 
  };


  if (!currentPack) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0a0c', color: '#fff', position: 'relative' }}>
        <TopBar />
        <UpdateNotification />
        
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {loadingError ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '50px', color: '#ef4444', marginBottom: '20px' }}></i>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>{lang === 'ru' ? 'СВЯЗЬ ПОТЕРЯНА' : 'CONNECTION LOST'}</h2>
              <p style={{ color: '#a1a1aa', marginBottom: '30px', maxWidth: '350px', lineHeight: '1.5' }}>
                {lang === 'ru' ? 'Не удалось загрузить данные лаунчера.' : 'Failed to load launcher data.'}<br/><span style={{ fontSize: '12px', color: '#52525b' }}>{loadingError}</span>
              </p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={fetchModpacks} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 800, cursor: 'pointer' }}>
                {lang === 'ru' ? 'ПОВТОРИТЬ ПОПЫТКУ' : 'RETRY'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ width: '45px', height: '45px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: '25px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '3px', color: '#10b981' }}>{lang === 'ru' ? 'ПОДКЛЮЧЕНИЕ...' : 'CONNECTING...'}</h2>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0a0c', color: '#fff', position: 'relative' }}>
        <TopBar />
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ width: '45px', height: '45px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: '25px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '3px', color: '#10b981' }}>{lang === 'ru' ? 'ПРОВЕРКА СЕССИИ...' : 'CHECKING SESSION...'}</h2>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        background: `linear-gradient(rgba(20, 20, 20, 0.75), rgba(20, 20, 20, 0.95)), url('${getSafeBgUrl(currentPack?.bgImage)}') center/cover`
      }}>
        <TopBar />
        <LoginPage onLoginSuccess={(prof) => {
          setProfile(prof);
          setProfileCache(prev => ({ ...prev, [prof.uuid]: prof }));
          localStorage.setItem('launcher_username', prof.name);
        }} />
      </div>
    );
  }

  // ОСНОВНОЙ ЭКРАН ЛАУНЧЕРА
  const activeBgImage = (currentPack && currentPack.bgImage && currentPack.bgImage.trim()) 
    ? getSafeBgUrl(currentPack.bgImage) 
    : DEFAULT_BG;

  const appStyle = {
    display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative',
    background: '#0a0a10',
    overflow: 'hidden'
  };

  // Функция рендера активной страницы (ленивый рендер — только активная страница в DOM)
  const renderPage = () => {
    if (!currentPack) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '15px' }}>
          <i className="fa-solid fa-layer-group" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.2)' }} />
          <div style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: 600 }}>{lang === 'ru' ? 'Пожалуйста, выберите сборку на странице сборок' : 'Please select a pack on the builds page'}</div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('builds')}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}
          >
            {lang === 'ru' ? 'Перейти к сборкам' : 'Go to Builds'}
          </motion.button>
        </div>
      );
    }

    switch (currentPage) {
      case 'builds':
        return (
          <BuildsPage 
            modpacks={modpacks} 
            currentPack={currentPack}
            profile={profile}
            fetchModpacks={fetchModpacks}
            onSelect={(pack) => {
              setCurrentPack(pack);
              localStorage.setItem('launcher_last_pack', pack.id);
              setServerLogs(lang === 'ru' ? `Выбрана сборка: ${pack.name}. Сервер готов...\n` : `Pack selected: ${pack.name}. Server ready...\n`);
              setCurrentPage('client');
            }} 
            onDelete={handleDeleteCustomPack}
            onExport={async (packId) => {
              if (window.electronAPI?.exportCustomPack) {
                const result = await window.electronAPI.exportCustomPack(packId);
                if (!result.success) {
                  showAlert(lang === 'ru' ? 'Ошибка экспорта' : 'Export Error', result.error || (lang === 'ru' ? 'Не удалось экспортировать сборку.' : 'Failed to export the pack.'));
                }
              }
            }}
            onEdit={(pack) => {
              setEditingPack(pack);
              setCurrentPage('create-pack');
            }}
            onCreateClick={() => {
              setEditingPack(null);
              setCurrentPage('create-pack');
            }}
            onImportClick={() => {
              setCurrentPage('import-export');
            }}
          />
        );
      case 'import-export':
        return (
          <ImportExportPage
            onBack={() => setCurrentPage('builds')}
            modpacks={modpacks}
            fetchModpacks={fetchModpacks}
          />
        );
      case 'create-pack':
        return (
          <CreatePackPage 
            isActive={true}
            editPack={editingPack}
            onCreate={(pack) => {
              handleCreateCustomPack(pack);
              setEditingPack(null);
            }} 
            onBack={() => {
              setEditingPack(null);
              setCurrentPage('builds');
            }} 
          />
        );
      case 'client':
        return (
          <ClientPage 
            openSettings={() => setCurrentPage('settings')} 
            openMods={() => setCurrentPage('mods')}
            currentPack={currentPack}
            isPlaying={isPlaying}
            isLaunching={isLaunching}
            isUpdating={isUpdating}
            downloadProgress={downloadProgress}
            clientStatus={clientStatus}
            clientConsoleLogs={clientConsoleLogs}
            runningPackId={runningPackId}
            playtime={playtime}
            onLaunchGame={handleLaunchGame}
            onKillGame={handleKillGame}
            onUpdatePack={handleUpdatePack}
            onPlaytimeChange={setPlaytime}
            onExportLogs={handleExportLogs}
            setClientStatus={setClientStatus}
            runningPackName={modpacks.find(p => p.id === runningPackId)?.name || ''}
            showConfirm={showConfirm}
            showAlert={showAlert}
          />
        );
      case 'mods':
        // Для официальных сборок + admin → показываем менеджер R2
        if (!currentPack.isCustom && profile && profile.is_admin === 1) {
          return (
            <OfficialBuildManagerPage
              currentPack={currentPack}
              onBack={() => setCurrentPage('client')}
            />
          );
        }
        // Для кастомных сборок (или обычных пользователей) → магазин модов
        return <ModsPage currentPack={currentPack} onBack={() => setCurrentPage('client')} showConfirm={showConfirm} showAlert={showAlert} />;
      case 'server':
        return <ServerPage logs={serverLogs} isRunning={isServerRunning} players={serverPlayers} currentPack={currentPack} onPackUpdate={handlePackUpdate} showConfirm={showConfirm} showAlert={showAlert} />;
      case 'users':
        return (
          <UsersPage 
            active={true} 
            onViewProfile={(user) => {
              setViewedProfile({
                ...user,
                name: user.username
              });
              setCurrentPage('profile');
            }} 
          />
        );
      case 'profile': {
        const targetProfile = viewedProfile
          ? (profileCache[viewedProfile.uuid] || viewedProfile)
          : (profileCache[profile.uuid] || profile);
        return (
          <ProfilePage 
            profile={targetProfile} 
            isOwnProfile={!viewedProfile || viewedProfile.uuid === profile.uuid}
            onBack={() => {
              setCurrentPage('users');
              setViewedProfile(null);
            }}
            onLogout={handleLogout} 
            currentPack={currentPack} 
            modpacks={modpacks} 
            onProfileUpdate={(updatedData) => {
              if (viewedProfile && viewedProfile.uuid !== profile.uuid) {
                setProfileCache(prev => ({
                  ...prev,
                  [viewedProfile.uuid]: { ...(prev[viewedProfile.uuid] || viewedProfile), ...updatedData }
                }));
              } else {
                setProfile(prev => ({ ...prev, ...updatedData }));
                setProfileCache(prev => ({
                  ...prev,
                  [profile.uuid]: { ...(prev[profile.uuid] || profile), ...updatedData }
                }));
              }
            }}
            showConfirm={showConfirm}
            showAlert={showAlert}
          />
        );
      }
      case 'settings':
        return <SettingsPage currentPack={currentPack} showConfirm={showConfirm} showAlert={showAlert} />;
      case 'admin':
        return profile && profile.is_admin === 1 ? (
          <AdminPage 
            active={true} 
            profile={profile} 
            onProfileUpdate={(updatedFields) => {
              setProfile(prev => ({ ...prev, ...updatedFields }));
            }} 
            onModpacksUpdate={fetchModpacks}
            onManageMods={(pack) => {
              setCurrentPack(pack);
              setCurrentPage('mods');
            }}
            badges={badges}
            onBadgesUpdate={fetchBadges}
            showConfirm={showConfirm}
            showAlert={showAlert}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={appStyle}>
      {/* Dynamic Background Layer */}
      {animatedBg && currentPack?.bgVideo ? (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <video 
            key={currentPack.id + '_video'}
            src={getSafeBgUrl(currentPack.bgVideo)} 
            autoPlay loop muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(20, 20, 20, 0.7), rgba(20, 20, 20, 0.9))' }} />
        </div>
      ) : (
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none',
          background: `linear-gradient(rgba(20, 20, 20, 0.7), rgba(20, 20, 20, 0.9)), url('${activeBgImage}') center/cover`,
          transition: 'background 0.5s ease-in-out'
        }} />
      )}

      {/* Main UI Layer */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* Глобальные модалы */}
        <AnimatePresence>
          {confirmModal && (
            <ConfirmModal
              title={confirmModal.title}
              message={confirmModal.message}
              onConfirm={confirmModal.onConfirm}
              onCancel={confirmModal.onCancel}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {alertModal && (
            <AlertModal
              title={alertModal.title}
              message={alertModal.message}
              type={alertModal.type}
              onClose={alertModal.onClose}
            />
          )}
        </AnimatePresence>

        <TopBar />
        <UpdateNotification />

        <div style={{ display: 'flex', flexGrow: 1, padding: '40px 20px 20px 20px', gap: '40px', overflow: 'hidden' }}>
          
          <div style={{ width: '60px', minWidth: '60px', background: '#11111157', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', border: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <NavButton icon="fa-layer-group" active={currentPage === 'builds' || currentPage === 'create-pack'} onClick={() => { setViewedProfile(null); setCurrentPage('builds'); }} color="#f59e0b" title={t('tab_builds')} />
              <NavButton icon="fa-gamepad" active={currentPage === 'client'} onClick={() => { setViewedProfile(null); setCurrentPage('client'); }} color="#10b981" title={t('client_play')} />
              <NavButton icon="fa-server" active={currentPage === 'server'} onClick={() => { setViewedProfile(null); setCurrentPage('server'); }} color="#3b82f6" title={t('tab_server')}
                dot={isServerRunning} dotColor="#10b981" />
              {!profile?.isOffline && (
                <>
                  <NavButton icon="fa-users" active={currentPage === 'users'} onClick={() => { setViewedProfile(null); setCurrentPage('users'); }} color="#6366f1" title={t('tab_users')} />
                  <NavButton icon="fa-circle-user" active={currentPage === 'profile'} onClick={() => { setViewedProfile(null); setCurrentPage('profile'); }} color="#a78bfa" title={t('tab_profile')} />
                </>
              )}
              {profile && profile.is_admin === 1 && (
                <NavButton icon="fa-shield-halved" active={currentPage === 'admin'} onClick={() => { setViewedProfile(null); setCurrentPage('admin'); }} color="#ef4444" title={t('tab_admin')} />
              )}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <NavButton icon="fa-right-from-bracket" active={false} onClick={handleLogout} color="#ef4444" title={lang === 'ru' ? 'Выйти из аккаунта' : 'Logout'} />
              <NavButton icon="fa-gear" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} color="#f59e0b" title={t('tab_settings')} />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingBottom: '10px' }}>
                <motion.button
                  onClick={handleManualUpdate}
                  title={lang === 'ru' ? 'Проверить обновления' : 'Check for Updates'}
                  animate={isCheckingUpdate ? { rotate: 360 } : {}}
                  transition={isCheckingUpdate ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                  style={{ background: 'transparent', border: 'none', color: isCheckingUpdate ? '#10b981' : '#52525b', cursor: 'pointer', fontSize: '14px' }}
                >
                  <i className="fa-solid fa-arrows-rotate"></i>
                </motion.button>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff33', letterSpacing: '0.5px' }}>v{appVersion}</span>
              </div>
            </div>
          </div>

        {/* Контентная область с анимацией переходов (ленивый рендер) */}
        <div style={{ flexGrow: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ height: '100%' }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>
      <InitialPathModal
        isOpen={showInitialPathModal}
        onClose={() => setShowInitialPathModal(false)}
      />
    </div>
  );
}

function NavButton({ icon, active, onClick, color, title, dot, dotColor }) {
  return (
    <div style={{ position: 'relative' }}>
      <motion.button title={title} whileTap={{ scale: 0.9 }} onClick={onClick} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: active ? color : 'transparent', color: active ? '#fff' : '#52525b', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`fa-solid ${icon}`}></i>
      </motion.button>
      {dot && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: '8px', height: '8px', borderRadius: '50%',
          background: dotColor || '#10b981',
          border: '2px solid rgba(17, 17, 17, 0.6)',
          boxShadow: `0 0 6px ${dotColor || '#10b981'}`,
        }} />
      )}
    </div>
  );
}