import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

// --- LOGO IMAGES ---
import divlauncherIcon from '../assets/brands/divlauncher.png';
import curseforgeIcon from '../assets/brands/curseforge.png';
import modrinthIcon from '../assets/brands/modrinth.png';
import prismIcon from '../assets/brands/prism.png';
import multimcIcon from '../assets/brands/multimc.png';

// --- GLASSMORPHIC & ACCENT STYLES ---
const glassPanelStyle = {
  background: 'rgba(10, 10, 16, 0.5)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  borderRadius: '24px',
  padding: '30px',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  color: '#fff'
};

const tabButtonStyle = (isActive) => ({
  padding: '10px 24px',
  borderRadius: '12px',
  background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
  border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
  color: isActive ? '#fff' : '#a1a1aa',
  fontSize: '14px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
});

const DEFAULT_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1280";

const getSafeBgUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('assets/')) {
    return path;
  }
  const cleanPath = path.replace(/\\/g, '/');
  return `local-file://${cleanPath}`;
};

export default function ImportExportPage({ onBack, modpacks, fetchModpacks }) {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [selectedPlatform, setSelectedPlatform] = useState(null); // null | 'divlauncher' | 'curseforge' | 'modrinth' | 'prism' | 'multimc'
  
  // Progress state
  const [importStatus, setImportStatus] = useState('idle'); // 'idle' | 'processing' | 'success' | 'error'
  const [progressData, setProgressData] = useState({ stage: '', message: '', progress: 0, current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  
  // Export state
  const [exportPackId, setExportPackId] = useState('');
  const [exportStatus, setExportStatus] = useState('idle'); // 'idle' | 'exporting' | 'success' | 'error'
  const [exportError, setExportError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const selectedPack = modpacks.find(p => p.id === exportPackId);
  const hasCustomBg = selectedPack && selectedPack.bgImage && selectedPack.bgImage !== DEFAULT_BG;
  const hasCustomVideo = selectedPack && selectedPack.bgVideo;

  useEffect(() => {
    if (window.electronAPI?.onImportProgress) {
      window.electronAPI.onImportProgress((data) => {
        setProgressData(data);
        if (data.stage === 'completed') {
          setImportStatus('success');
          if (fetchModpacks) fetchModpacks();
        }
      });
    }
  }, [fetchModpacks]);

  const handleStartImport = async (platform) => {
    if (!window.electronAPI?.importPackExtended) return;
    
    setImportStatus('processing');
    setProgressData({ stage: 'selecting', message: t('impexp_drop_zone_active'), progress: 2, current: 0, total: 0 });
    
    const result = await window.electronAPI.importPackExtended(platform);
    if (result.success) {
      setImportStatus('success');
      if (fetchModpacks) fetchModpacks();
    } else {
      if (result.error === 'Отменено' || result.error === 'Canceled') {
        setImportStatus('idle');
      } else {
        setImportStatus('error');
        setErrorMessage(result.error || 'Неизвестная ошибка импорта.');
      }
    }
  };

  const handleStartExport = async () => {
    if (!exportPackId) {
      setExportStatus('error');
      setExportError(t('impexp_error_empty'));
      return;
    }
    
    setExportStatus('exporting');
    const result = await window.electronAPI.exportPackExtended(selectedPack);
    if (result.success) {
      setExportStatus('success');
    } else {
      if (result.error === 'Отменено' || result.error === 'Canceled') {
        setExportStatus('idle');
      } else {
        setExportStatus('error');
        setExportError(result.error || 'Не удалось экспортировать сборку.');
      }
    }
  };

  // Platform logo images renderer
  const renderLogo = (platform, size = 64) => {
    switch (platform) {
      case 'divlauncher':
        return (
          <img src={divlauncherIcon} alt="DivLauncher" style={{ width: size, height: size, objectFit: 'contain' }} />
        );
      case 'curseforge':
        return (
          <img src={curseforgeIcon} alt="CurseForge" style={{ width: size, height: size, objectFit: 'contain' }} />
        );
      case 'modrinth':
        return (
          <img src={modrinthIcon} alt="Modrinth" style={{ width: size, height: size, objectFit: 'contain' }} />
        );
      case 'prism':
        return (
          <img src={prismIcon} alt="Prism" style={{ width: size, height: size, objectFit: 'contain' }} />
        );
      case 'multimc':
        return (
          <img src={multimcIcon} alt="MultiMC" style={{ width: size, height: size, objectFit: 'contain' }} />
        );
      default:
        return null;
    }
  };

  const getPlatformBorder = (platform) => {
    switch (platform) {
      case 'divlauncher': return 'rgba(16, 185, 129, 0.4)';
      case 'curseforge': return 'rgba(241, 100, 34, 0.4)';
      case 'modrinth': return 'rgba(16, 185, 129, 0.4)';
      case 'prism': return 'rgba(139, 92, 246, 0.4)';
      case 'multimc': return 'rgba(59, 130, 246, 0.4)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  return (
    <div style={glassPanelStyle} className="tab-enter">
      {/* Title & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.6px' }}>
            {t('impexp_title')}
          </h2>
        </div>

        {/* Pill-styled Tabs Switcher */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '10px', 
          padding: '3px', 
          border: '1px solid rgba(255,255,255,0.05)',
          alignItems: 'center'
        }}>
          <button 
            onClick={() => { setActiveTab('import'); setExportStatus('idle'); }} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'import' ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
              border: 'none',
              color: activeTab === 'import' ? '#fff' : '#a1a1aa',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {t('impexp_import_tab')}
          </button>
          <button 
            onClick={() => { setActiveTab('export'); setImportStatus('idle'); }} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'export' ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
              border: 'none',
              color: activeTab === 'export' ? '#fff' : '#a1a1aa',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {t('impexp_export_tab')}
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s'
          }}
          title={t('mods_back')}
        >
          <i className="fa-solid fa-arrow-left" />
        </motion.button>
      </div>

      {/* Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'import' && (
            <motion.div
              key="import-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', flexGrow: 1, minHeight: 0 }}
            >
              {importStatus === 'idle' && (
                <>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                    gap: '15px', 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    flexGrow: 1, 
                    paddingRight: '4px',
                    padding: '12px 8px',
                    margin: '-12px -8px'
                  }}>
                    {/* DivLauncher Card */}
                    <motion.div
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: getPlatformBorder('divlauncher'),
                        background: 'rgba(255, 255, 255, 0.06)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartImport('divlauncher')}
                      style={{
                        padding: '24px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        textAlign: 'center', 
                        gap: '15px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s'
                      }}
                    >
                      <div style={{ zIndex: 1 }}>{renderLogo('divlauncher')}</div>
                      <div style={{ zIndex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{t('impexp_platform_div')}</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{t('impexp_platform_div_desc')}</p>
                      </div>
                    </motion.div>

                    {/* CurseForge Card */}
                    <motion.div
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: getPlatformBorder('curseforge'),
                        background: 'rgba(255, 255, 255, 0.06)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartImport('curseforge')}
                      style={{
                        padding: '24px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        textAlign: 'center', 
                        gap: '15px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s'
                      }}
                    >
                      <div style={{ zIndex: 1 }}>{renderLogo('curseforge')}</div>
                      <div style={{ zIndex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{t('impexp_platform_cf')}</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{t('impexp_platform_cf_desc')}</p>
                      </div>
                    </motion.div>

                    {/* Modrinth Card */}
                    <motion.div
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: getPlatformBorder('modrinth'),
                        background: 'rgba(255, 255, 255, 0.06)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartImport('modrinth')}
                      style={{
                        padding: '24px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        textAlign: 'center', 
                        gap: '15px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s'
                      }}
                    >
                      <div style={{ zIndex: 1 }}>{renderLogo('modrinth')}</div>
                      <div style={{ zIndex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{t('impexp_platform_mr')}</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{t('impexp_platform_mr_desc')}</p>
                      </div>
                    </motion.div>

                    {/* Prism Card */}
                    <motion.div
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: getPlatformBorder('prism'),
                        background: 'rgba(255, 255, 255, 0.06)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartImport('prism')}
                      style={{
                        padding: '24px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        textAlign: 'center', 
                        gap: '15px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s'
                      }}
                    >
                      <div style={{ zIndex: 1 }}>{renderLogo('prism')}</div>
                      <div style={{ zIndex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{t('impexp_platform_prism')}</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{t('impexp_platform_prism_desc')}</p>
                      </div>
                    </motion.div>

                    {/* MultiMC Card */}
                    <motion.div
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: getPlatformBorder('multimc'),
                        background: 'rgba(255, 255, 255, 0.06)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartImport('multimc')}
                      style={{
                        padding: '24px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        textAlign: 'center', 
                        gap: '15px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s'
                      }}
                    >
                      <div style={{ zIndex: 1 }}>{renderLogo('multimc')}</div>
                      <div style={{ zIndex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{t('impexp_platform_mmc')}</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{t('impexp_platform_mmc_desc')}</p>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}

              {/* Progress UI */}
              {importStatus === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '30px', borderRadius: '20px', background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', marginTop: '20px'
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa' }}>
                    {t('impexp_progress_title')}
                  </h4>
                  
                  {/* Rotating loader / status animation */}
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        border: '3px solid rgba(59, 130, 246, 0.1)', borderTopColor: '#3b82f6',
                        borderRadius: '50%'
                      }}
                    />
                    <motion.div
                      animate={{ scale: [0.9, 1.1, 0.9] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute', top: '15px', left: '15px', right: '15px', bottom: '15px',
                        border: '2px solid rgba(16, 185, 129, 0.1)', borderBottomColor: '#10b981',
                        borderRadius: '50%'
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>
                      {progressData.message || 'Загрузка...'}
                    </p>
                    
                    {/* Progress Bar Container */}
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
                      <motion.div
                        animate={{ width: `${progressData.progress || 0}%` }}
                        style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #10b981)'
                        }}
                      />
                    </div>
                    
                    <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', fontWeight: 800, color: '#a1a1aa' }}>
                      {progressData.progress || 0}%
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Success state */}
              {importStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '40px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', textAlign: 'center'
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '28px'
                    }}
                  >
                    <i className="fa-solid fa-circle-check" />
                  </motion.div>
                  
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', letterSpacing: '1px' }}>
                      {t('impexp_success_import')}
                    </h4>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                      {lang === 'ru' ? 'Сборка была успешно установлена и готова к запуску.' : 'The modpack was successfully installed and is ready to play.'}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setImportStatus('idle')}
                    style={{
                      padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, cursor: 'pointer',
                      fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px'
                    }}
                  >
                    {lang === 'ru' ? 'Вернуться к импорту' : 'Back to Import'}
                  </motion.button>
                </motion.div>
              )}

              {/* Error state */}
              {importStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '40px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', textAlign: 'center'
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '28px'
                    }}
                  >
                    <i className="fa-solid fa-triangle-exclamation" />
                  </motion.div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '1px' }}>
                      {t('error')}
                    </h4>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#f87171', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace' }}>
                      {errorMessage}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setImportStatus('idle')}
                    style={{
                      padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 800, cursor: 'pointer',
                      fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px'
                    }}
                  >
                    {lang === 'ru' ? 'Попробовать снова' : 'Try Again'}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'export' && (
            <motion.div
              key="export-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, minHeight: 0 }}
            >

              {exportStatus === 'idle' && (
                <div style={{ display: 'flex', gap: '30px', flexGrow: 1, minHeight: 0 }}>
                  
                  {/* Left Column: Build Grid/List */}
                  <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                        {t('impexp_export_select')}
                      </label>
                      
                      {/* Search Bar to fill space and add functionality */}
                      <div style={{ position: 'relative', width: '200px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '11px' }} />
                        <input
                          type="text"
                          placeholder={lang === 'ru' ? 'Поиск сборки...' : 'Search build...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 28px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Interactive builds list with flexbox for dynamic size and rectangular shape */}
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap',
                      gap: '12px', 
                      overflowY: 'auto', 
                      overflowX: 'hidden',
                      paddingRight: '8px',
                      flexGrow: 1,
                      padding: '12px 8px',
                      margin: '-12px -8px'
                    }}>
                      {modpacks
                        .filter(pack => pack.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((pack) => {
                          const isSelected = exportPackId === pack.id;
                          return (
                            <motion.div
                              key={pack.id}
                              whileHover={{ 
                                scale: 1.02, 
                                borderColor: 'rgba(16, 185, 129, 0.4)', 
                                background: 'rgba(255, 255, 255, 0.05)' 
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setExportPackId(pack.id)}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: isSelected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '12px',
                                height: '68px',
                                flex: '1 1 220px',
                                transition: 'all 0.2s ease',
                                boxSizing: 'border-box'
                              }}
                            >
                              {/* Icon */}
                              {pack.icon ? (
                                pack.icon.startsWith('fa-') ? (
                                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#10b981', flexShrink: 0 }}>
                                    <i className={pack.icon} />
                                  </div>
                                ) : (
                                  <img src={pack.icon} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                                )
                              ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#10b981', flexShrink: 0 }}>
                                  {pack.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              
                              {/* Text Container */}
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                                <span style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 800, 
                                  color: isSelected ? '#10b981' : '#fff',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                  textAlign: 'left'
                                }}>
                                  {pack.name}
                                </span>
                                <span style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 600, marginTop: '2px', textAlign: 'left' }}>
                                  {pack.mcVersion} - {pack.loaderType}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Column: Build Preview & Actions */}
                  <div style={{ 
                    flex: 0.8, 
                    background: hasCustomBg && !hasCustomVideo 
                      ? `linear-gradient(to bottom, rgba(10, 10, 16, 0.45), rgba(10, 10, 16, 0.85)), url('${getSafeBgUrl(selectedPack.bgImage)}') center/cover` 
                      : 'rgba(255,255,255,0.02)', 
                    border: (hasCustomBg || hasCustomVideo) ? 'none' : '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: '20px', 
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '280px',
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundClip: 'padding-box',
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    transform: 'translateZ(0)'
                  }}>
                    {/* Background video for live wallpaper */}
                    {hasCustomVideo && (
                      <video 
                        src={getSafeBgUrl(selectedPack.bgVideo)} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        style={{ 
                          position: 'absolute', 
                          top: '-2px', 
                          left: '-2px', 
                          right: '-2px', 
                          bottom: '-2px', 
                          width: 'calc(100% + 4px)', 
                          height: 'calc(100% + 4px)', 
                          objectFit: 'cover', 
                          zIndex: 0 
                        }} 
                      />
                    )}
                    
                    {/* Dark gradient overlay for video to ensure readability */}
                    {hasCustomVideo && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '-2px', 
                        left: '-2px', 
                        right: '-2px', 
                        bottom: '-2px', 
                        background: 'linear-gradient(to bottom, rgba(10, 10, 16, 0.45), rgba(10, 10, 16, 0.85))', 
                        zIndex: 1 
                      }} />
                    )}
                    
                    {/* Scrollable Content Wrapper */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflowY: 'auto',
                      padding: '24px',
                      boxSizing: 'border-box'
                    }}>
                      {!selectedPack ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '15px', color: '#71717a', textAlign: 'center', padding: '20px' }}>
                          <i className="fa-solid fa-box-archive" style={{ fontSize: '36px', opacity: 0.3 }} />
                          <p style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
                            {lang === 'ru' ? 'Выберите сборку из списка слева для предварительного просмотра и экспорта' : 'Select a build from the list on the left to preview details and start export'}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                          {/* Title Area */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {selectedPack.icon ? (
                              selectedPack.icon.startsWith('fa-') ? (
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                  <i className={selectedPack.icon} />
                                </div>
                              ) : (
                                <img src={selectedPack.icon} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} onError={e => e.target.style.display = 'none'} />
                              )
                            ) : (
                              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                {selectedPack.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedPack.name}
                              </span>
                              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, marginTop: '2px' }}>
                                Minecraft {selectedPack.mcVersion}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />

                          {/* Details Metadata */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#a1a1aa', fontWeight: 700 }}>{lang === 'ru' ? 'Загрузчик модов:' : 'Mod Loader:'}</span>
                              <span style={{ color: '#e4e4e7', fontWeight: 800 }}>{selectedPack.loaderType} ({selectedPack.loaderVersion || 'N/A'})</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#a1a1aa', fontWeight: 700 }}>{lang === 'ru' ? 'Каталог сборок:' : 'Client Folder:'}</span>
                              <span style={{ color: '#e4e4e7', fontWeight: 800, fontFamily: 'Consolas, monospace', fontSize: '10px' }}>{selectedPack.clientDir || 'N/A'}</span>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 16px' }}>
                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.5px', marginBottom: '8px' }}>
                              {lang === 'ru' ? 'Включаемые файлы:' : 'Included Files:'}
                            </span>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 600 }}>
                              {selectedPack.isCustom ? (
                                <>
                                  <li>{lang === 'ru' ? 'Моды (.jar) из папки mods' : 'Mods (.jar) from mods folder'}</li>
                                  <li>{lang === 'ru' ? 'Конфигурации модов (config/)' : 'Mod settings (config/)'}</li>
                                </>
                              ) : (
                                <>
                                  <li style={{ color: '#f87171', textDecoration: 'line-through', opacity: 0.6 }}>
                                    {lang === 'ru' ? 'Моды (.jar) — загружаются с сервера' : 'Mods (.jar) — downloaded from server'}
                                  </li>
                                  <li style={{ color: '#f87171', textDecoration: 'line-through', opacity: 0.6 }}>
                                    {lang === 'ru' ? 'Конфигурации модов (config/) — загружаются с сервера' : 'Mod settings (config/) — downloaded from server'}
                                  </li>
                                </>
                              )}
                              <li>{lang === 'ru' ? 'Сохранения миров (saves/)' : 'Singleplayer saves (saves/)'}</li>
                              <li>{lang === 'ru' ? 'Ресурс-паки и шейдеры' : 'Resource packs & shaders'}</li>
                              <li>{lang === 'ru' ? 'Игровые настройки (options.txt)' : 'Game configurations (options.txt)'}</li>
                            </ul>
                          </div>

                          <div style={{ flexGrow: 1 }} />

                          <motion.button
                            disabled={!exportPackId}
                            whileHover={exportPackId ? { scale: 1.02 } : {}}
                            whileTap={exportPackId ? { scale: 0.98 } : {}}
                            onClick={handleStartExport}
                            style={{
                              background: exportPackId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              border: exportPackId ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                              color: exportPackId ? '#10b981' : '#52525b',
                              borderRadius: '10px',
                              padding: '12px 20px',
                              fontWeight: 800,
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              cursor: exportPackId ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s',
                              width: '100%',
                              marginTop: '10px'
                            }}
                          >
                            <i className="fa-solid fa-file-export" />
                            {t('impexp_export_btn')}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {exportStatus === 'exporting' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '30px', borderRadius: '20px', background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', marginTop: '20px'
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa' }}>
                    {lang === 'ru' ? 'Экспорт сборки' : 'Exporting Pack'}
                  </h4>
                  
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        border: '3px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981',
                        borderRadius: '50%'
                      }}
                    />
                    <i className="fa-solid fa-file-zipper" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '32px', color: '#10b981' }} />
                  </div>

                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>
                    {lang === 'ru' ? 'Пожалуйста, подождите. Архивация файлов сборки...' : 'Please wait. Archiving build files...'}
                  </p>
                </motion.div>
              )}

              {exportStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '40px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '28px'
                  }}>
                    <i className="fa-solid fa-circle-check" />
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', letterSpacing: '1px' }}>
                      {t('impexp_success_export')}
                    </h4>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                      {lang === 'ru' ? 'Архив сборки успешно сохранен в выбранное место.' : 'The build archive has been successfully saved to your chosen location.'}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setExportStatus('idle')}
                    style={{
                      padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, cursor: 'pointer',
                      fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px'
                    }}
                  >
                    {lang === 'ru' ? 'Вернуться к экспорту' : 'Back to Export'}
                  </motion.button>
                </motion.div>
              )}

              {exportStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    padding: '40px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '20px', textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '28px'
                  }}>
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '1px' }}>
                      {t('error')}
                    </h4>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#f87171' }}>
                      {exportError}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setExportStatus('idle')}
                    style={{
                      padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 800, cursor: 'pointer',
                      fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px'
                    }}
                  >
                    {lang === 'ru' ? 'Попробовать снова' : 'Try Again'}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
