const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (options) => ipcRenderer.send('launch-game', options),
  launchServer: (pack) => ipcRenderer.send('launch-server', pack),
  sendServerCommand: (cmd) => ipcRenderer.send('send-server-command', cmd),
  
  uploadWorld: (pack) => ipcRenderer.send('upload-world', pack),
  backupWorld: (pack) => ipcRenderer.send('backup-world', pack), // НОВЫЙ БЭКАП
  uploadClientConfigs: (pack) => ipcRenderer.send('upload-client-configs', pack),
  openClientFolder: (pack) => ipcRenderer.send('open-client-folder', pack),
  openServerFolder: (pack) => ipcRenderer.send('open-server-folder', pack),
  
  getServerProps: (pack) => ipcRenderer.invoke('get-server-props', pack), // ЧТЕНИЕ PROPS
  saveServerProps: (pack, props) => ipcRenderer.invoke('save-server-props', pack, props), // ЗАПИСЬ PROPS
  killGame: () => ipcRenderer.send('kill-game'),
  
  onProgress: (callback) => ipcRenderer.on('launch-progress', callback),
  onError: (callback) => ipcRenderer.on('launch-error', callback),
  onClosed: (callback) => ipcRenderer.on('launch-closed', callback),
  onServerLog: (callback) => ipcRenderer.on('server-log', callback),
  onServerStatus: (callback) => ipcRenderer.on('server-status', callback),
  onServerPlayers: (callback) => ipcRenderer.on('server-players', callback),

  // --- CLEANUP (для предотвращения утечек IPC-слушателей) ---
  removeAllListeners: (channel) => {
    const ALLOWED_CHANNELS = [
      'update-available', 'update-progress', 'update-downloaded',
      'server-log', 'server-status', 'server-players',
      'r2-upload-progress', 'download-progress', 'update-done',
      'launch-progress', 'launch-error', 'launch-closed'
    ];
    if (ALLOWED_CHANNELS.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // --- ОБНОВЛЕНИЯ ЛАУНЧЕРА ---
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),

  // --- ОБНОВЛЕНИЕ СБОРОК ---
  updatePack: (pack) => ipcRenderer.send('update-pack', pack),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDone: (callback) => ipcRenderer.on('update-done', callback),

  // --- CUSTOM AUTH (для страницы настроек) ---
  customLogin:     (username, password) => ipcRenderer.invoke('custom-login', username, password),
  customRegister:  (username, password) => ipcRenderer.invoke('custom-register', username, password),
  customCheckAuth: () => ipcRenderer.invoke('custom-check-auth'),
  customLogout:    () => ipcRenderer.invoke('custom-logout'),
  getSkinData:     (uuid) => ipcRenderer.invoke('get-skin-data', uuid),
  getDefaultSkin:  () => ipcRenderer.invoke('get-default-skin'),
  saveSkinFile:    (skinDataUrl, username, packClientDir) => ipcRenderer.invoke('save-skin-file', skinDataUrl, username, packClientDir),
  uploadSkin:      (clientDir, username) => ipcRenderer.invoke('upload-skin', clientDir, username),
  uploadCape:      (clientDir, username) => ipcRenderer.invoke('upload-cape', clientDir, username),
  changePassword:  (oldPassword, newPassword) => ipcRenderer.invoke('change-password', oldPassword, newPassword),
  updateBio:       (bio) => ipcRenderer.invoke('update-bio', bio),
  getUsers:        () => ipcRenderer.invoke('get-users'),
  getAuthServerUrl:() => ipcRenderer.invoke('get-auth-server-url'),
  startGoogleAuth: (action) => ipcRenderer.invoke('start-google-auth', action),
  updateProfileCustomization: (updates) => ipcRenderer.invoke('update-profile-customization', updates),
  uploadBackground: () => ipcRenderer.invoke('upload-background'),
  uploadAvatar: () => ipcRenderer.invoke('upload-avatar'),
  unlinkGoogle: () => ipcRenderer.invoke('unlink-google'),
  // --- ADMIN APIs ---
  getAdminUsers:    () => ipcRenderer.invoke('get-admin-users'),
  updateAdminUser:  (id, updates) => ipcRenderer.invoke('update-admin-user', id, updates),
  deleteAdminUser:  (id) => ipcRenderer.invoke('delete-admin-user', id),
  getBadges:        () => ipcRenderer.invoke('get-badges'),
  createAdminBadge: (badge) => ipcRenderer.invoke('create-admin-badge', badge),
  updateAdminBadge: (id, badge) => ipcRenderer.invoke('update-admin-badge', id, badge),
  deleteAdminBadge: (id) => ipcRenderer.invoke('delete-admin-badge', id),
  getCustomPacks: () => ipcRenderer.invoke('get-custom-packs'),
  saveCustomPack: (pack) => ipcRenderer.invoke('save-custom-pack', pack),
  importCustomPack: () => ipcRenderer.invoke('import-custom-pack'),
  exportCustomPack: (id) => ipcRenderer.invoke('export-custom-pack', id),
  deleteCustomPack: (id) => ipcRenderer.invoke('delete-custom-pack', id),
  syncLocalMods: (pack) => ipcRenderer.invoke('sync-local-mods', pack),
  // --- DISCORD RPC ---
  setDiscordIdle: () => ipcRenderer.send('discord-status-idle'),
  setDiscordPlaying: (packName) => ipcRenderer.send('discord-status-playing', packName),
  
  // --- MOD MANAGEMENT ---
  getInstalledMods: (clientDir, projectType) => ipcRenderer.invoke('get-installed-mods', clientDir, projectType),
  downloadMod: (url, clientDir, fileName, projectType) => ipcRenderer.invoke('download-mod', url, clientDir, fileName, projectType),
  deleteMod: (clientDir, fileName, projectType) => ipcRenderer.invoke('delete-mod', clientDir, fileName, projectType),
  searchCurse: (query, options) => ipcRenderer.invoke('search-curse', query, options),
  getCurseVersions: (modId, loaders, gameVersions) => ipcRenderer.invoke('get-curse-versions', modId, loaders, gameVersions),
  getCurseProject: (modId) => ipcRenderer.invoke('get-curse-project', modId),
  searchModrinth: (query, options) => ipcRenderer.invoke('search-modrinth', query, options),
  getModrinthVersions: (modId, loaders, gameVersions) => ipcRenderer.invoke('get-modrinth-versions', modId, loaders, gameVersions),
  getModrinthProject: (modId) => ipcRenderer.invoke('get-modrinth-project', modId),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),

  // --- R2 ADMIN FILE MANAGER ---
  r2ListFiles:     (prefix) => ipcRenderer.invoke('r2-list-files', prefix),
  r2UploadFile:    (key, filePath) => ipcRenderer.invoke('r2-upload-file', key, filePath),
  r2SelectMultipleFiles: () => ipcRenderer.invoke('r2-select-multiple-files'),
  r2DeleteFile:    (key) => ipcRenderer.invoke('r2-delete-file', key),
  r2GetModsJson:   (key) => ipcRenderer.invoke('r2-get-mods-json', key),
  r2SaveModsJson:  (key, content) => ipcRenderer.invoke('r2-save-mods-json', key, content),
  onR2UploadProgress: (callback) => ipcRenderer.on('r2-upload-progress', callback),
  getPathForFile: (file) => {
    if (webUtils && typeof webUtils.getPathForFile === 'function') {
      return webUtils.getPathForFile(file);
    }
    return file.path;
  },

  // --- SYSTEM INFO & BACKUPS ---
  getSystemMemory: () => ipcRenderer.invoke('get-system-memory'),
  listBackups: (pack) => ipcRenderer.invoke('list-backups', pack),
  deleteBackup: (pack, fileName) => ipcRenderer.invoke('delete-backup', pack, fileName),
  restoreBackup: (pack, fileName) => ipcRenderer.invoke('restore-backup', pack, fileName),
});