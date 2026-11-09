import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';
import { getSafeBgUrl } from '../utils/pathUtils';
import PromotePackModal from '../components/PromotePackModal';

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

const searchInputStyle = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  color: '#fff',
  padding: '9px 14px 9px 36px',
  width: '210px',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all 0.25s ease'
};

// --- КОМПОНЕНТ ЭЛЕМЕНТА КОНТЕКСТНОГО МЕНЮ ---
function ContextMenuItem({ icon, iconColor, label, onClick, danger = false }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '9px 12px',
        borderRadius: '10px',
        cursor: 'pointer',
        background: isHovered 
          ? (danger ? 'rgba(239, 68, 68, 0.16)' : 'rgba(255, 255, 255, 0.09)') 
          : 'transparent',
        color: danger 
          ? (isHovered ? '#fca5a5' : '#ef4444') 
          : (isHovered ? '#ffffff' : '#d4d4d8'),
        fontFamily: 'Montserrat',
        fontSize: '12.5px',
        fontWeight: 600,
        transition: 'all 0.15s ease'
      }}
    >
      <i 
        className={icon} 
        style={{ 
          width: '16px', 
          textAlign: 'center', 
          color: danger ? '#ef4444' : iconColor, 
          fontSize: '12.5px' 
        }} 
      />
      <span>{label}</span>
    </div>
  );
}

// --- КАРТОЧКА СБОРКИ (БЕЗ ТРАНСФОРМАЦИЙ / СВЕТОВОЙ HOVER) ---
function ModpackCard({
  pack,
  isActive,
  loaderColor,
  onSelect,
  onContextMenu,
  lang,
  t
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(pack)}
      onContextMenu={(e) => onContextMenu(e, pack)}
      style={{
        height: '210px',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        border: isActive 
          ? '1.5px solid rgba(16, 185, 129, 0.65)' 
          : (isHovered ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.07)'),
        background: isHovered ? 'rgba(24, 24, 32, 0.65)' : 'rgba(18, 18, 24, 0.55)',
        boxShadow: isActive 
          ? (isHovered ? '0 12px 32px -8px rgba(16, 185, 129, 0.45)' : '0 10px 28px -10px rgba(16, 185, 129, 0.35)') 
          : (isHovered ? '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.04)' : '0 6px 20px -8px rgba(0, 0, 0, 0.5)'),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '22px 18px',
        boxSizing: 'border-box',
        transition: 'border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease'
      }}
    >
      {/* Фоновое видео или изображение с мягким увеличением яркости */}
      {pack.bgVideo ? (
        <video
          autoPlay loop muted
          src={pack.bgVideo}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0,
            filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
            transition: 'filter 0.3s ease'
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: pack.bgImage 
              ? `url('${getSafeBgUrl(pack.bgImage)}') center/cover` 
              : 'linear-gradient(135deg, #14141a, #1c1c24)',
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

      {/* Индикатор выбранной сборки (в левом верхнем углу) */}
      {isActive && (
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
          {lang === 'ru' ? 'Выбрана' : 'Active'}
        </div>
      )}

      {/* Лаконичная кнопка «•••» для открытия контекстного меню */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e, pack);
        }}
        title={lang === 'ru' ? 'Меню сборки (ПКМ)' : 'Pack Menu (Right click)'}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '28px', height: '28px', borderRadius: '9px',
          background: isHovered ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: isHovered ? '#ffffff' : '#a1a1aa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(12px)',
          opacity: isHovered ? 1 : 0.45,
          transition: 'all 0.2s ease'
        }}
      >
        <i className="fa-solid fa-ellipsis" style={{ fontSize: '13px' }} />
      </button>

      {/* Иконка сборки */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: '14px' }}>
        {pack.icon ? (
          (typeof pack.icon === 'string' && pack.icon.startsWith('fa-')) ? (
            <div style={{
              width: '54px', height: '54px', borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '26px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
            }}>
              <i className={pack.icon} />
            </div>
          ) : (
            <img 
              src={pack.icon} 
              alt={pack.name} 
              style={{ 
                width: '54px', height: '54px', objectFit: 'contain', 
                borderRadius: '14px', 
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' 
              }} 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )
        ) : (
          <div style={{
            width: '54px', height: '54px', borderRadius: '14px',
            background: `linear-gradient(135deg, ${loaderColor}30, rgba(255,255,255,0.05))`,
            border: `1px solid ${loaderColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '20px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
          }}>
            {pack.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Название сборки (в естественном регистре, без капса) */}
      <h4 
        key={pack.titleColor || 'default'} 
        style={{ 
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
          ...(pack.titleColor && pack.titleColor.includes('gradient') ? {
            background: pack.titleColor,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            textShadow: 'none'
          } : pack.titleColor ? {
            color: pack.titleColor,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          } : {
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          })
        }}
        title={pack.name}
      >
        {pack.name}
      </h4>

      {/* Метаданные сборки: пилюли версии и ядра */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 2, 
        position: 'relative',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          fontSize: '10px', 
          fontWeight: 700, 
          color: '#e4e4e7',
          background: 'rgba(255, 255, 255, 0.07)', 
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '3px 8px', 
          borderRadius: '8px', 
          fontFamily: 'monospace'
        }}>
          {pack.mcVersion}
        </span>
        
        <span style={{ 
          fontSize: '10px', 
          fontWeight: 800, 
          color: loaderColor,
          background: `${loaderColor}15`, 
          border: `1px solid ${loaderColor}30`,
          padding: '3px 8px', 
          borderRadius: '8px',
          textTransform: 'capitalize'
        }}>
          {pack.loaderType}
        </span>

        {pack.isCustom && (
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 700, 
            color: '#a78bfa',
            background: 'rgba(167, 139, 250, 0.1)', 
            border: '1px solid rgba(167, 139, 250, 0.2)',
            padding: '3px 8px', 
            borderRadius: '8px'
          }}>
            {t('builds_custom')}
          </span>
        )}
      </div>
    </div>
  );
}

// --- КАРТОЧКА СОЗДАНИЯ СБОРКИ (В СЕТКЕ) ---
function NewPackCard({ onClick, lang }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        height: '210px',
        borderRadius: '20px',
        border: isHovered 
          ? '1.5px dashed rgba(16, 185, 129, 0.5)' 
          : '1.5px dashed rgba(255, 255, 255, 0.12)',
        background: isHovered ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.015)',
        boxShadow: isHovered ? '0 8px 24px -6px rgba(16, 185, 129, 0.2)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '24px 20px',
        boxSizing: 'border-box',
        transition: 'border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease'
      }}
    >
      <div style={{
        width: '50px', height: '50px', borderRadius: '16px',
        background: isHovered ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#10b981', fontSize: '20px', marginBottom: '14px',
        transition: 'all 0.25s ease'
      }}>
        <i className="fa-solid fa-plus" />
      </div>
      <div style={{
        fontSize: '14px', fontWeight: 700, color: '#ffffff',
        fontFamily: 'Montserrat', marginBottom: '4px'
      }}>
        {lang === 'ru' ? 'Новая сборка' : 'New Pack'}
      </div>
      <div style={{
        fontSize: '11px', color: '#71717a', fontWeight: 600,
        textAlign: 'center', lineHeight: '1.4'
      }}>
        {lang === 'ru' ? 'Создать с нуля' : 'Create from scratch'}
      </div>
    </div>
  );
}

// --- ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ СБОРОК ---
export default function BuildsPage({ 
  modpacks = [], 
  currentPack, 
  onSelect, 
  onDelete, 
  onEdit, 
  onExport, 
  onCreateClick, 
  onImportClick, 
  profile, 
  fetchModpacks 
}) {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTargetPack, setPromoteTargetPack] = useState(null);

  // Контекстное меню (ПКМ)
  const [contextMenu, setContextMenu] = useState(null); // { x, y, pack }
  const contextMenuRef = useRef(null);

  const handleContextMenu = (e, pack) => {
    e.preventDefault();
    e.stopPropagation();

    const MENU_WIDTH = 220;
    const MENU_HEIGHT = 240;

    let x = e.clientX;
    // Если клик близко к правому краю, открываем влево от курсора
    if (x + MENU_WIDTH > window.innerWidth - 12) {
      x = Math.max(12, e.clientX - MENU_WIDTH);
    }

    let y = e.clientY;
    // Если клик близко к нижнему краю, открываем вверх от курсора
    if (y + MENU_HEIGHT > window.innerHeight - 12) {
      y = Math.max(12, e.clientY - MENU_HEIGHT);
    }

    setContextMenu({ x, y, pack });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    if (contextMenu) {
      window.addEventListener('pointerdown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  // Фильтрация сборок по строке поиска
  const filteredPacks = modpacks.filter(pack => 
    pack.name.toLowerCase().includes(search.toLowerCase()) ||
    (pack.mcVersion && pack.mcVersion.toLowerCase().includes(search.toLowerCase())) ||
    (pack.loaderType && pack.loaderType.toLowerCase().includes(search.toLowerCase()))
  );

  const getLoaderColor = (type) => {
    switch (type) {
      case 'fabric': return '#34d399';
      case 'forge': return '#f59e0b';
      case 'quilt': return '#ec4899';
      case 'neoforge': return '#a78bfa';
      case 'paper': return '#10b981';
      case 'spigot': return '#ec4899';
      case 'hybrid': return '#a78bfa';
      default: return '#60a5fa'; // vanilla
    }
  };

  return (
    <div style={pageContainerStyle} className="tab-enter">
      {/* --- ШАПКА В ОДНУ ЛИНИЮ: Заголовок слева, Поиск и Кнопки справа --- */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        flexShrink: 0,
        gap: '16px'
      }}>
        {/* Заголовок без цифр и бейджей */}
        <h2 style={{ 
          margin: 0, 
          fontSize: '22px', 
          fontWeight: 800, 
          letterSpacing: '0.3px',
          fontFamily: 'Montserrat',
          color: '#ffffff'
        }}>
          {t('builds_title')}
        </h2>

        {/* Правая часть: Поиск + Кнопка создания + Импорт */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Поиск */}
          <div style={{ position: 'relative' }}>
            <i 
              className="fa-solid fa-magnifying-glass" 
              style={{ 
                position: 'absolute', 
                left: '13px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'rgba(255, 255, 255, 0.35)', 
                fontSize: '12.5px' 
              }} 
            />
            <input 
              type="text" 
              placeholder={t('builds_search')} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={searchInputStyle} 
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                e.target.style.width = '250px';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                e.target.style.width = '210px';
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', padding: '3px'
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: '11px' }} />
              </button>
            )}
          </div>

          {/* Кнопка создать сборку */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCreateClick}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              color: '#10b981',
              fontFamily: 'Montserrat',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.24)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.32)';
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '11.5px' }} />
            <span>{lang === 'ru' ? 'Создать сборку' : 'New Pack'}</span>
          </motion.button>

          {/* Кнопка импорта */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onImportClick}
            title={lang === 'ru' ? 'Импорт и Экспорт сборок' : 'Import / Export'}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#d4d4d8',
              fontFamily: 'Montserrat',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <i className="fa-solid fa-file-import" style={{ color: '#10b981', fontSize: '12px' }} />
            <span>{lang === 'ru' ? 'Импорт' : 'Import'}</span>
          </motion.button>
        </div>
      </div>

      {/* --- СЕТКА КАРТОЧЕК СБОРОК С ЧИСТЫМ ОТСТУПОМ --- */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        paddingRight: '6px',
        marginRight: '-6px',
        paddingTop: '4px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', 
          gap: '20px',
          paddingBottom: '24px'
        }}>
          {filteredPacks.map(pack => (
            <ModpackCard
              key={pack.id}
              pack={pack}
              isActive={currentPack && currentPack.id === pack.id}
              loaderColor={getLoaderColor(pack.loaderType)}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
              lang={lang}
              t={t}
            />
          ))}

          {/* Карточка добавления новой сборки в конце сетки */}
          <NewPackCard 
            onClick={onCreateClick}
            lang={lang}
          />
        </div>
      </div>

      {/* --- ФИРМЕННОЕ КОНТЕКСТНОЕ МЕНЮ (ЧЕРЕЗ REACT PORTAL В DOCUMENT.BODY) --- */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 999999,
                minWidth: '220px',
                background: 'rgba(16, 16, 24, 0.75)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '6px',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
                userSelect: 'none'
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Мини-шапка контекстного меню */}
              <div style={{
                padding: '8px 12px 10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '4px'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {contextMenu.pack.icon && (typeof contextMenu.pack.icon === 'string' && contextMenu.pack.icon.startsWith('fa-')) ? (
                    <i className={contextMenu.pack.icon} style={{ fontSize: '13px', color: '#10b981' }} />
                  ) : contextMenu.pack.icon ? (
                    <img src={contextMenu.pack.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>
                      {contextMenu.pack.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '145px',
                    fontFamily: 'Montserrat'
                  }}>
                    {contextMenu.pack.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#71717a', fontWeight: 600 }}>
                    {contextMenu.pack.mcVersion} • {contextMenu.pack.loaderType}
                  </div>
                </div>
              </div>

              {/* Пункты контекстного меню */}
              <ContextMenuItem
                icon="fa-solid fa-play"
                iconColor="#10b981"
                label={currentPack?.id === contextMenu.pack.id 
                  ? (lang === 'ru' ? 'Выбрана (играть)' : 'Selected (play)') 
                  : (lang === 'ru' ? 'Выбрать сборку' : 'Select pack')}
                onClick={() => {
                  onSelect(contextMenu.pack);
                  closeContextMenu();
                }}
              />

              {contextMenu.pack.isCustom && (
                <>
                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 6px' }} />
                  
                  <ContextMenuItem
                    icon="fa-solid fa-pen"
                    iconColor="#3b82f6"
                    label={lang === 'ru' ? 'Редактировать' : 'Edit'}
                    onClick={() => {
                      onEdit(contextMenu.pack);
                      closeContextMenu();
                    }}
                  />

                  <ContextMenuItem
                    icon="fa-solid fa-file-export"
                    iconColor="#10b981"
                    label={lang === 'ru' ? 'Экспортировать' : 'Export'}
                    onClick={() => {
                      if (onExport) onExport(contextMenu.pack.id);
                      closeContextMenu();
                    }}
                  />

                  {profile?.is_admin === 1 && (
                    <ContextMenuItem
                      icon="fa-solid fa-cloud-arrow-up"
                      iconColor="#a855f7"
                      label={lang === 'ru' ? 'Опубликовать' : 'Publish as Official'}
                      onClick={() => {
                        setPromoteTargetPack(contextMenu.pack);
                        setShowPromoteModal(true);
                        closeContextMenu();
                      }}
                    />
                  )}

                  <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 6px' }} />

                  <ContextMenuItem
                    icon="fa-solid fa-trash-can"
                    iconColor="#ef4444"
                    label={lang === 'ru' ? 'Удалить сборку' : 'Delete'}
                    danger={true}
                    onClick={() => {
                      onDelete(contextMenu.pack.id);
                      closeContextMenu();
                    }}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Модальное окно публикации официальной сборки */}
      <PromotePackModal
        isOpen={showPromoteModal}
        pack={promoteTargetPack}
        onClose={() => {
          setShowPromoteModal(false);
          setPromoteTargetPack(null);
        }}
        onSuccess={() => {
          setShowPromoteModal(false);
          setPromoteTargetPack(null);
          if (fetchModpacks) fetchModpacks();
        }}
      />
    </div>
  );
}
