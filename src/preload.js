const { contextBridge, ipcRenderer } = require('electron');

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

  // --- MICROSOFT AUTH (для страницы настроек) ---
  loginMicrosoft:     () => ipcRenderer.invoke('ms-login'),
  checkMicrosoftAuth: () => ipcRenderer.invoke('ms-check'),
  logoutMicrosoft:    () => ipcRenderer.invoke('ms-logout'),
  getSkinData:        (uuid) => ipcRenderer.invoke('get-skin-data', uuid),
  getDefaultSkin:     () => ipcRenderer.invoke('get-default-skin'),
  checkOfflineSkin: (username) => ipcRenderer.invoke('check-offline-skin', username),
  saveSkinFile:       (skinDataUrl, username, packClientDir) => ipcRenderer.invoke('save-skin-file', skinDataUrl, username, packClientDir),
  uploadMojangSkin:   (skinDataUrl, accessToken, variant) => ipcRenderer.invoke('upload-mojang-skin', skinDataUrl, accessToken, variant),
  uploadCloudflareSkin: (skinDataUrl, username) => ipcRenderer.invoke('upload-cloudflare-skin', skinDataUrl, username),
  // --- DISCORD RPC ---
  setDiscordIdle: () => ipcRenderer.send('discord-status-idle'),
  setDiscordPlaying: (packName) => ipcRenderer.send('discord-status-playing', packName),
});