import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as skinview3d from 'skinview3d';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
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

// Helper components for profile removed

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage({ currentPack }) {
  const [activeTab, setActiveTab] = useState('game');
  const [showConfirm, setShowConfirm] = useState(false);

  // Game
  const [ram,        setRam]       = useState(localStorage.getItem('launcher_ram')        || '4');
  const [maxRam, setMaxRam] = useState(16);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getSystemMemory) {
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
  }, [ram]);
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

  const importRef    = useRef(null);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('launcher_ram',         ram);
    localStorage.setItem('launcher_win_width',   winWidth);
    localStorage.setItem('launcher_win_height',  winHeight);
    localStorage.setItem('launcher_fullscreen',  String(fullscreen));
    localStorage.setItem('launcher_client_java', clientJava);
    localStorage.setItem('launcher_server_java', serverJava);
    localStorage.setItem('launcher_mode',        mode);
    localStorage.setItem('launcher_server_ip',   ip);
    
    window.dispatchEvent(new Event('settings-changed'));
  }, [ram, winWidth, winHeight, fullscreen, clientJava, serverJava, mode, ip]);

  // ── Export / Import ───────────────────────────────────────────────────────
  const handleExport = () => {
    const data = { ram, winWidth, winHeight, fullscreen, clientJava, serverJava, mode, ip };
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
  // renderProfile removed

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
          <input type="range" min="2" max={maxRam} step="1" value={ram}
            onChange={e => setRam(e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {['2','4','6','8','12','16','24','32','48','64'].filter(v => parseInt(v, 10) <= maxRam).map(v => (
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

  const tabContent = { game: renderGame, java: renderJava, network: renderNetwork, misc: renderMisc };

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