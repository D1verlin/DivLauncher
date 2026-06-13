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
    const propsPath = path.join(app.getPath('userData'), pack.serverDir, 'server.properties');
    if (!fs.existsSync(propsPath)) return { 'motd': pack.name, 'online-mode': 'false', 'max-players': '20', 'pvp': 'true' };
    const content = fs.readFileSync(propsPath, 'utf8');
    const props = {};
    content.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [k, ...v] = line.split('=');
        if (k) props[k.trim()] = v.join('=').trim();
      }
    });
    return props;
  });

  // Сохранение свойств сервера из UI
  ipcMain.handle('save-server-props', (event, pack, newProps) => {
    const propsPath = path.join(app.getPath('userData'), pack.serverDir, 'server.properties');
    let props = {};
    if (fs.existsSync(propsPath)) {
      fs.readFileSync(propsPath, 'utf8').split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [k, ...v] = line.split('=');
          if (k) props[k.trim()] = v.join('=').trim();
        }
      });
    }
    props = { ...props, ...newProps };
    fs.writeFileSync(propsPath, Object.entries(props).map(([k, v]) => `${k}=${v}`).join('\n'));
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

      if (sLoaderType === 'fabric') {
        const fabricJarPath = path.join(serverRoot, 'fabric-server-launch.jar');
        if (!fs.existsSync(fabricJarPath)) {
          event.reply('server-log', 'Установка ядра Fabric (скачивание сервера)...\n');
          execSync(`java -jar "${installerPath}" server -dir "${serverRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion} -downloadMinecraft`);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -jar fabric-server-launch.jar nogui\npause`);
      } else if (sLoaderType === 'paper' || sLoaderType === 'spigot' || sLoaderType === 'hybrid') {
        const serverJarName = path.basename(installerPath);
        const serverJarDest = path.join(serverRoot, serverJarName);
        if (!fs.existsSync(serverJarDest)) {
          fs.copyFileSync(installerPath, serverJarDest);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -jar "${serverJarName}" nogui\npause`);
      } else {
        if (!fs.existsSync(runBatPath)) {
          event.reply('server-log', 'Установка библиотек ядра Forge...\n');
          execSync(`java -jar "${installerPath}" --installServer "${serverRoot}"`);
        }
      }

      // Всегда скачиваем SkinsRestorer для гибридов/Spigot/Paper, или если запрошено
      if ((sLoaderType !== 'forge' && sLoaderType !== 'fabric') || sLoaderType === 'hybrid' || pack.autoInstallSkinsRestorer) {
        const pluginsDir = path.join(serverRoot, 'plugins');
        if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
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
      }

      // Внедрение пути к Java (либо из настроек, либо автоскачанная)
      let activeJavaPath = pack.javaPath && pack.javaPath.trim() !== '' 
        ? pack.javaPath 
        : await ensureJava17(event, 'java.exe');
        
      // Настройка SkinsRestorer
      const srConfigPath = path.join(serverRoot, 'plugins', 'SkinsRestorer', 'config.yml');
      if (fs.existsSync(srConfigPath)) {
        let srConfig = fs.readFileSync(srConfigPath, 'utf8');
        let modified = false;
        
        if (srConfig.includes('restrictSkinUrls:\n        enabled: false')) {
          srConfig = srConfig.replace('restrictSkinUrls:\n        enabled: false', 'restrictSkinUrls:\n        enabled: true');
          modified = true;
        }
        
        if (!srConfig.includes('- https://skin-api.dodobrest006.workers.dev')) {
          srConfig = srConfig.replace('list: \n        - https://i.imgur.com', 'list: \n        - https://skin-api.dodobrest006.workers.dev\n        - https://i.imgur.com');
          modified = true;
        }
        
        if (sLoaderType === 'hybrid' && srConfig.includes('teleportRefresh: false')) {
          srConfig = srConfig.replace('teleportRefresh: false', 'teleportRefresh: true');
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(srConfigPath, srConfig);
          event.reply('server-log', 'Автонастройка SkinsRestorer выполнена под ваш хост.\n');
        }
      }
        
      let batContent = fs.readFileSync(runBatPath, 'utf8');
      batContent = batContent.replace(/^java /gm, `"${activeJavaPath}" `);
      fs.writeFileSync(runBatPath, batContent);

      event.reply('server-log', 'Запуск сервера...\n');
      serverProcess = spawn('cmd.exe', ['/c', 'chcp 65001 >nul && run.bat'], { cwd: serverRoot });
      
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
        event.reply('server-log', '[ОШИБКА] ' + data.toString('utf8'));
      });

      serverProcess.on('close', (code) => {
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
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { title: 'Выберите мир', properties: ['openDirectory'] });
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
};