const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const extract = require('extract-zip');
const { app, shell, dialog, Notification } = require('electron'); 
const { execSync } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');

const launcher = new Client();
let gameProcess = null;

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        return resolve(downloadFile(response.headers.location, destPath, onProgress));
      }
      if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));

      const file = fs.createWriteStream(destPath);
      file.on('error', (err) => { file.close(); fs.unlink(destPath, () => reject(err)); });

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes && onProgress) onProgress(Math.round((downloadedBytes / totalBytes) * 100));
      });

      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => reject(err));
  });
}

async function ensureJava17(event, exeName = 'javaw.exe') {
  const jreDir = path.join(app.getPath('userData'), 'jre17');
  
  function findJava(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir, {withFileTypes: true});
    for (const f of files) {
      if (f.isDirectory()) {
        const res = findJava(path.join(dir, f.name));
        if (res) return res;
      } else if (f.name === exeName || f.name === 'java.exe') {
        return path.join(dir, f.name);
      }
    }
    return null;
  }

  let javaPath = findJava(jreDir);
  if (javaPath) return javaPath;

  if (!fs.existsSync(jreDir)) fs.mkdirSync(jreDir, { recursive: true });
  const zipPath = path.join(jreDir, 'jre.zip');
  const JRE_URL = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse";
  
  await downloadFile(JRE_URL, zipPath, (p) => event.reply('launch-progress', `Загрузка Java 17: ${p}%`));
  event.reply('launch-progress', 'Распаковка Java 17 (один раз)...');
  await extract(zipPath, { dir: jreDir });
  fs.unlinkSync(zipPath);
  
  return findJava(jreDir);
}

async function syncModpack(event, rootDir, pack) {
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });

  if (pack.packZipUrl && pack.packVersion) {
    const versionFile = path.join(rootDir, 'pack_version.txt');
    const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '0';

    if (currentVersion !== pack.packVersion) {
      const zipPath = path.join(rootDir, 'update.zip');
      await downloadFile(pack.packZipUrl, zipPath, (p) => event.reply('launch-progress', `Загрузка архива: ${p}%`));
      event.reply('launch-progress', 'Распаковка файлов...');
      await extract(zipPath, { dir: rootDir });
      fs.unlinkSync(zipPath);
      fs.writeFileSync(versionFile, pack.packVersion);
    }
  }

  if (pack.modsJsonUrl) {
    const modsDir = path.join(rootDir, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    event.reply('launch-progress', 'Проверка целостности модов...');
    let modsUrls = [];
    try {
      const res = await fetch(pack.modsJsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      modsUrls = await res.json();
    } catch (e) { throw new Error(`Не удалось получить список: ${e.message}`); }

    const expectedModsMap = new Map();
    for (const url of modsUrls) expectedModsMap.set(decodeURIComponent(url.split('/').pop()), url);
    
    const expectedFilenames = Array.from(expectedModsMap.keys());
    const localFiles = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));

    for (const file of localFiles) {
      if (!expectedFilenames.includes(file)) {
        event.reply('launch-progress', `Удаление лишнего: ${file}`);
        try { fs.unlinkSync(path.join(modsDir, file)); } catch(e){}
      }
    }

    const missingFilenames = expectedFilenames.filter(mod => !localFiles.includes(mod));
    if (missingFilenames.length > 0) {
      for (let i = 0; i < missingFilenames.length; i++) {
        const filename = missingFilenames[i];
        event.reply('launch-progress', `Скачивание: ${filename} (${i + 1}/${missingFilenames.length})`);
        try {
          const buffer = Buffer.from(await (await fetch(expectedModsMap.get(filename))).arrayBuffer());
          fs.writeFileSync(path.join(modsDir, filename), buffer);
        } catch (e) { throw new Error(`Сбой сети при скачивании ${filename}`); }
      }
    }
  }
}

async function ensureLoader(event, pack) {
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const installerName = pack.installerName || pack.forgeInstallerName;
  const installerUrl = pack.installerUrl || pack.forgeUrl;
  const installerPath = path.join(cacheDir, installerName);
  
  if (!fs.existsSync(installerPath)) {
    await downloadFile(installerUrl, installerPath, (p) => event.reply('launch-progress', `Загрузка ядра: ${p}%`));
  }
  return installerPath;
}

module.exports = function(ipcMain) {
  ipcMain.on('open-client-folder', (event, pack) => {
    if (!pack) return;
    shell.openPath(path.join(app.getPath('userData'), pack.clientDir));
  });

  ipcMain.on('upload-client-configs', async (event, pack) => {
    if (!pack) return;
    const { canceled, filePaths } = await dialog.showOpenDialog({ title: 'Выберите папку', properties: ['openDirectory'] });
    if (!canceled && filePaths.length > 0) {
      try {
        event.reply('launch-progress', `Копирование...`);
        fs.cpSync(filePaths[0], path.join(app.getPath('userData'), pack.clientDir, 'config'), { recursive: true, force: true });
        event.reply('launch-progress', `Конфиги загружены!`);
        setTimeout(() => event.reply('launch-progress', 'Готово к запуску'), 4000);
      } catch (err) { event.reply('launch-error', `Ошибка: ${err.message}`); }
    }
  });

  ipcMain.on('launch-game', async (event, options) => {
    try {
      const pack = options.pack;
      const gameRoot = path.join(app.getPath('userData'), pack.clientDir);
      launcher.removeAllListeners();
      if (!fs.existsSync(gameRoot)) fs.mkdirSync(gameRoot, { recursive: true });

      // === УМНАЯ АВТОРИЗАЦИЯ MICROSOFT С КЭШЕМ ===
      let auth;
      if (options.authMode === 'microsoft') {
        const cacheFile = path.join(app.getPath('userData'), 'msmc_cache.json');
        const authManager = new Auth("select_account");
        let xboxManager;

        try {
          // Пробуем войти тихо через кэш
          if (fs.existsSync(cacheFile)) {
            event.reply('launch-progress', 'Проверка сессии Microsoft...');
            const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            xboxManager = await authManager.refresh(cacheData);
            event.reply('launch-progress', 'Успешный вход по токену!');
          } else {
            throw new Error("Нет кэша");
          }
        } catch (err) {
          // Если кэша нет или он устарел - открываем окно Xbox
          event.reply('launch-progress', 'Ожидание входа в Microsoft...');
          xboxManager = await authManager.launch("electron");
        }
        
        // Сохраняем свежий токен для следующего раза
        fs.writeFileSync(cacheFile, JSON.stringify(xboxManager.save()));
        const token = await xboxManager.getMinecraft();
        auth = token.mclc();

      } else {
        auth = Authenticator.getAuth(options.username);
      }

      const installerPath = await ensureLoader(event, pack);
      await syncModpack(event, gameRoot, pack);

      let activeJavaPath = options.javaPath && options.javaPath.trim() !== '' 
        ? options.javaPath 
        : await ensureJava17(event, 'javaw.exe');

      let opts = {
        clientPackage: null, authorization: auth, root: gameRoot, 
        memory: { max: options.ram, min: "2G" }, javaPath: activeJavaPath, overrides: { detached: false }
      };

      if (pack.loaderType === 'fabric') {
        const fabricVersionName = `fabric-loader-${pack.loaderVersion}-${pack.mcVersion}`;
        const versionDir = path.join(gameRoot, 'versions', fabricVersionName);
        if (!fs.existsSync(versionDir)) {
          event.reply('launch-progress', 'Установка ядра Fabric...');
          const profilesPath = path.join(gameRoot, 'launcher_profiles.json');
          if (!fs.existsSync(profilesPath)) fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }));
          execSync(`java -jar "${installerPath}" client -dir "${gameRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion}`);
        }
        opts.version = { number: pack.mcVersion, type: "release", custom: fabricVersionName };
      } else {
        opts.version = { number: pack.mcVersion, type: "release" };
        opts.forge = installerPath;
        opts.customArgs = ['-Dforge.forceNoIgui=true'];
      }

      if (options.playMode === 'connect' && options.serverIp) opts.quickPlay = { type: "multiplayer", identifier: options.serverIp };

launcher.on('download-status', (e) => event.reply('launch-progress', `Библиотеки: ${e.name}`));
      launcher.on('progress', (e) => event.reply('launch-progress', `Этап: ${e.type} (${e.task}/${e.total})`));
      launcher.on('close', () => event.reply('launch-closed'));
      
      // Перенаправляем логи в UI
      launcher.on('debug', (e) => {
        console.log('[MC DEBUG]:', e);
        event.reply('launch-progress', '[LOG]' + e);
      });
      launcher.on('data', (e) => {
        console.log('[MC DATA]:', e);
        event.reply('launch-progress', '[LOG]' + e);
      });

      event.reply('launch-progress', 'Запуск Minecraft...');
      
      if (Notification.isSupported()) {
        new Notification({ title: 'DivLauncher', body: `Сборка ${pack.name} успешно установлена и запускается!` }).show();
      }

      gameProcess = await launcher.launch(opts);
    } catch (error) { event.reply('launch-error', error.message); }
  });
ipcMain.on('kill-game', () => {
    if (gameProcess) {
      try {
        gameProcess.kill('SIGKILL'); // Жестко закрываем процесс игры
        gameProcess = null;
      } catch (e) { console.error('Ошибка при закрытии игры:', e); }
    }
  });
};