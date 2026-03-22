import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ФУНКЦИЯ ФОРМАТИРОВАНИЯ ВРЕМЕНИ ---
const formatPlaytime = (ms) => {
  const totalMins = Math.floor(ms / 60000);
  if (totalMins === 0) return 'Меньше минуты';
  if (totalMins < 60) return `${totalMins} мин.`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h} ч. ${m} мин.`;
};

export default function ClientPage({ openSettings, currentPack }) {
  const [status, setStatus] = useState(`Готово к запуску`);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Состояния для счетчика времени
  const [playtime, setPlaytime] = useState(0);
  const sessionStartRef = useRef(null);
  
  const isLaunchingRef = useRef(false);
  const currentPackRef = useRef(currentPack); 

  // --- УМНАЯ ПРОВЕРКА ВЕРСИИ И УСТАНОВКИ ---
  const installedVersion = localStorage.getItem(`installed_v_${currentPack.id}`);
  const isZipPack = currentPack.useZip && currentPack.packVersion;
  const needsInstall = isZipPack && !installedVersion;
  const needsUpdate = isZipPack && installedVersion && (currentPack.packVersion !== installedVersion);

  useEffect(() => {
    isLaunchingRef.current = isLaunching;
  }, [isLaunching]);

  useEffect(() => {
    currentPackRef.current = currentPack;
    
    // Подгружаем сохраненное время при переключении сборки
    const savedTime = parseInt(localStorage.getItem(`playtime_${currentPack.id}`) || '0', 10);
    setPlaytime(savedTime);
    
    let initialStatus = 'Готово к запуску';
    if (needsInstall) initialStatus = `Требуется установка: v${currentPack.packVersion}`;
    else if (needsUpdate) initialStatus = `Доступно обновление: v${currentPack.packVersion}`;
    
    setStatus(initialStatus);
    setConsoleLogs([]); 
    setIsPlaying(false);
    setIsLaunching(false);
    setIsUpdating(false);
    setDownloadProgress(0);
  }, [currentPack, needsInstall, needsUpdate]);

  // АВТОСОХРАНЕНИЕ ВРЕМЕНИ (раз в минуту, защита от закрытия лаунчера)
  useEffect(() => {
    let interval;
    if (isPlaying && sessionStartRef.current) {
      interval = setInterval(() => {
        const playedMs = Date.now() - sessionStartRef.current;
        const saved = parseInt(localStorage.getItem(`playtime_${currentPackRef.current.id}`) || '0', 10);
        const newTotal = saved + playedMs;
        
        setPlaytime(newTotal); // Обновляем UI
        localStorage.setItem(`playtime_${currentPackRef.current.id}`, newTotal); // Пишем в память
        
        // Сдвигаем точку отсчета, чтобы не прибавлять одно и то же время дважды
        sessionStartRef.current = Date.now();
      }, 60000); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (window.electronAPI.onDownloadProgress) {
      window.electronAPI.onDownloadProgress((event, percent) => {
        setDownloadProgress(percent);
        setStatus(`Загрузка файлов: ${percent}%`);
      });
    }

    if (window.electronAPI.onUpdateDone) {
      window.electronAPI.onUpdateDone(() => {
        localStorage.setItem(`installed_v_${currentPackRef.current.id}`, currentPackRef.current.packVersion);
        setIsUpdating(false);
        setStatus(needsInstall ? 'Сборка успешно установлена!' : 'Сборка обновлена!');
      });
    }

    window.electronAPI.onProgress((event, msg) => {
      if (msg.startsWith('[LOG]')) {
        const cleanMsg = msg.replace('[LOG]', '').trim();
        if (cleanMsg) {
          setConsoleLogs(prev => {
            const lines = cleanMsg.split('\n').map(l => l.trim()).filter(l => l);
            return [...prev, ...lines].slice(-6); 
          });

          if (isLaunchingRef.current && (
              cleanMsg.includes('Render thread/INFO') || 
              cleanMsg.includes('LWJGL') || 
              cleanMsg.includes('OpenAL') ||
              cleanMsg.includes('Sound engine started') ||
              cleanMsg.includes('Setting user:')
          )) {
            setIsLaunching(false);
            setIsPlaying(true); 
            setStatus('Игра запущена!'); 
            // ЗАПУСКАЕМ ТАЙМЕР
            sessionStartRef.current = Date.now();

            // ---> МЕНЯЕМ СТАТУС В DISCORD НА ИГРОВОЙ <---
            if (window.electronAPI.setDiscordPlaying) {
              window.electronAPI.setDiscordPlaying(currentPackRef.current.name);
            }
          }
        }
        return;
      }
      
      setStatus(msg);
      if (msg.includes('Запуск Minecraft...')) {
        setConsoleLogs(["Инициализация движка...", "Передача управления Java..."]);
      }
    });

    window.electronAPI.onError((event, msg) => { 
      setStatus(`Ошибка: ${msg}`); 
      setIsLaunching(false); 
      setIsPlaying(false);
      setIsUpdating(false);
    });

    window.electronAPI.onClosed(() => { 
      // СОХРАНЯЕМ ОСТАТКИ ВРЕМЕНИ ПРИ ЗАКРЫТИИ
      if (sessionStartRef.current) {
        const playedMs = Date.now() - sessionStartRef.current;
        const saved = parseInt(localStorage.getItem(`playtime_${currentPackRef.current.id}`) || '0', 10);
        const newTotal = saved + playedMs;
        localStorage.setItem(`playtime_${currentPackRef.current.id}`, newTotal);
        setPlaytime(newTotal);
        sessionStartRef.current = null;
      }

      setStatus('Игра закрыта.'); 
      setIsLaunching(false); 
      setIsPlaying(false); 
      setConsoleLogs([]); 

      // ---> ВОЗВРАЩАЕМ СТАТУС В DISCORD В РЕЖИМ ОЖИДАНИЯ <---
      if (window.electronAPI.setDiscordIdle) {
        window.electronAPI.setDiscordIdle();
      }
    });
  }, [needsInstall]); 

  const handleAction = () => {
    if (isPlaying) {
      window.electronAPI.killGame();
      return;
    }

    if (needsInstall || needsUpdate) {
      setIsUpdating(true);
      setStatus(needsInstall ? 'Начинаем установку...' : 'Начинаем обновление...');
      if (window.electronAPI.updatePack) {
        window.electronAPI.updatePack(currentPack);
      }
      return;
    }

    const authMode = localStorage.getItem('launcher_auth_mode') || 'offline';
    const username = localStorage.getItem('launcher_username') || '';
    
    if (authMode === 'offline' && username.length < 3) { 
      setStatus('⚠️ Укажите никнейм в настройках!'); 
      return; 
    }
    
    setIsLaunching(true);
    setIsPlaying(false);
    setStatus('Подготовка к запуску...');
    setConsoleLogs(['Проверка файлов сборки...']);

    window.electronAPI.launchGame({
      authMode,
      username,
      ram: (localStorage.getItem('launcher_ram') || '4') + 'G',
      playMode: localStorage.getItem('launcher_mode') || 'host',
      serverIp: localStorage.getItem('launcher_server_ip') || '',
      javaPath: localStorage.getItem('launcher_client_java') || '',
      pack: currentPack
    });
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
        <motion.img variants={itemVariants} src={currentPack.logo} alt={currentPack.name} style={{ height: '140px', width: 'auto', maxWidth: '100%', objectFit: 'contain', marginBottom: '15px', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.8))' }} /> 
        
        <motion.h1 variants={itemVariants} style={{ fontSize: '38px', fontWeight: 900, color: '#fff', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 5px 15px rgba(0,0,0,0.9)' }}>
          {currentPack.name}
        </motion.h1>

        {/* БЛОК СТАТУСА И СЧЕТЧИКА ВРЕМЕНИ */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '15px', minHeight: '30px', marginBottom: '35px', position: 'relative' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', color: '#a1a1aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
            <i className="fa-regular fa-clock" style={{ color: '#3b82f6' }}></i>
            В игре: <span style={{ color: '#fff' }}>{formatPlaytime(playtime)}</span>
          </div>
          <p style={{ fontSize: '15px', color: (isLaunching || isUpdating) ? '#34d399' : (isPlaying ? '#60a5fa' : ((needsInstall || needsUpdate) ? '#f59e0b' : '#e4e4e7')), fontWeight: 600, margin: 0, textShadow: '0 2px 6px rgba(0,0,0,1)', transition: 'color 0.3s' }}>
            {status}
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
            whileHover={!(isLaunching || isUpdating) ? { scale: 1.05, boxShadow: isPlaying ? '0 10px 30px rgba(239, 68, 68, 0.5)' : ((needsInstall || needsUpdate) ? '0 10px 30px rgba(59, 130, 246, 0.5)' : '0 10px 30px rgba(16, 185, 129, 0.5)') } : {}} 
            whileTap={!(isLaunching || isUpdating) ? { scale: 0.95 } : {}} 
            onClick={!(isLaunching || isUpdating) ? handleAction : undefined} 
            style={{ 
              background: (isLaunching || isUpdating) ? '#059669' : (isPlaying ? '#ef4444' : ((needsInstall || needsUpdate) ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)')), 
              color: '#fff', border: 'none', padding: '0 40px', height: '65px', borderRadius: '20px', 
              fontSize: '18px', fontWeight: 800, cursor: (isLaunching || isUpdating) ? 'wait' : 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', textTransform: 'uppercase', 
              letterSpacing: '1.5px', boxShadow: '0 10px 25px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden',
              transition: 'background 0.3s'
            }}
          >
            {(isLaunching || isUpdating) && <motion.div animate={{ x: ['-150%', '250%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', transform: 'skewX(-20deg)' }} />}
            
            {/* ИКОНКА */}
            {(isLaunching || isUpdating) ? <i className="fa-solid fa-spinner fa-spin"></i> : (isPlaying ? <i className="fa-solid fa-stop"></i> : (needsInstall ? <i className="fa-solid fa-download"></i> : (needsUpdate ? <i className="fa-solid fa-cloud-arrow-down"></i> : <i className="fa-solid fa-play"></i>)))} 
            
            {/* ТЕКСТ */}
            {isLaunching ? 'ЗАПУСК...' : (isUpdating ? (needsInstall ? 'УСТАНОВКА...' : 'ОБНОВЛЕНИЕ...') : (isPlaying ? 'ОСТАНОВИТЬ' : (needsInstall ? 'УСТАНОВИТЬ СБОРКУ' : (needsUpdate ? 'ОБНОВИТЬ СБОРКУ' : 'ИГРАТЬ'))))}
          </motion.button>

          <motion.button 
            whileHover={!(isLaunching || isUpdating) && !isPlaying ? { background: 'rgba(0,0,0,0.8)', scale: 1.05, borderColor: 'rgba(255,255,255,0.3)' } : {}} 
            whileTap={!(isLaunching || isUpdating) && !isPlaying ? { scale: 0.95 } : {}} 
            onClick={!(isLaunching || isUpdating) && !isPlaying ? openSettings : undefined} 
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: (isLaunching || isUpdating || isPlaying) ? 'rgba(255,255,255,0.3)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: (isLaunching || isUpdating || isPlaying) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
          >
            <i className="fa-solid fa-sliders"></i>
          </motion.button>

          <motion.button 
            whileHover={!(isLaunching || isUpdating) ? { background: 'rgba(0,0,0,0.8)', scale: 1.05, borderColor: 'rgba(255,255,255,0.3)' } : {}} 
            whileTap={!(isLaunching || isUpdating) ? { scale: 0.95 } : {}} onClick={!(isLaunching || isUpdating) ? () => window.electronAPI.openClientFolder(currentPack) : undefined} 
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: (isLaunching || isUpdating) ? 'rgba(255,255,255,0.3)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '65px', height: '65px', borderRadius: '20px', fontSize: '22px', cursor: (isLaunching || isUpdating) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', transition: 'color 0.3s' }}
          >
            <i className="fa-regular fa-folder-open"></i>
          </motion.button>
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
                  style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: index === consoleLogs.length - 1 ? '#34d399' : '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 4px rgba(0,0,0,0.8)', transition: 'color 0.2s' }}
                >
                  {log}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}