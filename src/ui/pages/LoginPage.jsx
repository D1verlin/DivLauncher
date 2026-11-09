import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

export default function LoginPage({ onLoginSuccess, onShowUpdatePage }) {
  const { t } = useTranslation();
  const [loginMode, setLoginMode] = useState('login'); // 'login' | 'register' | 'offline'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const resetTwoFactor = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
  };

  const handleAction = async (e) => {
    if (e) e.preventDefault();
    setMessage(null);

    if (username.trim().length < 3) {
      setMessage({ type: 'error', text: t('login_err_username_len') });
      return;
    }

    if (loginMode === 'offline') {
      setLoading(true);
      try {
        const result = await window.electronAPI.customOfflineLogin(username.trim());
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(l => console.log("%c[MAIN] " + l, "color: #10b981; font-weight: 500;"));
        }
        if (result.success) {
          onLoginSuccess(result);
        } else {
          setMessage({ type: 'error', text: result.error || 'Ошибка входа в офлайн-режим' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 4) {
      setMessage({ type: 'error', text: t('login_err_password_len') });
      return;
    }

    if (loginMode === 'register') {
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: t('login_err_password_match') });
        return;
      }
      
      setLoading(true);
      try {
        const result = await window.electronAPI.customRegister(username, password);
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(l => console.log("%c[MAIN] " + l, "color: #10b981; font-weight: 500;"));
        }
        if (result.success) {
          setMessage({ type: 'success', text: t('login_success_reg') });
          setLoginMode('login');
          setPassword('');
          setConfirmPassword('');
          resetTwoFactor();
        } else {
          setMessage({ type: 'error', text: result.error || t('login_err_reg') });
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const result = await window.electronAPI.customLogin(username, password, twoFactorCode);
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(l => console.log("%c[MAIN] " + l, "color: #10b981; font-weight: 500;"));
        }
        if (result.requires_2fa) {
          setTwoFactorRequired(true);
          setMessage({ type: 'info', text: result.message || t('login_2fa_subtitle') });
          setLoading(false);
          return;
        }
        if (result.success) {
          onLoginSuccess({
            ...result,
            id: result.id,
            name: result.name,
            uuid: result.uuid,
            accessToken: result.accessToken,
            webToken: result.webToken,
            is_admin: result.is_admin,
            badge: result.badge,
            two_factor_enabled: result.two_factor_enabled
          });
        } else {
          setMessage({ type: 'error', text: result.error || t('login_err_login') });
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await window.electronAPI.startGoogleAuth('login');
      if (result.success) {
        onLoginSuccess({
          ...result,
          id: result.id,
          name: result.name,
          uuid: result.uuid,
          accessToken: result.accessToken,
          webToken: result.webToken,
          is_admin: result.is_admin,
          badge: result.badge
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Не удалось войти через Google' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const glassCard = {
    background: 'rgba(10, 10, 16, 0.55)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '26px 30px',
    width: '390px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
    zIndex: 10
  };

  const twoFactorGlassCard = {
    background: 'rgba(10, 10, 16, 0.55)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '24px',
    padding: '26px 26px',
    width: '360px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(124, 58, 237, 0.12)',
    zIndex: 10
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '13px',
    color: '#fff',
    padding: '10px 14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Montserrat',
    fontSize: '12.5px',
    fontWeight: 600,
    boxSizing: 'border-box',
    transition: 'border-color 0.25s, box-shadow 0.25s',
  };

  const labelStyle = {
    display: 'block',
    color: '#a1a1aa',
    fontSize: '10px',
    textTransform: 'uppercase',
    fontWeight: 800,
    marginBottom: '6px',
    letterSpacing: '1.6px',
  };

  const getSubmitButtonIcon = () => {
    if (loginMode === 'register') return 'fa-user-plus';
    if (loginMode === 'offline') return 'fa-wifi-slash';
    return 'fa-right-to-bracket';
  };

  const getSubmitButtonText = () => {
    if (loginMode === 'register') return t('login_register_btn');
    if (loginMode === 'offline') return t('login_offline_btn');
    return t('login_submit_btn');
  };

  return (
    <div className="custom-scrollbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute',
        width: '650px',
        height: '650px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, rgba(124,58,237,0.05) 50%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Cards container: side-by-side flex layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        zIndex: 10,
        maxWidth: '100%',
        flexWrap: 'wrap'
      }}>

        {/* Main Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={glassCard}
        >
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{
              fontFamily: 'Montserrat',
              fontWeight: 900,
              fontSize: '26px',
              letterSpacing: '2px',
              color: '#fff',
              textTransform: 'uppercase',
              margin: '0 0 4px 0',
              textShadow: '0 5px 15px rgba(0,0,0,0.5)'
            }}>
              DIVLAUNCHER
            </h2>
            <p style={{
              fontSize: '11px',
              color: '#10b981',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: 0
            }}>
              {t('login_title')}
            </p>
          </div>

          {/* 2FA Active Badge on Main Card */}
          {twoFactorRequired && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '11px',
                background: 'rgba(167, 139, 250, 0.12)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                color: '#c084fc',
                fontSize: '11px',
                fontWeight: 800,
                marginBottom: '14px',
                letterSpacing: '0.5px'
              }}
            >
              <i className="fa-solid fa-shield-halved" style={{ fontSize: '13px' }} />
              <span>{t('login_2fa_badge')}</span>
            </motion.div>
          )}

          {/* Tab Selector */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '16px',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => { setLoginMode('login'); setMessage(null); resetTwoFactor(); }}
              style={{
                flex: 1,
                padding: '10px 2px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: loginMode === 'login' ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: loginMode === 'login' ? '#34d399' : '#71717a',
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
                outline: loginMode === 'login' ? '1px solid rgba(16,185,129,0.2)' : 'none'
              }}
            >
              {t('login_btn_tab')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('register'); setMessage(null); resetTwoFactor(); }}
              style={{
                flex: 1,
                padding: '10px 2px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: loginMode === 'register' ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: loginMode === 'register' ? '#34d399' : '#71717a',
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
                outline: loginMode === 'register' ? '1px solid rgba(16,185,129,0.2)' : 'none'
              }}
            >
              {t('login_reg_tab')}
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('offline'); setMessage(null); resetTwoFactor(); }}
              style={{
                flex: 1,
                padding: '10px 2px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: loginMode === 'offline' ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: loginMode === 'offline' ? '#34d399' : '#71717a',
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
                outline: loginMode === 'offline' ? '1px solid rgba(16,185,129,0.2)' : 'none'
              }}
            >
              {t('login_offline_tab')}
            </button>
          </div>

          <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={labelStyle}>{t('login_username_label')}</label>
              <motion.input
                whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
                type="text"
                placeholder={t('login_username_placeholder')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {(loginMode === 'login' || loginMode === 'register') && (
              <div>
                <label style={labelStyle}>{t('login_password_label')}</label>
                <motion.input
                  whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
                  type="password"
                  placeholder={t('login_password_placeholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            )}

            {loginMode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <label style={labelStyle}>{t('login_confirm_label')}</label>
                <motion.input
                  whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: 'none' }}
                  type="password"
                  placeholder={t('login_confirm_placeholder')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </motion.div>
            )}

            {/* Alert messages for main card when 2FA is NOT active */}
            <AnimatePresence mode="wait">
              {message && !twoFactorRequired && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: message.type === 'error' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                    color: message.type === 'error' ? '#f87171' : '#34d399',
                  }}
                >
                  <i className={`fa-solid ${message.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`} style={{ fontSize: '14px', flexShrink: 0 }} />
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
              whileTap={{ opacity: 0.85 }}
              disabled={loading}
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#fff',
                padding: '14px',
                borderRadius: '13px',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '5px'
              }}
            >
              {loading ? (
                <>
                  <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                  {t('login_loading')}
                </>
              ) : (
                <>
                  <i className={`fa-solid ${getSubmitButtonIcon()}`} />
                  {getSubmitButtonText()}
                </>
              )}
            </motion.button>

            {loginMode !== 'offline' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 2px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '10px', color: '#71717a', padding: '0 10px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
                    или
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <motion.button
                  whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ opacity: 0.85 }}
                  disabled={loading}
                  type="button"
                  onClick={handleGoogleLogin}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '13px',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <i className="fa-brands fa-google" style={{ color: '#ea4335', fontSize: '14px' }} />
                  Войти через Google
                </motion.button>
              </>
            )}
          </form>
        </motion.div>

        {/* Separate 2FA Glassmorphism Container to the right */}
        <AnimatePresence>
          {twoFactorRequired && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              style={twoFactorGlassCard}
            >
              {/* Header Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(124,58,237,0.12))',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 0 24px rgba(167, 139, 250, 0.2)'
              }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: '24px', color: '#c084fc' }} />
              </div>

              <h3 style={{
                fontFamily: 'Montserrat',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '1.5px',
                color: '#fff',
                textTransform: 'uppercase',
                textAlign: 'center',
                margin: '0 0 8px 0',
                textShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}>
                {t('login_2fa_title')}
              </h3>

              <p style={{
                fontSize: '11px',
                color: '#a1a1aa',
                fontWeight: 600,
                textAlign: 'center',
                margin: '0 0 22px 0',
                lineHeight: '1.4'
              }}>
                {t('login_2fa_subtitle')}
              </p>

              <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#c084fc' }}>
                    {t('login_2fa_label')}
                  </label>
                  <motion.input
                    autoFocus
                    whileFocus={{
                      borderColor: 'rgba(192, 132, 252, 0.75)',
                      boxShadow: '0 0 16px rgba(167, 139, 250, 0.3)'
                    }}
                    type="text"
                    maxLength={9}
                    placeholder={t('login_2fa_placeholder')}
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))}
                    style={{
                      ...inputStyle,
                      borderColor: 'rgba(167, 139, 250, 0.35)',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: 900,
                      letterSpacing: '5px',
                      color: '#fff',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '14px 16px'
                    }}
                    required
                  />
                </div>

                {/* 2FA specific message/alert */}
                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(167,139,250,0.12)',
                        border: message.type === 'error' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(167,139,250,0.3)',
                        color: message.type === 'error' ? '#f87171' : '#c084fc',
                      }}
                    >
                      <i className={`fa-solid ${message.type === 'error' ? 'fa-circle-xmark' : 'fa-info-circle'}`} style={{ fontSize: '13px', flexShrink: 0 }} />
                      <span>{message.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit 2FA Code Button */}
                <motion.button
                  whileHover={{ opacity: 0.9, boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
                  whileTap={{ opacity: 0.85 }}
                  disabled={loading}
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    color: '#fff',
                    padding: '14px',
                    borderRadius: '13px',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '4px'
                  }}
                >
                  {loading ? (
                    <>
                      <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                      {t('login_loading')}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-shield-check" style={{ fontSize: '14px' }} />
                      {t('login_2fa_confirm_btn')}
                    </>
                  )}
                </motion.button>

                {/* Cancel / Back Button */}
                <motion.button
                  whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
                  whileTap={{ opacity: 0.85 }}
                  disabled={loading}
                  type="button"
                  onClick={() => {
                    resetTwoFactor();
                    setMessage(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#a1a1aa',
                    padding: '11px',
                    borderRadius: '13px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }} />
                  {t('login_2fa_back_btn')}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Кнопка обновления — левый нижний угол */}
      {onShowUpdatePage && (
        <motion.button
          whileHover={{ opacity: 0.9, }}
          whileTap={{ opacity: 0.85 }}
          onClick={onShowUpdatePage}
          title="Обновления лаунчера"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'Montserrat',
            transition: 'all 0.2s',
            zIndex: 10
          }}
        >
          <i className="fa-solid fa-arrows-rotate" style={{ fontSize: '13px' }} />
        </motion.button>
      )}
    </div>
  );
}
