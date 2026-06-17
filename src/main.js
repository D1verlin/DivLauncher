require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');

// Отключаем проверку SSL сертификатов для обхода проблем с рукопожатием (handshake failed)
app.commandLine.appendSwitch('ignore-certificate-errors');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
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
      contextIsolation: true 
    }
  });
  
  mainWindow.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  
  mainWindow.setMenu(null); 
  // mainWindow.webContents.openDevTools();
  
  // Режим разработчика
  
  // mainWindow.webContents.openDevTools();
  
  // Настраиваем автоапдейтер
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Проверяем обновления, как только окно загрузилось
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Отправляем события на фронтенд
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info.version);
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
  createWindow();
  setupClient(ipcMain);
  setupServer(ipcMain, mainWindow);
  initDiscord();
});

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});

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

// --- DISCORD RPC СОБЫТИЯ ---
ipcMain.on('discord-status-idle', () => {
  setIdleStatus();
});

ipcMain.on('discord-status-playing', (event, packName) => {
  setPlayingStatus(packName);
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

// --- ОБНОВЛЕНИЕ СБОРКИ (МОДПАКОВ) ---
ipcMain.on('update-pack', async (event, pack) => {
  try {
    // 1. Проверяем правильную ссылку из твоего JSON
    if (!pack.packZipUrl) {
      throw new Error('В modpacks.json не указана ссылка (packZipUrl) на архив сборки!');
    }

    // 2. Берем точный путь из твоего JSON (clientDir)
    // Получится: AppData/Roaming/div-launcher/.statech-client
    const rootPath = path.join(app.getPath('appData'), 'div-launcher', pack.clientDir);
    
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
    }

    const zipPath = path.join(rootPath, 'update.zip');

    // Начинаем скачивание архива
    event.reply('launch-progress', 'Подготовка к загрузке сборки...');
    
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
    event.reply('launch-progress', 'Распаковка файлов...');
    
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
