import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: '', name: 'Все категории', icon: 'fa-globe' },
  { id: 'optimization', name: 'Оптимизация', icon: 'fa-bolt' },
  { id: 'magic', name: 'Магия', icon: 'fa-wand-magic-sparkles' },
  { id: 'technology', name: 'Технологии', icon: 'fa-microchip' },
  { id: 'adventure', name: 'Приключения', icon: 'fa-map' },
  { id: 'decoration', name: 'Декорации', icon: 'fa-couch' },
  { id: 'library', name: 'Библиотеки', icon: 'fa-book' },
  { id: 'worldgen', name: 'Генерация', icon: 'fa-earth-americas' }
];

export default function ModsPage({ currentPack, onBack }) {
  const [mods, setMods] = useState([]);
  const [installedMods, setInstalledMods] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [installingTarget, setInstallingTarget] = useState(null); // project slug
  const [error, setError] = useState('');

  // Detailed view states
  const [selectedModSlug, setSelectedModSlug] = useState(null);
  const [selectedModListItem, setSelectedModListItem] = useState(null);
  const [selectedModData, setSelectedModData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const getModrinthLoader = (loader) => {
    if (loader === 'hybrid') return 'forge';
    if (loader === 'vanilla' || !loader) return null;
    return loader;
  };

  const loader = getModrinthLoader(currentPack?.loaderType);

  const fetchInstalledMods = useCallback(async () => {
    if (!currentPack || !currentPack.clientDir) return;
    const res = await window.electronAPI.getInstalledMods(currentPack.clientDir);
    if (res.success) {
      setInstalledMods(res.mods);
    }
  }, [currentPack]);

  const searchMods = useCallback(async (isLoadMore = false) => {
    if (!loader || !currentPack) return;
    setLoading(true);
    setError('');
    
    try {
      let facets = [
        [`versions:${currentPack.mcVersion}`],
        [`categories:${loader}`]
      ];
      if (activeCategory) {
        facets.push([`categories:${activeCategory}`]);
      }
      
      const queryStr = search.trim();
      const offset = isLoadMore ? (page + 1) * 12 : 0;
      
      const res = await window.electronAPI.searchModrinth(queryStr, facets, 12, offset);
      if (!res.success) {
        throw new Error(res.error || 'Не удалось загрузить список модов');
      }
      
      const data = res.data;
      
      if (isLoadMore) {
        setMods(prev => [...prev, ...data.hits]);
        setPage(page + 1);
      } else {
        setMods(data.hits);
        setPage(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, page, loader, currentPack]);

  useEffect(() => {
    fetchInstalledMods();
  }, [fetchInstalledMods]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchMods(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, activeCategory]);

  const handleInstallToggle = async (mod) => {
    setInstallingTarget(mod.slug);
    try {
      const res = await window.electronAPI.getModrinthVersions(mod.slug, [loader], [currentPack.mcVersion]);
      if (!res.success) {
        throw new Error(res.error || 'Не удалось получить версии мода');
      }
      
      const versions = res.data;
      if (!versions || versions.length === 0) {
        throw new Error('Нет совместимых версий файла для вашей версии Minecraft!');
      }
      
      const latestVersion = versions[0];
      const file = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
      
      // Check if installed using fuzzy logic (same logic as card UI)
      const fuzzyInstalledName = installedMods.find(f => 
        f.toLowerCase().includes(mod.slug.toLowerCase().replace(/-/g, '')) || 
        f.toLowerCase().includes(mod.slug.toLowerCase())
      );
      
      const isInstalled = !!fuzzyInstalledName;
      
      if (isInstalled) {
        const resDel = await window.electronAPI.deleteMod(currentPack.clientDir, fuzzyInstalledName);
        if (!resDel.success) throw new Error(resDel.error);
      } else {
        const resDl = await window.electronAPI.downloadMod(file.url, currentPack.clientDir, file.filename);
        if (!resDl.success) throw new Error(resDl.error);
      }
      
      await fetchInstalledMods();
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setInstallingTarget(null);
    }
  };

  const handleOpenDetails = async (mod) => {
    setSelectedModSlug(mod.slug);
    setSelectedModListItem(mod);
    setDetailsLoading(true);
    setError('');
    setSelectedModData(null);
    setActiveScreenshotIndex(0);
    setIsLightboxOpen(false);
    try {
      const res = await window.electronAPI.getModrinthProject(mod.slug);
      if (!res.success) throw new Error(res.error || 'Не удалось загрузить детали мода');
      setSelectedModData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const parseMarkdown = (md) => {
    if (!md) return '';
    // We convert markdown headers, list items, bolding, and code.
    // HTML tags like <img> are kept intact to be parsed natively by the browser.
    let html = md
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h4 style="margin: 16px 0 8px; color: #fff; font-weight: 700;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="margin: 20px 0 10px; color: #fff; font-weight: 800;">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 style="margin: 24px 0 12px; color: #fff; font-weight: 900;">$1</h2>')
      .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #d4d4d8;">$1</li>')
      .replace(/^\s*\*\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #d4d4d8;">$1</li>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto; font-family: monospace; color: #e4e4e7; margin: 12px 0;">$1</pre>')
      .replace(/`([^`\n]+?)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #e4e4e7;">$1</code>')
      .replace(/\n/g, '<br/>');
    return html;
  };

  // Click interceptor to open external links in the default OS web browser instead of inside Electron
  const handleDescriptionClick = (e) => {
    const target = e.target.closest('a');
    if (target && target.href) {
      e.preventDefault();
      window.electronAPI.openExternalLink(target.href);
    }
  };

  if (!loader) {
    return (
      <div style={{ padding: '40px', color: '#fff', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '40px 30px', borderRadius: '24px', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <i className="fa-triangle-exclamation fa-solid" style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '20px' }}></i>
          <h2 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Сборка не поддерживает моды</h2>
          <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
            Сборки на базе Vanilla поддерживают только плагины на стороне сервера. Для установки модификаций используйте сборку на базе Fabric, Forge или NeoForge.
          </p>
          <motion.button 
            whileHover={{ background: '#059669' }}
            whileTap={{ scale: 0.97 }}
            onClick={onBack} 
            style={{ padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'background 0.2s' }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
            Вернуться к сборке
          </motion.button>
        </div>
      </div>
    );
  }

  // Check if active project in detailed view is installed
  const isInstalled = selectedModData && installedMods.some(f => 
    f.toLowerCase().includes(selectedModData.slug.toLowerCase().replace(/-/g, '')) || 
    f.toLowerCase().includes(selectedModData.slug.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#fff', background: 'transparent', fontFamily: 'Montserrat, sans-serif' }}>
      
      {/* GLOBAL STYLING TARGETING EMBEDDED MARKDOWN ELEMENTS */}
      <style>{`
        .mod-desc-content img {
          max-width: 100%;
          height: auto !important;
          border-radius: 8px;
          margin: 8px 0;
          display: block;
        }
        .mod-desc-content a {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 600;
        }
        .mod-desc-content a:hover {
          text-decoration: underline;
        }
        .mod-desc-content ul, .mod-desc-content ol {
          margin-bottom: 10px;
          padding-left: 20px;
        }
      `}</style>

      {/* RIGHT SIDE PANEL: SWITCH BETWEEN GRID AND DETAILS */}
      <AnimatePresence mode="wait">
        {selectedModSlug ? (
          
          /* DETAILED MOD VIEW */
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, padding: '24px 40px' }}
          >
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexShrink: 0 }}>
              <motion.button 
                whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSelectedModSlug(null); setSelectedModData(null); setSelectedModListItem(null); }}
                style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'background 0.2s' }}
              >
                <i className="fa-solid fa-arrow-left"></i>
              </motion.button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#a1a1aa' }}>Назад к списку модов</span>
            </div>

            {detailsLoading ? (
              <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10b981' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px' }}></i>
              </div>
            ) : selectedModData ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '20px', paddingRight: '4px' }}>
                
                {/* Main Header Info Card */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '16px 20px', borderRadius: '14px', flexShrink: 0 }}>
                  {selectedModData.icon_url ? (
                    <img src={selectedModData.icon_url} alt={selectedModData.title} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#71717a' }}>
                      <i className="fa-solid fa-puzzle-piece"></i>
                    </div>
                  )}
                  <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedModData.title}
                    </h2>
                    <div style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#a1a1aa', fontWeight: 500 }}>
                        {selectedModListItem?.author || 'Неизвестен'}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-download" style={{ fontSize: '10px' }}></i> 
                        {selectedModData.downloads?.toLocaleString()} скачиваний
                      </span>
                    </div>
                  </div>
                  
                  {/* Action button */}
                  <motion.button 
                    whileHover={installingTarget !== selectedModData.slug ? { scale: 1.02 } : {}}
                    whileTap={installingTarget !== selectedModData.slug ? { scale: 0.98 } : {}}
                    onClick={() => handleInstallToggle(selectedModData)}
                    disabled={installingTarget === selectedModData.slug}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: installingTarget === selectedModData.slug 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : isInstalled 
                          ? 'rgba(239, 68, 68, 0.1)' 
                          : '#10b981',
                      color: installingTarget === selectedModData.slug 
                        ? '#71717a' 
                        : isInstalled 
                          ? '#f87171' 
                          : '#fff',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: installingTarget === selectedModData.slug ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s, color 0.2s',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (installingTarget !== selectedModData.slug) {
                        e.currentTarget.style.background = isInstalled ? 'rgba(239, 68, 68, 0.18)' : '#059669';
                        if (isInstalled) e.currentTarget.style.color = '#ef4444';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (installingTarget !== selectedModData.slug) {
                        e.currentTarget.style.background = isInstalled ? 'rgba(239, 68, 68, 0.1)' : '#10b981';
                        if (isInstalled) e.currentTarget.style.color = '#f87171';
                      }
                    }}
                  >
                    {installingTarget === selectedModData.slug ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Загрузка</>
                    ) : isInstalled ? (
                      <><i className="fa-solid fa-trash"></i> Удалить</>
                    ) : (
                      <><i className="fa-solid fa-download"></i> Скачать</>
                    )}
                  </motion.button>
                </div>

                {/* Subcontent block */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', minHeight: 0 }}>
                  
                  {/* Left block (Body) */}
                  <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>Описание</h3>
                    <div 
                      className="mod-desc-content"
                      onClick={handleDescriptionClick}
                      style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        fontSize: '13px', 
                        color: '#d4d4d8', 
                        lineHeight: '1.6', 
                        overflowY: 'auto',
                        maxHeight: '340px'
                      }}
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedModData.body) }}
                    />
                  </div>

                  {/* Right block (Gallery & Info) */}
                  <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Gallery section */}
                    {selectedModData.gallery && selectedModData.gallery.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>Галерея</h3>
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '12px' }}>
                          <div 
                            onClick={() => setIsLightboxOpen(true)}
                            style={{ 
                              width: '100%', 
                              height: '140px', 
                              borderRadius: '8px', 
                              overflow: 'hidden', 
                              background: '#09090b', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            <img 
                              src={selectedModData.gallery[activeScreenshotIndex]?.url} 
                              alt="screenshot" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: '#a1a1aa' }}>
                              <i className="fa-solid fa-magnifying-glass-plus"></i> Увеличить
                            </div>
                          </div>
                          
                          {selectedModData.gallery.length > 1 && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                              {selectedModData.gallery.map((img, idx) => (
                                <img 
                                  key={idx} 
                                  src={img.url} 
                                  alt="thumb" 
                                  onClick={() => setActiveScreenshotIndex(idx)}
                                  style={{ 
                                    width: '44px', 
                                    height: '30px', 
                                    objectFit: 'cover', 
                                    borderRadius: '4px', 
                                    cursor: 'pointer', 
                                    opacity: activeScreenshotIndex === idx ? 1 : 0.5,
                                    border: activeScreenshotIndex === idx ? '1px solid #10b981' : 'none',
                                    transition: 'opacity 0.2s'
                                  }} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>Спецификации</h3>
                      <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                          <span style={{ color: '#71717a' }}>Клиент</span>
                          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
                            {selectedModData.client_side === 'required' ? 'Обязателен' : selectedModData.client_side === 'optional' ? 'Необязателен' : 'Нет'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                          <span style={{ color: '#71717a' }}>Сервер</span>
                          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
                            {selectedModData.server_side === 'required' ? 'Обязателен' : selectedModData.server_side === 'optional' ? 'Необязателен' : 'Нет'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                          <span style={{ color: '#71717a' }}>Лицензия</span>
                          <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{selectedModData.license?.name || 'Неизвестно'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#71717a' }}>ID</span>
                          <span style={{ color: '#71717a', fontFamily: 'monospace' }}>{selectedModData.id}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#71717a' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '28px', marginBottom: '8px' }}></i>
                <span>Ошибка загрузки данных</span>
              </div>
            )}

            {/* FULLSCREEN LIGHTBOX FOR SCREENSHOTS */}
            {isLightboxOpen && selectedModData?.gallery && (
              <div 
                onClick={() => setIsLightboxOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.92)',
                  zIndex: 99999,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px'
                }}
              >
                <img 
                  src={selectedModData.gallery[activeScreenshotIndex]?.url} 
                  alt="screenshot-fullscreen" 
                  style={{ 
                    maxWidth: '90%', 
                    maxHeight: '80%', 
                    objectFit: 'contain', 
                    borderRadius: '12px'
                  }} 
                  onClick={(e) => e.stopPropagation()} 
                />
                
                {selectedModData.gallery.length > 1 && (
                  <div 
                    style={{ display: 'flex', gap: '24px', marginTop: '20px', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.button 
                      whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveScreenshotIndex(prev => (prev - 1 + selectedModData.gallery.length) % selectedModData.gallery.length)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </motion.button>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', fontFamily: 'monospace' }}>
                      {activeScreenshotIndex + 1} / {selectedModData.gallery.length}
                    </span>
                    <motion.button 
                      whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveScreenshotIndex(prev => (prev + 1) % selectedModData.gallery.length)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </motion.button>
                  </div>
                )}
                
                <div style={{ marginTop: '16px', color: '#71717a', fontSize: '12px' }}>
                  Кликните в любом месте для закрытия
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          
          /* GRID LIST VIEW (NO CATEGORY SIDEBAR) */
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, padding: '24px 40px' }}
          >
            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexShrink: 0, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.button 
                  whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', transition: 'background 0.2s' }}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </motion.button>
                
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 950, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Менеджер Модов</h1>
                  <p style={{ margin: '3px 0 0', color: '#a1a1aa', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{currentPack.name}</span>
                    <span style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.05)', color: '#e4e4e7', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {currentPack.mcVersion} • {loader.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              
              <div style={{ position: 'relative', width: '280px' }}>
                <i className="fa-solid fa-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '13px' }}></i>
                <input 
                  type="text" 
                  placeholder="Поиск модов на Modrinth..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: 'none', color: '#fff', outline: 'none', fontSize: '13px', boxSizing: 'border-box', transition: 'background 0.2s' }}
                  onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onBlur={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                />
              </div>
            </div>

            {/* HORIZONTAL CATEGORIES FILTERS */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', flexShrink: 0 }}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '16px',
                      border: 'none',
                      background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      color: isActive ? '#fff' : '#a1a1aa',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.color = '#a1a1aa';
                      }
                    }}
                  >
                    <i className={`fa-solid ${cat.icon}`}></i>
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* MODS LIST */}
            <div style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '20px' }}>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 18px', borderRadius: '10px', color: '#f87171', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px', alignContent: 'start' }}>
                {mods.map(mod => {
                  const isInstalled = installedMods.some(f => 
                    f.toLowerCase().includes(mod.slug.toLowerCase().replace(/-/g, '')) || 
                    f.toLowerCase().includes(mod.slug.toLowerCase())
                  );
                  
                  return (
                    <motion.div 
                      key={mod.project_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleOpenDetails(mod)}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    >
                      {/* Card Header Info */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.title} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#71717a' }}>
                            <i className="fa-solid fa-puzzle-piece"></i>
                          </div>
                        )}
                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mod.title}
                          </h3>
                          <div style={{ margin: '3px 0 0', fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#a1a1aa', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{mod.author}</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fa-solid fa-download" style={{ fontSize: '9px' }}></i> 
                              {mod.downloads >= 1000000 
                                ? `${(mod.downloads / 1000000).toFixed(1)}M` 
                                : mod.downloads >= 1000 
                                  ? `${(mod.downloads / 1000).toFixed(0)}K` 
                                  : mod.downloads
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
                        {mod.description}
                      </p>
                      
                      {/* Footer Actions */}
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}
                        onClick={(e) => e.stopPropagation()} 
                      >
                        <div style={{ display: 'flex', gap: '4px', overflow: 'hidden' }}>
                          {mod.categories.slice(0, 2).map(cat => (
                            <span key={cat} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '9px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                        
                        <motion.button 
                          whileHover={installingTarget !== mod.slug ? { scale: 1.02 } : {}}
                          whileTap={installingTarget !== mod.slug ? { scale: 0.98 } : {}}
                          onClick={() => handleInstallToggle(mod)}
                          disabled={installingTarget === mod.slug}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: installingTarget === mod.slug 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : isInstalled 
                                ? 'rgba(239, 68, 68, 0.1)' 
                                : '#10b981',
                            color: installingTarget === mod.slug 
                              ? '#71717a' 
                              : isInstalled 
                                ? '#f87171' 
                                : '#fff',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: installingTarget === mod.slug ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'background 0.2s, color 0.2s',
                            boxShadow: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (installingTarget !== mod.slug) {
                              e.currentTarget.style.background = isInstalled ? 'rgba(239, 68, 68, 0.18)' : '#059669';
                              if (isInstalled) e.currentTarget.style.color = '#ef4444';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (installingTarget !== mod.slug) {
                              e.currentTarget.style.background = isInstalled ? 'rgba(239, 68, 68, 0.1)' : '#10b981';
                              if (isInstalled) e.currentTarget.style.color = '#f87171';
                            }
                          }}
                        >
                          {installingTarget === mod.slug ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Загрузка</>
                          ) : isInstalled ? (
                            <><i className="fa-solid fa-trash"></i> Удалить</>
                          ) : (
                            <><i className="fa-solid fa-download"></i> Скачать</>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#10b981', fontSize: '24px' }}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
              )}

              {!loading && mods.length > 0 && mods.length % 12 === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <motion.button 
                    whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => searchMods(true)}
                    style={{ 
                      padding: '10px 24px', 
                      background: 'rgba(255,255,255,0.03)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      fontWeight: 600,
                      fontSize: '12px',
                      transition: 'background 0.2s'
                    }}
                  >
                    Загрузить ещё
                  </motion.button>
                </div>
              )}
              
              {!loading && mods.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '60px 40px', color: '#71717a' }}>
                  <i className="fa-solid fa-ghost" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.4 }}></i>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#a1a1aa', margin: '0 0 4px' }}>Ничего не найдено</h3>
                  <p style={{ fontSize: '12px', margin: 0 }}>Попробуйте изменить поисковый запрос или категорию.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
