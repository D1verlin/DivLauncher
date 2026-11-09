import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

const R2_BASE = 'https://mc.diverlin.ru';
const RELEASE_NOTES_URL = `${R2_BASE}/DivLauncher/release-notes.md`;

function parseMarkdownChangelog(md) {
  if (!md) return [];
  const sections = [];
  let current = null;
  for (const line of md.split('\n')) {
    const versionMatch = line.match(/^#{1,2}\s+v?([\d.]+)/);
    if (versionMatch) {
      if (current) sections.push(current);
      current = { version: versionMatch[1], items: [] };
    } else if (current && line.match(/^[-*]\s+/)) {
      current.items.push(line.replace(/^[-*]\s+/, '').trim());
    }
  }
  if (current) sections.push(current);
  return sections;
}

function classifyChangelogItem(itemText) {
  const text = itemText.toLowerCase();
  
  // Clean prefix bullets and emojis
  let cleanText = itemText
    .replace(/^[\s✨🛠🐛\-*•›>\+]*\s*/, '')
    .trim();
  
  // Clean category prefix words if present (e.g. "Новое:", "Fix:")
  cleanText = cleanText
    .replace(/^(?:новое|new|добавлено|added|улучшение|улучшения|improvement|improvements|изменено|changed|исправление|исправления|fixed|fix|fixes)\s*:\s*/i, '')
    .trim();
  
  if (text.includes('новое') || text.includes('new') || text.includes('добавлено') || text.includes('added') || text.includes('✨')) {
    return { type: 'new', text: cleanText };
  }
  if (text.includes('исправлено') || text.includes('fixed') || text.includes('fix') || text.includes('исправление') || text.includes('🐛')) {
    return { type: 'fix', text: cleanText };
  }
  return { type: 'improvement', text: cleanText };
}

export default function UpdatePage({ onBack }) {
  const { lang } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState('...');
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | available | downloading | downloaded | error | latest
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [latestVersion, setLatestVersion] = useState('');
  const [changelog, setChangelog] = useState([]);
  const [changelogLoading, setChangelogLoading] = useState(true);

  const isRu = lang === 'ru';

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => setCurrentVersion(v));
    }

    const FALLBACK_CHANGELOG = [
      {
        version: '1.2.5',
        items: isRu ? [
          '✨ Новое: Экран обновления приложения с логом изменений и поддержкой авто-установки',
          '✨ Новое: Интегрированный мессенджер и личные/групповые чаты в реальном времени',
          '🛠 Улучшения: Наглядный 4-этапный Stepper скачивания ресурсов и запуска Minecraft',
          '🐛 Исправления: Выдвижная панель детального стектрейса при возникновении ошибок',
          '🛠 Улучшения: Система пингов статуса (Heartbeat) и авто-переход в Offline при закрытии',
          '🛠 Улучшения: Кастомизация бокового меню и выбор акцентного цвета в настройках интерфейса'
        ] : [
          '✨ New: Launcher update page with changelog and auto-install support',
          '✨ New: Integrated messenger with direct & group chats (real-time SSE)',
          '🛠 Improvements: Visual 4-step Stepper for downloading assets and launching Minecraft',
          '🐛 Fixes: Slide-in error stacktrace panel with copy button',
          '🛠 Improvements: Online Heartbeat ping system and automatic Offline trigger on quit',
          '🛠 Improvements: Sidebar customization and accent color picker in interface settings'
        ]
      }
    ];

    // Загружаем changelog
    fetch(`${RELEASE_NOTES_URL}?t=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(md => {
        const parsed = parseMarkdownChangelog(md);
        setChangelog(parsed.length > 0 ? parsed : FALLBACK_CHANGELOG);
      })
      .catch(() => {
        setChangelog(FALLBACK_CHANGELOG);
      })
      .finally(() => setChangelogLoading(false));

    // Слушаем события обновления
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((event, v) => {
        setLatestVersion(v || '');
        setUpdateStatus('available');
      });
      window.electronAPI.onUpdateNotAvailable?.(() => {
        setUpdateStatus('latest');
      });
      window.electronAPI.onUpdateProgress((event, pct) => {
        setDownloadPercent(pct);
        setUpdateStatus('downloading');
      });
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus('downloaded');
      });
    }
    return () => {
      window.electronAPI?.removeAllListeners?.('update-available');
      window.electronAPI?.removeAllListeners?.('update-not-available');
      window.electronAPI?.removeAllListeners?.('update-progress');
      window.electronAPI?.removeAllListeners?.('update-downloaded');
    };
  }, [isRu]);

  const handleCheckUpdates = () => {
    setUpdateStatus('checking');
    window.electronAPI?.checkForUpdates();
    setTimeout(() => {
      setUpdateStatus(prev => prev === 'checking' ? 'idle' : prev);
    }, 10000);
  };

  const handleDownloadUpdate = () => {
    setUpdateStatus('downloading');
    setDownloadPercent(0);
    window.electronAPI?.downloadUpdate?.();
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'checking':
        return isRu ? 'Проверка...' : 'Checking...';
      case 'available':
        return isRu ? `Найдена v${latestVersion}` : `v${latestVersion} found`;
      case 'downloading':
        return isRu ? 'Загрузка...' : 'Downloading...';
      case 'downloaded':
        return isRu ? 'Готово к установке' : 'Ready to install';
      case 'error':
        return isRu ? 'Ошибка проверки' : 'Check error';
      case 'latest':
        return isRu ? 'Обновлений нет' : 'Up to date';
      case 'idle':
      default:
        return isRu ? 'Обновлений нет' : 'Up to date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checking':
      case 'downloading':
        return '#3b82f6'; // Blue
      case 'available':
        return '#a855f7'; // Purple
      case 'downloaded':
        return '#10b981'; // Green
      case 'error':
        return '#ef4444'; // Red
      case 'latest':
      case 'idle':
      default:
        return '#71717a'; // Gray
    }
  };

  const renderVersionSection = (section, idx) => {
    const categorized = {
      new: [],
      improvement: [],
      fix: []
    };
    
    section.items.forEach(item => {
      const { type, text } = classifyChangelogItem(item);
      categorized[type].push(text);
    });
    
    const isCurrent = section.version === currentVersion;

    return (
      <motion.div key={section.version} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: isCurrent ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.07)',
            color: isCurrent ? '#fff' : '#71717a',
            borderRadius: '8px', padding: '4px 10px',
            fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat', letterSpacing: '0.5px'
          }}>
            v{section.version}
          </span>
          {isCurrent && (
            <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
              {isRu ? '● Текущая' : '● Current'}
            </span>
          )}
        </div>

        {/* Categories list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '8px' }}>
          {/* ✨ New */}
          {categorized.new.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-circle-plus" style={{ fontSize: '12px' }} />
                {isRu ? 'Новое' : 'New'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categorized.new.map((text, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, lineHeight: '1.5' }}>
                    <span style={{ color: '#34d399', opacity: 0.5, flexShrink: 0 }}>•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 🛠 Improvements */}
          {categorized.improvement.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-screwdriver-wrench" style={{ fontSize: '12px' }} />
                {isRu ? 'Улучшения' : 'Improvements'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categorized.improvement.map((text, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, lineHeight: '1.5' }}>
                    <span style={{ color: '#60a5fa', opacity: 0.5, flexShrink: 0 }}>•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 🐛 Fixes */}
          {categorized.fix.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-bug-slash" style={{ fontSize: '12px' }} />
                {isRu ? 'Исправления' : 'Fixes'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categorized.fix.map((text, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, lineHeight: '1.5' }}>
                    <span style={{ color: '#f87171', opacity: 0.5, flexShrink: 0 }}>•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {idx < changelog.length - 1 && (
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '20px' }} />
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px 30px', boxSizing: 'border-box' }}>
      
      {/* Centered layout container */}
      <div style={{ maxWidth: '850px', width: '100%', height: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <motion.button whileTap={{ opacity: 0.85 }} onClick={onBack}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: '12px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'Montserrat', fontSize: '12px', fontWeight: 700 }}>
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }} />
              {isRu ? 'Назад' : 'Back'}
            </motion.button>
          )}
          <div>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '20px', margin: 0, fontFamily: 'Montserrat' }}>
              {isRu ? 'Обновление лаунчера' : 'Launcher Updates'}
            </h2>
            <p style={{ color: '#52525b', fontSize: '12px', margin: '4px 0 0 0', fontWeight: 600 }}>
              {isRu ? 'Управление версиями DivLauncher' : 'DivLauncher version management'}
            </p>
          </div>
        </div>

        {/* Version card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(10,10,16,0.7)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px',
            boxSizing: 'border-box'
          }}>
          
          {/* Left Column: Current version details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <p style={{ color: '#52525b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' }}>
                {isRu ? 'Установленная версия' : 'Installed version'}
              </p>
              <p style={{ color: '#fff', fontSize: '24px', fontWeight: 900, margin: 0, fontFamily: 'Montserrat' }}>
                v{currentVersion}
              </p>
            </div>
          </div>

          {/* Right Column: Compact status and button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* Status indicators */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ color: '#52525b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isRu ? 'Проверка' : 'Check'}
              </span>
              <span style={{ color: getStatusColor(updateStatus), fontSize: '13px', fontWeight: 800, fontFamily: 'Montserrat' }}>
                {getStatusLabel(updateStatus)}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ minWidth: '180px', display: 'flex', justifyContent: 'flex-end' }}>
              {/* Check for updates */}
              {(updateStatus === 'idle' || updateStatus === 'latest' || updateStatus === 'error') && (
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.12)' }} whileTap={{ opacity: 0.85 }}
                  onClick={handleCheckUpdates}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff', borderRadius: '14px', padding: '12px 20px',
                    fontWeight: 800, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                  <i className="fa-solid fa-arrows-rotate" />
                  {isRu ? 'Проверить' : 'Check'}
                </motion.button>
              )}

              {/* Checking... */}
              {updateStatus === 'checking' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: 700, fontSize: '13px', height: '42px', paddingRight: '10px' }}>
                  <motion.i className="fa-solid fa-arrows-rotate" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                  {isRu ? 'Поиск...' : 'Searching...'}
                </div>
              )}

              {/* Download update */}
              {updateStatus === 'available' && (
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.15)' }} whileTap={{ opacity: 0.85 }}
                  onClick={handleDownloadUpdate}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: '14px', padding: '12px 20px',
                    fontWeight: 800, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                  <i className="fa-solid fa-download" />
                  {isRu ? `Скачать v${latestVersion}` : `Download v${latestVersion}`}
                </motion.button>
              )}

              {/* Downloading... */}
              {updateStatus === 'downloading' && (
                <div style={{ width: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#e4e4e7', fontSize: '11px', fontWeight: 700 }}>
                      {latestVersion ? `v${latestVersion}` : (isRu ? 'Загрузка...' : 'Downloading...')}
                    </span>
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800 }}>{downloadPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${downloadPercent}%` }} transition={{ ease: 'linear', duration: 0.3 }}
                      style={{ height: '100%', background: '#ffffff', borderRadius: '10px' }} />
                  </div>
                </div>
              )}

              {/* Restart & install */}
              {updateStatus === 'downloaded' && (
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.15)' }} whileTap={{ opacity: 0.85 }}
                  onClick={() => window.electronAPI?.restartAndInstall()}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: '14px', padding: '12px 20px',
                    fontWeight: 800, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                  <i className="fa-solid fa-arrows-rotate" />
                  {isRu ? 'Обновить' : 'Restart'}
                </motion.button>
              )}
            </div>

          </div>

        </motion.div>

        {/* Changelog panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(10,10,16,0.7)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', 
            padding: '24px 10px 24px 24px',
            flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
          }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingRight: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className="fa-solid fa-list-check" style={{ color: '#ffffff', opacity: 0.9, fontSize: '14px' }} />
            </div>
            <span style={{ color: '#ffffff', opacity: 0.9, fontWeight: 800, fontSize: '14px', fontFamily: 'Montserrat' }}>
              {isRu ? 'История изменений' : 'Changelog'}
            </span>
          </div>

          {/* Scrollable list content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '14px' }}>
            {changelogLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#52525b', padding: '20px 0' }}>
                <motion.i className="fa-solid fa-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: '18px' }} />
                <span style={{ fontWeight: 600 }}>{isRu ? 'Загружаем changelog...' : 'Loading changelog...'}</span>
              </div>
            ) : changelog.length === 0 ? (
              <p style={{ color: '#52525b', fontWeight: 600, fontSize: '13px' }}>
                {isRu ? 'Список изменений недоступен.' : 'Changelog not available.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {changelog.map((section, idx) => renderVersionSection(section, idx))}
              </div>
            )}
          </div>

        </motion.div>

      </div>

    </div>
  );
}
