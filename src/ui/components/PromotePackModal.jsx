import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

export default function PromotePackModal({ isOpen, pack, onClose, onSuccess }) {
  const { lang } = useTranslation();
  const [step, setStep] = useState('idle'); // 'idle' | 'exporting' | 'uploading_zip' | 'updating_json' | 'success' | 'error'
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setProgressText('');
      setErrorMessage('');
      setProgressPercent(0);
    }
  }, [isOpen]);

  if (!isOpen || !pack) return null;

  const handlePromote = async () => {
    try {
      setStep('exporting');
      setProgressText(lang === 'ru' ? 'Архивация и экспорт файлов сборки...' : 'Exporting build files...');
      setProgressPercent(15);

      // Step 1: Export pack to zip
      const exportRes = await window.electronAPI.exportCustomPack(pack.id);
      if (!exportRes || !exportRes.success || !exportRes.filePath) {
        throw new Error(exportRes?.error || (lang === 'ru' ? 'Не удалось экспортировать сборку' : 'Failed to export pack'));
      }

      const localZipPath = exportRes.filePath;

      // Step 2: Upload ZIP to Cloudflare R2 / Hosting
      setStep('uploading_zip');
      setProgressText(lang === 'ru' ? 'Загрузка архива сборки на хостинг...' : 'Uploading pack archive to hosting...');
      setProgressPercent(40);

      const remoteZipKey = `DivLauncher/packs/${pack.id}.zip`;
      const uploadRes = await window.electronAPI.r2UploadFile(remoteZipKey, localZipPath);
      if (!uploadRes || !uploadRes.success) {
        throw new Error(uploadRes?.error || (lang === 'ru' ? 'Ошибка загрузки архива на хостинг' : 'Failed to upload archive to hosting'));
      }

      const packZipUrl = uploadRes.url || `https://mc.diverlin.ru/${remoteZipKey}`;

      // Step 3: Fetch current modpacks.json
      setStep('updating_json');
      setProgressText(lang === 'ru' ? 'Обновление реестра официальных сборок...' : 'Updating modpacks.json catalog...');
      setProgressPercent(75);

      const jsonRes = await window.electronAPI.r2GetModsJson('DivLauncher/modpacks.json');
      let currentPacks = [];
      if (jsonRes && jsonRes.success && Array.isArray(jsonRes.data)) {
        currentPacks = jsonRes.data;
      }

      // Build official pack entry
      const officialEntry = {
        id: pack.id,
        name: pack.name,
        titleColor: pack.titleColor || '#ffffff',
        mcVersion: pack.mcVersion,
        loaderType: pack.loaderType,
        loaderVersion: pack.loaderVersion || 'latest',
        clientDir: `clients/${pack.id}`,
        bgImage: pack.bgImage || '',
        bgVideo: pack.bgVideo || '',
        icon: pack.icon || 'fa-cube',
        packZipUrl: packZipUrl,
        useZip: true
      };

      if (pack.installerUrl) officialEntry.installerUrl = pack.installerUrl;
      if (pack.installerName) officialEntry.installerName = pack.installerName;
      if (pack.forgeUrl) officialEntry.forgeUrl = pack.forgeUrl;
      if (pack.forgeInstallerName) officialEntry.forgeInstallerName = pack.forgeInstallerName;

      const existingIdx = currentPacks.findIndex(p => p.id === pack.id);
      if (existingIdx > -1) {
        currentPacks[existingIdx] = { ...currentPacks[existingIdx], ...officialEntry };
      } else {
        currentPacks.push(officialEntry);
      }

      // Save modpacks.json
      const saveRes = await window.electronAPI.r2SaveModsJson('DivLauncher/modpacks.json', currentPacks);
      if (!saveRes || !saveRes.success) {
        throw new Error(saveRes?.error || (lang === 'ru' ? 'Не удалось сохранить modpacks.json' : 'Failed to save modpacks.json'));
      }

      setProgressPercent(100);
      setStep('success');
      if (onSuccess) onSuccess(officialEntry);
    } catch (err) {
      console.error('Promotion error:', err);
      setErrorMessage(err.message);
      setStep('error');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && (step === 'idle' || step === 'success' || step === 'error')) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            background: 'rgba(16, 16, 24, 0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '26px 28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
            fontFamily: 'Montserrat, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* Заголовок с минималистичной иконкой */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#10b981', fontSize: '18px' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h3 style={{ 
                color: '#ffffff', 
                fontSize: '16px', 
                fontWeight: 800, 
                margin: '0 0 4px 0', 
                letterSpacing: '0.2px',
                fontFamily: 'Montserrat'
              }}>
                {lang === 'ru' ? 'Публикация в официальные' : 'Publish as Official Pack'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ 
                  color: '#e4e4e7', 
                  fontSize: '12.5px', 
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px'
                }}>
                  {pack.name}
                </span>
                <span style={{ 
                  color: '#a1a1aa', 
                  fontSize: '10.5px', 
                  fontWeight: 600, 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1px 7px', 
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}>
                  {pack.mcVersion} • {pack.loaderType}
                </span>
              </div>
            </div>
          </div>

          {step === 'idle' && (
            <div>
              <p style={{ 
                color: '#a1a1aa', 
                fontSize: '13px', 
                lineHeight: '1.55', 
                margin: '0 0 22px 0' 
              }}>
                {lang === 'ru'
                  ? 'Сборка будет запакована в ZIP-архив, загружена на облачное хранилище R2 и добавлена в главный каталог официальных сборок.'
                  : 'The pack will be compressed into a ZIP archive, uploaded to R2 storage, and registered in the official modpack catalog.'}
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a1a1aa',
                    borderRadius: '11px',
                    padding: '9px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontFamily: 'Montserrat',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePromote}
                  style={{
                    background: 'rgba(16, 185, 129, 0.16)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    borderRadius: '11px',
                    padding: '9px 20px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontFamily: 'Montserrat',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '12px' }} />
                  <span>{lang === 'ru' ? 'Опубликовать' : 'Publish'}</span>
                </motion.button>
              </div>
            </div>
          )}

          {(step === 'exporting' || step === 'uploading_zip' || step === 'updating_json') && (
            <div style={{ textAlign: 'center', padding: '16px 0 6px 0' }}>
              <div style={{ fontSize: '26px', color: '#10b981', marginBottom: '14px' }}>
                <i className="fa-solid fa-spinner fa-spin" />
              </div>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '13.5px', margin: '0 0 14px 0', fontFamily: 'Montserrat' }}>
                {progressText}
              </p>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <motion.div
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ height: '100%', background: '#10b981', borderRadius: '3px' }}
                />
              </div>
              <span style={{ color: '#71717a', fontSize: '11.5px', fontWeight: 600, fontFamily: 'monospace' }}>
                {progressPercent}%
              </span>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '8px 0 4px 0' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
              }}>
                <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '18px' }} />
              </div>
              <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'Montserrat' }}>
                {lang === 'ru' ? 'Сборка успешно опубликована' : 'Pack Successfully Published'}
              </h4>
              <p style={{ color: '#a1a1aa', fontSize: '12.5px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                {lang === 'ru'
                  ? 'Сборка переведена в каталог официальных и теперь доступна всем пользователям.'
                  : 'The pack is now official and visible to all users in the launcher catalog.'}
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  borderRadius: '11px',
                  padding: '9px 24px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontFamily: 'Montserrat',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
                }}
              >
                {lang === 'ru' ? 'Готово' : 'Done'}
              </motion.button>
            </div>
          )}

          {step === 'error' && (
            <div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '12px 14px',
                margin: '14px 0 18px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '16px', flexShrink: 0 }} />
                <p style={{ color: '#f87171', fontSize: '12.5px', margin: 0, fontWeight: 600, lineHeight: '1.4' }}>
                  {errorMessage}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a1a1aa',
                    borderRadius: '11px',
                    padding: '9px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontFamily: 'Montserrat',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  {lang === 'ru' ? 'Закрыть' : 'Close'}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
