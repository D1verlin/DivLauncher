import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

export default function InitialPathModal({ isOpen, onClose }) {
  const { lang } = useTranslation();
  const [currentPath, setCurrentPath] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      if (window.electronAPI.getBuildsDir) {
        window.electronAPI.getBuildsDir().then(dir => {
          setCurrentPath(dir || '');
        });
      }
      if (window.electronAPI.getDefaultBuildsDir) {
        window.electronAPI.getDefaultBuildsDir().then(dir => {
          setDefaultPath(dir || '');
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    if (window.electronAPI && window.electronAPI.selectFolder) {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        setCurrentPath(selected);
      }
    }
  };

  const handleReset = async () => {
    if (window.electronAPI && window.electronAPI.getDefaultBuildsDir) {
      const def = await window.electronAPI.getDefaultBuildsDir();
      setCurrentPath(def);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      if (window.electronAPI && window.electronAPI.setBuildsDir) {
        const savedPath = await window.electronAPI.setBuildsDir(currentPath);
        localStorage.setItem('launcher_builds_dir', savedPath || currentPath);
      } else {
        localStorage.setItem('launcher_builds_dir', currentPath);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save builds dir:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
          background: '#0b0b0e',
          display: 'flex',
          flexDirection: 'column',
          justify: 'center',
          alignItems: 'center',
          padding: '60px 40px 40px 40px',
          boxSizing: 'border-box',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Full-width content wrapper (no boxed borders around it) */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <h2
            style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              margin: '0 0 8px 0',
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '-0.3px',
            }}
          >
            {lang === 'ru' ? 'Первичная настройка папки сборок' : 'Initial Builds Directory Setup'}
          </h2>
          <p
            style={{
              color: '#8e8e9c',
              fontSize: '13px',
              margin: '0 0 32px 0',
              fontWeight: 500,
              lineHeight: '1.5',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {lang === 'ru'
              ? 'Укажите папку для сохранения файлов клиентов, модов и ресурспаков.'
              : 'Choose the destination folder to store game clients and modpacks.'}
          </p>

          {/* Full-length path input block without card borders */}
          <div style={{ width: '100%', marginBottom: '32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span
                style={{
                  color: '#71717a',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {lang === 'ru' ? 'Путь установки' : 'Installation Path'}
              </span>

              {defaultPath && currentPath !== defaultPath && (
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  {lang === 'ru' ? 'Сбросить' : 'Reset'}
                </button>
              )}
            </div>

            {/* Seamless Full-width Input Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#16161d',
                borderRadius: '12px',
                padding: '10px 14px 10px 18px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  flex: 1,
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Consolas, monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={currentPath}
              >
                {currentPath || (lang === 'ru' ? 'Не выбрано' : 'Not selected')}
              </span>

              <button
                onClick={handleBrowse}
                style={{
                  background: '#252530',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'background 0.2s',
                }}
              >
                {lang === 'ru' ? 'Обзор' : 'Browse'}
              </button>
            </div>
          </div>

          {/* Full-width Action Button */}
          <button
            disabled={isSaving || !currentPath}
            onClick={handleConfirm}
            style={{
              width: '100%',
              background: '#3b82f6',
              border: 'none',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '14px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: currentPath ? 'pointer' : 'not-allowed',
              fontFamily: 'Montserrat, sans-serif',
              opacity: currentPath ? 1 : 0.5,
              transition: 'opacity 0.2s, background 0.2s',
            }}
          >
            {lang === 'ru' ? 'Продолжить' : 'Continue'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
