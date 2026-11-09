require('dotenv').config();
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');

// Задаём AppUserModelId ДО создания окна — иначе уведомления покажут иконку Electron
app.setAppUserModelId('ru.diverlin.divlauncher');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
axios.defaults.proxy = false;
const AdmZip = require('adm-zip');

const setupClient = require('./core/client');
const setupServer = require('./core/server');
const { initDiscord, setIdleStatus, setPlayingStatus } = require('./core/discord');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050, 
    height: 650, 
    resizable: false, 
    frame: false, 
    transparent: true,
    icon: path.join(__dirname, '..', 'icon.ico'),
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'), 
      nodeIntegration: false, 
      contextIsolation: true,
      webSecurity: true
    }
  });
  
  mainWindow.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  
  mainWindow.setMenu(null); 

  
  // Режим разработчика
  mainWindow.webContents.openDevTools();
  
  // Настраиваем автоапдейтер
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Проверяем обновления, как только окно загрузилось
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Отправляем события на фронтенд
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    // Отправляем процент загрузки (округляем до целого числа)
    mainWindow.webContents.send('update-progress', Math.round(progressObj.percent));
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });

  // Слушаем команду из React на перезапуск
  ipcMain.on('restart-and-install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
  
  // Грузим собранный билд React из папки dist-ui
  mainWindow.loadFile(path.join(__dirname, '..', 'dist-ui', 'index.html'));
}

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    try {
      let rawUrl = request.url.replace(/^local-file:\/\//i, '');
      let decodedPath = rawUrl;
      try { decodedPath = decodeURIComponent(rawUrl); } catch (_) {}
      let filePath = decodedPath;
      if (process.platform === 'win32') {
        if (/^\/[a-zA-Z][:|]/.test(filePath)) {
          filePath = filePath.substring(1);
        }
        filePath = filePath.replace(/^([a-zA-Z])\|/, '$1:');
        if (/^[a-zA-Z]\/[^:]/.test(filePath)) {
          filePath = filePath.charAt(0) + ':/' + filePath.substring(2);
        }
      }
      const normalized = path.normalize(filePath);
      if (fs.existsSync(normalized)) {
        return net.fetch(pathToFileURL(normalized).toString());
      }
      console.warn('[local-file] file not found:', normalized);
      return new Response('File not found', { status: 404 });
    } catch (err) {
      console.error('[local-file] protocol handle error:', err);
      return new Response('Error loading file', { status: 500 });
    }
  });

  createWindow();
  setupClient(ipcMain);
  setupServer(ipcMain, mainWindow);
  initDiscord();
});

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});

// Сброс статуса в offline при закрытии лаунчера
async function sendOfflinePresence() {
  try {
    const AUTH_SERVER = process.env.AUTH_SERVER || 'https://mcauth.diverlin.ru';
    let token = global.launcherAuthToken;
    if (!token) {
      try {
        const cacheFile = path.join(app.getPath('appData'), 'div-launcher', 'custom_auth.json');
        if (fs.existsSync(cacheFile)) {
          const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          token = cached.webToken;
        }
      } catch (_) {}
    }
    if (token && token !== 'offline') {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { current_activity: 'offline', current_game: null };
      await Promise.allSettled([
        axios.post(`${AUTH_SERVER}/api/profile/customize`, data, { headers, timeout: 1500 }),
        axios.post(`${AUTH_SERVER}/api/user/heartbeat`, { status: 'offline' }, { headers, timeout: 1500 })
      ]);
    }
  } catch (e) {}
}

let isCleanExit = false;
app.on('before-quit', (e) => {
  if (isCleanExit) return;
  e.preventDefault();
  isCleanExit = true;
  sendOfflinePresence().finally(() => {
    app.exit(0);
  });
});

/*
app.on('before-quit-legacy', () => {
  try {
    const axios = require('axios');
    const AUTH_SERVER = process.env.AUTH_SERVER || 'https://mcauth.diverlin.ru';
    const token = global.launcherAuthToken;
    if (token) {
      // keepAlive: true позволяет запросу завершиться даже при выходе
      axios.post(`${AUTH_SERVER}/api/user/heartbeat`, { status: 'offline' }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 2000
      }).catch(() => {});
    }
  } catch (e) {}
});

*/

// Обработка кнопок интерфейса
ipcMain.on('window-minimize', () => { 
  if (mainWindow) mainWindow.minimize(); 
});

ipcMain.on('window-close', () => { 
  app.quit(); 
});

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

// --- DISCORD RPC СОБЫТИЯ ---
ipcMain.on('discord-status-idle', (event, username, isOffline, lang) => {
  setIdleStatus(username, isOffline, lang);
});

ipcMain.on('discord-status-playing', (event, packName, username, isOffline, lang) => {
  setPlayingStatus(packName, username, isOffline, lang);
});

// Умное получение версии (чтобы в dev-режиме не показывало версию Electron)
ipcMain.handle('get-app-version', () => {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version;
    }
    return app.getVersion();
  } catch (e) {
    console.error("Ошибка при чтении package.json:", e);
    return app.getVersion();
  }
});

ipcMain.handle('get-system-memory', () => {
  try {
    const os = require('os');
    return Math.round(os.totalmem() / (1024 * 1024 * 1024));
  } catch (e) {
    console.error("Ошибка при получении памяти системы:", e);
    return 16;
  }
});

// --- Сохраняем JWT токен для использования при before-quit ---
ipcMain.on('set-auth-token', (event, token) => {
  global.launcherAuthToken = token;
});

// --- ОБНОВЛЕНИЕ СБОРКИ (МОДПАКОВ) ---
ipcMain.on('update-pack', async (event, pack) => {
  try {
    // 1. Проверяем правильную ссылку из твоего JSON
    if (!pack.packZipUrl) {
      throw new Error('В modpacks.json не указана ссылка (packZipUrl) на архив сборки!');
    }

    // 2. Берем точный путь из твоего JSON (clientDir)
    const rootPath = path.join(app.getPath('appData'), 'div-launcher', pack.clientDir);
    
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
    }

    const zipPath = path.join(rootPath, 'update.zip');

    // Начинаем скачивание архива
    event.reply('launch-progress', { stage: 'download_mods', percent: 0, detail: 'Подготовка к загрузке сборки...' });
    
    const response = await axios({
      url: pack.packZipUrl, // ИСПОЛЬЗУЕМ ПРАВИЛЬНОЕ ПОЛЕ
      method: 'GET',
      responseType: 'stream'
    });

    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;

    const writer = fs.createWriteStream(zipPath);
    
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (totalLength) {
        const percent = Math.round((downloaded / totalLength) * 100);
        event.reply('download-progress', percent);
      }
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Распаковка архива
    event.reply('launch-progress', { stage: 'download_mods', percent: 99, detail: 'Распаковка файлов...' });
    
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(rootPath, true); 

    fs.unlinkSync(zipPath);
    
    event.reply('update-done');

  } catch (error) {
    console.error("Ошибка при обновлении сборки:", error);
    event.reply('launch-progress', 'Ошибка обновления: ' + error.message);
    event.reply('launch-error', error.message);
  }
});
