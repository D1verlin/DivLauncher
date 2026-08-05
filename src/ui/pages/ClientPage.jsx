import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

// --- SHARED GLASSMORPHIC STYLES ---
const glassCard = {
  background: 'rgba(10, 10, 16, 0.75)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '24px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
};

const glassInput = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '14px',
  color: '#fff',
  padding: '10px 14px',
  width: '80px',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '14px',
  fontWeight: 700,
  textAlign: 'center',
};

// --- ФУНКЦИЯ ФОРМАТИРОВАНИЯ ВРЕМЕНИ ---
const formatPlaytime = (ms, t) => {
  const totalMins = Math.floor(ms / 60000);
  if (totalMins === 0) return t('client_playtime_less_minute');
  if (totalMins < 60) return `${totalMins}${t('client_playtime_minutes')}`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}${t('client_playtime_hours')}${m}${t('client_playtime_minutes')}`;
};

export default function ClientPage({ 
  openSettings, 
  openMods, 
  currentPack, 
  onDeletePack,
  isPlaying,
  isLaunching,
  isUpdating,
  downloadProgress,
  clientStatus: status,
  clientConsoleLogs: consoleLogs,
  runningPackId,
  runningPackName,
  playtime,
  onLaunchGame,
  onKillGame,
  onUpdatePack,
  onPlaytimeChange,
  onExportLogs,
  setClientStatus,
  showConfirm,
  showAlert
}) {
  const { lang, t } = useTranslation();
  const [activeUsername, setActiveUsername] = useState(localStorage.getItem('launcher_username') || '');

  // States for playtime editing modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');

  const getLogColor = (log) => {
    if (log.includes('[ERROR]') || log.includes('[FATAL]') || log.includes('Exception') || log.toLowerCase().includes('error')) {
      return '#ef4444'; // Red
    }
    if (log.includes('[WARN]') || log.includes('[WARNING]') || log.toLowerCase().includes('warn')) {
      return '#f59e0b'; // Amber
    }
    if (log.includes('[INFO]') || log.includes('INFO')) {
      return '#a1a1aa'; // Light Grey
    }
    return '#71717a'; // Grey
  };

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setActiveUsername(localStorage.getItem('launcher_username') || '');
    };
    window.addEventListener('settings-changed', handleSettingsUpdate);
    handleSettingsUpdate();
    return () => window.removeEventListener('settings-changed', handleSettingsUpdate);
  }, []);

  // --- УМНАЯ ПРОВЕРКА ВЕРСИИ И УСТАНОВКИ ---
  const installedVersion = localStorage.getItem(`installed_v_${currentPack.id}`);
  const isZipPack = currentPack.useZip && currentPack.packVersion;
  const needsInstall = isZipPack && !installedVersion;
  const needsUpdate = isZipPack && installedVersion && (currentPack.packVersion !== installedVersion);

  const isAnotherPackRunning = runningPackId && runningPackId !== currentPack.id;

  const handleAction = () => {
    if (isAnotherPackRunning) return;

    if (isPlaying) {
      onKillGame();
      return;
    }

    if (needsInstall || needsUpdate) {
      onUpdatePack(currentPack);
      return;
    }

    if (activeUsername.length < 3) { 
      setClientStatus(t('client_username_warning')); 
      return; 
    }
    
    onLaunchGame(currentPack, {
      pack: currentPack,
      username: activeUsername,
      ram: (localStorage.getItem('launcher_ram') || '4') + 'G',
      playMode: localStorage.getItem('launcher_mode') || 'host',
      serverIp: localStorage.getItem('launcher_server_ip') || '',
      javaPath: localStorage.getItem('launcher_client_java') || '',
      width: localStorage.getItem('launcher_win_width') || '1280',
      height: localStorage.getItem('launcher_win_height') || '720',
      fullscreen: localStorage.getItem('launcher_fullscreen') === 'true'
    });
  };

  const handleOpenEditModal = () => {
    const totalMins = Math.floor(playtime / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setEditHours(String(h));
    setEditMinutes(String(m));
    setShowEditModal(true);
  };

  const handleSavePlaytime = () => {
    const h = parseInt(editHours, 10);
    const m = parseInt(editMinutes, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m >= 60) {
      showAlert(t('error'), t('client_playtime_invalid_input'));
      return;
    }
    const newPlaytime = (h * 60 + m) * 60000;
    localStorage.setItem(`playtime_${currentPack.id}`, String(newPlaytime));
    onPlaytimeChange(newPlaytime);
    setShowEditModal(false);
  };

  const handleResetPlaytime = () => {
    setEditHours('0');
    setEditMinutes('0');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', justifyContent: 'center', 
      alignItems: 'flex-start', height: '100%', width: '100%', paddingLeft: '60px' 
    }}>
      
      {(isLaunching || isUpdating) && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, cursor: 'wait' }} />}

      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '600px', zIndex: 1 }}>
        <>
          {currentPack.logo && (
            <motion.img 
              variants={itemVariants} 
              src={currentPack.logo} 
              alt={currentPack.name} 
              onError={(e) => { e.target.style.display = 'none'; }}
              style={{ height: '140px', width: 'auto', maxWidth: '100%', objectFit: 'contain', marginBottom: '15px', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.8))' }} 
            />
          )}
          <motion.div 
            variants={itemVariants}
            style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: currentPack.logo ? '10px' : '20px' }}
          >
            {!currentPack.logo && currentPack.icon && (
              currentPack.icon.startsWith('fa-') ? (
                <i className={currentPack.icon} style={{ fontSize: '44px', color: currentPack.titleColor && !currentPack.titleColor.includes('gradient') ? currentPack.titleColor : '#60a5fa', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
              ) : (
                <img src={currentPack.icon} alt={currentPack.name} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '14px', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
              )
            )}
            <h1 
              key={currentPack.titleColor || 'default'}
              style={{ 
                fontSize: currentPack.logo ? '38px' : '44px', 
                fontWeight: currentPack.logo ? 900 : 950, 
                margin: 0, 
                textTransform: 'uppercase', 
                letterSpacing: currentPack.logo ? '1px' : '1.5px', 
                ...(currentPack.titleColor && currentPack.titleColor.includes('gradient') ? {
                  background: currentPack.titleColor,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                  textShadow: 'none'
                } : currentPack.titleColor ? {
                  color: currentPack.titleColor,
                  textShadow: '0 5px 15px rgba(0,0,0,0.9)',
                  background: 'none',
                  WebkitBackgroundClip: 'unset',
                  WebkitTextFillColor: 'unset'
                } : !currentPack.logo ? {
                  background: 'linear-gradient(90deg, #60a5fa, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                  textShadow: 'none'
                } : {
                  color: '#fff',
                  textShadow: '0 5px 15px rgba(0,0,0,0.9)',
                  background: 'none',
                  WebkitBackgroundClip: 'unset',
                  WebkitTextFillColor: 'unset'
                })
              }}
            >
              {currentPack.name}
            </h1>
          </motion.div>
        </>
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '15px', minHeight: '30px', marginBottom: '35px', position: 'relative', width: '100%' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', color: '#a1a1aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <i className="fa-regular fa-clock" style={{ color: '#3b82f6' }}></i>
            {t('client_playtime')}
            <span style={{ color: '#fff' }}>{formatPlaytime(playtime, t)}</span>
            <motion.button 
              whileHover={{ color: '#f59e0b' }} 
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenEditModal}
              title={t('client_playtime_edit')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px', padding: '0 4px', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
            >
              <i className="fa-solid fa-pen"></i>
            </motion.button>
          </div>
          <p style={{ 
            fontSize: '15px', 
            color: isAnotherPackRunning ? '#ef4444' : (isLaunching || isUpdating) ? '#34d399' : (isPlaying ? '#60a5fa' : ((needsInstall || needsUpdate) ? '#f59e0b' : '#e4e4e7')), 
            fontWeight: 600, 
            margin: 0, 
            textShadow: '0 2px 6px rgba(0,0,0,1)', 
            transition: 'color 0.3s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '350px'
          }}>
            {isAnotherPackRunning ? `${t('client_another_pack_running')} ${runningPackName}` : status}
          </p>
        </motion.div>

        <AnimatePresence>
          {isUpdating && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} 
              style={{ width: '100%', marginBottom: '20px', overflow: 'hidden' }}
            >
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${downloadProgress}%` }} style={{ height: '100%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '15px', zIndex: 10 }}>
          <motion.button 
            whileHover={!(isLaunching || isUpdating || isAnotherPackRunning) ? { boxShadow: isPlaying ? '0 10px 30px rgba(239, 68, 68, 0.5)' : ((needsInstall || needsUpdate) ? '0 10px 30px rgba(59, 130, 246, 0.5)' : '0 10px 30px rgba(16, 185, 129, 0.5)') } : {}} 
            whileTap={!(isLaunching || isUpdating || isAnotherPackRunning) ? { scale: 0.95 } : {}} 
            onClick={!(isLaunching || isUpdating || isAnotherPackRunning) ? handleAction : undefined} 
            style={{ 
              background: isAnotherPackRunning 
                ? 'rgba(255, 255, 255, 0.05)' 
                : (isLaunching || isUpdating) 
                  ? '#059669' 
                  : (isPlaying 
                    ? '#ef4444' 
                    : ((needsInstall || needsUpdate) 
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                      : 'linear-gradient(135deg, #10b981, #059669)')), 
              color: isAnotherPackRunning ? '#71717a' : '#fff', 
              border: isAnotherPackRunning ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', 
              padding: '0 40px', height: '65px', borderRadius: '20px', 
              fontSize: '18px', fontWeight: 800, 
              cursor: isAnotherPackRunning ? 'not-allowed' : (isLaunching || isUpdating) ? 'wait' : 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', textTransform: 'uppercase', 
              letterSpacing: '1.5px', boxShadow: isAnotherPackRunning ? 'none' : '0 10px 25px rgba(0,0,0,0.6)', 
              position: 'relative', overflow: 'hidden',
              transition: 'background 0.3s'
            }}
          >
            {(isLaunching || isUpdating) && <motion.div animate={{ x: ['-150%', '250%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', transform: 'skewX(-20deg)' }} />}
            
            {/* ИКОНКА */}
            {isAnotherPackRunning ? (
              <i className="fa-solid fa-ban"></i>
            ) : (isLaunching || isUpdating) ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : isPlaying ? (
              <i className="fa-solid fa-stop"></i>
            ) : needsInstall ? (
              <i className="fa-solid fa-download"></i>
            ) : needsUpdate ? (
              <i className="fa-solid fa-cloud-arrow-down"></i>
            ) : (
              <i className="fa-solid fa-play"></i>
            )} 
            
            {/* ТЕКСТ */}
            {isAnotherPackRunning ? (
              (lang === 'ru' ? 'ЗАПУЩЕНА ДРУГАЯ СБОРКА' : 'ANOTHER PACK IS RUNNING')
            ) : isLaunching ? (
              (lang === 'ru' ? 'ЗАПУСК...' : 'LAUNCHING...')
            ) : isUpdating ? (
              needsInstall 
                ? (lang === 'ru' ? 'УСТАНОВКА...' : 'INSTALLING...') 
                : (lang === 'ru' ? 'ОБНОВЛЕНИЕ...' : 'UPDATING...')
            ) : isPlaying ? (
              (lang === 'ru' ? 'ОСТАНОВИТЬ' : 'STOP')
            ) : needsInstall ? (
              t('client_install').toUpperCase()
            ) : needsUpdate ? (
              t('client_update').toUpperCase()
            ) : (
              t('client_play').toUpperCase()
            )}
          </motion.button>

          <motion.button 
            whileHover={!(isLaunching || isUpdating) && !isPlaying ? { background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.3)' } : {}} 
            whileTap={!(isLaunching || isUpdating) && !isPlaying ? { scale: 0.95 } : {}} 
            onClick={!(isLaunching || isUpdating) && !isPlaying ? openSettings : undefined} 
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: (isLaunching || isUpdating || isPlaying) ? 'rgba(255,255,255,0.3)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: (isLaunching || isUpdating || isPlaying) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
            title={t('tab_settings')}
          >
            <i className="fa-solid fa-sliders"></i>
          </motion.button>

          <motion.button 
            whileHover={!(isLaunching || isUpdating) && !isPlaying ? { background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.3)' } : {}} 
            whileTap={!(isLaunching || isUpdating) && !isPlaying ? { scale: 0.95 } : {}} 
            onClick={!(isLaunching || isUpdating) && !isPlaying ? openMods : undefined} 
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: (isLaunching || isUpdating || isPlaying) ? 'rgba(255,255,255,0.3)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: (isLaunching || isUpdating || isPlaying) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
            title={t('tab_mods')}
          >
            <i className="fa-solid fa-puzzle-piece"></i>
          </motion.button>

          <motion.button 
            whileHover={!(isLaunching || isUpdating) ? { background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.3)' } : {}} 
            whileTap={!(isLaunching || isUpdating) ? { scale: 0.95 } : {}} onClick={!(isLaunching || isUpdating) ? () => window.electronAPI.openClientFolder(currentPack) : undefined} 
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: (isLaunching || isUpdating) ? 'rgba(255,255,255,0.3)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: (isLaunching || isUpdating) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
            title={lang === 'ru' ? 'Папка сборки' : 'Pack Folder'}
          >
            <i className="fa-regular fa-folder-open"></i>
          </motion.button>

          {(isLaunching || isPlaying || consoleLogs.length > 0) && (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.3)' }} 
              whileTap={{ scale: 0.95 }}
              onClick={onExportLogs} 
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
              title={t('client_export_logs')}
            >
              <i className="fa-solid fa-file-arrow-down"></i>
            </motion.button>
          )}

        </motion.div>

        <AnimatePresence>
          {isLaunching && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} transition={{ duration: 0.4, type: "spring" }}
              style={{ marginTop: '15px', width: '100%', maxWidth: '600px', padding: '10px 15px', borderRadius: '16px', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)', display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              {consoleLogs.map((log, index) => (
                <div 
                  key={index}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: index === consoleLogs.length - 1 ? '#34d399' : getLogColor(log), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 4px rgba(0,0,0,0.8)', transition: 'color 0.2s' }}
                >
                  {log}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* --- PLAYTIME EDITING MODAL (GLASSMORPHIC) --- */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              style={{ ...glassCard, maxWidth: '380px', width: '90%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="fa-regular fa-clock" style={{ color: '#f59e0b', fontSize: '18px' }} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '16px', margin: 0, fontFamily: 'Montserrat' }}>
                    {t('client_playtime_edit_title')}
                  </h3>
                  <p style={{ color: '#71717a', fontWeight: 600, fontSize: '12px', margin: '4px 0 0 0' }}>
                    {currentPack.name}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '25px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {t('client_playtime_hours_label')}
                  </span>
                  <input 
                    type="number" 
                    min="0"
                    value={editHours} 
                    onChange={(e) => setEditHours(e.target.value)} 
                    style={glassInput} 
                  />
                </div>
                <span style={{ color: '#a1a1aa', fontSize: '20px', fontWeight: 800, marginTop: '20px' }}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {t('client_playtime_minutes_label')}
                  </span>
                  <input 
                    type="number" 
                    min="0"
                    max="59"
                    value={editMinutes} 
                    onChange={(e) => setEditMinutes(e.target.value)} 
                    style={glassInput} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button 
                    whileTap={{ scale: 0.98 }} 
                    onClick={() => setShowEditModal(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                      color: '#a1a1aa', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 700, fontSize: '13px',
                    }}
                  >
                    {t('cancel')}
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.98 }} 
                    onClick={handleSavePlaytime}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.15)',
                      color: '#10b981', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '13px',
                    }}
                  >
                    {t('save')}
                  </motion.button>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.99 }} 
                  onClick={handleResetPlaytime}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '12px',
                    border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)',
                    color: '#f87171', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 700, fontSize: '12px',
                  }}
                >
                  <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i>
                  {t('client_playtime_reset_btn')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}