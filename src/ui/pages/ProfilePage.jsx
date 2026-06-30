import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as skinview3d from 'skinview3d';
import { getBadgeStyle, getBadgeText } from '../utils/badgeHelper';
import { useTranslation } from '../utils/i18n';

// --- Preset Background Gradients ---
const PRESET_GRADIENTS = {
  'preset-1': 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',       // Sunset
  'preset-2': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',       // Midnight Purple
  'preset-3': 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',       // Ocean Breeze
  'preset-4': 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',       // Neon Green
  'preset-5': 'linear-gradient(135deg, #111111 0%, #1e1e24 100%)',       // Cosmic Dark
  'preset-6': 'linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)',       // Aurora
  'preset-7': 'linear-gradient(135deg, #ea8580 0%, #f6a192 100%)',       // Rose Gold
  'preset-8': 'linear-gradient(135deg, #f107a3 0%, #7b2ff7 100%)',       // Cyberpunk
};

const AVAILABLE_EMOJIS = [
  '🎮', '⛏️', '⚔️', '💎', '🔥', '✨', '👑', '😎', '👾', '🍀', 
  '🚀', '🛡️', '🦊', '🍕', '💀', '🧪', '📦', '💻', '🌍', '🏆',
  '☕', '❤️', '🎨', '🎵', '👻', '⚡', '🛸', '🧙', '🐉', '🐱'
];

// --- Custom Emoji Dropdown Picker ---
function EmojiPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '56px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: '#fff',
          width: '100%',
          height: '38px',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
          boxSizing: 'border-box'
        }}
      >
        {value}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '44px',
              left: 0,
              background: 'rgba(15, 15, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '8px',
              width: '180px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 1000,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '4px'
            }}
          >
            {AVAILABLE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  padding: '4px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Minecraft Head Avatar (Canvas) ---
function MinecraftAvatar({ skinDataUrl, size = 48 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skinDataUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const s = img.width / 64;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      // Draw head base
      ctx.drawImage(img, 8 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
      // Draw head overlay
      ctx.drawImage(img, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, size, size);
    };
    img.src = skinDataUrl;
  }, [skinDataUrl, size]);

  if (!skinDataUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '12px',
        background: 'rgba(167,139,250,0.15)', border: '2px solid rgba(167,139,250,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: size / 2.2 }} />
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{
        borderRadius: '12px', imageRendering: 'pixelated',
        border: '2px solid rgba(16,185,129,0.4)', display: 'block'
      }} />
  );
}

// --- 3D Skin Viewer ---
function SkinViewer({ skinDataUrl, capeDataUrl, skinVariant, width = 210, height = 310 }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: width,
      height: height
    });
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.5;
    viewer.zoom = 0.95;
    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.animation.speed = 0.5;
    viewer.renderer.setClearColor(0x000000, 0);
    viewerRef.current = viewer;
    return () => { viewer.dispose(); };
  }, [width, height]);

  useEffect(() => {
    if (!viewerRef.current) return;
    if (skinDataUrl) {
      viewerRef.current.loadSkin(skinDataUrl, { model: skinVariant }).catch(() => {});
    }
  }, [skinDataUrl, skinVariant]);

  useEffect(() => {
    if (!viewerRef.current) return;
    if (capeDataUrl) {
      viewerRef.current.loadCape(capeDataUrl).catch(() => {});
    } else {
      viewerRef.current.loadCape(null);
    }
  }, [capeDataUrl]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '14px' }} />;
}

// --- Info box ---
function InfoBox({ color = '#a1a1aa', icon = 'fa-solid fa-circle-info', children }) {
  return (
    <div style={{
      display: 'flex', gap: '9px', alignItems: 'flex-start', padding: '11px 14px',
      background: `${color}0c`, border: `1px solid ${color}22`, borderRadius: '11px',
    }}>
      <i className={icon} style={{ color, fontSize: '12px', marginTop: '3px', flexShrink: 0 }} />
      <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

export default function ProfilePage({ profile: initialProfile, isOwnProfile = true, onBack, onLogout, currentPack, onProfileUpdate }) {
  const { t, lang } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [skinUrl, setSkinUrl] = useState(null);
  const [capeUrl, setCapeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Active settings tab: 'style' | 'socials' | 'security'
  const [activeTab, setActiveTab] = useState('style');

  // Customization States
  const [bioText, setBioText] = useState(profile.bio || '');
  const [statusEmoji, setStatusEmoji] = useState(profile.status_emoji || '🎮');
  const [statusText, setStatusText] = useState(profile.status_text || '');
  const [profileBgType, setProfileBgType] = useState(profile.profile_bg_type || 'preset');
  const [profileBgValue, setProfileBgValue] = useState(profile.profile_bg_value || 'preset-1');
  const [avatarType, setAvatarType] = useState(profile.avatar_type || 'minecraft');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [skinVariant, setSkinVariant] = useState(profile.skin_model || 'classic');

  // Social Links States
  const [socialDiscord, setSocialDiscord] = useState(profile.social_discord || '');
  const [socialTelegram, setSocialTelegram] = useState(profile.social_telegram || '');
  const [socialYoutube, setSocialYoutube] = useState(profile.social_youtube || '');
  const [socialGithub, setSocialGithub] = useState(profile.social_github || '');

  // Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sync profile update with local state
  useEffect(() => {
    setProfile(initialProfile);
    setBioText(initialProfile.bio || '');
    setStatusEmoji(initialProfile.status_emoji || '🎮');
    setStatusText(initialProfile.status_text || '');
    setProfileBgType(initialProfile.profile_bg_type || 'preset');
    setProfileBgValue(initialProfile.profile_bg_value || 'preset-1');
    setAvatarType(initialProfile.avatar_type || 'minecraft');
    setAvatarUrl(initialProfile.avatar_url || '');
    setSkinVariant(initialProfile.skin_model || 'classic');
    setSocialDiscord(initialProfile.social_discord || '');
    setSocialTelegram(initialProfile.social_telegram || '');
    setSocialYoutube(initialProfile.social_youtube || '');
    setSocialGithub(initialProfile.social_github || '');
  }, [initialProfile]);

  // Refresh profile logic (Stale-While-Revalidate trigger)
  const fetchUpdatedProfile = useCallback(async () => {
    try {
      const url = await window.electronAPI.getAuthServerUrl();
      const cacheFile = await window.electronAPI.customCheckAuth();
      if (cacheFile && cacheFile.webToken) {
        // Fetch background details for target profile (either viewed user or own profile)
        const targetUuid = profile.uuid;
        const response = await fetch(`${url}/api/profile?uuid=${targetUuid}`, {
          headers: { 'Authorization': `Bearer ${cacheFile.webToken}` }
        });
        if (response.ok) {
          const updated = await response.json();
          // Update profile state
          setProfile(updated);
          // Callback to parent App.jsx memory cache
          if (onProfileUpdate) {
            onProfileUpdate(updated);
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  }, [profile.uuid, onProfileUpdate]);

  // Load profile skin/cape data
  const loadSkinData = useCallback(async () => {
    if (!profile || !window.electronAPI.getSkinData) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getSkinData(profile.uuid);
      if (result.success && result.skinDataUrl) {
        setSkinUrl(result.skinDataUrl);
        setCapeUrl(result.capeDataUrl);
      } else {
        const steveResult = await window.electronAPI.getDefaultSkin();
        if (steveResult.success) {
          setSkinUrl(steveResult.skinDataUrl);
          setCapeUrl(null);
        }
      }
    } catch (e) {
      console.error('[ProfilePage] Error fetching skin data:', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchUpdatedProfile();
  }, []);

  useEffect(() => {
    loadSkinData();
  }, [loadSkinData]);

  // Open external links handler
  const handleSocialClick = (platform, username) => {
    if (!username) return;

    if (platform === 'discord') {
      navigator.clipboard.writeText(username);
      setUploadStatus({
        type: 'success',
        text: lang === 'ru' ? `Discord тег "${username}" скопирован в буфер обмена!` : `Discord tag "${username}" copied to clipboard!`
      });
      return;
    }

    let url = '';
    if (platform === 'telegram') {
      const cleanUser = username.startsWith('@') ? username.slice(1) : username;
      url = `https://t.me/${cleanUser}`;
    } else if (platform === 'github') {
      url = `https://github.com/${username}`;
    } else if (platform === 'youtube') {
      url = username.startsWith('http') ? username : `https://youtube.com/@${username.startsWith('@') ? username.slice(1) : username}`;
    }

    if (url && window.electronAPI && window.electronAPI.openExternalLink) {
      window.electronAPI.openExternalLink(url);
    }
  };

  // Skin upload handler
  const handleUploadSkin = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadSkin(currentPack?.clientDir, profile.username || profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Скин успешно загружен на сервер!' : 'Skin uploaded successfully!' });
        loadSkinData();
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || (lang === 'ru' ? 'Ошибка загрузки скина' : 'Skin upload error') });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Cape upload handler
  const handleUploadCape = async () => {
    setUploadStatus(null);
    try {
      const result = await window.electronAPI.uploadCape(currentPack?.clientDir, profile.username || profile.name);
      if (result.success) {
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Плащ успешно загружен на сервер!' : 'Cape uploaded successfully!' });
        loadSkinData();
      } else if (result.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: result.error || (lang === 'ru' ? 'Ошибка загрузки плаща' : 'Cape upload error') });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Copy UUID
  const handleCopyUuid = () => {
    navigator.clipboard.writeText(profile.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  // Save customization changes
  const saveCustomization = async (fields) => {
    try {
      const res = await window.electronAPI.updateProfileCustomization(fields);
      if (res.success) {
        setProfile(prev => ({ ...prev, ...res.user }));
        if (onProfileUpdate) {
          onProfileUpdate(res.user);
        }
        return true;
      } else {
        alert(res.error || 'Ошибка обновления кастомизации');
        return false;
      }
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  // Handle Preset Background Selection
  const handleSelectPreset = async (presetId) => {
    setProfileBgType('preset');
    setProfileBgValue(presetId);
    await saveCustomization({ profile_bg_type: 'preset', profile_bg_value: presetId });
  };

  // Handle Custom Background Upload
  const handleUploadBackground = async () => {
    try {
      const res = await window.electronAPI.uploadBackground();
      if (res.success) {
        setProfileBgType('custom');
        setProfileBgValue(res.profile_bg_value);
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Фон профиля успешно обновлен!' : 'Profile background updated!' });
        if (onProfileUpdate) {
          onProfileUpdate({ profile_bg_type: 'custom', profile_bg_value: res.profile_bg_value });
        }
      } else if (res.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: res.error });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Handle Custom Avatar Upload
  const handleUploadAvatar = async () => {
    try {
      const res = await window.electronAPI.uploadAvatar();
      if (res.success) {
        setAvatarType('custom');
        setAvatarUrl(res.avatar_url);
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Аватар профиля успешно обновлен!' : 'Profile avatar updated!' });
        if (onProfileUpdate) {
          onProfileUpdate({ avatar_type: 'custom', avatar_url: res.avatar_url });
        }
      } else if (res.error !== 'Выбор отменен') {
        setUploadStatus({ type: 'error', text: res.error });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: err.message });
    }
  };

  // Handle Avatar Type switch
  const handleSwitchAvatarType = async (type) => {
    setAvatarType(type);
    await saveCustomization({ avatar_type: type });
  };

  // Handle Skin model variant change (Classic vs Slim)
  const handleToggleSkinVariant = async () => {
    const nextVariant = skinVariant === 'classic' ? 'slim' : 'classic';
    setSkinVariant(nextVariant);
    await saveCustomization({ skin_model: nextVariant });
  };

  // Save status text and bio
  const handleSaveStatus = async () => {
    await saveCustomization({
      status_emoji: statusEmoji,
      status_text: statusText,
      bio: bioText
    });
    setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Профиль успешно сохранен!' : 'Profile saved successfully!' });
  };

  // Save Social Media Links
  const handleSaveSocials = async () => {
    await saveCustomization({
      social_discord: socialDiscord,
      social_telegram: socialTelegram,
      social_youtube: socialYoutube,
      social_github: socialGithub
    });
    setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Ссылки на соцсети успешно сохранены!' : 'Social links saved!' });
  };

  // Link/Unlink Google Auth
  const handleLinkGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await window.electronAPI.startGoogleAuth('link');
      if (result.success) {
        await fetchUpdatedProfile();
        setUploadStatus({ type: 'success', text: lang === 'ru' ? `Google аккаунт ${result.email} привязан!` : `Google account ${result.email} linked!` });
      } else {
        alert(result.error || 'Ошибка привязки Google');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm(lang === 'ru' ? 'Вы уверены, что хотите отвязать Google аккаунт?' : 'Are you sure you want to unlink Google account?')) return;
    setGoogleLoading(true);
    try {
      const result = await window.electronAPI.unlinkGoogle();
      if (result.success) {
        await fetchUpdatedProfile();
        setUploadStatus({ type: 'success', text: lang === 'ru' ? 'Google аккаунт успешно отвязан!' : 'Google account unlinked!' });
      } else {
        alert(result.error || 'Ошибка отвязки Google');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 4) {
      setPasswordStatus({ type: 'error', text: lang === 'ru' ? 'Пароль должен быть не менее 4 символов' : 'Password must be at least 4 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: lang === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await window.electronAPI.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPasswordStatus({ type: 'success', text: lang === 'ru' ? 'Пароль успешно изменен!' : 'Password changed successfully!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', text: res.error || (lang === 'ru' ? 'Ошибка смены пароля' : 'Password change error') });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  // UI styling tokens
  const glassCard = {
    background: 'rgba(10, 10, 16, 0.5)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '20px',
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    padding: '10px 14px',
    outline: 'none',
    fontFamily: 'Montserrat',
    fontSize: '12px',
    fontWeight: 600,
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const currentBgStyle = profileBgType === 'preset'
    ? { background: PRESET_GRADIENTS[profileBgValue] || PRESET_GRADIENTS['preset-1'] }
    : { backgroundImage: `url(${profileBgValue.startsWith('/') ? 'https://mcauth.diverlin.ru' + profileBgValue : profileBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  const finalAvatarUrl = avatarUrl.startsWith('/') ? 'https://mcauth.diverlin.ru' + avatarUrl : avatarUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header section (FIXED AT TOP) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {!isOwnProfile && (
            <motion.button
              whileHover={{ scale: 1.05, x: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'Montserrat',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-arrow-left" /> {t('mods_back') || 'Назад'}
            </motion.button>
          )}
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
            textShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}>
            {isOwnProfile ? (lang === 'ru' ? 'Личный кабинет' : 'Account Panel') : (lang === 'ru' ? 'Профиль игрока' : 'Player Profile')}
          </h1>
        </div>
      </div>

      {/* --- SCROLLABLE BODY AREA --- */}
      <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {isOwnProfile ? (
          /* ================= OWN PROFILE VIEW ================= */
          <>
            {/* --- TOP BLOCK: Premium Preview Card --- */}
            <div style={{
              ...glassCard,
              ...currentBgStyle,
              position: 'relative',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              flexShrink: 0
            }}>
              {/* Dark overlay for text legibility */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.75) 100%)',
                zIndex: 1
              }} />

              {/* User avatar and name info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 2, flexGrow: 1 }}>
                {avatarType === 'custom' && avatarUrl ? (
                  <img
                    src={finalAvatarUrl}
                    alt="Avatar"
                    style={{
                      width: '72px', height: '72px', borderRadius: '18px',
                      objectFit: 'cover', border: '3px solid rgba(167, 139, 250, 0.6)',
                      boxShadow: '0 0 16px rgba(167, 139, 250, 0.4)'
                    }}
                  />
                ) : (
                  <div style={{ border: '3px solid rgba(16, 185, 129, 0.6)', borderRadius: '16px', padding: '2px', background: 'rgba(0,0,0,0.4)' }}>
                    <MinecraftAvatar skinDataUrl={skinUrl} size={64} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {profile.badge && (
                      <span style={getBadgeStyle(profile.badge)}>
                        {getBadgeText(profile.badge)}
                      </span>
                    )}
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {profile.username || profile.name}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: profile.is_admin ? '#10b981' : '#a78bfa',
                      background: profile.is_admin ? 'rgba(16,185,129,0.2)' : 'rgba(167,139,250,0.2)',
                      border: profile.is_admin ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(167,139,250,0.4)',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {profile.is_admin ? (lang === 'ru' ? 'Администратор' : 'Administrator') : (lang === 'ru' ? 'Игрок' : 'Player')}
                    </span>
                  </div>

                  {/* User status message */}
                  {(statusText || statusEmoji) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e4e4e7', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ fontSize: '16px' }}>{statusEmoji}</span>
                      <span>{statusText}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#a1a1aa', fontSize: '12px', fontStyle: 'italic' }}>
                      {lang === 'ru' ? 'Статус не установлен' : 'Status not configured'}
                    </span>
                  )}

                  {/* Biography (Bio) block inside card */}
                  {profile.bio && (
                    <div style={{
                      color: '#d4d4d8',
                      fontSize: '11px',
                      marginTop: '4px',
                      opacity: 0.85,
                      fontStyle: 'italic',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      borderLeft: '2px solid rgba(167,139,250,0.4)',
                      paddingLeft: '8px'
                    }}>
                      "{profile.bio}"
                    </div>
                  )}

                  {/* Clickable UUID */}
                  <div
                    onClick={handleCopyUuid}
                    style={{
                      fontSize: '11px', color: '#a1a1aa', marginTop: '6px',
                      fontFamily: 'monospace', cursor: 'pointer', display: 'inline-flex',
                      alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)',
                      padding: '3px 8px', borderRadius: '8px', width: 'fit-content'
                    }}
                    title={lang === 'ru' ? 'Скопировать UUID' : 'Copy UUID'}
                  >
                    <span>UUID: {profile.uuid}</span>
                    <i className="fa-solid fa-copy" style={{ fontSize: '10px' }} />
                    <AnimatePresence>
                      {copiedUuid && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, marginLeft: '4px' }}
                        >
                          {lang === 'ru' ? 'Скопировано!' : 'Copied!'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Social connections badge widget (CLICKABLE WITH HOVER & ACTIVE EFFECTS) */}
              <div style={{ display: 'flex', gap: '10px', zIndex: 2 }}>
                {socialDiscord && (
                  <motion.div
                    whileHover={{ scale: 1.1, background: 'rgba(88, 101, 242, 0.35)', borderColor: 'rgba(88, 101, 242, 0.7)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSocialClick('discord', socialDiscord)}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(88, 101, 242, 0.2)', border: '1px solid rgba(88, 101, 242, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#5865f2', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title={`Discord: ${socialDiscord} (${lang === 'ru' ? 'Кликните, чтобы скопировать тег' : 'Click to copy tag'})`}
                  >
                    <i className="fa-brands fa-discord" />
                  </motion.div>
                )}
                {socialTelegram && (
                  <motion.div
                    whileHover={{ scale: 1.1, background: 'rgba(36, 161, 222, 0.35)', borderColor: 'rgba(36, 161, 222, 0.7)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSocialClick('telegram', socialTelegram)}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(36, 161, 222, 0.2)', border: '1px solid rgba(36, 161, 222, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#24a1de', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title={`Telegram: ${socialTelegram} (${lang === 'ru' ? 'Открыть в Telegram' : 'Open in Telegram'})`}
                  >
                    <i className="fa-brands fa-telegram" />
                  </motion.div>
                )}
                {socialYoutube && (
                  <motion.div
                    whileHover={{ scale: 1.1, background: 'rgba(255, 0, 0, 0.35)', borderColor: 'rgba(255, 0, 0, 0.7)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSocialClick('youtube', socialYoutube)}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(255, 0, 0, 0.2)', border: '1px solid rgba(255, 0, 0, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ff0000', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title={`YouTube: ${socialYoutube} (${lang === 'ru' ? 'Перейти на канал' : 'Open YouTube Channel'})`}
                  >
                    <i className="fa-brands fa-youtube" />
                  </motion.div>
                )}
                {socialGithub && (
                  <motion.div
                    whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSocialClick('github', socialGithub)}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title={`GitHub: ${socialGithub} (${lang === 'ru' ? 'Открыть профиль GitHub' : 'Open GitHub profile'})`}
                  >
                    <i className="fa-brands fa-github" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Upload/Customization feedback messages */}
            <AnimatePresence>
              {uploadStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', fontSize: '11px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                    background: uploadStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: uploadStatus.type === 'error' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                    color: uploadStatus.type === 'error' ? '#f87171' : '#34d399',
                    flexShrink: 0
                  }}
                >
                  <i className={`fa-solid ${uploadStatus.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`} />
                  <span>{uploadStatus.text}</span>
                  <button onClick={() => setUploadStatus(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- TWO COLUMNS SECTION --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', flexGrow: 1 }}>
              
              {/* LEFT COLUMN: 3D Skin Viewer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ ...glassCard, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    padding: '2px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(16,185,129,0.2))',
                  }}>
                    <div style={{
                      background: 'radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.07) 0%, rgba(5,5,12,0.97) 70%)',
                      borderRadius: '14px', overflow: 'hidden', width: '200px', height: '300px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {loading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          style={{ width: '40px', height: '40px', border: '4px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
                      ) : (
                        <SkinViewer skinDataUrl={skinUrl} capeDataUrl={capeUrl} skinVariant={skinVariant} />
                      )}
                    </div>
                  </div>

                  {/* Model switcher */}
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleToggleSkinVariant}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', padding: '8px 12px', borderRadius: '10px',
                      cursor: 'pointer', fontFamily: 'Montserrat', fontSize: '11px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <i className="fa-solid fa-shirt" />
                    {lang === 'ru' ? 'Модель: ' : 'Model: '}
                    {skinVariant === 'classic' ? 'Steve (Classic)' : 'Alex (Slim)'}
                  </motion.button>
                </div>

                {/* Skin and Cape Upload Action Buttons */}
                <div style={{ ...glassCard, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleUploadSkin}
                    style={{
                      background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(124,58,237,0.08))',
                      border: '1px solid rgba(167,139,250,0.25)',
                      color: '#c4b5fd', padding: '11px', borderRadius: '11px',
                      cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}>
                    <i className="fa-solid fa-arrow-up-from-bracket" /> {lang === 'ru' ? 'Загрузить скин' : 'Upload skin'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleUploadCape}
                    style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
                      border: '1px solid rgba(16,185,129,0.25)',
                      color: '#34d399', padding: '11px', borderRadius: '11px',
                      cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}>
                    <i className="fa-solid fa-circle-chevron-up" /> {lang === 'ru' ? 'Загрузить плащ' : 'Upload cape'}
                  </motion.button>
                </div>
              </div>

              {/* RIGHT COLUMN: Control/Customization Panels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Tabs Selector Navigation */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '4px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => setActiveTab('style')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'style' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'style' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-palette" style={{ marginRight: '6px' }} />
                    {lang === 'ru' ? 'Стиль' : 'Style'}
                  </button>
                  <button
                    onClick={() => setActiveTab('socials')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'socials' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'socials' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-share-nodes" style={{ marginRight: '6px' }} />
                    {lang === 'ru' ? 'Соцсети' : 'Socials'}
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'security' ? 'rgba(167,139,250,0.15)' : 'transparent',
                      color: activeTab === 'security' ? '#c4b5fd' : '#71717a',
                      fontFamily: 'Montserrat', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }} />
                    {lang === 'ru' ? 'Безопасность' : 'Security'}
                  </button>
                </div>

                {/* TAB CONTENTS */}
                <div style={{ ...glassCard, padding: '20px', flexGrow: 1 }}>
                  
                  {/* STYLE TAB */}
                  {activeTab === 'style' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Preset Gradients Selector */}
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {lang === 'ru' ? 'Фон профиля (Пресеты)' : 'Profile Background Presets'}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {Object.keys(PRESET_GRADIENTS).map((key) => (
                            <motion.button
                              key={key}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSelectPreset(key)}
                              style={{
                                width: '40px', height: '40px', borderRadius: '50%', border: profileBgType === 'preset' && profileBgValue === key ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                                background: PRESET_GRADIENTS[key], cursor: 'pointer', boxShadow: profileBgType === 'preset' && profileBgValue === key ? '0 0 10px rgba(255,255,255,0.4)' : 'none'
                              }}
                              title={key}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Custom Background Uploader */}
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {lang === 'ru' ? 'Собственные обои профиля' : 'Custom Profile Background'}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleUploadBackground}
                            style={{
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                              fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            <i className="fa-solid fa-image" />
                            {lang === 'ru' ? 'Загрузить изображение / GIF' : 'Upload Image / GIF'}
                          </motion.button>
                          <span style={{ fontSize: '10px', color: '#71717a' }}>
                            {lang === 'ru' ? 'Рекомендуется: PNG, JPG, GIF (макс. 5МБ)' : 'Recommended: PNG, JPG, GIF (max 5MB)'}
                          </span>
                        </div>
                      </div>

                      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '5px 0' }} />

                      {/* Avatar Type and Upload */}
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {lang === 'ru' ? 'Аватар профиля' : 'Profile Avatar'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleSwitchAvatarType('minecraft')}
                              style={{
                                background: avatarType === 'minecraft' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${avatarType === 'minecraft' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                color: avatarType === 'minecraft' ? '#34d399' : '#a1a1aa',
                                padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat', transition: 'all 0.2s'
                              }}
                            >
                              Minecraft голова
                            </button>
                            <button
                              onClick={() => handleSwitchAvatarType('custom')}
                              style={{
                                background: avatarType === 'custom' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${avatarType === 'custom' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                color: avatarType === 'custom' ? '#34d399' : '#a1a1aa',
                                padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat', transition: 'all 0.2s'
                              }}
                            >
                              Кастомная аватарка
                            </button>
                          </div>

                      {avatarType === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleUploadAvatar}
                            style={{
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                              fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            <i className="fa-solid fa-user-tie" />
                            {lang === 'ru' ? 'Загрузить аватарку' : 'Upload Avatar Picture'}
                          </motion.button>
                          <span style={{ fontSize: '10px', color: '#71717a' }}>
                            {lang === 'ru' ? 'PNG, JPG, GIF (макс. 2МБ)' : 'PNG, JPG, GIF (max 2MB)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '5px 0' }} />

                  {/* Status and Bio Edit (WITH CUSTOM EMOJI PICKER & z-index layout) */}
                  <div style={{ position: 'relative' }}>
                    <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ru' ? 'Статус и информация' : 'Status & Bio Information'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                        <EmojiPicker
                          value={statusEmoji}
                          onChange={(emoji) => setStatusEmoji(emoji)}
                        />
                        <input
                          type="text"
                          placeholder={lang === 'ru' ? 'Чем вы сейчас занимаетесь?' : 'What are you doing now?'}
                          value={statusText}
                          onChange={(e) => setStatusText(e.target.value)}
                          style={inputStyle}
                          maxLength={50}
                        />
                      </div>
                      <div style={{ zIndex: 1 }}>
                        <textarea
                          placeholder={lang === 'ru' ? 'Расскажите о себе в профиле...' : 'Write bio description...'}
                          value={bioText}
                          onChange={(e) => setBioText(e.target.value)}
                          style={{
                            ...inputStyle,
                            minHeight: '60px',
                            resize: 'vertical',
                            fontFamily: 'Montserrat',
                          }}
                          maxLength={150}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={handleSaveStatus}
                          style={{
                            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', color: '#fff',
                            padding: '8px 20px', borderRadius: '10px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                          }}
                        >
                          Сохранить стиль и статус
                        </motion.button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* SOCIALS TAB */}
              {activeTab === 'socials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'ru' ? 'Связанные аккаунты соцсетей' : 'Linked Social Media Profiles'}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
                        <i className="fa-brands fa-discord" style={{ marginRight: '6px', color: '#5865f2' }} /> Discord
                      </label>
                      <input
                        type="text"
                        placeholder="username"
                        value={socialDiscord}
                        onChange={(e) => setSocialDiscord(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
                        <i className="fa-brands fa-telegram" style={{ marginRight: '6px', color: '#24a1de' }} /> Telegram
                      </label>
                      <input
                        type="text"
                        placeholder="@username"
                        value={socialTelegram}
                        onChange={(e) => setSocialTelegram(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
                        <i className="fa-brands fa-youtube" style={{ marginRight: '6px', color: '#ff0000' }} /> YouTube Channel URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://youtube.com/@channel"
                        value={socialYoutube}
                        onChange={(e) => setSocialYoutube(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
                        <i className="fa-brands fa-github" style={{ marginRight: '6px', color: '#fff' }} /> GitHub
                      </label>
                      <input
                        type="text"
                        placeholder="username"
                        value={socialGithub}
                        onChange={(e) => setSocialGithub(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleSaveSocials}
                        style={{
                          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', color: '#fff',
                          padding: '8px 20px', borderRadius: '10px', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                        }}
                      >
                        Сохранить соцсети
                      </motion.button>
                    </div>
                  </div>

                </div>
              )}

              {/* SECURITY & ACCOUNT TAB */}
              {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Google OAuth Verification Binding */}
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ru' ? 'Google верификация' : 'Google Account Verification'}
                    </h3>
                    
                    {profile.google_email ? (
                      <div style={{
                        padding: '14px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <i className="fa-brands fa-google" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase' }}>Аккаунт верифицирован</div>
                            <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginTop: '2px' }}>{profile.google_email}</div>
                          </div>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={handleUnlinkGoogle}
                          disabled={googleLoading}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171', padding: '6px 12px', borderRadius: '8px', cursor: googleLoading ? 'wait' : 'pointer',
                            fontFamily: 'Montserrat', fontSize: '10px', fontWeight: 800
                          }}
                        >
                          Отвязать
                        </motion.button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '14px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                            <i className="fa-solid fa-circle-exclamation" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase' }}>Верификация отсутствует</div>
                            <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginTop: '2px' }}>Привяжите Google для защиты аккаунта</div>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={handleLinkGoogle}
                          disabled={googleLoading}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                            color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: googleLoading ? 'wait' : 'pointer',
                            fontFamily: 'Montserrat', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <i className="fa-brands fa-google" />
                          Привязать
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '5px 0' }} />

                  {/* Change Password Panel */}
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ru' ? 'Смена пароля лаунчера' : 'Change Launcher Password'}
                    </h3>
                    <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <input
                          type="password"
                          placeholder={lang === 'ru' ? 'Текущий пароль' : 'Current Password'}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                        <input
                          type="password"
                          placeholder={lang === 'ru' ? 'Новый пароль' : 'New Password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                        <input
                          type="password"
                          placeholder={lang === 'ru' ? 'Повторите новый' : 'Confirm New'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={inputStyle}
                          required
                        />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          type="submit"
                          disabled={passwordLoading}
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff',
                            padding: '8px 20px', borderRadius: '10px', cursor: passwordLoading ? 'wait' : 'pointer',
                            fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat'
                          }}
                        >
                          {passwordLoading ? 'Сохранение...' : 'Обновить пароль'}
                        </motion.button>
                      </div>

                      {passwordStatus && (
                        <div style={{
                          padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          background: passwordStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                          border: passwordStatus.type === 'error' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(16,185,129,0.15)',
                          color: passwordStatus.type === 'error' ? '#f87171' : '#34d399'
                        }}>
                          {passwordStatus.text}
                        </div>
                      )}
                    </form>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '5px 0' }} />

                  {/* Logout block */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={onLogout}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171', padding: '10px 18px', borderRadius: '12px',
                        cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800,
                        fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <i className="fa-solid fa-right-from-bracket" />
                      {lang === 'ru' ? 'Выйти из аккаунта' : 'Logout from Account'}
                    </motion.button>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sync footer warning info */}
        <div style={{ marginTop: '10px', flexShrink: 0 }}>
          <InfoBox color="#3b82f6" icon="fa-solid fa-circle-info">
            {lang === 'ru' ? 'Кастомизация вашего профиля (фон, аватарка, соцсети, статусы) мгновенно синхронизируется с сервером авторизации и видна другим игрокам в списке.' : 'Profile customizability (background, avatar, status, social profiles) automatically synchronizes with the auth backend and is visible to other players.'}
          </InfoBox>
        </div>
      </>
        ) : (
          /* ================= GORGEOUS PUBLIC PLAYER PROFILE SHOWCASE ================= */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '24px',
            flexGrow: 1,
            alignItems: 'stretch',
            paddingBottom: '20px'
          }}>
            {/* LEFT COLUMN: Passport ID Card */}
            <div style={{
              ...glassCard,
              ...currentBgStyle,
              position: 'relative',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '30px'
            }}>
              {/* Dark overlay for readability */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.9) 100%)',
                zIndex: 1
              }} />

              {/* Main Details Wrapper */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>
                
                {/* Header Profile Badge/Avatar/Username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {avatarType === 'custom' && avatarUrl ? (
                    <img
                      src={finalAvatarUrl}
                      alt="Avatar"
                      style={{
                        width: '80px', height: '80px', borderRadius: '20px',
                        objectFit: 'cover', border: '3px solid rgba(167, 139, 250, 0.7)',
                        boxShadow: '0 0 20px rgba(167, 139, 250, 0.4)'
                      }}
                    />
                  ) : (
                    <div style={{ border: '3px solid rgba(16, 185, 129, 0.7)', borderRadius: '18px', padding: '2px', background: 'rgba(0,0,0,0.5)' }}>
                      <MinecraftAvatar skinDataUrl={skinUrl} size={72} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {profile.badge && (
                        <span style={getBadgeStyle(profile.badge)}>
                          {getBadgeText(profile.badge)}
                        </span>
                      )}
                      <span style={{ fontSize: '26px', fontWeight: 950, color: '#fff', letterSpacing: '0.5px' }}>
                        {profile.username || profile.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        color: profile.is_admin ? '#10b981' : '#a78bfa',
                        background: profile.is_admin ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.15)',
                        border: profile.is_admin ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(167,139,250,0.3)',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        {profile.is_admin ? (lang === 'ru' ? 'Администратор' : 'Administrator') : (lang === 'ru' ? 'Игрок' : 'Player')}
                      </span>
                      {profile.google_email && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 900,
                          color: '#10b981',
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <i className="fa-solid fa-circle-check" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status message */}
                {(statusText || statusEmoji) && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px',
                    color: '#e4e4e7', fontSize: '13px', fontWeight: 600, width: 'fit-content'
                  }}>
                    <span style={{ fontSize: '18px' }}>{statusEmoji}</span>
                    <span>{statusText}</span>
                  </div>
                )}

                {/* Detailed quote Bio Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <h4 style={{ color: '#71717a', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                    {lang === 'ru' ? 'Биография' : 'About me'}
                  </h4>
                  <div style={{
                    padding: '16px 20px',
                    background: 'rgba(167, 139, 250, 0.03)',
                    border: '1px solid rgba(167, 139, 250, 0.1)',
                    borderRadius: '16px',
                    color: '#e4e4e7',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    fontStyle: profile.bio ? 'normal' : 'italic',
                    wordBreak: 'break-word'
                  }}>
                    {profile.bio ? `"${profile.bio}"` : (lang === 'ru' ? 'Этот игрок еще ничего не рассказал о себе.' : 'This player hasn\'t written a biography yet.')}
                  </div>
                </div>

                {/* Social media connections lists */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <h4 style={{ color: '#71717a', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                    {lang === 'ru' ? 'Контакты и соцсети' : 'Contacts & Social Profiles'}
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {socialDiscord ? (
                      <motion.div
                        whileHover={{ scale: 1.02, background: 'rgba(88, 101, 242, 0.15)' }}
                        onClick={() => handleSocialClick('discord', socialDiscord)}
                        style={{
                          padding: '12px', borderRadius: '12px', background: 'rgba(88, 101, 242, 0.08)',
                          border: '1px solid rgba(88, 101, 242, 0.25)', display: 'flex', alignItems: 'center', gap: '10px',
                          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <i className="fa-brands fa-discord" style={{ color: '#5865f2', fontSize: '16px' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{socialDiscord}</span>
                      </motion.div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b', fontSize: '12px', fontWeight: 700 }}>
                        <i className="fa-brands fa-discord" style={{ opacity: 0.3 }} />
                        <span>Discord offline</span>
                      </div>
                    )}

                    {socialTelegram ? (
                      <motion.div
                        whileHover={{ scale: 1.02, background: 'rgba(36, 161, 222, 0.15)' }}
                        onClick={() => handleSocialClick('telegram', socialTelegram)}
                        style={{
                          padding: '12px', borderRadius: '12px', background: 'rgba(36, 161, 222, 0.08)',
                          border: '1px solid rgba(36, 161, 222, 0.25)', display: 'flex', alignItems: 'center', gap: '10px',
                          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <i className="fa-brands fa-telegram" style={{ color: '#24a1de', fontSize: '16px' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{socialTelegram}</span>
                      </motion.div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b', fontSize: '12px', fontWeight: 700 }}>
                        <i className="fa-brands fa-telegram" style={{ opacity: 0.3 }} />
                        <span>Telegram offline</span>
                      </div>
                    )}

                    {socialYoutube ? (
                      <motion.div
                        whileHover={{ scale: 1.02, background: 'rgba(255, 0, 0, 0.15)' }}
                        onClick={() => handleSocialClick('youtube', socialYoutube)}
                        style={{
                          padding: '12px', borderRadius: '12px', background: 'rgba(255, 0, 0, 0.08)',
                          border: '1px solid rgba(255, 0, 0, 0.25)', display: 'flex', alignItems: 'center', gap: '10px',
                          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <i className="fa-brands fa-youtube" style={{ color: '#ff0000', fontSize: '16px' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>YouTube</span>
                      </motion.div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b', fontSize: '12px', fontWeight: 700 }}>
                        <i className="fa-brands fa-youtube" style={{ opacity: 0.3 }} />
                        <span>YouTube offline</span>
                      </div>
                    )}

                    {socialGithub ? (
                      <motion.div
                        whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.15)' }}
                        onClick={() => handleSocialClick('github', socialGithub)}
                        style={{
                          padding: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', gap: '10px',
                          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <i className="fa-brands fa-github" style={{ color: '#fff', fontSize: '16px' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{socialGithub}</span>
                      </motion.div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b', fontSize: '12px', fontWeight: 700 }}>
                        <i className="fa-brands fa-github" style={{ opacity: 0.3 }} />
                        <span>GitHub offline</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: Huge rotating 3D skin model container */}
            <div style={{
              ...glassCard,
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              
              <div style={{
                position: 'absolute', top: '20px', left: '20px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Character Showcase
                </span>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }} />
              </div>

              <div style={{
                padding: '2px', borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(167,139,250,0.4), rgba(16,185,129,0.3))',
                boxShadow: '0 10px 40px rgba(167, 139, 250, 0.15)'
              }}>
                <div style={{
                  background: 'radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.1) 0%, rgba(5,5,12,0.99) 80%)',
                  borderRadius: '22px', overflow: 'hidden', width: '280px', height: '390px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      style={{ width: '50px', height: '50px', border: '5px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
                  ) : (
                    <SkinViewer skinDataUrl={skinUrl} capeDataUrl={capeUrl} skinVariant={skinVariant} width={280} height={390} />
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: '16px', color: '#71717a', fontSize: '11px', fontWeight: 600 }}>
                {lang === 'ru' ? 'Модель персонажа: ' : 'Character Model: '}
                <span style={{ color: '#fff', fontWeight: 800 }}>{skinVariant === 'classic' ? 'Steve (Classic)' : 'Alex (Slim)'}</span>
              </div>
            </div>
          </div>
        )}

      </div>
      
    </div>
  );
}
