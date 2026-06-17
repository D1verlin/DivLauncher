export function getBadgeStyle(badge) {
  if (!badge) return null;
  const b = badge.toUpperCase().trim();
  
  let gradient = 'linear-gradient(135deg, #a78bfa, #10b981)'; // default
  let border = 'rgba(255, 255, 255, 0.15)';
  
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
