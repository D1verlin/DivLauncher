import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

export default function LoginPage({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const handleAction = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (username.trim().length < 3) {
      setMessage({ type: 'error', text: t('login_err_username_len') });
      return;
    }
    if (password.length < 4) {
      setMessage({ type: 'error', text: t('login_err_password_len') });
      return;
    }

    if (isRegister) {
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
          setIsRegister(false);
          setPassword('');
          setConfirmPassword('');
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
        const result = await window.electronAPI.customLogin(username, password);
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(l => console.log("%c[MAIN] " + l, "color: #10b981; font-weight: 500;"));
        }
        if (result.success) {
          onLoginSuccess({
            id: result.id,
            name: result.name,
            uuid: result.uuid,
            accessToken: result.accessToken,
            webToken: result.webToken,
            is_admin: result.is_admin,
            badge: result.badge
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
    background: 'rgba(10, 10, 16, 0.45)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '35px 40px',
    width: '380px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
    zIndex: 10
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '13px',
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
    letterSpacing: '1.6px',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      position: 'relative'
    }}>
      {/* Background logo effect */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 1
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={glassCard}
      >
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{
            fontFamily: 'Montserrat',
            fontWeight: 900,
            fontSize: '28px',
            letterSpacing: '2px',
            color: '#fff',
            textTransform: 'uppercase',
            margin: '0 0 5px 0',
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

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.3)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '25px'
        }}>
          <button
            onClick={() => { setIsRegister(false); setMessage(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: !isRegister ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: !isRegister ? '#34d399' : '#71717a',
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              transition: 'all 0.2s',
              outline: !isRegister ? '1px solid rgba(16,185,129,0.2)' : 'none'
            }}
          >
            {t('login_btn_tab')}
          </button>
          <button
            onClick={() => { setIsRegister(true); setMessage(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: isRegister ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: isRegister ? '#34d399' : '#71717a',
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              transition: 'all 0.2s',
              outline: isRegister ? '1px solid rgba(16,185,129,0.2)' : 'none'
            }}
          >
            {t('login_reg_tab')}
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

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
            >
              <label style={labelStyle}>{t('login_confirm_label')}</label>
              <motion.input
                whileFocus={{ borderColor: 'rgba(16,185,129,0.6)', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
                type="password"
                placeholder={t('login_confirm_placeholder')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </motion.div>
          )}

          {/* Alert messages */}
          <AnimatePresence mode="wait">
            {message && (
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
            whileHover={{ scale: 1.02, boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
            whileTap={{ scale: 0.98 }}
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
              marginTop: '10px'
            }}
          >
            {loading ? (
              <>
                <motion.i className="fa-solid fa-circle-notch" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                {t('login_loading')}
              </>
            ) : (
              <>
                <i className={`fa-solid ${isRegister ? 'fa-user-plus' : 'fa-right-to-bracket'}`} />
                {isRegister ? t('login_register_btn') : t('login_submit_btn')}
              </>
            )}
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0 5px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '10px', color: '#71717a', padding: '0 10px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
              или
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.98 }}
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
        </form>
      </motion.div>
    </div>
  );
}
