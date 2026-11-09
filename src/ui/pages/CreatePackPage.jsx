import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';
import { fetchLoaderVersions } from '../utils/loaderFetcher';
import { getSafeBgUrl, toDisplayUrl, getFilePath } from '../utils/pathUtils';

const DEFAULT_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1280";

const PREDEFINED_COLORS = (lang) => [
  { id: 'default', label: lang === 'ru' ? 'Белый' : 'White', value: '#ffffff' },
  { id: 'emerald', label: lang === 'ru' ? 'Изумрудный' : 'Emerald', value: '#10b981' },
  { id: 'blue', label: lang === 'ru' ? 'Небесный' : 'Sky Blue', value: '#3b82f6' },
  { id: 'purple', label: lang === 'ru' ? 'Фиолетовый' : 'Purple', value: '#8b5cf6' },
  { id: 'rose', label: lang === 'ru' ? 'Розовый' : 'Rose', value: '#f43f5e' },
  { id: 'amber', label: lang === 'ru' ? 'Янтарный' : 'Amber', value: '#f59e0b' },
  { id: 'grad1', label: lang === 'ru' ? 'Градиент: Лес' : 'Gradient: Forest', value: 'linear-gradient(to right, #10b981, #059669)' },
  { id: 'grad2', label: lang === 'ru' ? 'Градиент: Океан' : 'Gradient: Ocean', value: 'linear-gradient(to right, #3b82f6, #06b6d4)' },
  { id: 'grad3', label: lang === 'ru' ? 'Градиент: Киберпанк' : 'Gradient: Cyberpunk', value: 'linear-gradient(to right, #f43f5e, #8b5cf6)' },
  { id: 'grad4', label: lang === 'ru' ? 'Градиент: Огонь' : 'Gradient: Fire', value: 'linear-gradient(to right, #f97316, #eab308)' },
  { id: 'grad5', label: lang === 'ru' ? 'Градиент: Тьма' : 'Gradient: Dark', value: 'linear-gradient(to right, #434343, #000000)' },
];

const FA_ICONS = [
  'fa-solid fa-cube', 'fa-solid fa-gem', 'fa-solid fa-shield-halved', 'fa-solid fa-flask',
  'fa-solid fa-dragon', 'fa-solid fa-bolt', 'fa-solid fa-fire', 'fa-solid fa-ghost', 'fa-solid fa-leaf',
  'fa-solid fa-meteor', 'fa-solid fa-moon', 'fa-solid fa-skull', 'fa-solid fa-star', 'fa-solid fa-sun',
  'fa-solid fa-tree', 'fa-solid fa-water', 'fa-solid fa-wind', 'fa-solid fa-crown', 'fa-solid fa-hammer',
  'fa-solid fa-hat-wizard', 'fa-solid fa-wand-magic-sparkles', 'fa-solid fa-ring', 'fa-solid fa-scroll',
  'fa-solid fa-compass', 'fa-solid fa-map', 'fa-solid fa-book', 'fa-solid fa-feather', 'fa-solid fa-key',
  'fa-solid fa-dungeon', 'fa-solid fa-campground', 'fa-solid fa-mountain'
];

// --- СТИЛЬ КОНТЕЙНЕРА СТРАНИЦЫ: ПОЛНОСТЬЮ ОТКРЫТЫЙ, БЕЗ ТЕМНЫХ ПЛАШЕК ---
const pageContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  background: 'transparent',
  border: 'none',
  padding: '0 4px 12px 4px',
  boxSizing: 'border-box'
};

const inputStyle = {
  background: 'rgba(20, 20, 28, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  borderRadius: '12px',
  color: '#fff',
  padding: '11px 14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  color: '#d4d4d8',
  fontSize: '11px',
  fontWeight: 700,
  marginBottom: '6px',
  letterSpacing: '0.4px',
  fontFamily: 'Montserrat'
};

const specBadgeStyle = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#10b981',
  background: 'rgba(16, 185, 129, 0.1)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  padding: '2px 8px',
  borderRadius: '6px',
  letterSpacing: '0.3px',
  fontFamily: 'Montserrat',
  whiteSpace: 'nowrap'
};

// Configurable Custom Dropdown Component with search support and rich descriptions
function CustomSelect({ label, value, options, onChange, placeholder, showSearch = false }) {
  const { lang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = showSearch
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isOpen && (
        <div 
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998, background: 'transparent' }}
        />
      )}
      <label style={labelStyle}>{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isOpen ? 'rgba(24, 24, 34, 0.85)' : 'rgba(20, 20, 28, 0.6)',
          borderColor: isOpen ? '#10b981' : 'rgba(255, 255, 255, 0.09)',
          boxShadow: isOpen ? '0 0 14px rgba(16, 185, 129, 0.2)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.icon && <i className={selectedOption.icon} style={{ color: selectedOption.color || '#10b981' }} />}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fa-solid ${isOpen ? 'fa-angle-up' : 'fa-angle-down'}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '100%',
              background: 'rgba(20, 20, 28, 0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              padding: '6px',
              zIndex: 999,
              boxShadow: '0 20px 40px rgba(0,0,0,0.65), 0 0 20px rgba(16, 185, 129, 0.08)',
              boxSizing: 'border-box'
            }}
          >
            {showSearch && (
              <div style={{ padding: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '4px' }}>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'Поиск...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '6px 10px',
                    outline: 'none',
                    fontFamily: 'Montserrat',
                    fontSize: '11px',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
            <div className="custom-scrollbar" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: '#71717a', fontSize: '11px' }}>
                  {lang === 'ru' ? 'Ничего не найдено' : 'No results found'}
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: value === opt.value ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: value === opt.value ? '#10b981' : '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (value !== opt.value) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={e => {
                      if (value !== opt.value) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.icon && <i className={opt.icon} style={{ color: opt.color || '#10b981', width: '16px', textAlign: 'center' }} />}
                      <span>{opt.label}</span>
                    </div>
                    {opt.description && (
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', paddingLeft: opt.icon ? '24px' : '0', fontWeight: 500, lineHeight: '1.3' }}>
                        {opt.description}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ИНТЕРАКТИВНОЕ LIVE PREVIEW КАРТОЧКИ (СИНХРОНИЗИРОВАНО С BUILDS PAGE, БЕЗ TRANSFORM) ---
function LivePreviewCard({ name, mcVersion, loaderType, bgImage, bgVideo, icon, faIcon, titleColor, description }) {
  const { lang } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const finalBg = bgImage?.trim() || DEFAULT_BG;
  const finalName = name?.trim() || (lang === 'ru' ? 'Моя Сборка' : 'My Pack');

  const loadersList = [
    { value: 'vanilla', label: 'Vanilla' },
    { value: 'forge', label: 'Forge' },
    { value: 'fabric', label: 'Fabric' },
    { value: 'quilt', label: 'Quilt' },
    { value: 'neoforge', label: 'NeoForge' }
  ];

  const getLoaderColor = () => {
    switch (loaderType) {
      case 'fabric': return '#34d399'; 
      case 'forge': return '#f59e0b'; 
      case 'quilt': return '#ec4899'; 
      case 'neoforge': return '#a78bfa'; 
      default: return '#60a5fa'; 
    }
  };

  const loaderColor = getLoaderColor();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '20px' }}>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '280px',
          height: '210px',
          borderRadius: '20px',
          overflow: 'hidden',
          border: isHovered ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.08)',
          background: isHovered ? 'rgba(24, 24, 32, 0.65)' : 'rgba(18, 18, 24, 0.55)',
          boxShadow: isHovered 
            ? '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.04)' 
            : '0 6px 20px -8px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '22px 18px',
          boxSizing: 'border-box',
          transition: 'border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease'
        }}
      >
        {/* Фоновое видео или фоновый арт */}
        {bgVideo ? (
          <video 
            src={getSafeBgUrl(bgVideo)} 
            autoPlay loop muted 
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0,
              filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
              transition: 'filter 0.3s ease'
            }} 
          />
        ) : (
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              background: `url('${getSafeBgUrl(finalBg)}') center/cover`,
              zIndex: 0,
              filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
              transition: 'filter 0.3s ease'
            }} 
          />
        )}

        {/* Градиент затемнения */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          background: isHovered 
            ? 'linear-gradient(to bottom, rgba(10, 10, 14, 0.38) 0%, rgba(10, 10, 14, 0.88) 100%)' 
            : 'linear-gradient(to bottom, rgba(10, 10, 14, 0.5) 0%, rgba(10, 10, 14, 0.92) 100%)', 
          zIndex: 1,
          transition: 'background 0.3s ease'
        }} />

        {/* Индикатор в левом углу */}
        <div style={{
          position: 'absolute', top: '14px', left: '14px',
          fontSize: '10px', fontWeight: 800,
          color: '#34d399', background: 'rgba(16, 185, 129, 0.16)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          padding: '3px 10px', borderRadius: '20px',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          letterSpacing: '0.4px', zIndex: 10, backdropFilter: 'blur(10px)'
        }}>
          <i className="fa-solid fa-check" style={{ fontSize: '9px' }} />
          {lang === 'ru' ? 'Превью' : 'Preview'}
        </div>

        {/* Иконка сборки */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '14px' }}>
          {icon ? (
            <img 
              src={icon} 
              alt="Icon" 
              style={{ 
                width: '54px', height: '54px', borderRadius: '14px', objectFit: 'contain', 
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' 
              }} 
            />
          ) : faIcon ? (
            <div style={{ 
              width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '26px', color: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' 
            }}>
              <i className={faIcon} />
            </div>
          ) : (
            <div style={{
              width: '54px', height: '54px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${loaderColor}30, rgba(255,255,255,0.05))`,
              border: `1px solid ${loaderColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 800, color: '#fff',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
            }}>
              {finalName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Название */}
        <h4 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '15.5px', 
          fontWeight: 700, 
          textAlign: 'center', 
          letterSpacing: '0.2px',
          width: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          zIndex: 2,
          position: 'relative',
          fontFamily: 'Montserrat',
          ...(titleColor && titleColor.includes('gradient') ? {
            background: titleColor,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            textShadow: 'none'
          } : titleColor ? {
            color: titleColor,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          } : {
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          })
        }}>
          {finalName}
        </h4>

        {/* Теги */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
          <span style={{ 
            fontSize: '10px', fontWeight: 700, color: '#e4e4e7',
            background: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '3px 8px', borderRadius: '8px', fontFamily: 'monospace'
          }}>
            {mcVersion || '1.20.1'}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 800, textTransform: 'capitalize',
            color: loaderColor, background: `${loaderColor}15`, border: `1px solid ${loaderColor}30`,
            padding: '3px 8px', borderRadius: '8px'
          }}>
            {loadersList.find(l => l.value === loaderType)?.label || 'Vanilla'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CreatePackPage({ onCreate, onBack, isActive, editPack }) {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [loaderType, setLoaderType] = useState('vanilla');
  const [customBg, setCustomBg] = useState('');
  const [customBgVideo, setCustomBgVideo] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [faIcon, setFaIcon] = useState('');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [customDir, setCustomDir] = useState('');
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState('');
  const [loaderVersionsList, setLoaderVersionsList] = useState([]);
  const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);

  const [versions, setVersions] = useState([]);
  const [promos, setPromos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mcVersion && loaderType && loaderType !== 'vanilla') {
      setLoadingLoaderVersions(true);
      fetchLoaderVersions(mcVersion, loaderType).then(list => {
        setLoaderVersionsList(list);
        if (list.length > 0) {
          if (editPack && editPack.loaderVersion && list.some(v => v.version === editPack.loaderVersion)) {
            setSelectedLoaderVersion(editPack.loaderVersion);
          } else {
            setSelectedLoaderVersion(list[0].version);
          }
        } else {
          setSelectedLoaderVersion('');
        }
      }).catch(() => {
        setLoaderVersionsList([]);
        setSelectedLoaderVersion('');
      }).finally(() => {
        setLoadingLoaderVersions(false);
      });
    } else {
      setLoaderVersionsList([]);
      setSelectedLoaderVersion('');
    }
  }, [mcVersion, loaderType, editPack]);

  useEffect(() => {
    if (isActive) {
      if (editPack) {
        setName(editPack.name || '');
        setMcVersion(editPack.mcVersion || '');
        setLoaderType(editPack.loaderType || 'vanilla');
        setCustomBg(editPack.bgImage && editPack.bgImage !== DEFAULT_BG ? editPack.bgImage : '');
        setCustomBgVideo(editPack.bgVideo || '');
        setCustomLogo(editPack.logo || '');
        if (editPack.icon && editPack.icon.startsWith('fa-')) {
          setFaIcon(editPack.icon);
          setCustomIcon('');
        } else {
          setCustomIcon(editPack.icon || '');
          setFaIcon('');
        }
        setTitleColor(editPack.titleColor || '#ffffff');
        setCustomDir(editPack.clientDir || '');
      } else {
        setName('');
        setMcVersion('');
        setLoaderType('vanilla');
        setCustomBg('');
        setCustomBgVideo('');
        setCustomIcon('');
        setCustomLogo('');
        setFaIcon('');
        setTitleColor('#ffffff');
        setCustomDir('');
      }
      setActiveTab('basic');
      setError('');
    }
  }, [isActive, editPack]);

  // Load Mojang version manifest & Forge promotions manifest
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        const manifestData = await manifestRes.json();
        
        const releases = manifestData.versions
          .filter(v => v.type === 'release')
          .map(v => v.id);

        const cutOffIndex = releases.indexOf('1.7.10');
        const filteredReleases = cutOffIndex > -1 ? releases.slice(0, cutOffIndex + 1) : releases;

        setVersions(filteredReleases);

        const promosRes = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        const promosData = await promosRes.json();
        setPromos(promosData.promos || {});

        if (!editPack && filteredReleases.length > 0) {
          setMcVersion(filteredReleases[0]);
        }
      } catch (err) {
        console.error("Failed to fetch Minecraft versions manifest:", err);
        setError(lang === 'ru' ? 'Не удалось загрузить список версий Minecraft' : 'Failed to load Minecraft versions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lang, editPack]);

  const getAvailableLoaders = () => {
    if (!mcVersion) return [];
    const available = [{ value: 'vanilla', label: 'Vanilla' }];
    const hasForge = Object.keys(promos).some(key => key.startsWith(mcVersion));
    if (hasForge) available.push({ value: 'forge', label: 'Forge' });

    const parts = mcVersion.split('.').map(p => parseInt(p, 10));
    const major = parts[0] || 0;
    const minor = parts[1] || 0;

    const isFabricSupported = (major > 1) || (major === 1 && minor >= 14);
    if (isFabricSupported) available.push({ value: 'fabric', label: 'Fabric' });

    const isQuiltSupported = (major > 1) || (major === 1 && minor >= 14);
    if (isQuiltSupported) available.push({ value: 'quilt', label: 'Quilt' });

    const isNeoForgeSupported = (major > 1) || (major === 1 && minor >= 20);
    if (isNeoForgeSupported) available.push({ value: 'neoforge', label: 'NeoForge' });

    return available;
  };

  const allLoaders = [
    {
      value: 'vanilla',
      label: 'Vanilla',
      icon: 'fa-solid fa-cubes',
      color: '#60a5fa',
      description: lang === 'ru' ? 'Чистая ванильная игра без модов.' : 'Clean vanilla game without mods.'
    },
    {
      value: 'fabric',
      label: 'Fabric',
      icon: 'fa-solid fa-scroll',
      color: '#34d399',
      description: lang === 'ru' ? 'Легковесный современный загрузчик модов.' : 'Lightweight modern mod loader.'
    },
    {
      value: 'forge',
      label: 'Forge',
      icon: 'fa-solid fa-hammer',
      color: '#f59e0b',
      description: lang === 'ru' ? 'Классическое ядро с наибольшим количеством сюжетных модов.' : 'Classic core with massive mod variety.'
    },
    {
      value: 'quilt',
      label: 'Quilt',
      icon: 'fa-solid fa-feather-pointed',
      color: '#ec4899',
      description: lang === 'ru' ? 'Современная альтернатива Fabric.' : 'Modern mod loader alternative to Fabric.'
    },
    {
      value: 'neoforge',
      label: 'NeoForge',
      icon: 'fa-solid fa-shield-halved',
      color: '#a78bfa',
      description: lang === 'ru' ? 'Улучшенное продолжение Forge для современных версий (1.20.1+).' : 'Next-gen Forge continuation for 1.20.1+.'
    }
  ];

  const loadersList = allLoaders.filter(l => getAvailableLoaders().some(avail => avail.value === l.value));

  useEffect(() => {
    if (mcVersion && Object.keys(promos).length > 0) {
      const validKeys = loadersList.map(l => l.value);
      if (!validKeys.includes(loaderType)) {
        setLoaderType('vanilla');
      }
    }
  }, [mcVersion, promos]);

  const activeLoader = allLoaders.find(l => l.value === loaderType) || allLoaders[0];

  const handleCreate = (e) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 3) {
      setError(lang === 'ru' ? 'Название сборки должно быть не менее 3 символов' : 'Pack name must be at least 3 characters');
      return;
    }
    
    if (!mcVersion) {
      setError(lang === 'ru' ? 'Пожалуйста, выберите версию игры' : 'Please select game version');
      return;
    }

    const translit = (str) => {
      const ru = 'А-а-Б-б-В-в-Г-г-Д-д-Е-е-Ё-ё-Ж-ж-З-з-И-и-Й-й-К-к-Л-л-М-м-Н-н-О-о-П-п-Р-р-С-с-Т-т-У-у-Ф-ф-Х-х-Ц-ц-Ч-ч-Ш-ш-Щ-щ-Ъ-ъ-Ы-ы-Ь-ь-Э-э-Ю-ю-Я-я'.split('-');
      const en = 'A-a-B-b-V-v-G-g-D-d-E-e-E-e-Zh-zh-Z-z-I-i-Y-y-K-k-L-l-M-m-N-n-O-o-P-p-R-r-S-s-T-t-U-u-F-f-H-h-Ts-ts-Ch-ch-Sh-sh-Sch-sch---y---E-e-Yu-yu-Ya-ya'.split('-');
      let res = '';
      for(let i=0; i<str.length; i++) {
        const idx = ru.indexOf(str[i]);
        res += idx >= 0 ? en[idx] : str[i];
      }
      return res;
    };
    const safeName = translit(name.trim()).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'pack';
    const id = editPack ? editPack.id : `custom-${safeName}-${Date.now()}`;
    
    let clientDir = editPack ? editPack.clientDir : `.${safeName}-client`;
    let serverDir = editPack ? (editPack.serverDir || `${clientDir}-server`) : `.${safeName}-server`;
    if (customDir.trim() && (!editPack || customDir.trim() !== editPack.clientDir)) {
      clientDir = customDir.trim();
      serverDir = `${customDir.trim()}-server`;
    }

    const newPack = {
      ...(editPack || {}),
      id,
      name: name.trim(),
      mcVersion,
      loaderType,
      isCustom: true,
      clientDir,
      serverDir,
      bgImage: customBg.trim() || DEFAULT_BG,
      bgVideo: customBgVideo.trim() || "",
      icon: customIcon.trim() || faIcon || "",
      logo: customLogo.trim() || "",
      titleColor: titleColor || "#ffffff"
    };

    if (loaderType !== 'vanilla' && selectedLoaderVersion) {
      newPack.loaderVersion = selectedLoaderVersion;
    }

    onCreate(newPack);
  };

  return (
    <div style={pageContainerStyle} className="tab-enter">
      {/* --- ШАПКА: Кнопка Назад, Заголовок и Табы в одну линию --- */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '18px', 
        flexShrink: 0,
        gap: '16px' 
      }}>
        {/* Левая часть: Стрелка назад + Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(20, 20, 28, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#fff',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
            }}
            title={lang === 'ru' ? "Назад к сборкам" : "Back to packs"}
          >
            <i className="fa-solid fa-arrow-left-long" />
          </button>

          <h2 style={{ 
            margin: 0, 
            fontSize: '22px', 
            fontWeight: 800, 
            fontFamily: 'Montserrat', 
            color: '#ffffff', 
            letterSpacing: '0.3px' 
          }}>
            {editPack 
              ? (lang === 'ru' ? 'Редактирование сборки' : 'Edit Pack') 
              : (lang === 'ru' ? 'Создание сборки' : 'New Pack')}
          </h2>
        </div>

        {/* Правая часть: Переключатели вкладок в одну строку */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(20, 20, 28, 0.6)', 
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '3px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.08)' 
        }}>
          <button 
            type="button"
            onClick={() => setActiveTab('basic')}
            style={{ 
              padding: '7px 18px', 
              borderRadius: '9px', 
              background: activeTab === 'basic' ? 'rgba(59, 130, 246, 0.18)' : 'transparent', 
              border: activeTab === 'basic' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent', 
              color: activeTab === 'basic' ? '#60a5fa' : '#a1a1aa', 
              fontWeight: 700, 
              fontSize: '12px', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '7px',
              fontFamily: 'Montserrat'
            }}
          >
            <i className="fa-solid fa-cube" style={{ fontSize: '11px' }} />
            <span>{lang === 'ru' ? 'Основные' : 'Basic'}</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('design')}
            style={{ 
              padding: '7px 18px', 
              borderRadius: '9px', 
              background: activeTab === 'design' ? 'rgba(16, 185, 129, 0.18)' : 'transparent', 
              border: activeTab === 'design' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent', 
              color: activeTab === 'design' ? '#34d399' : '#a1a1aa', 
              fontWeight: 700, 
              fontSize: '12px', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '7px',
              fontFamily: 'Montserrat'
            }}
          >
            <i className="fa-solid fa-palette" style={{ fontSize: '11px' }} />
            <span>{lang === 'ru' ? 'Оформление' : 'Design'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '38px', height: '38px', border: '3px solid rgba(16, 185, 129, 0.15)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: '14px', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', fontFamily: 'Montserrat' }}>
            {lang === 'ru' ? 'Загрузка списков версий...' : 'Loading versions...'}
          </span>
        </div>
      ) : (
        <div style={{ flexGrow: 1, display: 'flex', gap: '28px', overflow: 'hidden' }}>
          
          {/* Левая колонка: Форма настроек */}
          <div style={{ flex: '1.25', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '8px' }}>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {activeTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Название сборки' : 'Pack Name'}</label>
                    <input
                      type="text"
                      placeholder={lang === 'ru' ? 'Например: Мой ТехноМир' : 'e.g. My Tech World'}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', zIndex: 100 }}>
                    <div style={{ flex: 1 }}>
                      <CustomSelect
                        label={lang === 'ru' ? 'Версия игры' : 'Game Version'}
                        value={mcVersion}
                        options={versions.map(v => ({ value: v, label: v }))}
                        onChange={setMcVersion}
                        placeholder={lang === 'ru' ? 'Выберите версию' : 'Select version'}
                        showSearch={true}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <CustomSelect
                        label={lang === 'ru' ? 'Загрузчик / Ядро' : 'Loader / Core'}
                        value={loaderType}
                        options={loadersList}
                        onChange={setLoaderType}
                        placeholder={lang === 'ru' ? 'Выберите ядро' : 'Select core'}
                      />
                    </div>

                    {loaderType !== 'vanilla' && (
                      <div style={{ flex: 1 }}>
                        <CustomSelect
                          label={lang === 'ru' ? 'Версия ядра' : 'Loader Version'}
                          value={selectedLoaderVersion}
                          options={loaderVersionsList.map(v => ({
                            value: v.version,
                            label: `${v.version} ${v.isRecommended ? (lang === 'ru' ? '(Реком.)' : '(Rec.)') : ''}`.trim()
                          }))}
                          onChange={setSelectedLoaderVersion}
                          placeholder={loadingLoaderVersions ? (lang === 'ru' ? 'Загрузка...' : 'Loading...') : (lang === 'ru' ? 'Версия ядра' : 'Core version')}
                          showSearch={true}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Путь к папке сборки (Опционально)' : 'Pack Folder Path (Optional)'}</label>
                    <input
                      type="text"
                      placeholder={lang === 'ru' ? 'Например: D:\\Games\\MyPack (по умолчанию div-launcher)' : 'e.g. D:\\Games\\MyPack'}
                      value={customDir}
                      onChange={e => setCustomDir(e.target.value)}
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'design' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Фон (Изображение) со спецификацией размера */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        {lang === 'ru' ? 'Фон (Изображение)' : 'Background (Image)'}
                      </label>
                      <span style={specBadgeStyle}>1920×1080 (16:9) • JPG / WebP &lt; 1.5 МБ</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={lang === 'ru' ? 'URL или путь к файлу...' : 'URL or file path...'}
                        value={toDisplayUrl(customBg)}
                        onChange={e => setCustomBg(getSafeBgUrl(e.target.value))}
                        style={{ ...inputStyle, flexGrow: 1 }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      />
                      <label 
                        style={{ 
                          background: 'rgba(20, 20, 28, 0.6)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)'}
                        title={lang === 'ru' ? 'Выбрать файл' : 'Browse'}
                      >
                        <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          if (e.target.files[0]) {
                            const filePath = getFilePath(e.target.files[0]);
                            if (filePath) setCustomBg(getSafeBgUrl(filePath));
                          }
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Фон (Видео) со спецификацией размера */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        {lang === 'ru' ? 'Фон (Видео)' : 'Background (Video)'}
                      </label>
                      <span style={specBadgeStyle}>1920×1080 (16:9) • MP4 без звука &lt; 25 МБ</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={lang === 'ru' ? 'URL видео (.mp4)...' : 'Video URL (.mp4)...'}
                        value={toDisplayUrl(customBgVideo)}
                        onChange={e => setCustomBgVideo(getSafeBgUrl(e.target.value))}
                        style={{ ...inputStyle, flexGrow: 1 }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      />
                      <label 
                        style={{ 
                          background: 'rgba(20, 20, 28, 0.6)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)'}
                        title={lang === 'ru' ? 'Выбрать видео' : 'Browse'}
                      >
                        <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                        <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => {
                          if (e.target.files[0]) {
                            const filePath = getFilePath(e.target.files[0]);
                            if (filePath) setCustomBgVideo(getSafeBgUrl(filePath));
                          }
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Иконка сборки со спецификацией размера */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        {lang === 'ru' ? 'Иконка сборки' : 'Pack Icon'}
                      </label>
                      <span style={specBadgeStyle}>128×128 (1:1) • PNG с прозрачностью</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={lang === 'ru' ? 'URL иконки...' : 'Icon URL...'}
                        value={toDisplayUrl(customIcon)}
                        onChange={e => { setCustomIcon(getSafeBgUrl(e.target.value)); setFaIcon(''); }}
                        style={{ ...inputStyle, flexGrow: 1 }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      />
                      <label 
                        style={{ 
                          background: 'rgba(20, 20, 28, 0.6)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)'}
                        title={lang === 'ru' ? 'Выбрать файл' : 'Browse'}
                      >
                        <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          if (e.target.files[0]) {
                            const filePath = getFilePath(e.target.files[0]);
                            if (filePath) { setCustomIcon(getSafeBgUrl(filePath)); setFaIcon(''); }
                          }
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Логотип сборки (для шапки страницы клиента) со спецификацией размера */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        {lang === 'ru' ? 'Логотип сборки (Опционально)' : 'Pack Logo (Optional)'}
                      </label>
                      <span style={specBadgeStyle}>800×200 (4:1) • PNG прозрачный фон</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={lang === 'ru' ? 'URL логотипа для шапки клиента...' : 'Header logo URL...'}
                        value={toDisplayUrl(customLogo)}
                        onChange={e => setCustomLogo(getSafeBgUrl(e.target.value))}
                        style={{ ...inputStyle, flexGrow: 1 }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      />
                      <label 
                        style={{ 
                          background: 'rgba(20, 20, 28, 0.6)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)'}
                        title={lang === 'ru' ? 'Выбрать логотип' : 'Browse'}
                      >
                        <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          if (e.target.files[0]) {
                            const filePath = getFilePath(e.target.files[0]);
                            if (filePath) setCustomLogo(getSafeBgUrl(filePath));
                          }
                        }} />
                      </label>
                    </div>
                  </div>

                  {/* Готовые иконки */}
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Или выберите готовую иконку:' : 'Or select pre-made icon:'}</label>
                    <div className="custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '6px', maxHeight: '90px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {FA_ICONS.map(i => (
                        <div 
                          key={i} 
                          onClick={() => { setFaIcon(i); setCustomIcon(''); }} 
                          style={{ 
                            cursor: 'pointer', height: '34px', borderRadius: '8px', 
                            background: faIcon === i ? 'rgba(59,130,246,0.3)' : 'transparent', 
                            border: faIcon === i ? '1px solid #3b82f6' : '1px solid transparent', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            transition: 'all 0.15s ease' 
                          }}
                          onMouseEnter={e => { if(faIcon !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={e => { if(faIcon !== i) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <i className={i} style={{ color: faIcon === i ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '15px' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Цвет названия */}
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Цвет названия' : 'Title Color'}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {PREDEFINED_COLORS(lang).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setTitleColor(c.value)} 
                          title={c.label} 
                          style={{ 
                            cursor: 'pointer', width: '26px', height: '26px', borderRadius: '50%', 
                            background: c.value, 
                            border: titleColor === c.value ? '2px solid #fff' : '2px solid transparent', 
                            transition: 'all 0.2s ease', 
                            boxShadow: titleColor === c.value ? '0 0 10px rgba(255,255,255,0.4)' : 'none'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '12px',
                  padding: '10px 14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Montserrat'
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '13px' }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Кнопки действий формы */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1.2,
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Montserrat'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.26)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                  }}
                >
                  {editPack ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : (lang === 'ru' ? 'Создать сборку' : 'Create Pack')}
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    flex: 0.8,
                    background: 'rgba(20, 20, 28, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    color: '#d4d4d8',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Montserrat'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(20, 20, 28, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>

          {/* Правая колонка: Live Preview карточки */}
          <div style={{
            flex: '0.85',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            background: 'transparent',
            padding: '4px',
            height: '100%',
            overflowY: 'auto'
          }}>
            <LivePreviewCard
              name={name}
              mcVersion={mcVersion}
              loaderType={loaderType}
              bgImage={customBg}
              bgVideo={customBgVideo}
              icon={customIcon}
              faIcon={faIcon}
              titleColor={titleColor}
              description={activeLoader.description}
            />
          </div>

        </div>
      )}
    </div>
  );
}
