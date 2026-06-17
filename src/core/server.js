const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const extract = require('extract-zip');
const { app, dialog, shell } = require('electron');
const { execSync, spawn } = require('child_process');
const axios = require('axios');

let serverProcess = null;

function downloadFile(urlStr, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'DivLauncher/1.0.5' } };
    const client = urlStr.startsWith('https') ? https : http;
    client.get(urlStr, options, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) return resolve(downloadFile(response.headers.location, destPath, onProgress));
      if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));

      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.url) return resolve(downloadFile(json.url, destPath, onProgress));
            reject(new Error('JSON response does not contain a url field'));
          } catch (e) { reject(e); }
        });
        return;
      }

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

// АВТОМАТИЧЕСКАЯ УСТАНОВКА JAVA 17 ДЛЯ СЕРВЕРА
async function ensureJava17(event, exeName = 'java.exe') {
  const jreDir = path.join(app.getPath('userData'), 'jre17');
  function findJava(dir) {
    if (!fs.existsSync(dir)) return null;
    for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
      if (f.isDirectory()) {
        const res = findJava(path.join(dir, f.name));
        if (res) return res;
      } else if (f.name === exeName) return path.join(dir, f.name);
    }
    return null;
  }
  let javaPath = findJava(jreDir);
  if (javaPath) return javaPath;

  if (!fs.existsSync(jreDir)) fs.mkdirSync(jreDir, { recursive: true });
  const zipPath = path.join(jreDir, 'jre.zip');
  const JRE_URL = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse";
  
  await downloadFile(JRE_URL, zipPath, (p) => { if (p % 25 === 0) event.reply('server-log', `Загрузка Java 17: ${p}%\n`); });
  event.reply('server-log', 'Распаковка Java 17 (один раз)...\n');
  await extract(zipPath, { dir: jreDir });
  fs.unlinkSync(zipPath);
  return findJava(jreDir);
}

async function ensureLoader(event, pack) {
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const name = pack.serverLoaderName || pack.installerName || pack.forgeInstallerName;
  const url = pack.serverLoaderUrl || pack.installerUrl || pack.forgeUrl;

  const installerPath = path.join(cacheDir, name);
  if (!fs.existsSync(installerPath)) {
    event.reply('server-log', `Скачивание ядра сервера...\n`);
    await downloadFile(url, installerPath, (p) => { if (p % 25 === 0) event.reply('server-log', `Ядро: ${p}%\n`); });
  }
  return installerPath;
}

async function syncServerModpack(event, rootDir, pack) {
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });

  if (pack.packZipUrl && pack.packVersion) {
    const versionFile = path.join(rootDir, 'pack_version.txt');
    const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '0';
    if (currentVersion !== pack.packVersion) {
      event.reply('server-log', 'Найдено обновление! Скачивание архива...\n');
      const zipPath = path.join(rootDir, 'update.zip');
      await downloadFile(pack.packZipUrl, zipPath, (p) => { if (p % 20 === 0) event.reply('server-log', `Архив: ${p}%\n`); });
      event.reply('server-log', 'Распаковка базы сервера...\n');
      await extract(zipPath, { dir: rootDir });
      fs.unlinkSync(zipPath);
      fs.writeFileSync(versionFile, pack.packVersion);
    }
  }

  if (pack.modsJsonUrl) {
    const modsDir = path.join(rootDir, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    const clientOnly = ['embeddium', 'rubidium', 'entity_texture_features', 'echo_compass', 'crashassistant', 'crash_assistant', 'jei-', 'journeymap', 'oculus', 'client'];
    let modsUrls = [];
    try {
      const res = await axios.get(`${pack.modsJsonUrl}?t=${Date.now()}`);
      modsUrls = res.data;
    } catch (e) { throw new Error(`Не удалось получить список: ${e.message}`); }

    const expectedModsMap = new Map();
    for (const url of modsUrls) {
      const filename = decodeURIComponent(url.split('/').pop());
      if (!clientOnly.some(k => filename.toLowerCase().includes(k))) expectedModsMap.set(filename, url);
    }
    
    const expectedFilenames = Array.from(expectedModsMap.keys());
    for (const file of fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'))) {
      if (!expectedFilenames.includes(file)) try { fs.unlinkSync(path.join(modsDir, file)); } catch(e){}
    }

    const missingFilenames = expectedFilenames.filter(mod => !fs.existsSync(path.join(modsDir, mod)));
    if (missingFilenames.length > 0) {
      event.reply('server-log', `Требуется загрузить файлов: ${missingFilenames.length}\n`);
      for (let i = 0; i < missingFilenames.length; i++) {
        const filename = missingFilenames[i];
        if (i % 5 === 0) event.reply('server-log', `Скачивание: ${i + 1}/${missingFilenames.length}\n`);
        try {
          const res = await axios.get(expectedModsMap.get(filename), { responseType: 'arraybuffer' });
          fs.writeFileSync(path.join(modsDir, filename), res.data);
        } catch (e) { throw new Error(`Сбой сети при скачивании ${filename}: ${e.message}`); }
      }
    }
    event.reply('server-log', 'Синхронизация завершена!\n');
  }
}

module.exports = function(ipcMain, mainWindow) {
  app.on('before-quit', () => { if (serverProcess) serverProcess.kill(); });

  // Чтение свойств сервера для UI
  ipcMain.handle('get-server-props', (event, pack) => {
    const serverRoot = path.join(app.getPath('userData'), pack.serverDir);
    const propsPath = path.join(serverRoot, 'server.properties');
    let props = { 
      'motd': pack.name, 
      'online-mode': 'true', 
      'max-players': '20', 
      'pvp': 'true', 
      'view-distance': '10', 
      'simulation-distance': '10', 
      'entity-broadcast-range-percentage': '100', 
      'player-tracking-range': '48' 
    };

    if (fs.existsSync(propsPath)) {
      const content = fs.readFileSync(propsPath, 'utf8');
      content.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [k, ...v] = line.split('=');
          if (k) props[k.trim()] = v.join('=').trim();
        }
      });
    }

    // Чтение player-tracking-range из spigot.yml
    const spigotPath = path.join(serverRoot, 'spigot.yml');
    if (fs.existsSync(spigotPath)) {
      const content = fs.readFileSync(spigotPath, 'utf8');
      const match = content.match(/players:\s*(\d+)/);
      if (match) props['player-tracking-range'] = match[1];
    }

    // Чтение player-tracking-range из paper-world-defaults.yml
    const paperWorldPath = path.join(serverRoot, 'config', 'paper-world-defaults.yml');
    if (fs.existsSync(paperWorldPath)) {
      const content = fs.readFileSync(paperWorldPath, 'utf8');
      const match = content.match(/players:\s*(\d+)/);
      if (match) props['player-tracking-range'] = match[1];
    }

    // Чтение player-tracking-range из paper.yml
    const paperPath = path.join(serverRoot, 'paper.yml');
    if (fs.existsSync(paperPath)) {
      const content = fs.readFileSync(paperPath, 'utf8');
      const match = content.match(/players:\s*(\d+)/);
      if (match) props['player-tracking-range'] = match[1];
    }

    return props;
  });

  // Сохранение свойств сервера из UI
  ipcMain.handle('save-server-props', (event, pack, newProps) => {
    const serverRoot = path.join(app.getPath('userData'), pack.serverDir);
    const propsPath = path.join(serverRoot, 'server.properties');
    let props = {};
    if (fs.existsSync(propsPath)) {
      fs.readFileSync(propsPath, 'utf8').split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [k, ...v] = line.split('=');
          if (k) props[k.trim()] = v.join('=').trim();
        }
      });
    }
    
    const { 'player-tracking-range': playerTrackingRange, ...serverProps } = newProps;
    props = { ...props, ...serverProps, 'online-mode': 'true' };
    fs.writeFileSync(propsPath, Object.entries(props).map(([k, v]) => `${k}=${v}`).join('\n'));

    // Обновление spigot.yml
    const spigotPath = path.join(serverRoot, 'spigot.yml');
    if (fs.existsSync(spigotPath)) {
      let content = fs.readFileSync(spigotPath, 'utf8');
      if (newProps['view-distance']) content = content.replace(/(view-distance:\s*)\w+/g, `$1${newProps['view-distance']}`);
      if (newProps['simulation-distance']) content = content.replace(/(simulation-distance:\s*)\w+/g, `$1${newProps['simulation-distance']}`);
      if (playerTrackingRange) content = content.replace(/(players:\s*)\d+/g, `$1${playerTrackingRange}`);
      fs.writeFileSync(spigotPath, content);
    }

    // Обновление paper-world-defaults.yml
    const paperWorldPath = path.join(serverRoot, 'config', 'paper-world-defaults.yml');
    if (fs.existsSync(paperWorldPath)) {
      let content = fs.readFileSync(paperWorldPath, 'utf8');
      if (newProps['view-distance']) content = content.replace(/(view-distance:\s*)\w+/g, `$1${newProps['view-distance']}`);
      if (newProps['simulation-distance']) content = content.replace(/(simulation-distance:\s*)\w+/g, `$1${newProps['simulation-distance']}`);
      if (playerTrackingRange) content = content.replace(/(players:\s*)\d+/g, `$1${playerTrackingRange}`);
      fs.writeFileSync(paperWorldPath, content);
    }

    // Обновление paper.yml
    const paperPath = path.join(serverRoot, 'paper.yml');
    if (fs.existsSync(paperPath)) {
      let content = fs.readFileSync(paperPath, 'utf8');
      if (newProps['view-distance']) content = content.replace(/(view-distance:\s*)\w+/g, `$1${newProps['view-distance']}`);
      if (newProps['simulation-distance']) content = content.replace(/(simulation-distance:\s*)\w+/g, `$1${newProps['simulation-distance']}`);
      if (playerTrackingRange) content = content.replace(/(players:\s*)\d+/g, `$1${playerTrackingRange}`);
      fs.writeFileSync(paperPath, content);
    }
  });

  // Быстрый бэкап мира через встроенный TAR Windows
  ipcMain.on('backup-world', (event, pack) => {
    const serverRoot = path.join(app.getPath('userData'), pack.serverDir);
    const worldDir = path.join(serverRoot, 'world');
    if (!fs.existsSync(worldDir)) {
      event.reply('server-log', '[Бэкап] Ошибка: Папка world пуста или не существует.\n');
      return;
    }
    event.reply('server-log', '[Бэкап] Архивация мира начата...\n');
    try {
      const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      execSync(`tar.exe -a -c -f "${backupName}" "world"`, { cwd: serverRoot });
      event.reply('server-log', `[Бэкап] Успешно сохранен в файл: ${backupName}\n`);
    } catch (e) { event.reply('server-log', `[Бэкап] Ошибка: ${e.message}\n`); }
  });

  async function ensurePlugins(event, serverRoot, sLoaderType, pack) {
    const supportsPlugins = sLoaderType === 'paper' || sLoaderType === 'spigot' || sLoaderType === 'hybrid';
    if (!supportsPlugins) return;

    const pluginsDir = path.join(serverRoot, 'plugins');
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

    // Read backend configuration to get database and token credentials
    const getBackendEnv = () => {
      const backendEnvPath = path.join(app.getAppPath(), 'backend', '.env');
      const env = {};
      if (fs.existsSync(backendEnvPath)) {
        const content = fs.readFileSync(backendEnvPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [k, ...v] = trimmed.split('=');
            if (k) env[k.trim()] = v.join('=').trim();
          }
        });
      }
      return env;
    };

    const backendEnv = getBackendEnv();

    // 1. SkinsRestorer
    const srPath = path.join(pluginsDir, 'SkinsRestorer.jar');
    if (!fs.existsSync(srPath)) {
      event.reply('server-log', 'Скачивание SkinsRestorer...\n');
      try {
        await downloadFile('https://github.com/SkinsRestorer/SkinsRestorer/releases/latest/download/SkinsRestorer.jar', srPath, (p) => {
          if (p % 50 === 0) event.reply('server-log', `SkinsRestorer: ${p}%\n`);
        });
      } catch (e) {
        event.reply('server-log', `[ОШИБКА] Не удалось скачать SkinsRestorer: ${e.message}\n`);
      }
    }

    // Pre-create and configure SkinsRestorer config.yml
    const srConfigDir = path.join(pluginsDir, 'SkinsRestorer');
    const srConfigPath = path.join(srConfigDir, 'config.yml');
    if (!fs.existsSync(srConfigDir)) fs.mkdirSync(srConfigDir, { recursive: true });

    const authServerUrl = process.env.AUTH_SERVER || backendEnv.AUTH_SERVER || 'https://mcauth.diverlin.ru';
    let authDomain = 'mcauth.diverlin.ru';
    try {
      const parsed = new URL(authServerUrl);
      authDomain = parsed.host;
    } catch (e) {}

    if (fs.existsSync(srConfigPath)) {
      try {
        let content = fs.readFileSync(srConfigPath, 'utf8');
        let modified = false;
        if (content.includes('restrictSkinUrls:\n        enabled: false')) {
          content = content.replace('restrictSkinUrls:\n        enabled: false', 'restrictSkinUrls:\n        enabled: true');
          modified = true;
        }
        if (!content.includes(`- https://${authDomain}`)) {
          content = content.replace(
            /list:\s*\n\s*-\s*https:\/\/i\.imgur\.com/g,
            `list:\n        - https://${authDomain}\n        - http://${authDomain}\n        - https://i.imgur.com`
          );
          modified = true;
        }
        if (sLoaderType === 'hybrid' && content.includes('teleportRefresh: false')) {
          content = content.replace('teleportRefresh: false', 'teleportRefresh: true');
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(srConfigPath, content);
          event.reply('server-log', 'Автонастройка SkinsRestorer обновлена.\n');
        }
      } catch (e) {}
    } else {
      const srDefaultConfig = `
restrictSkinUrls:
  enabled: true
  list:
    - https://${authDomain}
    - http://${authDomain}
    - https://i.imgur.com
teleportRefresh: ${sLoaderType === 'hybrid' ? 'true' : 'false'}
`;
      fs.writeFileSync(srConfigPath, srDefaultConfig.trim());
      event.reply('server-log', 'Создан и настроен стандартный конфиг SkinsRestorer.\n');
    }

    // 2. LuckPerms
    const lpPath = path.join(pluginsDir, 'LuckPerms.jar');
    if (!fs.existsSync(lpPath)) {
      event.reply('server-log', 'Скачивание LuckPerms...\n');
      try {
        await downloadFile('https://api.spiget.org/v2/resources/28140/download', lpPath, (p) => {
          if (p % 50 === 0) event.reply('server-log', `LuckPerms: ${p}%\n`);
        });
      } catch (e) {
        event.reply('server-log', `[ОШИБКА] Не удалось скачать LuckPerms: ${e.message}\n`);
      }
    }

    // Configure LuckPerms (Hardcoded MySQL database configuration)
    const isLpMysql = true;
    const lpStorage = 'mysql';

    const lpHost = '77.239.121.180';
    const lpPort = '3306';
    const lpUser = 'luckperms';
    const lpPass = 'luckpermspass';
    const lpName = 'luckperms';

    const lpConfigDir = path.join(pluginsDir, 'LuckPerms');
    const lpConfigPath = path.join(lpConfigDir, 'config.yml');
    if (!fs.existsSync(lpConfigDir)) fs.mkdirSync(lpConfigDir, { recursive: true });

    if (fs.existsSync(lpConfigPath)) {
      try {
        let content = fs.readFileSync(lpConfigPath, 'utf8');
        content = content.replace(/storage-method:\s*\w+/g, `storage-method: ${lpStorage}`);
        if (isLpMysql) {
          if (!content.includes('data:') || content.length < 100) {
            content = `server: global\nstorage-method: mysql\ndata:\n  address: ${lpHost}:${lpPort}\n  database: ${lpName}\n  username: ${lpUser}\n  password: '${lpPass}'\n`;
          } else {
            content = content.replace(/(address:\s*['"]?).*?(['"]?\n)/g, `$1${lpHost}:${lpPort}$2`);
            content = content.replace(/(database:\s*['"]?).*?(['"]?\n)/g, `$1${lpName}$2`);
            content = content.replace(/(username:\s*['"]?).*?(['"]?\n)/g, `$1${lpUser}$2`);
            content = content.replace(/(password:\s*['"]?).*?(['"]?\n)/g, `$1${lpPass}$2`);
          }
        }
        fs.writeFileSync(lpConfigPath, content);
        event.reply('server-log', `Конфигурация LuckPerms обновлена (${lpStorage}).\n`);
      } catch (e) {
        event.reply('server-log', `[ОШИБКА] Не удалось обновить конфиг LuckPerms: ${e.message}\n`);
      }
    } else {
      let lpDefaultConfig = '';
      if (isLpMysql) {
        lpDefaultConfig = `
server: global
storage-method: mysql
data:
  address: ${lpHost}:${lpPort}
  database: ${lpName}
  username: ${lpUser}
  password: '${lpPass}'
`;
      } else {
        lpDefaultConfig = `
server: global
storage-method: h2
`;
      }
      fs.writeFileSync(lpConfigPath, lpDefaultConfig.trim());
      event.reply('server-log', `Создан и настроен стандартный конфиг LuckPerms (${lpStorage}).\n`);
    }

    // 3. DivStatsSync (Statistics synchronization plugin)
    const dssPath = path.join(pluginsDir, 'DivStatsSync.jar');
    if (!fs.existsSync(dssPath)) {
      event.reply('server-log', 'Скачивание плагина синхронизации статистики (DivStatsSync)...\n');
      const dssUrl = pack.statsSyncPluginUrl || 'https://github.com/Diverlin/DivStatsSync/releases/latest/download/DivStatsSync.jar';
      try {
        await downloadFile(dssUrl, dssPath, (p) => {
          if (p % 50 === 0) event.reply('server-log', `DivStatsSync: ${p}%\n`);
        });
      } catch (e) {
        event.reply('server-log', `[ИНФО] Ссылка на плагин статистики недоступна или в процессе публикации: ${e.message}\n`);
      }
    }

    // Configure DivStatsSync
    const syncUrl = `${authServerUrl.replace(/\/$/, '')}/api/server/sync-stats`;
    const serverToken = backendEnv.SERVER_TOKEN || 'SuperSecretSyncToken123';

    const dssConfigDir = path.join(pluginsDir, 'DivStatsSync');
    const dssConfigPath = path.join(dssConfigDir, 'config.yml');
    if (!fs.existsSync(dssConfigDir)) fs.mkdirSync(dssConfigDir, { recursive: true });

    const dssDefaultConfig = `
api-url: '${syncUrl}'
server-token: '${serverToken}'
`;
    fs.writeFileSync(dssConfigPath, dssDefaultConfig.trim());
    event.reply('server-log', 'Конфигурация плагина статистики DivStatsSync обновлена.\n');

    // 4. LPC (Chat formatter for LuckPerms)
    const lpcPath = path.join(pluginsDir, 'LPC.jar');
    if (!fs.existsSync(lpcPath)) {
      event.reply('server-log', 'Скачивание плагина LPC (LuckPerms Chat)...\n');
      try {
        await downloadFile('https://api.spiget.org/v2/resources/68965/download', lpcPath, (p) => {
          if (p % 50 === 0) event.reply('server-log', `LPC: ${p}%\n`);
        });
      } catch (e) {
        event.reply('server-log', `[ОШИБКА] Не удалось скачать LPC: ${e.message}\n`);
      }
    }

    // 5. TAB (Tab-list and nametag formatter)
    const tabPath = path.join(pluginsDir, 'TAB.jar');
    if (!fs.existsSync(tabPath)) {
      event.reply('server-log', 'Скачивание плагина TAB (Таб-лист и теги)...\n');
      try {
        await downloadFile('https://api.spiget.org/v2/resources/57806/download', tabPath, (p) => {
          if (p % 50 === 0) event.reply('server-log', `TAB: ${p}%\n`);
        });
      } catch (e) {
        event.reply('server-log', `[ОШИБКА] Не удалось скачать TAB: ${e.message}\n`);
      }
    }
  }

  async function startServer(event, pack) {
    if (serverProcess) { event.reply('server-log', 'Сервер уже запущен!\n'); return; }
    try {
      const serverRoot = path.join(app.getPath('userData'), pack.serverDir);
      if (!fs.existsSync(serverRoot)) fs.mkdirSync(serverRoot, { recursive: true });
      event.reply('server-status', 'starting');
      
      const installerPath = await ensureLoader(event, pack);
      await syncServerModpack(event, serverRoot, pack);
      
      const runBatPath = path.join(serverRoot, 'run.bat');
      const sLoaderType = pack.serverLoaderType || pack.loaderType;

      // Получаем настройки бэкенда для получения authServerUrl
      const getBackendEnv = () => {
        const backendEnvPath = path.join(app.getAppPath(), 'backend', '.env');
        const env = {};
        if (fs.existsSync(backendEnvPath)) {
          const content = fs.readFileSync(backendEnvPath, 'utf8');
          content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const [k, ...v] = trimmed.split('=');
              if (k) env[k.trim()] = v.join('=').trim();
            }
          });
        }
        return env;
      };

      const backendEnv = getBackendEnv();
      const authServerUrl = process.env.AUTH_SERVER || backendEnv.AUTH_SERVER || 'https://mcauth.diverlin.ru';

      // Копируем или скачиваем authlib-injector для сервера
      const injectorSrc = path.join(app.getPath('userData'), 'loader-cache', 'authlib-injector.jar');
      const injectorDest = path.join(serverRoot, 'authlib-injector.jar');
      if (fs.existsSync(injectorSrc)) {
        fs.copyFileSync(injectorSrc, injectorDest);
      } else {
        event.reply('server-log', 'Скачивание authlib-injector для сервера...\n');
        const injectorUrl = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
        try {
          await downloadFile(injectorUrl, injectorDest);
        } catch (e) {
          event.reply('server-log', `[ОШИБКА] Не удалось скачать authlib-injector: ${e.message}\n`);
        }
      }

      if (sLoaderType === 'fabric') {
        const fabricJarPath = path.join(serverRoot, 'fabric-server-launch.jar');
        if (!fs.existsSync(fabricJarPath)) {
          event.reply('server-log', 'Установка ядра Fabric (скачивание сервера)...\n');
          execSync(`java -jar "${installerPath}" server -dir "${serverRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion} -downloadMinecraft`);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar fabric-server-launch.jar nogui\npause`);
      } else if (sLoaderType === 'paper' || sLoaderType === 'spigot' || sLoaderType === 'hybrid') {
        const serverJarName = path.basename(installerPath);
        const serverJarDest = path.join(serverRoot, serverJarName);
        if (!fs.existsSync(serverJarDest)) {
          fs.copyFileSync(installerPath, serverJarDest);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar "${serverJarName}" nogui\npause`);
      } else {
        if (!fs.existsSync(runBatPath)) {
          event.reply('server-log', 'Установка библиотек ядра Forge...\n');
          execSync(`java -jar "${installerPath}" --installServer "${serverRoot}"`);
        }
        // Настройка jvm аргументов для Forge серверов (через user_jvm_args.txt)
        const jvmArgsPath = path.join(serverRoot, 'user_jvm_args.txt');
        let jvmContent = '';
        if (fs.existsSync(jvmArgsPath)) {
          jvmContent = fs.readFileSync(jvmArgsPath, 'utf8');
        }
        let modified = false;
        if (!jvmContent.includes('-Dfile.encoding=UTF-8')) {
          jvmContent = `-Dfile.encoding=UTF-8\n` + jvmContent;
          modified = true;
        }
        if (!jvmContent.includes('-javaagent:authlib-injector.jar')) {
          jvmContent = `-javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil\n` + jvmContent;
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(jvmArgsPath, jvmContent.trim() + '\n');
        }
      }

      // Автоматическое скачивание и настройка нужных плагинов
      await ensurePlugins(event, serverRoot, sLoaderType, pack);

      // Внедрение пути к Java (либо из настроек, либо автоскачанная)
      let activeJavaPath = pack.javaPath && pack.javaPath.trim() !== '' 
        ? pack.javaPath 
        : await ensureJava17(event, 'java.exe');
        
      // Настройка SkinsRestorer выполнена превентивно в ensurePlugins
        
      let batContent = fs.readFileSync(runBatPath, 'utf8');
      batContent = batContent.replace(/^java /gm, `"${activeJavaPath}" `);
      fs.writeFileSync(runBatPath, batContent);

      event.reply('server-log', 'Запуск сервера...\n');
      serverProcess = spawn('cmd.exe', ['/c', 'chcp 65001 >nul && run.bat'], { cwd: serverRoot });
      
      const syncInterval = setInterval(async () => {
        if (!serverProcess) {
          clearInterval(syncInterval);
          return;
        }
        await performStatsSync(serverRoot, authServerUrl);
      }, 30000);

      let onlinePlayers = new Set();
      let needsEula = false; 

      serverProcess.stdout.on('data', (data) => {
        const text = data.toString('utf8');
        event.reply('server-log', text);
        const lowerText = text.toLowerCase();
        if (lowerText.includes('press any key') || lowerText.includes('любую клавишу')) {
          if (serverProcess && serverProcess.stdin) serverProcess.stdin.write('\n');
        }
        if (text.includes('You need to agree to the EULA')) needsEula = true;
        const joinMatch = text.match(/]: ([a-zA-Z0-9_]{3,16}) joined the game/);
        const leaveMatch = text.match(/]: ([a-zA-Z0-9_]{3,16}) left the game/);
        if (joinMatch) { onlinePlayers.add(joinMatch[1]); event.reply('server-players', Array.from(onlinePlayers)); }
        if (leaveMatch) { onlinePlayers.delete(leaveMatch[1]); event.reply('server-players', Array.from(onlinePlayers)); }
      });

      serverProcess.stderr.on('data', (data) => {
        const text = data.toString('utf8');
        if (text.includes('[INFO]') || text.includes('[WARN]')) {
          event.reply('server-log', text);
        } else {
          event.reply('server-log', '[ОШИБКА] ' + text);
        }
      });

      serverProcess.on('close', async (code) => {
        clearInterval(syncInterval);
        await performStatsSync(serverRoot, authServerUrl);
        event.reply('server-status', 'stopped');
        serverProcess = null;
        onlinePlayers.clear();
        event.reply('server-players', []);
        if (needsEula) {
          event.reply('server-log', '\n[ВНИМАНИЕ] Открываю файл EULA...\n');
          const notepad = spawn('notepad.exe', [path.join(serverRoot, 'eula.txt')]);
          notepad.on('close', () => {
            event.reply('server-log', 'Перезапуск сервера...\n\n');
            startServer(event, pack); 
          });
        } else {
            event.reply('server-log', `\nСервер остановлен.\n`);
        }
      });
    } catch (error) {
      event.reply('server-log', 'Ошибка: ' + error.message + '\n');
      event.reply('server-status', 'stopped');
      serverProcess = null;
    }
  }

  ipcMain.on('launch-server', (event, pack) => startServer(event, pack));
  ipcMain.on('send-server-command', (event, cmd) => {
    if (serverProcess && serverProcess.stdin) {
      serverProcess.stdin.write(cmd + '\n');
      event.reply('server-log', `> ${cmd}\n`);
    }
  });

  ipcMain.on('open-server-folder', (event, pack) => {
    if (!pack) return;
    shell.openPath(path.join(app.getPath('userData'), pack.serverDir));
  });

  ipcMain.on('upload-world', async (event, pack) => {
    if (!pack) return;
    const { canceled, filePaths } = await dialog.showOpenDialog({ title: 'Выберите мир', properties: ['openDirectory'] });
    if (!canceled && filePaths.length > 0) {
      const targetFolder = path.join(app.getPath('userData'), pack.serverDir, 'world');
      try {
        event.reply('server-log', `Установка мира...\n`);
        if (fs.existsSync(targetFolder)) fs.rmSync(targetFolder, { recursive: true, force: true });
        fs.cpSync(filePaths[0], targetFolder, { recursive: true });
        event.reply('server-log', `Мир установлен.\n`);
      } catch (err) { event.reply('server-log', `Ошибка: ${err.message}\n`); }
    }
  });

  const getLoggedInUser = () => {
    const cacheFile = path.join(app.getPath('userData'), 'custom_auth_cache.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return {
          uuid: cached.selectedProfile.id,
          name: cached.selectedProfile.name,
          webToken: cached.webToken
        };
      } catch (e) {}
    }
    return null;
  };

  const addDashesToUUID = (uuid) => {
    if (uuid.includes('-')) return uuid;
    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
  };

  const parseMinecraftStats = (statsJson) => {
    const stats = {
      playtime_seconds: 0,
      blocks_mined: 0,
      mobs_killed: 0,
      deaths: 0
    };
    try {
      const data = JSON.parse(statsJson);
      const customStats = data.stats?.["minecraft:custom"] || {};
      const playTimeTicks = customStats["minecraft:play_time"] || customStats["minecraft:time_since_death"] || 0;
      stats.playtime_seconds = Math.floor(playTimeTicks / 20);
      stats.deaths = customStats["minecraft:deaths"] || 0;
      stats.mobs_killed = customStats["minecraft:mob_kills"] || 0;

      const minedStats = data.stats?.["minecraft:mined"] || {};
      let blocksMined = 0;
      for (const key in minedStats) {
        blocksMined += minedStats[key] || 0;
      }
      stats.blocks_mined = blocksMined;
    } catch (e) {
      console.error('[Stats Parser] Failed to parse Minecraft stats JSON:', e);
    }
    return stats;
  };

  const parseMinecraftAdvancements = (advancementsJson) => {
    const achievements = [];
    try {
      const data = JSON.parse(advancementsJson);
      for (const key in data) {
        if (key === 'DataVersion') continue;
        if (data[key] && data[key].done === true) {
          achievements.push(key);
        }
      }
    } catch (e) {
      console.error('[Advancements Parser] Failed to parse Minecraft advancements JSON:', e);
    }
    return achievements;
  };

  const performStatsSync = async (serverRoot, authServerUrl) => {
    try {
      const user = getLoggedInUser();
      if (!user || !user.uuid || !user.webToken) return;

      const formattedUuid = addDashesToUUID(user.uuid);
      
      let worldFolder = 'world';
      const propertiesPath = path.join(serverRoot, 'server.properties');
      if (fs.existsSync(propertiesPath)) {
        const props = fs.readFileSync(propertiesPath, 'utf8');
        const match = props.match(/^level-name\s*=\s*(.+)$/m);
        if (match && match[1]) {
          worldFolder = match[1].trim();
        }
      }

      const statsPath = path.join(serverRoot, worldFolder, 'stats', `${formattedUuid}.json`);
      const advancementsPath = path.join(serverRoot, worldFolder, 'advancements', `${formattedUuid}.json`);

      let stats = { playtime_seconds: 0, blocks_mined: 0, mobs_killed: 0, deaths: 0 };
      let achievements = [];

      if (fs.existsSync(statsPath)) {
        const statsContent = fs.readFileSync(statsPath, 'utf8');
        stats = parseMinecraftStats(statsContent);
      }

      if (fs.existsSync(advancementsPath)) {
        const advancementsContent = fs.readFileSync(advancementsPath, 'utf8');
        achievements = parseMinecraftAdvancements(advancementsContent);
      }

      if (fs.existsSync(statsPath)) {
        await axios.post(`${authServerUrl.replace(/\/$/, '')}/api/profile/sync-stats`, {
          ...stats,
          achievements
        }, {
          headers: { 'Authorization': `Bearer ${user.webToken}` }
        });
        console.log(`[Stats Sync] Successfully synced local server stats for ${user.name}`);
      }
    } catch (e) {
      console.error('[Stats Sync] Failed to sync local stats:', e.message);
    }
  };
};