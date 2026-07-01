import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

const glassPanelStyle = {
  background: 'rgba(15, 15, 20, 0.45)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '25px'
};

const searchInputStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#fff',
  padding: '10px 16px 10px 40px',
  width: '260px',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all 0.3s'
};

export default function BuildsPage({ modpacks, currentPack, onSelect, onDelete, onEdit, onExport, onCreateClick, onImportClick }) {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredPacks = modpacks.filter(pack => 
    pack.name.toLowerCase().includes(search.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 22 } }
  };

  return (
    <div style={glassPanelStyle} className="tab-enter">
      {/* Top Header & Search bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
            {t('builds_title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#10b981', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('builds_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }} />
            <motion.input 
              whileFocus={{ borderColor: 'rgba(16, 185, 129, 0.5)', width: '320px', backgroundColor: 'rgba(0,0,0,0.4)' }}
              type="text" 
              placeholder={t('builds_search')} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={searchInputStyle} 
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreateClick}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontFamily: 'Montserrat',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <i className="fa-solid fa-plus" />
          </motion.button>
        </div>
      </div>

      {/* Grid container with scrolls */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        paddingRight: '5px',
        padding: '12px 8px',
        margin: '-12px -8px'
      }}>
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '20px',
            paddingBottom: '20px'
          }}
        >
          {/* List custom/standard build cards */}
          {filteredPacks.map(pack => {
            const isActive = currentPack && currentPack.id === pack.id;
            
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
            
            const loaderColor = getLoaderColor(pack.loaderType);
            
            return (
              <motion.div
                key={pack.id}
                variants={itemVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                style={{
                  height: '180px',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isActive ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  transition: 'border-color 0.25s, box-shadow 0.25s'
                }}
                onClick={() => onSelect(pack)}
              >
                {/* Background Image/Gradient zooming on hover */}
                {pack.bgVideo ? (
                  <motion.video
                    autoPlay loop muted
                    src={pack.bgVideo}
                    variants={{
                      initial: { scale: 1 },
                      hover: { scale: 1.08, transition: { duration: 0.4, ease: 'easeOut' } }
                    }}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0
                    }}
                  />
                ) : (
                  <motion.div
                    variants={{
                      initial: { scale: 1 },
                      hover: { scale: 1.08, transition: { duration: 0.4, ease: 'easeOut' } }
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: pack.bgImage ? `url('${pack.bgImage}') center/cover` : 'linear-gradient(135deg, #18181b, #27272a)',
                      zIndex: 0
                    }}
                  />
                )}
                
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(10, 10, 16, 0.45), rgba(10, 10, 16, 0.9))', zIndex: 0 }} />

                {/* Glowing radial backdrop on hover */}
                <motion.div 
                  variants={{
                    initial: { opacity: 0 },
                    hover: { opacity: 1, transition: { duration: 0.3 } }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 50% 120%, ${loaderColor}20 0%, transparent 65%)`,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />

                {/* Toolbar for custom packs */}
                {pack.isCustom && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 10 }}>
                    <motion.button
                      whileHover={{ scale: 1.15, background: 'rgba(16, 185, 129, 0.9)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onExport) onExport(pack.id);
                      }}
                      title={t('builds_export')}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s'
                      }}
                    >
                      <i className="fa-solid fa-file-export" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.15, background: 'rgba(59, 130, 246, 0.9)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(pack);
                      }}
                      title={t('builds_edit')}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s'
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.15, background: 'rgba(239, 68, 68, 0.9)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(pack.id);
                      }}
                      title={t('builds_delete')}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s'
                      }}
                    >
                      <i className="fa-solid fa-trash-can" />
                    </motion.button>
                  </div>
                )}

                {/* Avatar Icon */}
                {pack.icon ? (
                  pack.icon.startsWith('fa-') ? (
                    <motion.div 
                      variants={{
                        initial: { scale: 1, y: 0 },
                        hover: { scale: 1.1, y: -4, transition: { type: 'spring', stiffness: 300, damping: 15 } }
                      }}
                      style={{
                        width: '48px', height: '48px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '24px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                        marginBottom: '12px', zIndex: 2, position: 'relative'
                      }}
                    >
                      <i className={pack.icon} />
                    </motion.div>
                  ) : (
                    <motion.img 
                      variants={{
                        initial: { scale: 1, y: 0 },
                        hover: { scale: 1.1, y: -4, transition: { type: 'spring', stiffness: 300, damping: 15 } }
                      }}
                      src={pack.icon} 
                      alt={pack.name} 
                      style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', marginBottom: '12px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))', zIndex: 2, position: 'relative' }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )
                ) : (
                  <motion.div 
                    variants={{
                      initial: { scale: 1, y: 0 },
                      hover: { scale: 1.1, y: -4, transition: { type: 'spring', stiffness: 300, damping: 15 } }
                    }}
                    style={{
                      width: '48px', height: '48px', borderRadius: '10px',
                      background: `linear-gradient(135deg, ${loaderColor}, #1a1a24)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '18px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      marginBottom: '12px',
                      zIndex: 2,
                      position: 'relative',
                      border: `1px solid ${loaderColor}20`
                    }}
                  >
                    {pack.name.charAt(0).toUpperCase()}
                  </motion.div>
                )}

                {/* Modpack Title */}
                <h4 key={pack.titleColor || 'default'} style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  textAlign: 'center', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 2,
                  position: 'relative',
                  ...(pack.titleColor && pack.titleColor.includes('gradient') ? {
                    background: pack.titleColor,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    textShadow: 'none'
                  } : pack.titleColor ? {
                    color: pack.titleColor,
                    background: 'none',
                    WebkitBackgroundClip: 'unset',
                    WebkitTextFillColor: 'unset',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  } : {
                    color: '#fff',
                    background: 'none',
                    WebkitBackgroundClip: 'unset',
                    WebkitTextFillColor: 'unset',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  })
                }}>
                  {pack.name}
                </h4>

                {/* Tags details */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', zIndex: 2, position: 'relative' }}>
                  <span style={{ 
                    fontSize: '9px', fontWeight: 800, color: '#e4e4e7',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase', fontFamily: 'monospace'
                  }}>
                    {pack.mcVersion}
                  </span>
                  
                  <span style={{ 
                    fontSize: '9px', fontWeight: 900, 
                    color: loaderColor,
                    background: `${loaderColor}15`, 
                    border: `1px solid ${loaderColor}25`,
                    padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase'
                  }}>
                    {pack.loaderType}
                  </span>

                  {pack.isCustom && (
                    <span style={{ 
                      fontSize: '9px', fontWeight: 800, color: '#a78bfa',
                      background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)',
                      padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase'
                    }}>
                      {t('builds_custom')}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Special Card-Placeholder for Import / Export */}
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.02,
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'linear-gradient(135deg, rgba(25, 25, 30, 0.55), rgba(15, 15, 20, 0.7))'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onImportClick}
            style={{
              height: '180px',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.45), rgba(10, 10, 15, 0.6))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              transition: 'border-color 0.2s, background 0.2s'
            }}
          >
            <motion.div 
              variants={{
                initial: { scale: 1, y: 0 },
                hover: { scale: 1.05, y: -2, transition: { type: 'spring', stiffness: 300, damping: 15 } }
              }}
              style={{ 
                width: '48px', height: '48px', borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '22px',
                marginBottom: '12px',
                zIndex: 3,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <i className="fa-solid fa-file-import" style={{ color: '#10b981' }} />
            </motion.div>
            
            <h4 style={{ 
              margin: '0 0 6px 0', 
              fontSize: '14px', 
              fontWeight: 800, 
              color: '#fff',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              zIndex: 3
            }}>
              {lang === 'ru' ? 'Импорт / Экспорт' : 'Import / Export'}
            </h4>
            
            <p style={{ margin: 0, fontSize: '10px', color: '#a1a1aa', textAlign: 'center', lineHeight: 1.3, zIndex: 3 }}>
              {lang === 'ru' ? 'Перенос сборок с CurseForge, Modrinth и др.' : 'Transfer packs from CurseForge, Modrinth etc.'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
