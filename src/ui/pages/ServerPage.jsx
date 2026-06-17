import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const glassPanelStyle = {
  background: 'rgba(15, 15, 20, 0.45)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const glassInputStyle = {
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#fff',
  padding: '10px 14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)',
  transition: 'border 0.3s'
};

// Стили для кнопок в контекстном меню
const contextBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#e4e4e7',
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  transition: 'background 0.2s, color 0.2s'
};

export default function ServerPage({ logs, isRunning, players, currentPack }) {
  const [command, setCommand] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [propsData, setPropsData] = useState({});
  const consoleEndRef = useRef(null);

  // СОСТОЯНИЯ ДЛЯ УПРАВЛЕНИЯ ИГРОКАМИ (КОНТЕКСТНОЕ МЕНЮ)
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => { 
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [logs]);

  // Закрываем меню при клике в любое место
  useEffect(() => {
    const handleClickOutside = () => setSelectedPlayer(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleServer = () => {
    if (isRunning) window.electronAPI.sendServerCommand('stop');
    else window.electronAPI.launchServer({ ...currentPack, javaPath: localStorage.getItem('launcher_server_java') || '' });
  };

  const sendCommand = (e) => { 
    e.preventDefault(); 
    if(command) { window.electronAPI.sendServerCommand(command); setCommand(''); } 
  };

  const loadProps = async () => {
    const p = await window.electronAPI.getServerProps(currentPack);
    setPropsData(p);
    setShowProps(true);
  };

  const saveProps = () => {
    window.electronAPI.saveServerProps(currentPack, propsData);
    setShowProps(false);
    if (isRunning) window.electronAPI.sendServerCommand('say Настройки изменены (требуется рестарт)');
  };

  const getPlayerDistancePreset = (data) => {
    const pct = parseInt(data['entity-broadcast-range-percentage'] || '100', 10);
    const range = parseInt(data['player-tracking-range'] || '48', 10);
    if (range <= 32 || pct <= 50) return 'low';
    if (range <= 64 || pct <= 100) return 'medium';
    if (range <= 128 || pct <= 200) return 'high';
    return 'ultra';
  };

  const applyPlayerDistancePreset = (preset) => {
    let newProps = { ...propsData };
    if (preset === 'low') {
      newProps['simulation-distance'] = '4';
      newProps['entity-broadcast-range-percentage'] = '50';
      newProps['player-tracking-range'] = '32';
    } else if (preset === 'medium') {
      newProps['simulation-distance'] = '8';
      newProps['entity-broadcast-range-percentage'] = '100';
      newProps['player-tracking-range'] = '64';
    } else if (preset === 'high') {
      newProps['simulation-distance'] = '16';
      newProps['entity-broadcast-range-percentage'] = '200';
      newProps['player-tracking-range'] = '128';
    } else if (preset === 'ultra') {
      newProps['simulation-distance'] = '32';
      newProps['entity-broadcast-range-percentage'] = '500';
      newProps['player-tracking-range'] = '512';
    }
    setPropsData(newProps);
  };

  // --- ЛОГИКА КОНТЕКСТНОГО МЕНЮ ИГРОКА ---
  const handlePlayerClick = (e, player) => {
    e.stopPropagation(); // Не даем клику уйти на документ (чтобы меню не закрылось сразу)
    
    // Получаем координаты клика относительно окна
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Если меню уже открыто для этого игрока - закрываем
    if (selectedPlayer === player) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
      // Смещаем меню чуть правее и ниже карточки игрока
      setMenuPosition({ x: rect.left - 130, y: rect.top });
    }
  };

  const handlePlayerAction = (action, player) => {
    if (!isRunning) return;
    
    let cmd = '';
    switch (action) {
      case 'kick': cmd = `kick ${player}`; break;
      case 'ban': cmd = `ban ${player}`; break;
      case 'op': cmd = `op ${player}`; break;
      case 'deop': cmd = `deop ${player}`; break;
      case 'kill': cmd = `kill ${player}`; break;
      default: return;
    }
    
    window.electronAPI.sendServerCommand(cmd);
    setSelectedPlayer(null); // Закрываем меню
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', height: '100%', width: '100%', gap: '15px', position: 'relative', paddingBottom: '15px' }}
    >
      
      {/* ... (Модальное окно настроек остается без изменений) ... */}
      <AnimatePresence>
        {showProps && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'absolute', top: '-40px', left: '-80px', right: '-20px', bottom: '-20px', 
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 100, 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              style={{ ...glassPanelStyle, padding: '25px', width: '400px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Настройки {currentPack.name}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', display: 'block' }}>Название в списке (MOTD)</label>
                  <input type="text" value={propsData['motd'] || ''} onChange={e => setPropsData({...propsData, 'motd': e.target.value})} style={glassInputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flexGrow: 1 }}>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', display: 'block' }}>Слоты</label>
                    <input type="text" value={propsData['max-players'] || '20'} onChange={e => setPropsData({...propsData, 'max-players': e.target.value})} style={glassInputStyle} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', display: 'block' }}>PVP</label>
                    <select value={propsData['pvp'] || 'true'} onChange={e => setPropsData({...propsData, 'pvp': e.target.value})} style={{...glassInputStyle, cursor: 'pointer'}}>
                      <option value="true" style={{background: '#111'}}>Вкл</option>
                      <option value="false" style={{background: '#111'}}>Выкл</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

                {/* Дальность чанков */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Дальность чанков (Территория)</label>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', fontFamily: 'Montserrat' }}>{propsData['view-distance'] || '10'} чанков</span>
                  </div>
                  <input 
                    type="range" 
                    min="4" 
                    max="32" 
                    step="1" 
                    value={propsData['view-distance'] || '10'} 
                    onChange={e => setPropsData({...propsData, 'view-distance': e.target.value})} 
                    style={{ width: '100%', cursor: 'pointer' }} 
                  />
                </div>

                {/* Дальность прорисовки игроков */}
                <div>
                  <label style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', display: 'block' }}>Прорисовка игроков (Пользователи)</label>
                  <select 
                    value={getPlayerDistancePreset(propsData)} 
                    onChange={e => applyPlayerDistancePreset(e.target.value)} 
                    style={{...glassInputStyle, cursor: 'pointer'}}
                  >
                    <option value="low" style={{background: '#111'}}>Низкая (32м / 4 чанка симуляции / 50%)</option>
                    <option value="medium" style={{background: '#111'}}>Средняя (64м / 8 чанков симуляции / 100%) [Стандарт]</option>
                    <option value="high" style={{background: '#111'}}>Высокая (128м / 16 чанков симуляции / 200%)</option>
                    <option value="ultra" style={{background: '#111'}}>Ультра (512м / 32 чанка симуляции / 500%) [Максимум]</option>
                  </select>
                  <span style={{ fontSize: '9px', color: '#71717a', marginTop: '4px', display: 'block', lineHeight: '1.35', fontStyle: 'italic' }}>
                    {(() => {
                      const core = currentPack.serverLoaderType || currentPack.loaderType || 'vanilla';
                      if (core === 'spigot' || core === 'paper' || core === 'hybrid') {
                        return 'Ядро Spigot/Paper/Hybrid: оптимизирует радиус отслеживания игроков и лимит чанков симуляции.';
                      }
                      return 'Ядро Forge/Fabric: оптимизирует процент вещания сущностей и дистанцию симуляции.';
                    })()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileHover={{ filter: 'brightness(1.1)' }} onClick={saveProps} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', flexGrow: 1, cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '13px', transition: 'filter 0.2s' }}>
                  Сохранить
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => setShowProps(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', flexGrow: 1, cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '13px', transition: 'background 0.2s' }}>
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ЛЕВАЯ ПАНЕЛЬ: УПРАВЛЕНИЕ */}
      <motion.div variants={itemVariants} style={{ width: '220px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ ...glassPanelStyle, padding: '15px' }}>
          <div style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '5px', letterSpacing: '1px' }}>Статус Хоста</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: isRunning ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', textShadow: isRunning ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(239,68,68,0.5)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${isRunning ? '#10b981' : '#ef4444'}` }}></span>
            {isRunning ? 'РАБОТАЕТ' : 'ОТКЛЮЧЕН'}
          </div>
        </div>

        <motion.button 
          whileHover={{ boxShadow: isRunning ? '0 8px 25px rgba(239, 68, 68, 0.6)' : '0 8px 25px rgba(16, 185, 129, 0.6)' }} 
          onClick={toggleServer} 
          style={{ 
            background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', 
            color: '#fff', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 900, fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'box-shadow 0.2s, background 0.3s'
          }}
        >
          {isRunning ? <><i className="fa-solid fa-power-off"></i> ОСТАНОВИТЬ</> : <><i className="fa-solid fa-play"></i> ЗАПУСТИТЬ</>}
        </motion.button>

        <div style={{ flexGrow: 1 }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={loadProps} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#fff', transition: 'background 0.2s' }}>
              <i className="fa-solid fa-sliders"></i> Свойства сервера
            </motion.button>

            <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => window.electronAPI.backupWorld(currentPack)} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#f59e0b', transition: 'background 0.2s' }}>
              <i className="fa-solid fa-box-archive"></i> Бэкап мира
            </motion.button>

            <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => window.electronAPI.openServerFolder(currentPack)} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#fff', transition: 'background 0.2s' }}>
              <i className="fa-regular fa-folder-open"></i> Папка сервера
            </motion.button>
        </div>
      </motion.div>

      {/* 2. ЦЕНТРАЛЬНАЯ ПАНЕЛЬ: КОНСОЛЬ */}
      <motion.div variants={itemVariants} style={{ ...glassPanelStyle, flexGrow: 1 }}>
        <div style={{ flexGrow: 1, padding: '15px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#e4e4e7', whiteSpace: 'pre-wrap', wordBreak: 'break-all', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {logs || <span style={{ color: '#71717a' }}>Ожидание запуска ядра...</span>}
          <div ref={consoleEndRef} />
        </div>
        
        <form onSubmit={sendCommand} style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ padding: '8px', color: '#10b981', fontWeight: 900 }}>{'>'}</span>
          <input 
            type="text" value={command} onChange={e => setCommand(e.target.value)} disabled={!isRunning} 
            placeholder={isRunning ? "Команда (без /)..." : "Сервер выключен"} 
            style={{ background: 'transparent', border: 'none', color: '#fff', flexGrow: 1, outline: 'none', fontFamily: 'Montserrat', fontSize: '13px' }} 
          />
          <motion.button 
            whileHover={isRunning ? { background: 'rgba(16, 185, 129, 0.3)' } : {}} type="submit" disabled={!isRunning} 
            style={{ background: isRunning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: isRunning ? '#10b981' : '#52525b', border: 'none', width: '34px', height: '34px', borderRadius: '10px', cursor: isRunning ? 'pointer' : 'default', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background 0.2s' }}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </motion.button>
        </form>
      </motion.div>

      {/* 3. ПРАВАЯ ПАНЕЛЬ: СТАТИСТИКА И ИГРОКИ */}
      <motion.div variants={itemVariants} style={{ width: '200px', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <motion.button whileHover={isRunning ? { background: 'rgba(59, 130, 246, 0.3)' } : {}} onClick={() => window.electronAPI.sendServerCommand('forge tps')} disabled={!isRunning} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px', cursor: isRunning ? 'pointer' : 'default', fontSize: '11px', fontWeight: 800, color: isRunning ? '#60a5fa' : '#52525b', justifyContent: 'center', alignItems: 'center', gap: '5px', transition: 'background 0.2s' }}>
            <i className="fa-solid fa-gauge-high"></i> TPS
          </motion.button>
          
          <motion.button whileHover={isRunning ? { background: 'rgba(16, 185, 129, 0.3)' } : {}} onClick={() => window.electronAPI.sendServerCommand('save-all')} disabled={!isRunning} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px', cursor: isRunning ? 'pointer' : 'default', fontSize: '11px', fontWeight: 800, color: isRunning ? '#34d399' : '#52525b', justifyContent: 'center', alignItems: 'center', gap: '5px', transition: 'background 0.2s' }}>
            <i className="fa-solid fa-floppy-disk"></i> SAVE
          </motion.button>
        </div>

        <div style={{ ...glassPanelStyle, flexGrow: 1, padding: '15px', position: 'relative' }}>
          <div style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Онлайн</span>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '8px' }}>{players.length}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {players.length === 0 ? (
              <div style={{ color: '#52525b', fontSize: '12px', textAlign: 'center', marginTop: '15px', fontWeight: 600 }}>Сервер пуст</div>
            ) : (
              players.map(player => (
                <div 
                  key={player} 
                  onClick={(e) => handlePlayerClick(e, player)}
                  style={{ 
                    background: selectedPlayer === player ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.3)', 
                    padding: '6px 10px', 
                    borderRadius: '10px', 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    border: selectedPlayer === player ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={`https://minotar.net/helm/${player}/20.png`} alt={player} style={{ borderRadius: '4px', width: '20px', height: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} onError={(e) => e.target.style.display='none'} />
                  {player}
                </div>
              ))
            )}
          </div>

          {/* ВСПЛЫВАЮЩЕЕ МЕНЮ ИГРОКА */}
          <AnimatePresence>
            {selectedPlayer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 10 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()} // Чтобы клики внутри меню не закрывали его
                style={{
                  position: 'fixed',
                  top: menuPosition.y,
                  left: menuPosition.x,
                  background: 'rgba(20, 20, 25, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 999,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '120px'
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '10px', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px', textAlign: 'center' }}>
                  {selectedPlayer}
                </div>
                
                <button onClick={() => handlePlayerAction('kick', selectedPlayer)} style={contextBtnStyle} onMouseOver={e => e.currentTarget.style.color = '#f59e0b'} onMouseOut={e => e.currentTarget.style.color = '#e4e4e7'}>
                  <i className="fa-solid fa-user-minus" style={{ width: '15px' }}></i> Кикнуть
                </button>
                <button onClick={() => handlePlayerAction('kill', selectedPlayer)} style={contextBtnStyle} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#e4e4e7'}>
                  <i className="fa-solid fa-skull" style={{ width: '15px' }}></i> Убить
                </button>
                <button onClick={() => handlePlayerAction('op', selectedPlayer)} style={contextBtnStyle} onMouseOver={e => e.currentTarget.style.color = '#10b981'} onMouseOut={e => e.currentTarget.style.color = '#e4e4e7'}>
                  <i className="fa-solid fa-crown" style={{ width: '15px' }}></i> Дать OP
                </button>
                <button onClick={() => handlePlayerAction('deop', selectedPlayer)} style={contextBtnStyle} onMouseOver={e => e.currentTarget.style.color = '#6366f1'} onMouseOut={e => e.currentTarget.style.color = '#e4e4e7'}>
                  <i className="fa-solid fa-user-shield" style={{ width: '15px' }}></i> Забрать OP
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '2px 0' }}></div>
                <button onClick={() => handlePlayerAction('ban', selectedPlayer)} style={{ ...contextBtnStyle, color: '#ef4444' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <i className="fa-solid fa-gavel" style={{ width: '15px' }}></i> Забанить
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
      
    </motion.div>
  );
}