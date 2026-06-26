import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: '', name: 'Все', icon: 'fa-globe' },
  { id: 'optimization', name: 'Оптимизация', icon: 'fa-bolt' },
  { id: 'magic', name: 'Магия', icon: 'fa-wand-magic-sparkles' },
  { id: 'technology', name: 'Технологии', icon: 'fa-microchip' },
  { id: 'adventure', name: 'Приключения', icon: 'fa-map' },
  { id: 'decoration', name: 'Декор', icon: 'fa-couch' },
  { id: 'library', name: 'Библиотеки', icon: 'fa-book' },
  { id: 'worldgen', name: 'Генерация', icon: 'fa-earth-americas' }
];

const SORT_OPTIONS = [
  { id: 'popular', name: 'Популярные', icon: 'fa-fire' },
  { id: 'downloads', name: 'Скачиваемые', icon: 'fa-download' },
  { id: 'updated', name: 'Обновлённые', icon: 'fa-calendar' },
  { id: 'name', name: 'А-Я', icon: 'fa-sort-alpha-down' }
];

export default function ModsPage({ currentPack, onBack }) {
  const [mods, setMods] = useState([]);
  const [installedMods, setInstalledMods] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [installingTarget, setInstallingTarget] = useState(null); // project slug
  const [error, setError] = useState('');

  // Detailed view states
  const [selectedMod, setSelectedMod] = useState(null);
  const [selectedModData, setSelectedModData] = useState(null);
  const [versionsList, setVersionsList] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('description'); // 'description' | 'versions' | 'dependencies' | 'gallery'

  const getCurseLoader = (loader) => {
    if (loader === 'hybrid') return 'forge';
    if (loader === 'vanilla' || !loader) return null;
    return loader;
  };

  const loader = getCurseLoader(currentPack?.loaderType);

  const fetchInstalledMods = useCallback(async () => {
    if (!currentPack || !currentPack.clientDir) return;
    const res = await window.electronAPI.getInstalledMods(currentPack.clientDir);
    if (res.success) {
      setInstalledMods(res.mods);
    }
  }, [currentPack]);

  const getSortParams = (sortKey) => {
    if (sortKey === 'downloads') return { sortField: 6, sortOrder: 'desc' };
    if (sortKey === 'updated') return { sortField: 3, sortOrder: 'desc' };
    if (sortKey === 'name') return { sortField: 4, sortOrder: 'asc' };
    return { sortField: 2, sortOrder: 'desc' }; // popular
  };

  const searchMods = useCallback(async (isLoadMore = false) => {
    if (!loader || !currentPack) return;
    setLoading(true);
    setError('');
    
    try {
      const queryStr = search.trim();
      const offset = isLoadMore ? (page + 1) * 12 : 0;
      const { sortField, sortOrder } = getSortParams(sortBy);
      
      const res = await window.electronAPI.searchCurse(queryStr, {
        mcVersion: currentPack.mcVersion,
        loader: loader,
        category: activeCategory,
        limit: 12,
        offset: offset,
        sortField,
        sortOrder
      });
      
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
  }, [search, activeCategory, sortBy, page, loader, currentPack]);

  useEffect(() => {
    fetchInstalledMods();
  }, [fetchInstalledMods]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchMods(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, activeCategory, sortBy]);

  const getInstalledMap = useCallback(() => {
    if (!currentPack?.id) return {};
    try {
      return JSON.parse(localStorage.getItem(`installed_map_${currentPack.id}`) || '{}');
    } catch {
      return {};
    }
  }, [currentPack]);

  const saveInstalledMap = useCallback((map) => {
    if (!currentPack?.id) return;
    localStorage.setItem(`installed_map_${currentPack.id}`, JSON.stringify(map));
  }, [currentPack]);

  const getInstalledFileName = useCallback((mod) => {
    if (!mod) return null;
    const map = getInstalledMap();
    
    // 1. Precise match via saved mapping
    if (mod.id && map[mod.id]) {
      const fileName = map[mod.id];
      if (installedMods.includes(fileName)) {
        return fileName;
      }
    }
    
    // 2. Fallback fuzzy match via slug
    if (mod.slug) {
      const slugLower = mod.slug.toLowerCase();
      const slugNoDashes = slugLower.replace(/-/g, '');
      const found = installedMods.find(f => {
        const fileLower = f.toLowerCase();
        return fileLower.includes(slugLower) || 
               fileLower.includes(slugNoDashes);
      });
      if (found) {
        // Auto-associate in map for future fast precise matching
        if (mod.id) {
          map[mod.id] = found;
          saveInstalledMap(map);
        }
        return found;
      }
    }
    return null;
  }, [installedMods, getInstalledMap, saveInstalledMap]);

  const handleInstallToggle = async (mod) => {
    setInstallingTarget(mod.slug);
    try {
      const installedFile = getInstalledFileName(mod);
      
      if (installedFile) {
        const resDel = await window.electronAPI.deleteMod(currentPack.clientDir, installedFile);
        if (!resDel.success) throw new Error(resDel.error);
        
        const map = getInstalledMap();
        delete map[mod.id];
        saveInstalledMap(map);
      } else {
        const res = await window.electronAPI.getCurseVersions(mod.id, [loader], [currentPack.mcVersion]);
        if (!res.success) {
          throw new Error(res.error || 'Не удалось получить версии мода');
        }
        
        const versions = res.data;
        if (!versions || versions.length === 0) {
          throw new Error('Нет совместимых версий файла для вашей версии Minecraft!');
        }
        
        const latestVersion = versions[0];
        const file = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
        
        const resDl = await window.electronAPI.downloadMod(file.url, currentPack.clientDir, file.filename);
        if (!resDl.success) throw new Error(resDl.error);

        const map = getInstalledMap();
        map[mod.id] = file.filename;
        saveInstalledMap(map);
      }
      
      await fetchInstalledMods();
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setInstallingTarget(null);
    }
  };

  const handleInstallVersion = async (mod, versionFile) => {
    setInstallingTarget(mod.slug);
    try {
      const file = versionFile.files[0];
      if (!file) throw new Error('Файл не содержит ссылку для скачивания');
      
      const resDl = await window.electronAPI.downloadMod(file.url, currentPack.clientDir, file.filename);
      if (!resDl.success) throw new Error(resDl.error);
      
      const map = getInstalledMap();
      map[mod.id] = file.filename;
      saveInstalledMap(map);
      
      await fetchInstalledMods();
    } catch (err) {
      alert(`Ошибка при установке версии: ${err.message}`);
    } finally {
      setInstallingTarget(null);
    }
  };

  const handleUninstallVersion = async (mod, fileName) => {
    setInstallingTarget(mod.slug);
    try {
      const resDel = await window.electronAPI.deleteMod(currentPack.clientDir, fileName);
      if (!resDel.success) throw new Error(resDel.error);
      
      const map = getInstalledMap();
      delete map[mod.id];
      saveInstalledMap(map);
      
      await fetchInstalledMods();
    } catch (err) {
      alert(`Ошибка при удалении версии: ${err.message}`);
    } finally {
      setInstallingTarget(null);
    }
  };

  const handleOpenDetails = async (mod) => {
    setSelectedMod(mod);
    setDetailsLoading(true);
    setError('');
    setSelectedModData(null);
    setVersionsList([]);
    setActiveScreenshotIndex(0);
    setSelectedTab('description');
    
    try {
      const [projRes, versionsRes] = await Promise.all([
        window.electronAPI.getCurseProject(mod.id),
        window.electronAPI.getCurseVersions(mod.id, [loader], [currentPack.mcVersion])
      ]);
      
      if (!projRes.success) throw new Error(projRes.error || 'Не удалось загрузить детали мода');
      setSelectedModData(projRes.data);
      if (versionsRes.success) {
        setVersionsList(versionsRes.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenFolder = () => {
    if (currentPack) {
      window.electronAPI.openClientFolder(currentPack);
    }
  };

  const parseMarkdown = (md) => {
    if (!md) return '';
    if (md.trim().startsWith('<') || md.includes('<p>') || md.includes('</div>') || md.includes('<a ')) {
      return md;
    }
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
        <div style={{ background: 'rgba(10, 10, 16, 0.5)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', padding: '40px 30px', borderRadius: '20px', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '20px' }}></i>
          <h2 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Сборка не поддерживает моды</h2>
          <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
            Vanilla-сборки не поддерживают модификации. Выберите или создайте сборку на базе Fabric, Forge или NeoForge в настройках.
          </p>
          <motion.button 
            whileHover={{ scale: 1.03, background: 'rgba(16, 185, 129, 0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={onBack} 
            style={{ padding: '12px 24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '11px', cursor: 'pointer', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.6px' }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
            Вернуться к сборке
          </motion.button>
        </div>
      </div>
    );
  }

  // Common glass panel style
  const glassPanelStyle = {
    background: 'rgba(10, 10, 16, 0.5)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: '25px',
    boxSizing: 'border-box'
  };

  const actionButtonAccentStyle = (isDel = false) => ({
    background: isDel 
      ? 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(185,28,28,0.09))'
      : 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.09))',
    border: isDel 
      ? '1px solid rgba(239,68,68,0.32)' 
      : '1px solid rgba(16,185,129,0.32)',
    color: isDel ? '#f87171' : '#34d399',
    borderRadius: '11px',
    padding: '9px 14px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'Montserrat',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  });

  const secondaryButtonStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    color: '#e4e4e7',
    borderRadius: '11px',
    padding: '9px 14px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'Montserrat',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  };

  return (
    <div style={{ height: '100%', width: '100%', color: '#fff', boxSizing: 'border-box', background: 'transparent' }}>
      
      {/* CSS Overrides */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .mod-desc-content img {
          max-width: 100%;
          height: auto !important;
          border-radius: 12px;
          margin: 12px 0;
          display: block;
        }
        .mod-desc-content a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 700;
        }
        .mod-desc-content a:hover {
          text-decoration: underline;
        }
        .mod-desc-content ul, .mod-desc-content ol {
          margin: 10px 0 10px 20px;
        }
        .mod-desc-content li {
          margin-bottom: 6px;
          color: #e4e4e7;
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.01) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.01) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {!selectedMod ? (
          
          /* ========================================================================= */
          /* =========================== 1. MODS LIST PAGE =========================== */
          /* ========================================================================= */
          <motion.div 
            key="list-page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            style={glassPanelStyle}
          >
            {/* Header section with back button, title, search and main action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0, flexWrap: 'wrap', gap: '16px' }}>
              
              {/* Title & Back Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <motion.button 
                  whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.06)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onBack}
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '11px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.07)', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '13px'
                  }}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </motion.button>

                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.6px' }}>
                    Менеджер Модов
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                    <span>Установлено локально: {installedMods.length}</span>
                  </div>
                </div>
              </div>

              {/* Search input & Folder opener */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                
                {/* Search field */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}></i>
                  <input 
                    type="text" 
                    placeholder="Поиск модов..." 
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setMods([]);
                      setPage(0);
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px 10px 38px', 
                      borderRadius: '13px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: '#fff', 
                      outline: 'none', 
                      fontSize: '12px', 
                      boxSizing: 'border-box',
                      fontFamily: 'Montserrat',
                      fontWeight: 600
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  />
                  {search && (
                    <i 
                      className="fa-solid fa-circle-xmark" 
                      onClick={() => {
                        setSearch('');
                        setMods([]);
                        setPage(0);
                      }}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}
                    />
                  )}
                </div>

                {/* Open Folder Action */}
                <motion.button 
                  whileHover={{ scale: 1.03, background: 'rgba(255, 255, 255, 0.06)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenFolder}
                  style={secondaryButtonStyle}
                >
                  <i className="fa-regular fa-folder-open" style={{ color: '#34d399' }}></i>
                  Открыть Папку
                </motion.button>
              </div>

            </div>

            {/* Categories horizontal filter list */}
            <div className="custom-scrollbar" style={{ 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              paddingBottom: '10px', 
              marginBottom: '16px', 
              flexShrink: 0 
            }}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setMods([]);
                      setPage(0);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '11px',
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                      background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      color: isActive ? '#34d399' : '#a1a1aa',
                      fontWeight: 800,
                      fontSize: '11px',
                      fontFamily: 'Montserrat',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    <i className={`fa-solid ${cat.icon}`} style={{ fontSize: '10px' }}></i>
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Sort Bar control strip */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.05)', 
              borderRadius: '13px', 
              padding: '8px 16px', 
              marginBottom: '18px', 
              flexShrink: 0 
            }}>
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Сортировка по:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {SORT_OPTIONS.map(opt => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setMods([]);
                        setPage(0);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        color: isSelected ? '#10b981' : '#a1a1aa',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s',
                        border: isSelected ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid transparent'
                      }}
                    >
                      <i className={`fa-solid ${opt.icon}`} style={{ fontSize: '10px' }}></i>
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mods Grid */}
            <div className="custom-scrollbar" style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '16px', paddingRight: '4px' }}>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '14px 18px', borderRadius: '13px', color: '#f87171', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Grid Layout using cards with border-radius: 20px */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                
                {mods.map(mod => {
                  const localFile = getInstalledFileName(mod);
                  const isInstalled = !!localFile;
                  
                  return (
                    <div
                      key={mod.project_id}
                      style={{
                        background: 'rgba(10, 10, 16, 0.35)',
                        border: isInstalled 
                          ? '1px solid rgba(16, 185, 129, 0.25)' 
                          : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '20px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      onClick={() => handleOpenDetails(mod)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(10, 10, 16, 0.35)';
                      }}
                    >
                      {/* Badge categories at top of card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', overflow: 'hidden' }}>
                          {mod.categories.slice(0, 2).map(cat => (
                            <span 
                              key={cat} 
                              style={{ 
                                padding: '2px 8px', 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                border: '1px solid rgba(255, 255, 255, 0.07)', 
                                borderRadius: '6px', 
                                fontSize: '8px', 
                                fontWeight: 800, 
                                color: '#a1a1aa', 
                                textTransform: 'uppercase' 
                              }}
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                        
                        {isInstalled && (
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            border: '1px solid rgba(16, 185, 129, 0.2)', 
                            color: '#10b981', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            textTransform: 'uppercase' 
                          }}>
                            Установлен
                          </span>
                        )}
                      </div>

                      {/* Card Identity Header */}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.title} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#71717a', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <i className="fa-solid fa-puzzle-piece"></i>
                          </div>
                        )}
                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mod.title}
                          </h3>
                          <div style={{ margin: '3px 0 0', fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981', fontWeight: 800 }}>{mod.author}</span>
                          </div>
                        </div>
                      </div>

                      {/* Brief description text */}
                      <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
                        {mod.description}
                      </p>

                      {/* Divider line */}
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }}></div>

                      {/* Action footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
                          <i className="fa-solid fa-download" style={{ fontSize: '9px' }}></i> 
                          {mod.downloads >= 1000000 
                            ? `${(mod.downloads / 1000000).toFixed(1)}M` 
                            : mod.downloads >= 1000 
                              ? `${(mod.downloads / 1000).toFixed(0)}K` 
                              : mod.downloads
                          }
                        </span>

                        <motion.button 
                          whileHover={installingTarget !== mod.slug ? { scale: 1.03 } : {}}
                          whileTap={installingTarget !== mod.slug ? { scale: 0.96 } : {}}
                          onClick={() => handleInstallToggle(mod)}
                          disabled={installingTarget === mod.slug}
                          style={actionButtonAccentStyle(isInstalled)}
                        >
                          {installingTarget === mod.slug ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : isInstalled ? (
                            <><i className="fa-solid fa-trash"></i> Удалить</>
                          ) : (
                            <><i className="fa-solid fa-download"></i> Скачать</>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  );
                })}

                {/* Skeletons loader */}
                {loading && (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div 
                      key={idx}
                      style={{
                        background: 'rgba(10, 10, 16, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '20px',
                        padding: '20px',
                        height: '165px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton-shimmer" style={{ height: '14px', borderRadius: '4px', width: '70%' }} />
                          <div className="skeleton-shimmer" style={{ height: '10px', borderRadius: '3px', width: '40%' }} />
                        </div>
                      </div>
                      <div className="skeleton-shimmer" style={{ height: '12px', borderRadius: '3px', width: '100%', marginTop: '6px' }} />
                      <div className="skeleton-shimmer" style={{ height: '12px', borderRadius: '3px', width: '80%' }} />
                    </div>
                  ))
                )}

              </div>

              {/* Load More Button */}
              {!loading && mods.length > 0 && mods.length % 12 === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.06)' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => searchMods(true)}
                    style={secondaryButtonStyle}
                  >
                    Загрузить ещё
                  </motion.button>
                </div>
              )}

              {/* Empty state */}
              {!loading && mods.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '60px 40px', color: '#71717a' }}>
                  <i className="fa-solid fa-ghost" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}></i>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#a1a1aa', margin: '0 0 4px' }}>Ничего не найдено</h3>
                  <p style={{ fontSize: '12px', margin: 0 }}>Попробуйте изменить поисковый запрос или фильтр категории.</p>
                </div>
              )}

            </div>
          </motion.div>
        ) : (
          
          /* ========================================================================= */
          /* ======================== 2. SPECIFIC MOD DETAILS ======================== */
          /* ========================================================================= */
          <motion.div
            key="details-page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            style={glassPanelStyle}
          >
            {/* Header bar back redirection details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexShrink: 0 }}>
              <motion.button 
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setSelectedMod(null); setSelectedModData(null); }}
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '11px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.07)', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '13px'
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
              </motion.button>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px' }}>Назад к списку модов</span>
            </div>

            {detailsLoading ? (
              <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10b981' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '36px' }}></i>
                  <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600 }}>Загрузка деталей мода...</span>
                </div>
              </div>
            ) : selectedModData ? (
              <div className="custom-scrollbar" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '20px', paddingRight: '4px' }}>
                
                {/* Hero Info Card section: border-radius: 20px */}
                <div style={{ 
                  display: 'flex', 
                  gap: '24px', 
                  alignItems: 'center', 
                  background: 'rgba(10, 10, 16, 0.45)', 
                  border: '1px solid rgba(255,255,255,0.07)', 
                  padding: '24px', 
                  borderRadius: '20px', 
                  flexWrap: 'wrap'
                }}>
                  {selectedModData.icon_url ? (
                    <img src={selectedModData.icon_url} alt={selectedModData.title} style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#71717a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <i className="fa-solid fa-puzzle-piece"></i>
                    </div>
                  )}

                  <div style={{ flexGrow: 1, minWidth: 200 }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff' }}>
                      {selectedModData.title}
                    </h2>
                    <div style={{ margin: '6px 0 0', fontSize: '13px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>
                        <i className="fa-solid fa-user" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                        {selectedMod?.author || 'Разработчик'}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a1a1aa', fontWeight: 600 }}>
                        <i className="fa-solid fa-download" style={{ fontSize: '11px' }}></i> 
                        {selectedModData.downloads?.toLocaleString()} скачиваний
                      </span>
                    </div>
                  </div>

                  {/* Large Hero Action Button */}
                  <motion.button 
                    whileHover={installingTarget !== selectedModData.slug ? { scale: 1.03 } : {}}
                    whileTap={installingTarget !== selectedModData.slug ? { scale: 0.96 } : {}}
                    onClick={() => handleInstallToggle(selectedModData)}
                    disabled={installingTarget === selectedModData.slug}
                    style={{
                      ...actionButtonAccentStyle(!!getInstalledFileName(selectedModData)),
                      padding: '14px 28px',
                      fontSize: '12px'
                    }}
                  >
                    {installingTarget === selectedModData.slug ? (
                      <><i className="fa-solid fa-circle-notch fa-spin"></i> Обработка</>
                    ) : getInstalledFileName(selectedModData) ? (
                      <><i className="fa-solid fa-trash"></i> Удалить модификацию</>
                    ) : (
                      <><i className="fa-solid fa-download"></i> Установить мод</>
                    )}
                  </motion.button>
                </div>

                {/* Main Unified Tabs Container (Full width) */}
                <div style={{ 
                  background: 'rgba(10, 10, 16, 0.35)', 
                  border: '1px solid rgba(255, 255, 255, 0.07)', 
                  borderRadius: '20px', 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Tab menu items bar */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    paddingBottom: '8px', 
                    flexShrink: 0 
                  }}>
                    {[
                      { id: 'description', name: 'Описание', icon: 'fa-align-left' },
                      { id: 'versions', name: `Совместимые версии (${versionsList.length})`, icon: 'fa-code-branch' },
                      { id: 'dependencies', name: `Зависимости (${selectedModData.dependencies?.length || 0})`, icon: 'fa-puzzle-piece' },
                      { id: 'gallery', name: 'Скриншоты', icon: 'fa-images' }
                    ].map(tab => {
                      const isActive = selectedTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedTab(tab.id)}
                          style={{
                            padding: '10px 20px',
                            background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                            color: isActive ? '#10b981' : '#a1a1aa',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'Montserrat',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s',
                            borderBottom: isActive ? '2px solid #10b981' : 'none',
                            borderBottomLeftRadius: isActive ? '0px' : '8px',
                            borderBottomRightRadius: isActive ? '0px' : '8px'
                          }}
                        >
                          <i className={`fa-solid ${tab.icon}`}></i>
                          {tab.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Pane Contents */}
                  <div style={{ minHeight: '300px' }}>
                    
                    {/* TAB 1: Description */}
                    {selectedTab === 'description' && (
                      <div 
                        className="mod-desc-content custom-scrollbar"
                        onClick={handleDescriptionClick}
                        style={{ 
                          fontSize: '13px', 
                          color: '#d4d4d8', 
                          lineHeight: '1.6', 
                          overflowY: 'auto',
                          maxHeight: '500px',
                          paddingRight: '6px'
                        }}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedModData.body) }}
                      />
                    )}

                    {/* TAB 2: Versions List */}
                    {selectedTab === 'versions' && (
                      <div className="custom-scrollbar" style={{ maxHeight: '440px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                        {versionsList.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a', fontSize: '13px' }}>
                            <i className="fa-solid fa-ban" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                            <div>Нет файлов под вашу версию Minecraft ({currentPack.mcVersion})</div>
                          </div>
                        ) : (
                          versionsList.map(v => {
                            const isCurrentFileInstalled = installedMods.includes(v.fileName);
                            const releaseTypeLabel = v.releaseType === 1 ? 'Релиз' : v.releaseType === 2 ? 'Бета' : 'Альфа';
                            const releaseTypeColor = v.releaseType === 1 ? '#10b981' : v.releaseType === 2 ? '#3b82f6' : '#f59e0b';
                            const formattedDate = v.fileDate ? new Date(v.fileDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Неизвестно';
                            
                            return (
                              <div 
                                key={v.id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between', 
                                  gap: '12px', 
                                  background: isCurrentFileInstalled ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)', 
                                  border: isCurrentFileInstalled ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(255,255,255,0.03)',
                                  padding: '10px 16px', 
                                  borderRadius: '12px' 
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                                      {v.displayName}
                                    </span>
                                    <span style={{ fontSize: '9px', fontWeight: 800, background: `${releaseTypeColor}15`, color: releaseTypeColor, border: `1px solid ${releaseTypeColor}30`, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                      {releaseTypeLabel}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'monospace' }}>{v.fileName}</span>
                                    <span>•</span>
                                    <span>{formattedDate}</span>
                                  </div>
                                </div>

                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => isCurrentFileInstalled ? handleUninstallVersion(selectedModData, v.fileName) : handleInstallVersion(selectedModData, v)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: isCurrentFileInstalled ? 'rgba(239, 68, 68, 0.1)' : '#10b981',
                                    color: isCurrentFileInstalled ? '#f87171' : '#fff',
                                    border: isCurrentFileInstalled ? '1px solid rgba(239, 68, 68, 0.15)' : 'none',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  {isCurrentFileInstalled ? 'Удалить' : 'Скачать'}
                                </motion.button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* TAB 3: Dependencies list */}
                    {selectedTab === 'dependencies' && (
                      <div className="custom-scrollbar" style={{ maxHeight: '440px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                        {!selectedModData.dependencies || selectedModData.dependencies.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a', fontSize: '13px' }}>
                            <i className="fa-solid fa-circle-check" style={{ fontSize: '24px', color: '#10b981', marginBottom: '8px' }}></i>
                            <div>Дополнительные библиотеки не требуются</div>
                          </div>
                        ) : (
                          selectedModData.dependencies.map(dep => {
                            const isRequired = dep.relationType === 3;
                            return (
                              <div 
                                key={dep.id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '12px', 
                                  background: 'rgba(255,255,255,0.01)', 
                                  border: '1px solid rgba(255,255,255,0.03)',
                                  padding: '10px 14px', 
                                  borderRadius: '12px',
                                  cursor: dep.slug ? 'pointer' : 'default'
                                }}
                                onClick={() => {
                                  if (dep.slug) {
                                    handleOpenDetails(dep);
                                  }
                                }}
                              >
                                {dep.icon_url ? (
                                  <img src={dep.icon_url} alt={dep.name} style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#71717a' }}>
                                    <i className="fa-solid fa-puzzle-piece"></i>
                                  </div>
                                )}
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: dep.slug ? '#10b981' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.name}</div>
                                  <div style={{ fontSize: '10px', color: '#71717a' }}>ID: {dep.id}</div>
                                </div>
                                <span style={{ 
                                  fontSize: '9px', 
                                  fontWeight: 800, 
                                  background: isRequired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)', 
                                  color: isRequired ? '#f87171' : '#f59e0b',
                                  border: isRequired ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)',
                                  padding: '3px 8px', 
                                  borderRadius: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  {isRequired ? 'Обязательно' : 'Опционально'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* TAB 4: Screenshots gallery */}
                    {selectedTab === 'gallery' && (
                      <div>
                        {!selectedModData.gallery || selectedModData.gallery.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a', fontSize: '13px' }}>
                            <i className="fa-solid fa-image" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                            <div>Изображения отсутствуют</div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                            {selectedModData.gallery.map((img, idx) => (
                              <motion.div 
                                key={idx}
                                whileHover={{ scale: 1.04 }}
                                onClick={() => { setActiveScreenshotIndex(idx); setIsLightboxOpen(true); }}
                                style={{ 
                                  height: '110px', 
                                  borderRadius: '12px', 
                                  overflow: 'hidden', 
                                  background: '#09090b', 
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  cursor: 'pointer'
                                }}
                              >
                                <img src={img.url} alt="screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#71717a' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                <span>Ошибка загрузки данных</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            padding: '40px',
            boxSizing: 'border-box'
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
              style={{ display: 'flex', gap: '20px', marginTop: '20px', alignItems: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button 
                whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveScreenshotIndex(prev => (prev - 1 + selectedModData.gallery.length) % selectedModData.gallery.length)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </motion.button>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#a1a1aa', fontFamily: 'monospace' }}>
                {activeScreenshotIndex + 1} / {selectedModData.gallery.length}
              </span>
              <motion.button 
                whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveScreenshotIndex(prev => (prev + 1) % selectedModData.gallery.length)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </motion.button>
            </div>
          )}
          
          <div style={{ marginTop: '14px', color: '#71717a', fontSize: '11px', fontWeight: 600 }}>
            Кликните в любом месте для закрытия
          </div>
        </div>
      )}
    </div>
  );
}
