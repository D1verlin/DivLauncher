import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

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

const glassPanelStyle = {
  background: 'rgba(15, 15, 20, 0.45)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '25px',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden'
};

const inputStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#fff',
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'border-color 0.25s, box-shadow 0.25s',
};

const labelStyle = {
  display: 'block',
  color: '#a1a1aa',
  fontSize: '10px',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: '8px',
  letterSpacing: '1.5px',
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
          borderColor: isOpen ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
          boxShadow: isOpen ? '0 0 10px rgba(16,185,129,0.15)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedOption?.icon && <i className={selectedOption.icon} style={{ color: selectedOption.color || '#10b981' }} />}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fa-solid ${isOpen ? 'fa-angle-up' : 'fa-angle-down'}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '75px',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'rgba(20, 20, 25, 0.96)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              maxHeight: '260px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {showSearch && (
              <div style={{ padding: '4px', position: 'sticky', top: 0, background: 'rgba(20, 20, 25, 0.96)', zIndex: 1001, marginBottom: '4px' }}>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'Поиск версии...' : 'Search version...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px 12px',
                    width: '100%',
                    outline: 'none',
                    fontSize: '12px',
                    fontFamily: 'Montserrat',
                    fontWeight: 600
                  }}
                />
              </div>
            )}
            
            <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                  {lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}
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
                      padding: opt.description ? '10px 14px' : '8px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: opt.value === value ? (opt.color || '#34d399') : '#fff',
                      background: opt.value === value ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? 'rgba(255, 255, 255, 0.06)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                        {opt.icon && <i className={opt.icon} style={{ color: opt.color || '#10b981', width: '16px', textAlign: 'center' }} />}
                        {opt.label}
                      </span>
                      {opt.value === value && <i className="fa-solid fa-check" style={{ color: opt.color || '#10b981', fontSize: '12px' }} />}
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

// LivePreviewCard Component
function LivePreviewCard({ name, mcVersion, loaderType, bgImage, bgVideo, icon, faIcon, titleColor, description }) {
  const { lang } = useTranslation();
  const finalBg = bgImage?.trim() || DEFAULT_BG;
  const finalName = name?.trim() || (lang === 'ru' ? 'Моя Сборка' : 'My Pack');
  const titleStyle = titleColor && titleColor.includes('gradient') 
    ? { background: titleColor, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', textShadow: 'none' } 
    : { color: titleColor || '#fff', background: 'none', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset' };

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

  const getLoaderBg = () => {
    switch (loaderType) {
      case 'fabric': return 'rgba(52, 211, 153, 0.1)';
      case 'forge': return 'rgba(245, 158, 11, 0.1)';
      case 'quilt': return 'rgba(236, 72, 153, 0.1)';
      case 'neoforge': return 'rgba(167, 139, 250, 0.1)';
      default: return 'rgba(96, 165, 250, 0.1)';
    }
  };

  const getLoaderBorder = () => {
    switch (loaderType) {
      case 'fabric': return 'rgba(52, 211, 153, 0.2)';
      case 'forge': return 'rgba(245, 158, 11, 0.2)';
      case 'quilt': return 'rgba(236, 72, 153, 0.2)';
      case 'neoforge': return 'rgba(167, 139, 250, 0.2)';
      default: return 'rgba(96, 165, 250, 0.2)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '25px' }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '180px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.3s, box-shadow 0.3s'
      }} className="hover-card">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}>
          {bgVideo ? (
            <video src={bgVideo} autoPlay loop muted style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', width: '100%', height: '100%', background: `url('${finalBg}') center/cover` }} />
          )}
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(15,15,20,0.3), rgba(15,15,20,0.9))' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          {icon ? (
            <img src={icon} alt="Icon" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))', marginBottom: '12px' }} />
          ) : faIcon ? (
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', marginBottom: '12px' }}>
              <i className={faIcon} />
            </div>
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 900, color: '#fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '12px'
            }}>
              {finalName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <h3 key={titleColor} style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', ...titleStyle }}>
            {finalName}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>Minecraft {mcVersion || '...'}</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{
              fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
              color: getLoaderColor(), background: getLoaderBg(), border: `1px solid ${getLoaderBorder()}`,
              padding: '2px 6px', borderRadius: '6px'
            }}>
              {loadersList.find(l => l.value === loaderType)?.label || 'Vanilla'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '16px' }}>
          <i className="fa-solid fa-circle-info" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{lang === 'ru' ? 'Информация' : 'Information'}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
            {lang === 'ru' 
              ? 'Эта карточка показывает, как ваша сборка будет выглядеть в общем списке сборок. Убедитесь, что текст хорошо читается на выбранном фоне!' 
              : 'This card shows how your pack will look in the main list. Make sure the text is readable on the selected background!'}
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
  const [faIcon, setFaIcon] = useState('');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [customDir, setCustomDir] = useState('');

  const [versions, setVersions] = useState([]);
  const [promos, setPromos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isActive) {
      if (editPack) {
        setName(editPack.name || '');
        setMcVersion(editPack.mcVersion || '');
        setLoaderType(editPack.loaderType || 'vanilla');
        setCustomBg(editPack.bgImage && editPack.bgImage !== DEFAULT_BG ? editPack.bgImage : '');
        setCustomBgVideo(editPack.bgVideo || '');
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

        // 1. Fetch versions manifest
        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        const manifestData = await manifestRes.json();
        
        // Filter releases only, down to version 1.7.10
        const releases = manifestData.versions
          .filter(v => v.type === 'release')
          .map(v => v.id);

        const cutOffIndex = releases.indexOf('1.7.10');
        const filteredReleases = cutOffIndex > -1 ? releases.slice(0, cutOffIndex + 1) : releases;

        setVersions(filteredReleases);

        // 2. Fetch Forge promotions
        const promosRes = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        const promosData = await promosRes.json();
        setPromos(promosData.promos || {});

        // Only set default version when creating new pack (not editing)
        // editPack's version is set via the isActive effect above
        if (filteredReleases.length > 0 && !editPack) {
          setMcVersion(filteredReleases[0]);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic manifests:", err);
        setError(lang === 'ru' ? 'Не удалось загрузить списки версий. Проверьте подключение к сети.' : 'Failed to load versions list. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute available loaders for selected Minecraft version
  const getAvailableLoaders = () => {
    if (!mcVersion) return [{ value: 'vanilla', label: 'Vanilla' }];

    const list = [{ value: 'vanilla', label: 'Vanilla' }];

    const versionParts = mcVersion.split('.');
    const minorVersion = parseInt(versionParts[1] || '0', 10);
    const patchVersion = parseInt(versionParts[2] || '0', 10);

    // Fabric check (Minecraft version >= 1.14)
    if (minorVersion >= 14) {
      list.push({ value: 'fabric', label: 'Fabric' });
      list.push({ value: 'quilt', label: 'Quilt' });
    }

    // Forge check (check promotions manifest)
    const hasForge = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`] || promos[mcVersion];
    if (hasForge) {
      list.push({ value: 'forge', label: 'Forge' });
    }

    // NeoForge check (Minecraft version >= 1.20.1)
    if (minorVersion > 20 || (minorVersion === 20 && patchVersion >= 1)) {
      list.push({ value: 'neoforge', label: 'NeoForge' });
    }

    return list;
  };

  const allLoaders = [
    {
      value: 'vanilla',
      label: 'Vanilla',
      icon: 'fa-solid fa-cubes',
      color: '#60a5fa',
      description: lang === 'ru' ? 'Чистая ванильная игра без модов. Идеально для стандартного режима.' : 'Clean vanilla game without mods. Ideal for standard gameplay.'
    },
    {
      value: 'fabric',
      label: 'Fabric',
      icon: 'fa-solid fa-scroll',
      color: '#34d399',
      description: lang === 'ru' ? 'Легковесный современный загрузчик модов. Высокая производительность и совместимость.' : 'Lightweight modern mod loader. High performance and compatibility.'
    },
    {
      value: 'forge',
      label: 'Forge',
      icon: 'fa-solid fa-hammer',
      color: '#f59e0b',
      description: lang === 'ru' ? 'Классическое ядро с наибольшим количеством крупных сюжетных и технических модов.' : 'Classic core with the largest amount of major storyline and technical mods.'
    },
    {
      value: 'quilt',
      label: 'Quilt',
      icon: 'fa-solid fa-feather-pointed',
      color: '#ec4899',
      description: lang === 'ru' ? 'Современный загрузчик модов, созданный как альтернатива Fabric. Поддерживает большинство модов Fabric.' : 'Modern mod loader designed as an alternative to Fabric. Supports most Fabric mods.'
    },
    {
      value: 'neoforge',
      label: 'NeoForge',
      icon: 'fa-solid fa-shield-halved',
      color: '#a78bfa',
      description: lang === 'ru' ? 'Новое улучшенное продолжение проекта Forge для современных версий Minecraft (1.20.1+).' : 'New improved continuation of Forge project for modern Minecraft versions (1.20.1+).'
    }
  ];

  const loadersList = allLoaders.filter(l => getAvailableLoaders().some(avail => avail.value === l.value));

  // Reset loader if selected version doesn't support the current active loader
  // Note: only reset when promos data is already loaded to avoid premature resets while editing
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
    
    let clientDir = `.${safeName}-client`;
    let serverDir = `.${safeName}-server`;
    if (customDir.trim()) {
      clientDir = customDir.trim();
      serverDir = `${customDir.trim()}-server`;
    } else if (editPack) {
      clientDir = editPack.clientDir;
      serverDir = editPack.serverDir;
    }

    const newPack = {
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
      titleColor: titleColor || "#ffffff",
      logo: "" // Text title fallback will render on ClientPage
    };

    if (loaderType === 'fabric') {
      newPack.loaderVersion = '0.16.10'; // Stable Fabric loader version
      newPack.installerUrl = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.1.1/fabric-installer-1.1.1.jar';
      newPack.installerName = 'fabric-installer-1.1.1.jar';
    } else if (loaderType === 'quilt') {
      newPack.loaderVersion = '0.26.3'; // Stable Quilt loader version
      newPack.installerUrl = 'https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.14.1/quilt-installer-0.14.1.jar';
      newPack.installerName = 'quilt-installer-0.14.1.jar';
    } else if (loaderType === 'forge') {
      // Find forge version
      const forgeVersion = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`] || promos[mcVersion];
      if (!forgeVersion) {
        setError(lang === 'ru' ? `Версия Forge для Minecraft ${mcVersion} не найдена.` : `Forge version for Minecraft ${mcVersion} not found.`);
        return;
      }
      newPack.forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`;
      newPack.forgeInstallerName = `forge-${mcVersion}-${forgeVersion}-installer.jar`;
    } else if (loaderType === 'neoforge') {
      const neoForgeVersions = {
        '1.20.1': '20.1.89',
        '1.20.2': '20.2.93',
        '1.20.4': '20.4.251',
        '1.20.6': '20.6.139',
        '1.21': '21.0.167',
        '1.21.1': '21.1.233',
        '1.21.2': '21.2.1-beta',
        '1.21.3': '21.3.96',
        '1.21.4': '21.4.157'
      };
      let neoVersion = neoForgeVersions[mcVersion];
      if (!neoVersion) {
        const parts = mcVersion.split('.');
        const minor = parts[1] || '21';
        const patch = parts[2] || '0';
        neoVersion = `${minor}.${patch}.150`; // Fallback to a higher patch to avoid 404 (e.g., .150 instead of .9)
      }
      newPack.forgeUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVersion}/neoforge-${neoVersion}-installer.jar`;
      newPack.forgeInstallerName = `neoforge-${neoVersion}-installer.jar`;
    }

    onCreate(newPack);
    onBack();
  };

  return (
    <div style={glassPanelStyle} className="tab-enter">
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', zIndex: 10 }}>
        <motion.button
          whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          title={lang === 'ru' ? "Назад к сборкам" : "Back to packs"}
        >
          <i className="fa-solid fa-arrow-left-long" />
        </motion.button>

        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {editPack ? (lang === 'ru' ? 'Настройка сборки' : 'Pack Settings') : (lang === 'ru' ? 'Создание сборки' : 'Create Pack')}
          </h2>
          <p style={{ margin: 0, color: '#10b981', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {editPack ? (lang === 'ru' ? 'Изменение оформления вашей сборки' : 'Change layout of your pack') : (lang === 'ru' ? 'Настройте персональный профиль игрового клиента и сервера' : 'Configure custom client and server profile')}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} 
            style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: '15px' }} 
          />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {lang === 'ru' ? 'Загрузка списков версий с Mojang...' : 'Loading versions list from Mojang...'}
          </span>
        </div>
      ) : (
        <div style={{ flexGrow: 1, display: 'flex', gap: '30px', overflow: 'hidden', paddingBottom: '10px' }}>
          
          {/* Left Column: Form Parameters */}
          <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                type="button"
                onClick={() => setActiveTab('basic')}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: activeTab === 'basic' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeTab === 'basic' ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent', color: activeTab === 'basic' ? '#60a5fa' : '#a1a1aa', fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-cube" />
                {lang === 'ru' ? 'ОСНОВНЫЕ' : 'BASIC'}
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('design')}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: activeTab === 'design' ? 'rgba(16,185,129,0.15)' : 'transparent', border: activeTab === 'design' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent', color: activeTab === 'design' ? '#34d399' : '#a1a1aa', fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-palette" />
                {lang === 'ru' ? 'ОФОРМЛЕНИЕ' : 'DESIGN'}
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeTab === 'basic' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Название сборки' : 'Pack Name'}</label>
                    <motion.input
                      whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
                      type="text"
                      placeholder={lang === 'ru' ? 'Например: Мой ТехноМир' : 'e.g. My Tech World'}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '15px', zIndex: 100 }}>
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
                  </div>

                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Путь к папке сборки (Опционально)' : 'Pack Folder Path (Optional)'}</label>
                    <motion.input
                      whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
                      type="text"
                      placeholder={lang === 'ru' ? 'Например: D:\\Games\\MyPack (оставьте пустым для стандартного)' : 'e.g. D:\\Games\\MyPack (leave empty for default)'}
                      value={customDir}
                      onChange={e => setCustomDir(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'design' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>


                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>{lang === 'ru' ? 'Фон (Изображение)' : 'Background (Image)'}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <motion.input
                            whileFocus={{ borderColor: 'rgba(59,130,246,0.6)' }}
                            type="text"
                            placeholder={lang === 'ru' ? 'URL изображения...' : 'Image URL...'}
                            value={customBg}
                            onChange={e => setCustomBg(e.target.value)}
                            style={{ ...inputStyle, flexGrow: 1 }}
                          />
                          <label style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                            cursor: 'pointer', transition: '0.2s'
                          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                            <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                              if(e.target.files[0]) setCustomBg(`local-file://${e.target.files[0].path.replace(/\\/g, '/')}`);
                            }} />
                          </label>
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>{lang === 'ru' ? 'Фон (Видео)' : 'Background (Video)'}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <motion.input
                            whileFocus={{ borderColor: 'rgba(59,130,246,0.6)' }}
                            type="text"
                            placeholder={lang === 'ru' ? 'URL видео (.mp4/.webm)' : 'Video URL (.mp4/.webm)'}
                            value={customBgVideo}
                            onChange={e => setCustomBgVideo(e.target.value)}
                            style={{ ...inputStyle, flexGrow: 1 }}
                          />
                          <label style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                            cursor: 'pointer', transition: '0.2s'
                          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                            <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                            <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => {
                              if(e.target.files[0]) setCustomBgVideo(`local-file://${e.target.files[0].path.replace(/\\/g, '/')}`);
                            }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Иконка (Свое изображение)' : 'Icon (Custom Image)'}</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.input
                          whileFocus={{ borderColor: 'rgba(59,130,246,0.6)' }}
                          type="text"
                          placeholder={lang === 'ru' ? 'URL иконки...' : 'Icon URL...'}
                          value={customIcon}
                          onChange={e => { setCustomIcon(e.target.value); setFaIcon(''); }}
                          style={{ ...inputStyle, flexGrow: 1 }}
                        />
                        <label style={{ 
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center',
                          cursor: 'pointer', transition: '0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                          <i className="fa-solid fa-folder-open" style={{ color: '#60a5fa' }} />
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            if(e.target.files[0]) { setCustomIcon(`local-file://${e.target.files[0].path.replace(/\\/g, '/')}`); setFaIcon(''); }
                          }} />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Или выберите готовую иконку:' : 'Or select pre-made icon:'}</label>
                      <div className="custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '6px', maxHeight: '110px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {FA_ICONS.map(i => (
                          <div key={i} onClick={() => { setFaIcon(i); setCustomIcon(''); }} style={{ cursor: 'pointer', height: '36px', borderRadius: '8px', background: faIcon === i ? 'rgba(59,130,246,0.3)' : 'transparent', border: faIcon === i ? '1px solid #3b82f6' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => { if(faIcon !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }} onMouseLeave={e => { if(faIcon !== i) e.currentTarget.style.background = 'transparent' }}>
                            <i className={i} style={{ color: faIcon === i ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '16px' }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Цвет оформления текста' : 'Text Style Color'}</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {PREDEFINED_COLORS(lang).map(c => (
                          <div key={c.id} onClick={() => setTitleColor(c.value)} title={c.label} style={{ cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', background: c.value, border: titleColor === c.value ? '2px solid #fff' : '2px solid transparent', transition: 'all 0.2s', boxShadow: titleColor === c.value ? '0 0 10px rgba(255,255,255,0.4)' : 'none', transform: titleColor === c.value ? 'scale(1.15)' : 'scale(1)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '12px',
                  padding: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '14px' }} />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  style={{
                    flex: 1.2,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    cursor: 'pointer'
                  }}
                >
                  {editPack ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : (lang === 'ru' ? 'Создать сборку' : 'Create Pack')}
                </motion.button>
                <motion.button
                  whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onBack}
                  style={{
                    flex: 0.8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    cursor: 'pointer'
                  }}
                >
                  {t('cancel')}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Preview Panel */}
          <div style={{
            flex: '0.8',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '20px',
            padding: '25px',
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
