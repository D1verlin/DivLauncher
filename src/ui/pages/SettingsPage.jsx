import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Усиленный стиль для "стекла"
const glassControlStyle = {
  background: 'rgba(15, 15, 20, 0.45)', // Чуть больше плотности для читаемости
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '30px',
  color: '#fff',
  padding: '16px 24px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '15px',
  fontWeight: 600,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.05)',
  transition: 'all 0.3s ease'
};

// Исправленный компонент выпадающего списка
function CustomDropdown({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    // Динамический z-index решает проблему перекрытия слоев
    <div style={{ position: 'relative', width: '100%', zIndex: isOpen ? 50 : 1 }}>
      
      <motion.div
        whileHover={{ scale: 1.02, borderColor: 'rgba(16, 185, 129, 0.6)', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2), inset 0 2px 5px rgba(255,255,255,0.05)', background: 'rgba(0, 0, 0, 0.55)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{ ...glassControlStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{selectedOption?.label}</span>
        <motion.i 
          animate={{ rotate: isOpen ? 180 : 0 }} 
          transition={{ duration: 0.3 }}
          className="fa-solid fa-chevron-down" 
          style={{ fontSize: '14px', color: '#10b981' }} 
        />
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
              style={{
                position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0,
                background: 'rgba(20, 20, 25, 0.75)', 
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                border: '1px solid rgba(255,255,255,0.15)', 
                borderRadius: '24px',
                padding: '10px', 
                zIndex: 100,
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
              }}
            >
              {options.map((opt) => (
                <motion.div
                  key={opt.value}
                  whileHover={{ background: 'rgba(16, 185, 129, 0.2)', x: 5 }}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  style={{
                    padding: '14px 18px', borderRadius: '16px', cursor: 'pointer',
                    color: opt.value === value ? '#10b981' : '#e4e4e7',
                    fontWeight: opt.value === value ? 800 : 600,
                    transition: 'background 0.2s, color 0.2s, transform 0.2s',
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                >
                  {opt.value === value && <i className="fa-solid fa-check" style={{ fontSize: '12px' }}></i>}
                  {opt.label}
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const [authMode, setAuthMode] = useState(localStorage.getItem('launcher_auth_mode') || 'offline');
  const [username, setUsername] = useState(localStorage.getItem('launcher_username') || '');
  const [mode, setMode] = useState(localStorage.getItem('launcher_mode') || 'host');
  const [ip, setIp] = useState(localStorage.getItem('launcher_server_ip') || '');
  const [ram, setRam] = useState(localStorage.getItem('launcher_ram') || '4');
  
  const [serverJava, setServerJava] = useState(localStorage.getItem('launcher_server_java') || '');
  const [clientJava, setClientJava] = useState(localStorage.getItem('launcher_client_java') || '');

  useEffect(() => {
    localStorage.setItem('launcher_auth_mode', authMode);
    localStorage.setItem('launcher_username', username);
    localStorage.setItem('launcher_mode', mode);
    localStorage.setItem('launcher_server_ip', ip);
    localStorage.setItem('launcher_ram', ram);
    localStorage.setItem('launcher_server_java', serverJava);
    localStorage.setItem('launcher_client_java', clientJava);
  }, [authMode, username, mode, ip, ram, serverJava, clientJava]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  // УБРАН filter: blur() чтобы не ломать backdrop-filter у детей
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 20 } }
  };

  const labelStyle = {
    display: 'block', color: '#f4f4f5', fontSize: '13px', textTransform: 'uppercase', 
    fontWeight: 800, marginBottom: '10px', marginLeft: '15px', letterSpacing: '1.5px', textShadow: '0 2px 8px rgba(0,0,0,1)' 
  };

  const whileHoverFocus = {
    scale: 1.02, borderColor: 'rgba(16, 185, 129, 0.6)',
    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2), inset 0 2px 5px rgba(255,255,255,0.05)', background: 'rgba(0, 0, 0, 0.55)'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px', height: '100%', overflowY: 'auto', paddingBottom: '80px' }}>
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '35px', width: '100%', maxWidth: '750px' }}>
        
        <motion.h1 variants={itemVariants} style={{ fontSize: '42px', fontWeight: 900, margin: '0 0 10px 0', color: '#fff', textTransform: 'uppercase', letterSpacing: '3px', textShadow: '0 5px 15px rgba(0,0,0,0.8)', textAlign: 'center' }}>
          Параметры
        </motion.h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          
          <motion.div variants={itemVariants} style={{ position: 'relative', zIndex: 10 }}>
            <label style={labelStyle}><i className="fa-solid fa-shield-halved" style={{ marginRight: '8px', color: '#10b981' }}></i> Тип аккаунта</label>
            <CustomDropdown 
              value={authMode} 
              onChange={setAuthMode} 
              options={[
                { value: 'offline', label: 'Пиратский (Локальный)' },
                { value: 'microsoft', label: 'Лицензия (Xbox)' }
              ]} 
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label style={labelStyle}><i className="fa-solid fa-user" style={{ marginRight: '8px', color: '#f59e0b' }}></i> Никнейм</label>
            <motion.input 
              whileHover={whileHoverFocus} whileFocus={whileHoverFocus} type="text" 
              value={authMode === 'microsoft' ? 'Автоматически из Xbox' : username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Введите ник" disabled={authMode === 'microsoft'} spellCheck="false" 
              style={{ ...glassControlStyle, opacity: authMode === 'microsoft' ? 0.6 : 1 }}
            />
          </motion.div>

          <motion.div variants={itemVariants} style={{ position: 'relative', zIndex: 9 }}>
            <label style={labelStyle}><i className="fa-solid fa-network-wired" style={{ marginRight: '8px', color: '#3b82f6' }}></i> Подключение</label>
            <CustomDropdown 
              value={mode} 
              onChange={setMode} 
              options={[
                { value: 'host', label: 'Я создаю сервер (Хост)' },
                { value: 'connect', label: 'Я подключаюсь к другу' }
              ]} 
            />
          </motion.div>

          <AnimatePresence mode="popLayout">
            {mode === 'connect' ? (
              <motion.div key="ip-input" initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <label style={labelStyle}><i className="fa-solid fa-globe" style={{ marginRight: '8px', color: '#0ea5e9' }}></i> IP Адрес сервера</label>
                <motion.input 
                  whileHover={whileHoverFocus} whileFocus={whileHoverFocus} type="text" 
                  value={ip} onChange={(e) => setIp(e.target.value)} 
                  placeholder="Например: 26.15.112.5" style={glassControlStyle}
                />
              </motion.div>
            ) : <div key="ip-placeholder" />}
          </AnimatePresence>

        </div>

        <motion.div variants={itemVariants} style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}><i className="fa-solid fa-memory" style={{ marginRight: '8px', color: '#a855f7' }}></i> Выделение ОЗУ</label>
            <motion.div key={ram} initial={{ scale: 1.5, color: '#fff' }} animate={{ scale: 1, color: '#10b981' }} style={{ fontWeight: 900, fontSize: '20px', textShadow: '0 0 15px rgba(16, 185, 129, 0.6)', paddingRight: '15px' }}>
              {ram} ГБ
            </motion.div>
          </div>
          <motion.div whileHover={{ scale: 1.01 }} style={{ background: 'rgba(15, 15, 20, 0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '15px 25px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <input type="range" min="2" max="16" step="1" value={ram} onChange={(e) => setRam(e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
          </motion.div>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '10px' }}>
          <motion.div variants={itemVariants}>
            <label style={labelStyle}><i className="fa-brands fa-java" style={{ marginRight: '8px', color: '#ef4444' }}></i> Java 17 (Клиент)</label>
            <motion.input whileHover={whileHoverFocus} whileFocus={whileHoverFocus} type="text" value={clientJava} onChange={(e) => setClientJava(e.target.value)} placeholder="Оставьте пустым для авто-загрузки (Рекомендуется)" spellCheck="false" style={glassControlStyle} />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <label style={labelStyle}><i className="fa-solid fa-server" style={{ marginRight: '8px', color: '#f43f5e' }}></i> Java 17 (Сервер)</label>
            <motion.input whileHover={whileHoverFocus} whileFocus={whileHoverFocus} type="text" value={serverJava} onChange={(e) => setServerJava(e.target.value)} placeholder="Оставьте пустым для авто-загрузки (Рекомендуется)" spellCheck="false" style={glassControlStyle} />
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}