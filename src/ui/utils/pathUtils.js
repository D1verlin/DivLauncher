export const DEFAULT_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1280";

export const getSafeBgUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('file://')) {
    return url.replace(/^file:\/\//, 'local-file://');
  }
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('assets/') ||
    url.startsWith('local-file://')
  ) {
    return url;
  }
  const cleanPath = url.replace(/\\/g, '/');
  return `local-file://${cleanPath}`;
};

export const toDisplayUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('local-file://')) {
    return url.replace('local-file://', '');
  }
  return url;
};

export const getFilePath = (file) => {
  if (!file) return '';
  if (window.electronAPI && typeof window.electronAPI.getPathForFile === 'function') {
    const p = window.electronAPI.getPathForFile(file);
    if (p && typeof p === 'string') return p.replace(/\\/g, '/');
  }
  if (file.path && typeof file.path === 'string') {
    return file.path.replace(/\\/g, '/');
  }
  return '';
};

export const getAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const AUTH_SERVER = 'https://mcauth.diverlin.ru';
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${AUTH_SERVER}${clean}`;
};
