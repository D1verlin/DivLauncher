const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const axios = require('axios');
const extract = require('extract-zip');

// Устанавливаем стандартный User-Agent браузера для обхода защиты Cloudflare от ботов
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const { app, shell, dialog, Notification } = require('electron'); 
const { execSync } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');

const launcher = new Client();
let gameProcess = null;

const AUTH_SERVER = process.env.AUTH_SERVER || 'https://mcauth.diverlin.ru';

function uploadFileNative(targetUrl, webToken, boundary, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${webToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 45000,
      rejectUnauthorized: false
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ message: 'Success but non-JSON response', raw: data });
          }
        } else {
          reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });

    req.write(payload);
    req.end();
  });
}

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
      const res = await axios.get(`${pack.modsJsonUrl}?t=${Date.now()}`);
      modsUrls = res.data;
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
          const res = await axios.get(expectedModsMap.get(filename), { responseType: 'arraybuffer' });
          fs.writeFileSync(path.join(modsDir, filename), res.data);
        } catch (e) { throw new Error(`Сбой сети при скачивании ${filename}: ${e.message}`); }
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

async function ensureAuthlibInjector(event) {
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const injectorPath = path.join(cacheDir, 'authlib-injector.jar');
  const injectorUrl = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
  
  if (!fs.existsSync(injectorPath)) {
    await downloadFile(injectorUrl, injectorPath, (p) => event.reply('launch-progress', `Загрузка authlib-injector: ${p}%`));
  }
  return injectorPath;
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

      // === CUSTOM YGGDRASIL AUTH ===
      let auth;
      const cacheFile = path.join(app.getPath('userData'), 'custom_auth_cache.json');
      if (fs.existsSync(cacheFile)) {
        try {
          const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          auth = {
            access_token: cached.accessToken,
            client_token: cached.clientToken || "divlauncher",
            uuid: cached.selectedProfile.id,
            name: cached.selectedProfile.name,
            user_properties: "{}"
          };
          options.username = cached.selectedProfile.name; // Use auth username
        } catch (e) {
          auth = Authenticator.getAuth(options.username);
        }
      } else {
        // Fallback for offline mode if token not provided
        auth = Authenticator.getAuth(options.username);
      }

      const installerPath = await ensureLoader(event, pack);
      const authlibPath = await ensureAuthlibInjector(event);
      await syncModpack(event, gameRoot, pack);

      let activeJavaPath = options.javaPath && options.javaPath.trim() !== '' 
        ? options.javaPath 
        : await ensureJava17(event, 'javaw.exe');

      let customArgs = [`-javaagent:${authlibPath}=${AUTH_SERVER}/api/yggdrasil`];

      let opts = {
        clientPackage: null, authorization: auth, root: gameRoot, 
        memory: { max: options.ram, min: "2G" }, javaPath: activeJavaPath, overrides: { detached: false },
        customArgs: customArgs,
        window: {
          width: options.width || "1280",
          height: options.height || "720",
          fullscreen: options.fullscreen || false
        }
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
        opts.customArgs.push('-Dforge.forceNoIgui=true');
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
      // Автонастройка CustomSkinLoader
      try {
        const cslDir = path.join(gameRoot, 'CustomSkinLoader');
        if (!fs.existsSync(cslDir)) fs.mkdirSync(cslDir, { recursive: true });
        const cslConfigPath = path.join(cslDir, 'CustomSkinLoader.json');
        
        const cslConfig = {
          version: "14.12",
          enable: true,
          loadlist: [
            {
              name: "LocalSkins",
              type: "Legacy",
              skin: "resourcepacks/skins/{USERNAME}.png",
              cape: "resourcepacks/skins/{USERNAME}_cape.png"
            },
            {
              name: "DivLauncherLegacy",
              type: "Legacy",
              skin: `${AUTH_SERVER.replace(/\/$/, '')}/api/skins/{USERNAME}.png`,
              cape: `${AUTH_SERVER.replace(/\/$/, '')}/api/capes/{USERNAME}.png`
            },
            {
              name: "DivLauncher",
              type: "Yggdrasil",
              apiRoot: `${AUTH_SERVER}/api/yggdrasil/`
            },
            {
              name: "Mojang",
              type: "MojangAPI"
            }
          ]
        };
        fs.writeFileSync(cslConfigPath, JSON.stringify(cslConfig, null, 2));
      } catch (e) {
        console.error('CustomSkinLoader auto-config error:', e);
      }

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

  // ─── CUSTOM AUTH для страницы настроек ────────────────────────────────

  const getCustomCacheFile = () => path.join(app.getPath('userData'), 'custom_auth_cache.json');
  const debugLogPath = 'C:\\Users\\Lenovo\\Desktop\\Projects\\DivLauncher\\div_launcher_debug.log';
  const userDataLogPath = path.join(app.getPath('userData'), 'debug.log');

  // Initialize the log files on start
  try {
    fs.writeFileSync(debugLogPath, `=== DIVLAUNCHER DEBUG LOG STARTED ${new Date().toISOString()} ===\n`);
  } catch(e) {}
  try {
    fs.writeFileSync(userDataLogPath, `=== DIVLAUNCHER DEBUG LOG STARTED ${new Date().toISOString()} ===\n`);
  } catch(e) {}

  function createLogger() {
    const logs = [];
    return {
      log: (...args) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${msg}`;
        logs.push(formatted);
        console.log(formatted);
        try { fs.appendFileSync(userDataLogPath, formatted + '\n'); } catch (e) {}
        try { fs.appendFileSync(debugLogPath, formatted + '\n'); } catch (e) {}
      },
      getLogs: () => logs
    };
  }

  ipcMain.handle('custom-login', async (event, username, password) => {
    const logger = createLogger();
    logger.log("=== [custom-login] START ===");
    logger.log(`Username: "${username}"`);
    try {
      logger.log(`Sending authentication request to Yggdrasil: ${AUTH_SERVER}/authserver/authenticate`);
      const response = await axios.post(`${AUTH_SERVER}/authserver/authenticate`, {
        agent: { name: 'Minecraft', version: 1 },
        username: username,
        password: password,
        clientToken: 'divlauncher'
      });
      
      const data = response.data;
      logger.log("Yggdrasil authenticate response status:", response.status);
      if (data.accessToken && data.selectedProfile) {
        logger.log("Yggdrasil authenticate success. UUID:", data.selectedProfile.id);
        
        // Also call Web login to get the JWT token for skin uploads
        let webToken = null;
        let webResponse = null;
        try {
          logger.log(`Sending login request to Web API: ${AUTH_SERVER}/api/login`);
          webResponse = await axios.post(`${AUTH_SERVER}/api/login`, {
            username: username,
            password: password
          });
          logger.log("Web login response status:", webResponse.status);
          webToken = webResponse.data.token;
          logger.log("Web token received:", webToken ? (webToken.slice(0, 15) + "...") : "null");
        } catch (webErr) {
          logger.log("Web login failed! Error:", webErr.message);
          if (webErr.response) {
            logger.log("Web login error response status:", webErr.response.status, "data:", webErr.response.data);
          }
          const errMsg = webErr.response?.data?.error || webErr.response?.data?.errorMessage || webErr.message;
          return { success: false, error: 'Ошибка веб-авторизации: ' + errMsg, logs: logger.getLogs() };
        }

        const cacheData = {
          ...data,
          webToken: webToken
        };
        fs.writeFileSync(getCustomCacheFile(), JSON.stringify(cacheData));
        logger.log("Auth credentials written to cache file successfully.");
        return { 
          success: true, 
          id: webResponse.data.user.id,
          name: data.selectedProfile.name, 
          uuid: data.selectedProfile.id, 
          accessToken: data.accessToken,
          webToken: webToken,
          is_admin: webResponse.data.user.is_admin,
          badge: webResponse.data.user.badge,
          logs: logger.getLogs()
        };
      }
      logger.log("Invalid credentials returned from authenticate API.");
      return { success: false, error: 'Неверные данные авторизации', logs: logger.getLogs() };
    } catch (err) {
      logger.log("Yggdrasil authenticate failed! Error:", err.message);
      if (err.response) {
        logger.log("Yggdrasil authenticate error response status:", err.response.status, "data:", err.response.data);
      }
      const msg = err.response?.data?.errorMessage || err.message;
      return { success: false, error: msg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('custom-register', async (event, username, password) => {
    const logger = createLogger();
    logger.log("=== [custom-register] START ===");
    logger.log(`Username: "${username}"`);
    try {
      logger.log(`Sending register request to Web API: ${AUTH_SERVER}/api/register`);
      const response = await axios.post(`${AUTH_SERVER}/api/register`, {
        username: username,
        password: password
      });
      logger.log("Register response status:", response.status, "data:", response.data);
      return { success: true, logs: logger.getLogs() };
    } catch (err) {
      logger.log("Register failed! Error:", err.message);
      if (err.response) {
        logger.log("Register error response status:", err.response.status, "data:", err.response.data);
      }
      const msg = err.response?.data?.error || err.response?.data?.errorMessage || err.message;
      return { success: false, error: msg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('custom-check-auth', async () => {
    const logger = createLogger();
    logger.log("=== [custom-check-auth] START ===");
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        logger.log("No cache file found at path:", cacheFile);
        return null;
      }
      
      logger.log("Reading cache file...");
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      logger.log("Cached access token prefix:", cached.accessToken ? cached.accessToken.slice(0, 8) + "..." : "undefined");
      logger.log("Cached web token prefix:", cached.webToken ? cached.webToken.slice(0, 15) + "..." : "undefined");
      logger.log("Cached username:", cached.selectedProfile?.name, "UUID:", cached.selectedProfile?.id);
      
      // Refresh token
      logger.log(`Sending token refresh request: ${AUTH_SERVER}/authserver/refresh`);
      const response = await axios.post(`${AUTH_SERVER}/authserver/refresh`, {
        accessToken: cached.accessToken,
        clientToken: cached.clientToken || 'divlauncher'
      });

      const data = response.data;
      logger.log("Refresh response status:", response.status);
      if (data.accessToken && data.selectedProfile) {
        logger.log("Yggdrasil refresh success. New access token prefix:", data.accessToken.slice(0, 8) + "...");
        
        // Verify webToken is still valid
        let webToken = cached.webToken;
        logger.log("Verifying web token with /api/profile...");
        let profileDetails = null;
        try {
          const webRes = await axios.get(`${AUTH_SERVER}/api/profile`, {
            headers: { 'Authorization': `Bearer ${webToken}` }
          });
          logger.log("Web token verification success. Profile data:", webRes.data);
          profileDetails = webRes.data;
        } catch (webErr) {
          logger.log("Web token verification failed! Error:", webErr.message);
          if (webErr.response) {
            logger.log("Web token verification error response status:", webErr.response.status, "data:", webErr.response.data);
          }
          // If webToken is expired, force re-login
          logger.log("Forcing re-login due to invalid web token.");
          return null;
        }

        const updatedCache = {
          ...data,
          webToken: webToken
        };
        fs.writeFileSync(cacheFile, JSON.stringify(updatedCache));
        logger.log("Updated auth cache written back to file.");
        return { 
          id: profileDetails ? profileDetails.id : null,
          name: data.selectedProfile.name, 
          uuid: data.selectedProfile.id, 
          accessToken: data.accessToken,
          webToken: webToken,
          is_admin: profileDetails ? profileDetails.is_admin : 0,
          badge: profileDetails ? profileDetails.badge : null,
          logs: logger.getLogs()
        };
      }
      logger.log("Invalid response from refresh API.");
      return null;
    } catch (err) {
      logger.log("custom-check-auth exception! Error:", err.message);
      if (err.response) {
        logger.log("Error response status:", err.response.status, "data:", err.response.data);
      }
      return null;
    }
  });

  ipcMain.handle('custom-logout', () => {
    const cacheFile = getCustomCacheFile();
    if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
    return { success: true };
  });

  ipcMain.handle('get-skin-data', async (event, uuid) => {
    const logger = createLogger();
    logger.log("=== [get-skin-data] START ===");
    logger.log("Requested UUID:", uuid);

    const getAbsoluteUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return `${AUTH_SERVER}${url}`;
      return `${AUTH_SERVER}/${url}`;
    };

    try {
      const cleanUuid = uuid.replace(/-/g, '');
      logger.log(`Requesting sessionserver profile: ${AUTH_SERVER}/sessionserver/session/minecraft/profile/${cleanUuid}`);
      const sessionRes = await axios.get(`${AUTH_SERVER}/sessionserver/session/minecraft/profile/${cleanUuid}?t=${Date.now()}`);
      logger.log("Sessionserver status:", sessionRes.status);
      
      const texturesProp = sessionRes.data.properties?.find(p => p.name === 'textures');
      if (!texturesProp) {
        logger.log("No textures property found in sessionserver response.");
        return { success: false, error: 'Скин не найден', logs: logger.getLogs() };
      }

      const texturesData = JSON.parse(Buffer.from(texturesProp.value, 'base64').toString('utf8'));
      const skinUrl = texturesData.textures?.SKIN?.url;
      const capeUrl = texturesData.textures?.CAPE?.url;
      const model = texturesData.textures?.SKIN?.metadata?.model || 'classic';
      logger.log("Parsed skinUrl:", skinUrl, "capeUrl:", capeUrl, "model:", model);
      
      let skinDataUrl = null;
      let capeDataUrl = null;

      const appendQueryParam = (url, key, value) => {
        if (!url) return null;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}${key}=${value}`;
      };

      if (skinUrl) {
        const absoluteSkinUrl = getAbsoluteUrl(skinUrl);
        const downloadUrl = appendQueryParam(absoluteSkinUrl, 't', Date.now());
        logger.log("Downloading skin image from:", downloadUrl);
        const skinRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const base64 = Buffer.from(skinRes.data).toString('base64');
        skinDataUrl = `data:image/png;base64,${base64}`;
      }
      
      if (capeUrl) {
        const absoluteCapeUrl = getAbsoluteUrl(capeUrl);
        const downloadUrl = appendQueryParam(absoluteCapeUrl, 't', Date.now());
        logger.log("Downloading cape image from:", downloadUrl);
        const capeRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const base64 = Buffer.from(capeRes.data).toString('base64');
        capeDataUrl = `data:image/png;base64,${base64}`;
      }

      logger.log("=== [get-skin-data] FINISH SUCCESS ===");
      return { success: true, skinDataUrl, capeDataUrl, model, logs: logger.getLogs() };
    } catch (err) {
      logger.log("get-skin-data failed. Error:", err.message);
      return { success: false, error: err.message, logs: logger.getLogs() };
    }
  });

  const STEVE_URL = 'https://minotar.net/skin/Steve';
  ipcMain.handle('get-default-skin', async () => {
    try {
      const cacheFile = path.join(app.getPath('userData'), 'steve_skin_cache.png');
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile);
        return { success: true, skinDataUrl: `data:image/png;base64,${data.toString('base64')}` };
      }
      const res = await axios.get(STEVE_URL, { responseType: 'arraybuffer', timeout: 15000 });
      fs.writeFileSync(cacheFile, Buffer.from(res.data));
      const base64 = Buffer.from(res.data).toString('base64');
      return { success: true, skinDataUrl: `data:image/png;base64,${base64}` };
    } catch (err) {
      return { success: false };
    }
  });

  ipcMain.handle('save-skin-file', async (event, skinDataUrl, username, packClientDir) => {
    try {
      const base64Data = skinDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const gameRoot = path.join(app.getPath('userData'), packClientDir || 'div-launcher');
      const skinsDir = path.join(gameRoot, 'resourcepacks', 'skins');
      if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });

      const skinPath = path.join(skinsDir, `${username}.png`);
      fs.writeFileSync(skinPath, buffer);

      return { success: true, skinPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('upload-skin', async (event, clientDir, username) => {
    const logger = createLogger();
    logger.log("=== [upload-skin] START ===");
    logger.log(`clientDir: "${clientDir}", username: "${username}"`);
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        logger.log("Cache file not found!");
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken || cached.accessToken;
      logger.log("Web token prefix:", webToken ? webToken.slice(0, 15) + "..." : "undefined");
      if (webToken === cached.accessToken) {
        logger.log("WARNING: webToken was missing in cache! Falling back to Yggdrasil accessToken. This will likely cause a 401!");
      }

      logger.log("Opening file selection dialog...");
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите файл скина (.png)',
        filters: [{ name: 'Изображения', extensions: ['png'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        logger.log("File selection canceled by user.");
        return { success: false, error: 'Выбор отменен', logs: logger.getLogs() };
      }
      const filePath = filePaths[0];
      logger.log("Selected file path:", filePath);
      const fileBuffer = fs.readFileSync(filePath);
      logger.log("File size read:", fileBuffer.length, "bytes");

      // 1. Upload to server (manually constructing the multipart body to avoid Axios + global Blob/FormData hanging in Node/Electron)
      const boundary = `----ElectronBoundary${Math.random().toString(36).substring(2)}`;
      const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="skin"; filename="skin.png"\r\n` +
        `Content-Type: image/png\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const payload = Buffer.concat([header, fileBuffer, footer]);

      logger.log(`Sending POST upload request to Web API: ${AUTH_SERVER}/api/profile/skin`);
      const responseData = await uploadFileNative(`${AUTH_SERVER}/api/profile/skin`, webToken, boundary, payload);
      logger.log("Upload response data:", responseData);
      
      const skinUrl = responseData.skin_url;

      // 2. Save locally for CustomSkinLoader
      if (clientDir && username) {
        try {
          const gameRoot = path.join(app.getPath('userData'), clientDir);
          const skinsDir = path.join(gameRoot, 'resourcepacks', 'skins');
          if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });
          fs.writeFileSync(path.join(skinsDir, `${username}.png`), fileBuffer);
          logger.log("Saved skin copy locally to resourcepacks/skins for launcher sync.");
        } catch (localErr) {
          logger.log("Failed to save skin locally (non-fatal):", localErr.message);
        }
      }

      if (skinUrl) {
        logger.log("Skin upload completed successfully with skinUrl:", skinUrl);
        return { success: true, skinUrl, logs: logger.getLogs() };
      }
      logger.log("Skin upload completed successfully.");
      return { success: true, logs: logger.getLogs() };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || resData.detail || errMsg;
      }
      logger.log("upload-skin exception! Error:", errMsg, "Stack:", err.stack);
      return { success: false, error: errMsg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('upload-cape', async (event, clientDir, username) => {
    const logger = createLogger();
    logger.log("=== [upload-cape] START ===");
    logger.log(`clientDir: "${clientDir}", username: "${username}"`);
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        logger.log("Cache file not found!");
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken || cached.accessToken;
      logger.log("Web token prefix:", webToken ? webToken.slice(0, 15) + "..." : "undefined");
      if (webToken === cached.accessToken) {
        logger.log("WARNING: webToken was missing in cache! Falling back to Yggdrasil accessToken. This will likely cause a 401!");
      }

      logger.log("Opening file selection dialog...");
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите файл плаща (.png)',
        filters: [{ name: 'Изображения', extensions: ['png'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        logger.log("File selection canceled by user.");
        return { success: false, error: 'Выбор отменен', logs: logger.getLogs() };
      }
      const filePath = filePaths[0];
      logger.log("Selected file path:", filePath);
      const fileBuffer = fs.readFileSync(filePath);
      logger.log("File size read:", fileBuffer.length, "bytes");

      // 1. Upload to server (manually constructing the multipart body to avoid Axios + global Blob/FormData hanging in Node/Electron)
      const boundary = `----ElectronBoundary${Math.random().toString(36).substring(2)}`;
      const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="cape"; filename="cape.png"\r\n` +
        `Content-Type: image/png\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const payload = Buffer.concat([header, fileBuffer, footer]);

      logger.log(`Sending POST upload request to Web API: ${AUTH_SERVER}/api/profile/cape`);
      const responseData = await uploadFileNative(`${AUTH_SERVER}/api/profile/cape`, webToken, boundary, payload);
      logger.log("Upload response data:", responseData);

      const capeUrl = responseData.cape_url;

      // 2. Save locally
      if (clientDir && username) {
        try {
          const gameRoot = path.join(app.getPath('userData'), clientDir);
          const skinsDir = path.join(gameRoot, 'resourcepacks', 'skins');
          if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });
          fs.writeFileSync(path.join(skinsDir, `${username}_cape.png`), fileBuffer);
          logger.log("Saved cape copy locally to resourcepacks/skins for launcher sync.");
        } catch (localErr) {
          logger.log("Failed to save cape locally (non-fatal):", localErr.message);
        }
      }

      if (capeUrl) {
        logger.log("Cape upload completed successfully with capeUrl:", capeUrl);
        return { success: true, capeUrl, logs: logger.getLogs() };
      }
      logger.log("Cape upload completed successfully.");
      return { success: true, logs: logger.getLogs() };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || resData.detail || errMsg;
      }
      logger.log("upload-cape exception! Error:", errMsg, "Stack:", err.stack);
      return { success: false, error: errMsg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('get-admin-users', async () => {
    const logger = createLogger();
    logger.log("=== [get-admin-users] START ===");
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Fetching admin users from Web API: ${AUTH_SERVER}/api/admin/users`);
      const response = await axios.get(`${AUTH_SERVER}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, users: response.data };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("get-admin-users failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('update-admin-user', async (event, id, updates) => {
    const logger = createLogger();
    logger.log(`=== [update-admin-user] START (id: ${id}) ===`);
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Updating user ${id} via Web API: ${AUTH_SERVER}/api/admin/users/${id}`);
      const response = await axios.put(`${AUTH_SERVER}/api/admin/users/${id}`, updates, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("update-admin-user failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('delete-admin-user', async (event, id) => {
    const logger = createLogger();
    logger.log(`=== [delete-admin-user] START (id: ${id}) ===`);
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Deleting user ${id} via Web API: ${AUTH_SERVER}/api/admin/users/${id}`);
      const response = await axios.delete(`${AUTH_SERVER}/api/admin/users/${id}`, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("delete-admin-user failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('change-password', async (event, oldPassword, newPassword) => {
    const logger = createLogger();
    logger.log("=== [change-password] START ===");
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Changing password via Web API: ${AUTH_SERVER}/api/profile/password`);
      const response = await axios.post(`${AUTH_SERVER}/api/profile/password`, { oldPassword, newPassword }, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("change-password failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('update-bio', async (event, bio) => {
    const logger = createLogger();
    logger.log("=== [update-bio] START ===");
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Updating bio via Web API: ${AUTH_SERVER}/api/profile/bio`);
      const response = await axios.post(`${AUTH_SERVER}/api/profile/bio`, { bio }, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message, bio: response.data.bio };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("update-bio failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('get-users', async () => {
    const logger = createLogger();
    logger.log("=== [get-users] START ===");
    try {
      const cacheFile = getCustomCacheFile();
      if (!fs.existsSync(cacheFile)) {
        return { success: false, error: 'Вы не авторизованы', logs: logger.getLogs() };
      }
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const webToken = cached.webToken;
      if (!webToken) {
        return { success: false, error: 'Токен веб-авторизации не найден', logs: logger.getLogs() };
      }

      logger.log(`Fetching all users from Web API: ${AUTH_SERVER}/api/users`);
      const response = await axios.get(`${AUTH_SERVER}/api/users`, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, users: response.data };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("get-users failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });
  ipcMain.handle('get-auth-server-url', () => {
    return AUTH_SERVER;
  });
};
