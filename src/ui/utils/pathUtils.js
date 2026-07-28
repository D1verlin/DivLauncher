export const getSafeBgUrl = (url) => {
  if (!url) return '';
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
  if (!url) return '';
  if (url.startsWith('local-file://')) {
    return url.replace('local-file://', '');
  }
  return url;
};

export const getFilePath = (file) => {
  if (!file) return '';
  if (window.electronAPI && typeof window.electronAPI.getPathForFile === 'function') {
    const p = window.electronAPI.getPathForFile(file);
    if (p) return p.replace(/\\/g, '/');
  }
  if (file.path) {
    return file.path.replace(/\\/g, '/');
  }
  return '';
};
