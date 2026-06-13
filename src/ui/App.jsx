import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClientPage from './pages/ClientPage';
import ServerPage from './pages/ServerPage';
import SettingsPage from './pages/SettingsPage';

const MODPACKS_URL = "https://mc.diverlin.ru/DivLauncher/modpacks.json";

// --- КОМПОНЕНТ АВТООБНОВЛЕНИЯ (Глассморфизм) ---
function UpdateNotification() {
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateAvailable((event, v) => {
      setVersion(v || 'новую версию');
      setStatus('downloading');
      setProgress(0);
    });

    window.electronAPI.onUpdateProgress((event, percent) => {
      setProgress(percent);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setStatus('downloaded');
    });
  }, []);

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
                {status === 'downloaded' ? 'Обновление готово!' : 'Загрузка обновления...'}
              </h4>
              <p style={{ margin: '4px 0 0 0', color: '#a1a1aa', fontSize: '12px', fontWeight: 600 }}>
                Версия {version}
              </p>
            </div>
          </div>

          {status === 'downloading' ? (
            <div style={{ marginTop: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', color: '#e4e4e7', fontWeight: 700 }}>
                <span>Скачивание файлов</span>
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
              whileHover={{ scale: 1.03, boxShadow: '0 5px 15px rgba(16, 185, 129, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.electronAPI.restartAndInstall()}
              style={{
                marginTop: '5px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                border: 'none', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                textTransform: 'uppercase', letterSpacing: '1px'
              }}
            >
              <i className="fa-solid fa-arrows-rotate"></i> Перезапустить
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

// --- ОСНОВНОЕ ПРИЛОЖЕНИЕ ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('client');
  const [modpacks, setModpacks] = useState([]);
  const [currentPack, setCurrentPack] = useState(null);
  const [loadingError, setLoadingError] = useState(null); 
  
  const [appVersion, setAppVersion] = useState('0.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [serverLogs, setServerLogs] = useState('Ожидание загрузки сборок...\n');
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPlayers, setServerPlayers] = useState([]);

  // Animated background toggle
  const [animatedBg, setAnimatedBg] = useState(localStorage.getItem('launcher_animated_bg') !== 'false');

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setAnimatedBg(localStorage.getItem('launcher_animated_bg') !== 'false');
    };
    window.addEventListener('settings-changed', handleSettingsUpdate);
    return () => window.removeEventListener('settings-changed', handleSettingsUpdate);
  }, []);

  const fetchModpacks = () => {
    setLoadingError(null);
    fetch(`${MODPACKS_URL}?t=${new Date().getTime()}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setModpacks(data);
        if (data.length > 0) {
          // --- УМНЫЙ ВЫБОР СБОРКИ ---
          const savedPackId = localStorage.getItem('launcher_last_pack');
          const lastPack = data.find(p => p.id === savedPackId);
          const packToSelect = lastPack || data[0];

          setCurrentPack(packToSelect);
          setServerLogs(`Выбрана сборка: ${packToSelect.name}. Сервер готов к запуску...\n`);
        } else {
          setLoadingError("Список сборок на сервере пуст.");
        }
      })
      .catch(err => {
        setLoadingError(err.message);
      });
  };

  useEffect(() => {
    fetchModpacks();
    
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => setAppVersion(v));
    }

    window.electronAPI.onServerLog((e, data) => setServerLogs(p => p + data));
    window.electronAPI.onServerStatus((e, status) => setIsServerRunning(status === 'starting'));
    window.electronAPI.onServerPlayers((e, playerList) => setServerPlayers(playerList));

    const checkVideoSetting = () => {
      setEnableVideoBg(localStorage.getItem('launcher_video_bg') !== 'false');
    };
    
    const interval = setInterval(checkVideoSetting, 500);
    return () => clearInterval(interval);

  }, []);

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
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>СВЯЗЬ ПОТЕРЯНА</h2>
              <p style={{ color: '#a1a1aa', marginBottom: '30px', maxWidth: '350px', lineHeight: '1.5' }}>
                Не удалось загрузить данные лаунчера.<br/><span style={{ fontSize: '12px', color: '#52525b' }}>{loadingError}</span>
              </p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={fetchModpacks} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 800, cursor: 'pointer' }}>
                ПОВТОРИТЬ ПОПЫТКУ
              </motion.button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ width: '45px', height: '45px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: '25px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '3px', color: '#10b981' }}>ПОДКЛЮЧЕНИЕ...</h2>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ОСНОВНОЙ ЭКРАН ЛАУНЧЕРА
  const appStyle = {
    display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative',
    background: (animatedBg && currentPack.bgVideo) 
      ? 'transparent' 
      : `linear-gradient(rgba(20, 20, 20, 0.7), rgba(20, 20, 20, 0.9)), url('${currentPack.bgImage}') center/cover`,
    transition: 'background 0.5s ease-in-out'
  };

  return (
    <div style={appStyle}>
      {animatedBg && currentPack.bgVideo && (
        <video 
          key={currentPack.id}
          src={currentPack.bgVideo} 
          autoPlay loop muted playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
        />
      )}
      <TopBar />
      <UpdateNotification />

        <div style={{ display: 'flex', flexGrow: 1, padding: '40px 20px 20px 20px', gap: '40px', overflow: 'hidden' }}>
          
          <div style={{ width: '60px', minWidth: '60px', background: '#11111157', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', border: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
              {modpacks.map(pack => (
                <motion.img 
                  key={pack.id} src={pack.icon} alt={pack.name} title={pack.name}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { 
                    setCurrentPack(pack); 
                    localStorage.setItem('launcher_last_pack', pack.id); // Запоминаем выбор!
                    setServerLogs(`Выбрана сборка: ${pack.name}...\n`); 
                  }}
                  style={{ width: '40px', height: '40px', cursor: 'pointer', opacity: currentPack.id === pack.id ? 1 : 0.4, borderRadius: '8px', objectFit: 'contain' }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <NavButton icon="fa-gamepad" active={currentPage === 'client'} onClick={() => setCurrentPage('client')} color="#10b981" />
              <NavButton icon="fa-server" active={currentPage === 'server'} onClick={() => setCurrentPage('server')} color="#3b82f6" />
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <NavButton icon="fa-gear" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} color="#f59e0b" />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingBottom: '10px' }}>
                <motion.button
                  onClick={handleManualUpdate}
                  title="Проверить обновления"
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

        <div style={{ flexGrow: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          {currentPack ? (
            <>
              <div style={{ display: currentPage === 'client' ? 'block' : 'none', height: '100%' }}>
                <ClientPage openSettings={() => setCurrentPage('settings')} currentPack={currentPack} />
              </div>
              <div style={{ display: currentPage === 'server' ? 'block' : 'none', height: '100%' }}>
                <ServerPage logs={serverLogs} isRunning={isServerRunning} players={serverPlayers} currentPack={currentPack} />
              </div>
              <div style={{ display: currentPage === 'settings' ? 'block' : 'none', height: '100%' }}>
                <SettingsPage currentPack={currentPack} />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a1a1aa' }}>
              {loadingError ? <span style={{color:'#ef4444'}}>{loadingError}</span> : 'Загрузка сборок...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, active, onClick, color }) {
  return (
    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClick} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: active ? color : 'transparent', color: active ? '#fff' : '#52525b', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className={`fa-solid ${icon}`}></i>
    </motion.button>
  );
}