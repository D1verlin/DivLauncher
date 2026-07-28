import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';
import { getSafeBgUrl, toDisplayUrl, getFilePath } from '../utils/pathUtils';

export default function PublishCurseForgeModal({ isOpen, onClose, onSuccess }) {
  const { lang } = useTranslation();
  const [zipPath, setZipPath] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Form Fields
  const [packId, setPackId] = useState('');
  const [packName, setPackName] = useState('');
  const [mcVersion, setMcVersion] = useState('1.20.1');
  const [loaderType, setLoaderType] = useState('fabric');
  const [loaderVersion, setLoaderVersion] = useState('latest');
  const [filesCount, setFilesCount] = useState(0);
  const [version, setVersion] = useState('1.0.0');

  // Visual Customization
  const [icon, setIcon] = useState('fa-cube');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState('');
  const [bgVideo, setBgVideo] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setZipPath('');
      setIsInspecting(false);
      setIsPublishing(false);
      setErrorMessage('');
      setProgressText('');
      setProgressPercent(0);
      setPackId('');
      setPackName('');
      setFilesCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (window.electronAPI?.onExportProgress) {
      window.electronAPI.onExportProgress((data) => {
        if (data.message) setProgressText(data.message);
        if (data.progress !== undefined) setProgressPercent(data.progress);
      });
    }
  }, []);

  if (!isOpen) return null;

  const handleSelectFile = async () => {
    if (!window.electronAPI?.selectFolder) return;
    setErrorMessage('');
    setIsInspecting(true);

    try {
      // Open file dialog for zip
      const filePaths = await window.electronAPI.r2SelectMultipleFiles();
      if (!filePaths || filePaths.length === 0) {
        setIsInspecting(false);
        return;
      }

      const selectedZip = filePaths[0];
      setZipPath(selectedZip);

      // Inspect manifest
      const inspectRes = await window.electronAPI.inspectCurseForgeZip(selectedZip);
      if (!inspectRes || !inspectRes.success) {
        throw new Error(inspectRes?.error || 'Не удалось прочитать manifest.json из архива');
      }

      const meta = inspectRes.metadata;
      setPackName(meta.packName || '');
      setMcVersion(meta.mcVersion || '1.20.1');
      setLoaderType(meta.loaderType || 'fabric');
      setLoaderVersion(meta.loaderVersion || 'latest');
      setFilesCount(meta.filesCount || 0);
      setVersion(meta.version || '1.0.0');

      // Auto-generate ID slug
      const slug = (meta.packName || 'curseforge-pack')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPackId(slug);
    } catch (err) {
      console.error('File inspect error:', err);
      setErrorMessage(err.message);
    } finally {
      setIsInspecting(false);
    }
  };

  const handlePublish = async () => {
    if (!zipPath) {
      setErrorMessage(lang === 'ru' ? 'Выберите ZIP-архив CurseForge' : 'Select a CurseForge ZIP file');
      return;
    }
    if (!packId.trim()) {
      setErrorMessage(lang === 'ru' ? 'Укажите ID сборки' : 'Enter pack ID');
      return;
    }

    setIsPublishing(true);
    setErrorMessage('');
    setProgressText(lang === 'ru' ? 'Подготовка к публикации...' : 'Preparing publication...');
    setProgressPercent(10);

    try {
      const publishData = {
        zipPath,
        id: packId.trim(),
        name: packName.trim() || 'CurseForge Pack',
        titleColor,
        icon,
        bgImage,
        bgVideo,
        mcVersion,
        loaderType,
        loaderVersion,
        version
      };

      const result = await window.electronAPI.publishCurseForgeOfficialPack(publishData);
      if (!result || !result.success) {
        throw new Error(result?.error || 'Не удалось опубликовать сборку');
      }

      if (onSuccess) onSuccess(result.officialEntry);
      onClose();
    } catch (err) {
      console.error('Publish CurseForge error:', err);
      setErrorMessage(err.message);
      setIsPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          style={{
            background: '#121216',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95)',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'rgba(241, 100, 34, 0.15)',
                border: '1px solid rgba(241, 100, 34, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-fire-flame-curved" style={{ color: '#f97316', fontSize: '24px' }} />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 900, margin: '0 0 4px 0', fontFamily: 'Montserrat, sans-serif' }}>
                {lang === 'ru' ? 'Официальная сборка из CurseForge' : 'Official CurseForge Modpack'}
              </h3>
              <p style={{ color: '#71717a', fontSize: '12px', margin: 0, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
                {lang === 'ru'
                  ? 'Экономная загрузка на хостинг (только ZIP), подкачка модов напрямую с CurseForge'
                  : 'Lightweight archive hosting with direct CurseForge mod downloads'}
              </p>
            </div>
          </div>

          {/* Select Zip File Action */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontFamily: 'Montserrat, sans-serif' }}>
              {lang === 'ru' ? 'Архив CurseForge (.zip)' : 'CurseForge Archive (.zip)'}
            </label>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  background: '#1a1a20',
                  border: '1px solid #282834',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: zipPath ? '#e4e4e7' : '#71717a',
                  fontSize: '12px',
                  fontFamily: 'Consolas, monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {zipPath || (lang === 'ru' ? 'Выберите ZIP-архив сборки...' : 'Select ZIP file...')}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isInspecting || isPublishing}
                onClick={handleSelectFile}
                style={{
                  background: '#f97316',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {isInspecting ? (lang === 'ru' ? 'Анализ...' : 'Inspecting...') : (lang === 'ru' ? 'Обзор...' : 'Browse...')}
              </motion.button>
            </div>
          </div>

          {/* Auto-inspected Details */}
          {zipPath && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#181820',
                border: '1px solid #282834',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #282834', paddingBottom: '12px' }}>
                <div>
                  <span style={{ color: '#f97316', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'ru' ? 'Обнаруженный манифест' : 'Detected Manifest'}
                  </span>
                  <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{packName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: 700 }}>
                    MC {mcVersion} • {loaderType} ({loaderVersion})
                  </span>
                  <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
                    {filesCount} {lang === 'ru' ? 'модов в манифесте' : 'mods in manifest'}
                  </div>
                </div>
              </div>

              {/* Form Customization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    {lang === 'ru' ? 'ID сборки' : 'Pack ID'}
                  </label>
                  <input
                    type="text"
                    value={packId}
                    onChange={e => setPackId(e.target.value)}
                    placeholder="my-official-pack"
                    style={{
                      width: '100%',
                      background: '#22222c',
                      border: '1px solid #333342',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    {lang === 'ru' ? 'Название' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={packName}
                    onChange={e => setPackName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#22222c',
                      border: '1px solid #333342',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    {lang === 'ru' ? 'Иконка (FontAwesome)' : 'Icon'}
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    placeholder="fa-cube"
                    style={{
                      width: '100%',
                      background: '#22222c',
                      border: '1px solid #333342',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    {lang === 'ru' ? 'Цвет названия' : 'Title Color'}
                  </label>
                  <input
                    type="color"
                    value={titleColor}
                    onChange={e => setTitleColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      background: '#22222c',
                      border: '1px solid #333342',
                      borderRadius: '10px',
                      padding: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#71717a', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                  {lang === 'ru' ? 'Фоновое изображение (URL или путь)' : 'Background Image (URL or file)'}
                </label>
                <input
                  type="text"
                  value={toDisplayUrl(bgImage)}
                  onChange={e => setBgImage(getSafeBgUrl(e.target.value))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    background: '#22222c',
                    border: '1px solid #333342',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Progress / Error Displays */}
          {isPublishing && (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>{progressText}</p>
              <div style={{ width: '100%', height: '6px', background: '#22222c', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%', background: '#f97316' }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={isPublishing}
              style={{
                background: '#22222c',
                border: 'none',
                color: '#a1a1aa',
                borderRadius: '12px',
                padding: '12px 20px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPublishing || !zipPath || !packId}
              onClick={handlePublish}
              style={{
                background: '#f97316',
                border: 'none',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '12px 24px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: zipPath && packId ? 'pointer' : 'not-allowed',
                opacity: zipPath && packId ? 1 : 0.5,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {lang === 'ru' ? 'Опубликовать сборку' : 'Publish Pack'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
