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
  color: '#e4e4e7',
  padding: '10px 14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)',
  transition: 'border 0.3s'
};

const TabButton = ({ active, icon, label, onClick }) => (
  <motion.button
    whileHover={{ background: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)' }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
      color: active ? '#60a5fa' : '#a1a1aa',
      border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
      padding: '8px 16px',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      fontWeight: 600,
      transition: 'all 0.2s'
    }}
  >
    <i className={`fa-solid ${icon}`}></i> {label}
  </motion.button>
);

export default function ServerPage({ logs, isRunning, players, currentPack, onPackUpdate }) {
  const [activeTab, setActiveTab] = useState('console'); // console | players | settings
  const [command, setCommand] = useState('');
  const [propsData, setPropsData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const consoleEndRef = useRef(null);

  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const getLogColor = (log) => {
    if (log.includes('[ERROR]') || log.includes('[FATAL]') || log.toLowerCase().includes('error') || log.includes('Exception')) {
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

  const renderColorizedLogs = (logsText) => {
    if (!logsText) return <span style={{ color: '#52525b' }}>Ожидание запуска ядра...</span>;
    const lines = logsText.split('\n');
    return lines.map((line, idx) => {
      if (!line && idx === lines.length - 1) return null;
      return (
        <div key={idx} style={{ color: getLogColor(line), minHeight: '1.2em' }}>
          {line}
        </div>
      );
    });
  };

  const handleExportServerLogs = () => {
    if (!logs) return;
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `server_log_${currentPack?.id || 'logs'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadBackups = async () => {
    if (!currentPack) return;
    setBackupsLoading(true);
    try {
      const list = await window.electronAPI.listBackups(currentPack);
      setBackups(list || []);
    } catch (e) {
      console.error('Ошибка загрузки бэкапов:', e);
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleCreateBackup = () => {
    if (!currentPack) return;
    window.electronAPI.backupWorld(currentPack);
    setTimeout(loadBackups, 2000);
  };

  const handleDeleteBackup = async (fileName) => {
    if (!currentPack) return;
    if (confirm(`Вы уверены, что хотите удалить бэкап ${fileName}?`)) {
      const res = await window.electronAPI.deleteBackup(currentPack, fileName);
      if (res.success) {
        loadBackups();
      } else {
        alert('Ошибка удаления: ' + res.error);
      }
    }
  };

  const handleRestoreBackup = async (fileName) => {
    if (!currentPack) return;
    if (isRunning) {
      alert('Невозможно восстановить бэкап при запущеном сервере! Сначала остановите сервер.');
      return;
    }
    if (confirm(`Вы действительно хотите ВОССТАНОВИТЬ мир из ${fileName}? Текущий мир будет полностью удален.`)) {
      setIsRestoring(true);
      const res = await window.electronAPI.restoreBackup(currentPack, fileName);
      setIsRestoring(false);
      if (res.success) {
        alert('Резервная копия успешно восстановлена!');
        loadBackups();
      } else {
        alert('Ошибка восстановления: ' + res.error);
      }
    }
  };

  const getDefaultLoader = (pack) => {
    if (!pack) return 'vanilla';
    if (pack.serverLoaderType) return pack.serverLoaderType;
    const loader = pack.loaderType || 'vanilla';
    if (loader === 'vanilla') return 'paper';
    if (loader === 'forge') {
      const arclightVersions = ['1.16.5', '1.18.2', '1.19.2', '1.20.1'];
      if (arclightVersions.includes(pack.mcVersion)) return 'hybrid';
    }
    return loader;
  };

  const [serverLoader, setServerLoader] = useState(() => getDefaultLoader(currentPack));

  useEffect(() => {
    if (currentPack) {
      setServerLoader(getDefaultLoader(currentPack));
      loadProps(); // Load props when pack changes
    }
  }, [currentPack]);

  useEffect(() => {
    if (activeTab === 'backups') {
      loadBackups();
    }
  }, [activeTab, currentPack]);

  useEffect(() => { 
    if (activeTab === 'console') {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }
  }, [logs, activeTab]);

  const loadProps = async () => {
    const p = await window.electronAPI.getServerProps(currentPack);
    setPropsData(p || {});
    setHasUnsavedChanges(false);
  };

  const toggleServer = () => {
    if (isRunning) window.electronAPI.sendServerCommand('stop');
    else window.electronAPI.launchServer({ ...currentPack, javaPath: localStorage.getItem('launcher_server_java') || '' });
  };

  const handleSyncMods = async () => {
    if (window.electronAPI && window.electronAPI.syncLocalMods) {
      const result = await window.electronAPI.syncLocalMods(currentPack);
      if (result.success) {
        alert(`Успешно подтянуто модов: ${result.copiedCount} (клиентских пропущено: ${result.skippedCount})`);
      } else {
        alert(`Ошибка синхронизации: ${result.error}`);
      }
    }
  };

  const sendCommand = (e) => { 
    e.preventDefault(); 
    if(command) { window.electronAPI.sendServerCommand(command); setCommand(''); } 
  };

  const handlePropChange = (key, value) => {
    setPropsData(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const saveProps = async () => {
    window.electronAPI.saveServerProps(currentPack, propsData);
    
    if (currentPack.isCustom && window.electronAPI.saveCustomPack) {
      const updatedPack = {
        ...currentPack,
        serverLoaderType: serverLoader
      };
      await window.electronAPI.saveCustomPack(updatedPack);
      if (onPackUpdate) {
        onPackUpdate(updatedPack);
      }
    }

    setHasUnsavedChanges(false);
    if (isRunning) window.electronAPI.sendServerCommand('say Настройки изменены (требуется рестарт)');
  };

  const getServerCoreOptions = () => {
    if (!currentPack) return [];
    const loader = currentPack.loaderType || 'vanilla';
    if (loader === 'vanilla') return [
      { value: 'vanilla', label: 'Vanilla' },
      { value: 'paper', label: 'Paper' },
      { value: 'spigot', label: 'Spigot' }
    ];
    if (loader === 'forge') {
      const options = [{ value: 'forge', label: 'Forge' }];
      if (['1.16.5', '1.18.2', '1.19.2', '1.20.1'].includes(currentPack.mcVersion)) {
        options.push({ value: 'hybrid', label: 'Hybrid (Arclight)' });
      }
      return options;
    }
    if (loader === 'fabric') return [{ value: 'fabric', label: 'Fabric' }];
    if (loader === 'quilt') return [{ value: 'quilt', label: 'Quilt' }];
    if (loader === 'neoforge') return [{ value: 'neoforge', label: 'NeoForge' }];
    return [{ value: loader, label: loader }];
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
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '15px', paddingBottom: '15px' }}
    >
      {/* HEADER TABS */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '16px' }}>
        <h2 style={{ margin: '0 20px 0 10px', fontSize: '18px', fontWeight: 700, color: '#fff' }}>Сервер</h2>
        <TabButton active={activeTab === 'console'} icon="fa-terminal" label="Консоль" onClick={() => setActiveTab('console')} />
        <TabButton active={activeTab === 'players'} icon="fa-users" label={`Игроки (${players.length})`} onClick={() => setActiveTab('players')} />
        <TabButton active={activeTab === 'backups'} icon="fa-file-zipper" label="Бэкапы" onClick={() => setActiveTab('backups')} />
        <TabButton active={activeTab === 'settings'} icon="fa-sliders" label="Настройки" onClick={() => setActiveTab('settings')} />
      </div>

      {/* CONTENT AREA */}
      <div style={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* --- CONSOLE TAB --- */}
        {activeTab === 'console' && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ display: 'flex', gap: '15px', height: '100%' }}>
            
            {/* Sidebar */}
            <div style={{ width: '220px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ ...glassPanelStyle, padding: '15px' }}>
                <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, marginBottom: '6px' }}>Статус</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: isRunning ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${isRunning ? '#10b981' : '#ef4444'}` }}></span>
                  {isRunning ? 'Работает' : 'Отключен'}
                </div>
              </div>

              <motion.button 
                whileHover={{ boxShadow: isRunning ? '0 8px 25px rgba(239, 68, 68, 0.4)' : '0 8px 25px rgba(16, 185, 129, 0.4)' }} 
                onClick={toggleServer} 
                style={{ 
                  background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', 
                  color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                }}
              >
                {isRunning ? <><i className="fa-solid fa-power-off"></i> Выключить</> : <><i className="fa-solid fa-play"></i> Запустить</>}
              </motion.button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <motion.button whileHover={isRunning ? { background: 'rgba(59, 130, 246, 0.2)' } : {}} onClick={() => window.electronAPI.sendServerCommand('forge tps')} disabled={!isRunning} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px', cursor: isRunning ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600, color: isRunning ? '#60a5fa' : '#52525b', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}>
                  <i className="fa-solid fa-gauge-high"></i> TPS
                </motion.button>
                <motion.button whileHover={isRunning ? { background: 'rgba(16, 185, 129, 0.2)' } : {}} onClick={() => window.electronAPI.sendServerCommand('save-all')} disabled={!isRunning} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px', cursor: isRunning ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600, color: isRunning ? '#34d399' : '#52525b', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}>
                  <i className="fa-solid fa-floppy-disk"></i> Сохранить
                </motion.button>
              </div>

              <div style={{ flexGrow: 1 }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => window.electronAPI.backupWorld(currentPack)} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#f59e0b', transition: 'background 0.2s' }}>
                    <i className="fa-solid fa-box-archive"></i> Бэкап мира
                  </motion.button>
                  <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => window.electronAPI.openServerFolder(currentPack)} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#e4e4e7', transition: 'background 0.2s' }}>
                    <i className="fa-regular fa-folder-open"></i> Папка сервера
                  </motion.button>

                  {logs && logs.trim() !== '' && (
                    <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} onClick={handleExportServerLogs} style={{ ...glassPanelStyle, borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#e4e4e7', transition: 'background 0.2s' }}>
                      <i className="fa-solid fa-file-arrow-down"></i> Экспорт логов
                    </motion.button>
                  )}

                  {currentPack.isCustom && (
                    <motion.button 
                      whileHover={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' }} 
                      onClick={handleSyncMods} 
                      style={{ 
                        ...glassPanelStyle, 
                        borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)', transition: 'all 0.2s' 
                      }}
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Подтянуть моды
                    </motion.button>
                  )}
              </div>
            </div>

            {/* Console View */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: 'rgba(10, 10, 12, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ flexGrow: 1, padding: '15px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#d4d4d8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'text', WebkitUserSelect: 'text' }}>
                {renderColorizedLogs(logs)}
                <div ref={consoleEndRef} />
              </div>
              
              <div style={{ padding: '12px' }}>
                <form onSubmit={sendCommand} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px', transition: 'border 0.2s' }}>
                  <span style={{ color: '#10b981', fontFamily: 'Consolas, monospace', fontWeight: 600 }}>{'>'}</span>
                  <input 
                    type="text" value={command} onChange={e => setCommand(e.target.value)} disabled={!isRunning} 
                    placeholder={isRunning ? "Введите команду..." : "Сервер выключен"} 
                    style={{ background: 'transparent', border: 'none', color: '#e4e4e7', flexGrow: 1, outline: 'none', fontFamily: 'Consolas, monospace', fontSize: '13px' }} 
                  />
                  <motion.button 
                    whileHover={isRunning ? { scale: 1.05, color: '#34d399' } : {}} type="submit" disabled={!isRunning} 
                    style={{ background: 'transparent', color: isRunning ? '#10b981' : '#52525b', border: 'none', cursor: isRunning ? 'pointer' : 'default', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'color 0.2s', padding: '4px' }}
                  >
                    <i className="fa-solid fa-paper-plane" style={{ fontSize: '14px' }}></i>
                  </motion.button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- PLAYERS TAB --- */}
        {activeTab === 'players' && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' }}>
            <div style={{ ...glassPanelStyle, padding: '20px', flexGrow: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#e4e4e7', fontSize: '15px', fontWeight: 600 }}>
                  Онлайн <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '8px', marginLeft: '8px' }}>{players.length}</span>
                </h3>
                {isRunning && (
                  <form onSubmit={(e) => { e.preventDefault(); const v = e.target.elements.cmd.value; if(v) window.electronAPI.sendServerCommand(`whitelist add ${v}`); e.target.reset(); }} style={{ display: 'flex', gap: '8px' }}>
                    <input name="cmd" type="text" placeholder="Ник игрока..." style={{ ...glassInputStyle, width: '200px' }} />
                    <button type="submit" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '0 15px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Добавить в Whitelist</button>
                  </form>
                )}
              </div>

              {players.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b', gap: '15px' }}>
                  <i className="fa-solid fa-user-slash" style={{ fontSize: '32px' }}></i>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Сервер пуст</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', alignContent: 'start' }}>
                  {players.map(player => (
                    <motion.div 
                      key={player}
                      whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                      style={{ 
                        background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', position: 'relative'
                      }}
                    >
                      <img src={`https://minotar.net/helm/${player}/32.png`} alt={player} style={{ borderRadius: '6px', width: '32px', height: '32px' }} onError={(e) => e.target.style.display='none'} />
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ color: '#e4e4e7', fontWeight: 600, fontSize: '14px' }}>{player}</div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.button whileHover={{ scale: 1.1, color: '#10b981' }} onClick={() => handlePlayerAction('op', player)} title="Дать OP" style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}>
                          <i className="fa-solid fa-crown" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, color: '#6366f1' }} onClick={() => handlePlayerAction('deop', player)} title="Забрать OP" style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}>
                          <i className="fa-solid fa-user-shield" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, color: '#f59e0b' }} onClick={() => handlePlayerAction('kick', player)} title="Кикнуть" style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}>
                          <i className="fa-solid fa-user-minus" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, color: '#ef4444' }} onClick={() => handlePlayerAction('ban', player)} title="Забанить" style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}>
                          <i className="fa-solid fa-gavel" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ ...glassPanelStyle, height: '100%', position: 'relative' }}>
            <div style={{ padding: '20px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* General Settings */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <h4 style={{ color: '#e4e4e7', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}><i className="fa-solid fa-globe" style={{color:'#3b82f6'}}></i> Основные</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Описание (MOTD)</label>
                      <input type="text" value={propsData['motd'] || ''} onChange={e => handlePropChange('motd', e.target.value)} style={glassInputStyle} />
                    </div>
                    {currentPack.isCustom && (
                      <div>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Ядро сервера</label>
                        <select 
                          value={serverLoader} 
                          onChange={e => { setServerLoader(e.target.value); setHasUnsavedChanges(true); }} 
                          disabled={getServerCoreOptions().length <= 1}
                          style={{...glassInputStyle, cursor: getServerCoreOptions().length <= 1 ? 'not-allowed' : 'pointer', opacity: getServerCoreOptions().length <= 1 ? 0.6 : 1}}
                        >
                          {getServerCoreOptions().map(opt => (
                            <option key={opt.value} value={opt.value} style={{background: '#111'}}>{opt.label}</option>
                          ))}
                        </select>
                        {getServerCoreOptions().length <= 1 && (
                          <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                            Для данного клиента доступно только одно совместимое ядро.
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flexGrow: 1 }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Слоты</label>
                        <input type="number" value={propsData['max-players'] || '20'} onChange={e => handlePropChange('max-players', e.target.value)} style={glassInputStyle} />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Порт сервера</label>
                        <input type="number" value={propsData['server-port'] || '25565'} onChange={e => handlePropChange('server-port', e.target.value)} style={glassInputStyle} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gameplay Settings */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <h4 style={{ color: '#e4e4e7', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}><i className="fa-solid fa-gamepad" style={{color:'#f59e0b'}}></i> Игровой процесс</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Сложность</label>
                      <select value={propsData['difficulty'] || 'normal'} onChange={e => handlePropChange('difficulty', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="peaceful" style={{background: '#111'}}>Мирная</option>
                        <option value="easy" style={{background: '#111'}}>Лёгкая</option>
                        <option value="normal" style={{background: '#111'}}>Нормальная</option>
                        <option value="hard" style={{background: '#111'}}>Сложная</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Режим игры</label>
                      <select value={propsData['gamemode'] || 'survival'} onChange={e => handlePropChange('gamemode', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="survival" style={{background: '#111'}}>Выживание</option>
                        <option value="creative" style={{background: '#111'}}>Творчество</option>
                        <option value="adventure" style={{background: '#111'}}>Приключение</option>
                        <option value="spectator" style={{background: '#111'}}>Наблюдатель</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>PVP</label>
                      <select value={propsData['pvp'] || 'true'} onChange={e => handlePropChange('pvp', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="true" style={{background: '#111'}}>Вкл</option>
                        <option value="false" style={{background: '#111'}}>Выкл</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Hardcore</label>
                      <select value={propsData['hardcore'] || 'false'} onChange={e => handlePropChange('hardcore', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="false" style={{background: '#111'}}>Выкл</option>
                        <option value="true" style={{background: '#111'}}>Вкл</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* World & Security */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <h4 style={{ color: '#e4e4e7', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}><i className="fa-solid fa-shield-halved" style={{color:'#10b981'}}></i> Безопасность</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Лицензия</label>
                      <select value={propsData['online-mode'] || 'true'} onChange={e => handlePropChange('online-mode', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="false" style={{background: '#111'}}>Пиратки (false)</option>
                        <option value="true" style={{background: '#111'}}>Лицензия (true)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Вайтлист</label>
                      <select value={propsData['white-list'] || 'false'} onChange={e => handlePropChange('white-list', e.target.value)} style={{...glassInputStyle, cursor: 'pointer'}}>
                        <option value="false" style={{background: '#111'}}>Выкл</option>
                        <option value="true" style={{background: '#111'}}>Вкл</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Радиус защиты спавна (в блоках)</label>
                      <input type="number" value={propsData['spawn-protection'] || '16'} onChange={e => handlePropChange('spawn-protection', e.target.value)} style={glassInputStyle} />
                    </div>
                  </div>
                </div>

                {/* Optimization */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <h4 style={{ color: '#e4e4e7', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}><i className="fa-solid fa-rocket" style={{color:'#ec4899'}}></i> Оптимизация мира</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500 }}>Дальность чанков</label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>{propsData['view-distance'] || '10'}</span>
                      </div>
                      <input type="range" min="4" max="32" step="1" value={propsData['view-distance'] || '10'} onChange={e => handlePropChange('view-distance', e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500 }}>Дистанция симуляции</label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ec4899' }}>{propsData['simulation-distance'] || '10'}</span>
                      </div>
                      <input type="range" min="4" max="32" step="1" value={propsData['simulation-distance'] || '10'} onChange={e => handlePropChange('simulation-distance', e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Floating Save Bar */}
            <AnimatePresence>
              {hasUnsavedChanges && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    zIndex: 50
                  }}
                >
                  <span style={{ color: '#e4e4e7', fontWeight: 500, fontSize: '13px' }}>У вас есть несохранённые изменения</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button 
                      whileHover={{ background: 'rgba(255,255,255,0.05)' }} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => loadProps()} 
                      style={{ background: 'transparent', border: '1px solid transparent', color: '#a1a1aa', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}
                    >
                      Отмена
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }} 
                      whileTap={{ scale: 0.95 }}
                      onClick={saveProps} 
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      Сохранить
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- BACKUPS TAB --- */}
        {activeTab === 'backups' && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" style={{ ...glassPanelStyle, height: '100%' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 800 }}>Резервные копии мира</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#71717a', fontSize: '12px', fontWeight: 600 }}>
                    Архивы папки world. Восстановление перезапишет текущий мир.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateBackup}
                  disabled={backupsLoading || isRestoring}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '12px',
                    fontWeight: 700, fontSize: '13px', cursor: (backupsLoading || isRestoring) ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-file-zipper"></i> Создать бэкап
                </motion.button>
              </div>

              {isRestoring && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '12px', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Восстановление мира в процессе... Пожалуйста, подождите.</span>
                </div>
              )}

              {backupsLoading ? (
                <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', marginRight: '10px' }}></i> Загрузка списка резервных копий...
                </div>
              ) : backups.length === 0 ? (
                <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#52525b', gap: '15px' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '36px' }}></i>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Бэкапы не найдены</div>
                </div>
              ) : (
                <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
                  {backups.map(backup => (
                    <motion.div
                      key={backup.name}
                      whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                      style={{
                        background: 'rgba(0,0,0,0.15)', padding: '12px 18px', borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '15px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                          <i className="fa-regular fa-file-zip"></i>
                        </div>
                        <div>
                          <div style={{ color: '#e4e4e7', fontWeight: 700, fontSize: '13px', wordBreak: 'break-all' }}>{backup.name}</div>
                          <div style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                            Размер: {(backup.size / (1024 * 1024)).toFixed(2)} МБ • Создан: {new Date(backup.time).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.button
                          whileHover={{ scale: 1.05, background: 'rgba(16, 185, 129, 0.15)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRestoreBackup(backup.name)}
                          disabled={isRestoring || isRunning}
                          style={{
                            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#34d399', padding: '8px 14px', borderRadius: '10px', cursor: (isRestoring || isRunning) ? 'not-allowed' : 'pointer',
                            fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
                            opacity: isRunning ? 0.5 : 1
                          }}
                          title={isRunning ? "Остановите сервер для восстановления" : "Восстановить мир из этого бэкапа"}
                        >
                          <i className="fa-solid fa-clock-rotate-left"></i> Восстановить
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.15)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteBackup(backup.name)}
                          disabled={isRestoring}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171', padding: '8px 14px', borderRadius: '10px', cursor: isRestoring ? 'not-allowed' : 'pointer',
                            fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                          title="Удалить этот бэкап"
                        >
                          <i className="fa-solid fa-trash-can"></i> Удалить
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}