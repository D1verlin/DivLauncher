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
      setProgressText(lang === 'ru' ? 'Обновление реестра официальных сборок (modpacks.json)...' : 'Updating modpacks.json catalog...');
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
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
            background: 'linear-gradient(145deg, rgba(20, 20, 32, 0.95), rgba(12, 12, 20, 0.98))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(168, 85, 247, 0.15)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              boxShadow: '0 8px 20px rgba(168, 85, 247, 0.25)',
            }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#c084fc', fontSize: '24px' }} />
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 900, margin: '0 0 4px 0' }}>
                {lang === 'ru' ? 'Публикация в официальные' : 'Publish as Official Pack'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                {pack.name} ({pack.mcVersion} • {pack.loaderType})
              </p>
            </div>
          </div>

          {step === 'idle' && (
            <div>
              <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                {lang === 'ru'
                  ? 'Сборка будет автоматически запакована в ZIP-архив, выгружена на сервер хостинга R2 и добавлена в главный каталог `modpacks.json`.'
                  : 'The pack will be compressed into a ZIP archive, uploaded to Cloudflare R2 storage, and registered in `modpacks.json`.'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    borderRadius: '14px',
                    padding: '12px 20px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePromote}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 8px 20px rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fa-solid fa-rocket" />
                  {lang === 'ru' ? 'Опубликовать' : 'Publish'}
                </motion.button>
              </div>
            </div>
          )}

          {(step === 'exporting' || step === 'uploading_zip' || step === 'updating_json') && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '36px', color: '#c084fc', marginBottom: '16px' }}>
                <i className="fa-solid fa-spinner fa-spin" />
              </div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>{progressText}</p>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <motion.div
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #a855f7, #ec4899)' }}
                />
              </div>
              <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{progressPercent}%</span>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                margin: '0 auto 16px auto',
              }}>
                <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '28px' }} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0' }}>
                {lang === 'ru' ? 'Сборка успешно опубликована!' : 'Pack Successfully Published!'}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
                {lang === 'ru'
                  ? 'Сборка переведена в разряд официальных и доступна для всех пользователей в главном каталоге.'
                  : 'The pack is now official and visible to all users in the launcher catalog.'}
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  borderRadius: '14px',
                  padding: '12px 28px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {lang === 'ru' ? 'Отлично' : 'Done'}
              </motion.button>
            </div>
          )}

          {step === 'error' && (
            <div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: '20px' }} />
                <p style={{ color: '#f87171', fontSize: '13px', margin: 0, fontWeight: 600 }}>{errorMessage}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    borderRadius: '14px',
                    padding: '12px 20px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px',
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
