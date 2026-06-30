let loadedBadges = [];

export function setLoadedBadges(badges) {
  if (Array.isArray(badges)) {
    loadedBadges = badges;
  }
}

export function getLoadedBadges() {
  return loadedBadges;
}

export function getBadgeText(badge) {
  if (!badge) return '';
  const b = badge.toUpperCase().trim();
  const found = loadedBadges.find(x => x.code.toUpperCase() === b);
  if (found) return found.text;
  return badge;
}

export function getBadgeStyle(badge) {
  if (!badge) return null;
  const b = badge.toUpperCase().trim();
  
  let gradient = 'linear-gradient(135deg, #a78bfa, #10b981)'; // default
  let border = 'rgba(255, 255, 255, 0.15)';
  
  // Look up in loaded dynamic badges first
  const found = loadedBadges.find(x => x.code.toUpperCase() === b);
  if (found) {
    gradient = `linear-gradient(135deg, ${found.gradient_start}, ${found.gradient_end})`;
    border = found.border_color;
  } else {
    // Fallback to hardcoded default styles
    if (b === 'ADMIN' || b === 'АДМИН' || b === 'OWNER' || b === 'СОЗДАТЕЛЬ') {
      gradient = 'linear-gradient(135deg, #ef4444, #b91c1c)';
      border = 'rgba(239, 68, 68, 0.35)';
    } else if (b === 'DEV' || b === 'DEVELOPER' || b === 'РАЗРАБОТЧИК') {
      gradient = 'linear-gradient(135deg, #3b82f6, #06b6d4)';
      border = 'rgba(59, 130, 246, 0.35)';
    } else if (b === 'VIP' || b === 'ВИП' || b === 'GOLD') {
      gradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
      border = 'rgba(245, 158, 11, 0.35)';
    } else if (b === 'PREMIUM' || b === 'PREM' || b === 'ПРЕМИУМ') {
      gradient = 'linear-gradient(135deg, #10b981, #0d9488)';
      border = 'rgba(16, 185, 129, 0.35)';
    } else if (b === 'YOUTUBE' || b === 'YT' || b === 'MEDIA') {
      gradient = 'linear-gradient(135deg, #ff0000, #ea580c)';
      border = 'rgba(255, 0, 0, 0.35)';
    } else if (b === 'SPONSOR' || b === 'СПОНСОР') {
      gradient = 'linear-gradient(135deg, #ec4899, #8b5cf6)';
      border = 'rgba(236, 72, 153, 0.35)';
    } else if (b === 'HELPER' || b === 'ХЕЛПЕР' || b === 'MOD' || b === 'MODER' || b === 'МОДЕРАТОР') {
      gradient = 'linear-gradient(135deg, #8b5cf6, #4f46e5)';
      border = 'rgba(139, 92, 246, 0.35)';
    }
  }
  
  return {
    fontSize: '9px',
    fontWeight: 900,
    color: '#fff',
    background: gradient,
    border: `1px solid ${border}`,
    padding: '2px 7px',
    borderRadius: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
  };
}

export function getUserTheme(user, lang) {
  const badgeCode = user.badge ? user.badge.toUpperCase().trim() : '';
  
  // Look up in loaded dynamic badges first
  const customBadge = loadedBadges.find(b => b.code.toUpperCase() === badgeCode);
  if (customBadge) {
    return {
      color: customBadge.gradient_start,
      icon: customBadge.code === 'ADMIN' || customBadge.code === 'OWNER' ? 'fa-shield-halved' : 'fa-gem',
      label: customBadge.text
    };
  }

  // Fallback to hardcoded roles
  if (user.is_admin === 1 || badgeCode === 'ADMIN' || badgeCode === 'АДМИН' || badgeCode === 'OWNER' || badgeCode === 'СОЗДАТЕЛЬ') {
    return { color: '#ef4444', icon: 'fa-shield-halved', label: lang === 'ru' ? 'Администрация' : 'Administration' };
  }
  if (badgeCode === 'DEV' || badgeCode === 'DEVELOPER' || badgeCode === 'РАЗРАБОТЧИК') {
    return { color: '#3b82f6', icon: 'fa-code', label: lang === 'ru' ? 'Разработчик' : 'Developer' };
  }
  if (badgeCode === 'VIP' || badgeCode === 'ВИП' || badgeCode === 'GOLD' || badgeCode === 'PREMIUM' || badgeCode === 'PREM' || badgeCode === 'ПРЕМИУМ') {
    return { color: '#f59e0b', icon: 'fa-gem', label: 'VIP' };
  }
  if (badgeCode === 'YOUTUBE' || badgeCode === 'YT' || badgeCode === 'MEDIA') {
    return { color: '#ff0000', icon: 'fa-play', label: lang === 'ru' ? 'Медиа' : 'Media' };
  }
  if (badgeCode === 'SPONSOR' || badgeCode === 'СПОНСОР') {
    return { color: '#ec4899', icon: 'fa-heart', label: lang === 'ru' ? 'Спонсор' : 'Sponsor' };
  }
  if (badgeCode === 'HELPER' || badgeCode === 'ХЕЛПЕР' || badgeCode === 'MOD' || badgeCode === 'MODER' || badgeCode === 'МОДЕРАТОР') {
    return { color: '#8b5cf6', icon: 'fa-user-shield', label: lang === 'ru' ? 'Модерация' : 'Moderation' };
  }
  return { color: '#10b981', icon: 'fa-user', label: lang === 'ru' ? 'Игрок' : 'Player' };
}
