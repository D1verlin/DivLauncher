const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const extract = require('extract-zip');
const { app, dialog, shell } = require('electron');
const AdmZip = require('adm-zip');
const { execSync, spawn } = require('child_process');
const axios = require('axios');

let serverProcess = null;

const debugLogPath = 'C:\\Users\\Lenovo\\Desktop\\Projects\\DivLauncher\\div_launcher_debug.log';

function sysLog(...args) {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  try { fs.appendFileSync(debugLogPath, formatted + '\n'); } catch (e) {}
  try {
    const uData = app.getPath('userData');
    if (uData) {
      const logFile = path.join(uData, 'debug.log');
      fs.appendFileSync(logFile, formatted + '\n');
    }
  } catch (e) {}
}

function downloadFile(urlStr, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'DivLauncher/1.0.5' } };
    const client = urlStr.startsWith('https') ? https : http;
    const req = client.get(urlStr, options, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) return reject(new Error(`Redirect location missing for ${urlStr}`));
        return resolve(downloadFile(redirectUrl, destPath, onProgress));
      }
      if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode} for ${urlStr}`));

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
    });

    req.on('error', (err) => reject(err));

    // 30 seconds connection/idle timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Download timeout for ${urlStr}`));
    });
  });
}

// АВТОМАТИЧЕСКАЯ УСТАНОВКА JAVA 17 ДЛЯ СЕРВЕРА
function getRequiredJavaVersion(mcVersion) {
  if (!mcVersion) return 17;
  const parts = mcVersion.split('.');
  const major = parseInt(parts[0] || '1', 10);
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  if (major === 1) {
    if (minor < 17) return 8;
    if (minor === 17) return 16;
    if (minor === 20 && patch >= 5) return 21;
    if (minor > 20) return 21;
    return 17;
  }
  return 21;
}

async function ensureJava(event, version = 17, exeName = 'java.exe') {
  const jreDir = path.join(app.getPath('userData'), `jre${version}`);
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
  
  let urls = [];
  if (version === 21) {
    urls = [
      `https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse`,
      `https://cdn.azul.com/zulu/bin/zulu21.34.19-ca-jre21.0.3-win_x64.zip`,
      `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_windows_hotspot_21.0.2_13.zip`
    ];
  } else if (version === 16) {
    urls = [
      `https://corretto.aws/downloads/latest/amazon-corretto-16-x64-windows-jre.zip`,
      `https://cdn.azul.com/zulu/bin/zulu16.32.15-ca-jre16.0.2-win_x64.zip`
    ];
  } else if (version === 8) {
    urls = [
      `https://api.adoptium.net/v3/binary/latest/8/ga/windows/x64/jre/hotspot/normal/eclipse`,
      `https://cdn.azul.com/zulu/bin/zulu8.78.0.19-ca-jre8.0.412-win_x64.zip`,
      `https://corretto.aws/downloads/latest/amazon-corretto-8-x64-windows-jre.zip`
    ];
  } else {
    urls = [
      `https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse`,
      `https://cdn.azul.com/zulu/bin/zulu17.50.19-ca-jre17.0.11-win_x64.zip`,
      `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.19%2B10/OpenJDK17U-jre_x64_windows_hotspot_17.0.19_10.zip`
    ];
  }

  let downloadSuccess = false;
  let lastError = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const sourceName = url.includes('adoptium.net') ? 'Adoptium API' : url.includes('azul.com') ? 'Azul Zulu CDN' : 'GitHub Releases';
    event.reply('server-log', `Подключение к источнику Java ${version} (${sourceName})...\n`);
    try {
      await downloadFile(url, zipPath, (p) => { 
        if (p % 25 === 0) event.reply('server-log', `Загрузка Java ${version}: ${p}%\n`); 
      });
      downloadSuccess = true;
      event.reply('server-log', `Успешно скачано JRE из ${sourceName}\n`);
      break;
    } catch (err) {
      lastError = err;
      event.reply('server-log', `[Предупреждение] Не удалось скачать из ${sourceName}: ${err.message}. Пробуем следующий источник...\n`);
      if (fs.existsSync(zipPath)) {
        try { fs.unlinkSync(zipPath); } catch(e){}
      }
    }
  }

  if (!downloadSuccess) {
    throw new Error(`Не удалось загрузить Java ${version} из доступных источников: ${lastError?.message}`);
  }

  event.reply('server-log', `Распаковка Java ${version} (один раз)...\n`);
  await extract(zipPath, { dir: jreDir });
  fs.unlinkSync(zipPath);
  return findJava(jreDir);
}

function getJavaMajorVersion(javaPath) {
  try {
    const javaExe = javaPath.replace(/javaw\.exe$/i, 'java.exe');
    const { execSync } = require('child_process');
    const output = execSync(`"${javaExe}" -version`, { timeout: 2000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const versionMatch = output.match(/(?:version\s*\"|openjdk\s*version\s*\")(\d+)/i) || output.match(/\"1\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      sysLog(`Validated custom Java version: major = ${major}`);
      return major;
    }
  } catch (e) {
    sysLog(`Failed to check custom Java version for ${javaPath}: ${e.message}`);
  }
  return null;
}

const neoForgeLatestVersions = {
  '1.20.1': '20.1.89',
  '1.20.2': '20.2.93',
  '1.20.4': '20.4.251',
  '1.20.6': '20.6.139',
  '1.21': '21.0.167',
  '1.21.1': '21.1.233',
  '1.21.2': '21.2.1-beta',
  '1.21.3': '21.3.96',
  '1.21.4': '21.4.157'
};

async function resolveNeoForgeVersion(mcVersion) {
  if (neoForgeLatestVersions[mcVersion]) {
    return neoForgeLatestVersions[mcVersion];
  }

  const parts = mcVersion.split('.');
  const minor = parts[1] || '21';
  const patch = parts[2] || '0';
  const prefix = `${minor}.${parts[2] || '0'}.`;

  try {
    sysLog(`Fetching NeoForge maven-metadata.xml for dynamic version resolution...`);
    const metadataUrl = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml';
    
    const res = await axios.get(metadataUrl, { timeout: 5000 });
    const xml = res.data;

    const regex = /<version>([^<]+)<\/version>/g;
    let match;
    const matches = [];
    while ((match = regex.exec(xml)) !== null) {
      const v = match[1];
      if (v.startsWith(prefix)) {
        matches.push(v);
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aParts = a.split('-');
        const bParts = b.split('-');
        const ap = parseInt(aParts[0].split('.')[2] || '0', 10);
        const bp = parseInt(bParts[0].split('.')[2] || '0', 10);
        if (bp !== ap) return bp - ap;
        if (aParts.length === 1 && bParts.length > 1) return -1;
        if (bParts.length === 1 && aParts.length > 1) return 1;
        return 0;
      });
      sysLog(`Dynamically resolved NeoForge version for ${mcVersion}: ${matches[0]}`);
      return matches[0];
    }
  } catch (e) {
    sysLog(`Failed to dynamically resolve NeoForge version: ${e.message}`);
  }

  const fallback = `${minor}.${patch}.150`;
  sysLog(`Falling back to NeoForge version for ${mcVersion}: ${fallback}`);
  return fallback;
}

async function saveCorrectedPackConfig(pack) {
  if (!pack.isCustom) return;
  try {
    const file = path.join(app.getPath('userData'), 'custom_modpacks.json');
    if (fs.existsSync(file)) {
      let packs = JSON.parse(fs.readFileSync(file, 'utf8'));
      const existingIndex = packs.findIndex(p => p.id === pack.id);
      if (existingIndex > -1) {
        packs[existingIndex] = {
          ...packs[existingIndex],
          loaderVersion: pack.loaderVersion,
          installerUrl: pack.installerUrl,
          installerName: pack.installerName,
          forgeUrl: pack.forgeUrl,
          forgeInstallerName: pack.forgeInstallerName
        };
        fs.writeFileSync(file, JSON.stringify(packs, null, 2));
        sysLog(`Successfully updated custom_modpacks.json for corrected pack ${pack.name}`);
      }
    }
  } catch (err) {
    sysLog(`Failed to write corrected pack to custom_modpacks.json: ${err.message}`);
  }
}

async function resolveLoaderDetails(pack) {
  if (!pack) return;
  if (pack.loaderType === 'fabric') {
    let loaderVersion = pack.loaderVersion || '0.16.10';
    let installerUrl = pack.installerUrl || 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.1.1/fabric-installer-1.1.1.jar';
    let updated = false;

    if (installerUrl.includes('/fabric-installer/1.0.1/')) {
      installerUrl = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.1.1/fabric-installer-1.1.1.jar';
      installerName = 'fabric-installer-1.1.1.jar';
      updated = true;
    }

    try {
      sysLog(`Fetching latest Fabric loader/installer metadata for ${pack.mcVersion}...`);
      const loaderRes = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${pack.mcVersion}`, { timeout: 5000 });
      if (loaderRes.data && loaderRes.data.length > 0) {
        const latestLoader = loaderRes.data[0].loader;
        if (latestLoader && latestLoader.version !== pack.loaderVersion) {
          loaderVersion = latestLoader.version;
          updated = true;
        }
      }
      
      const instRes = await axios.get('https://meta.fabricmc.net/v2/versions/installer', { timeout: 5000 });
      if (instRes.data && instRes.data.length > 0) {
        const latestInst = instRes.data.find(i => i.stable === true) || instRes.data[0];
        if (latestInst && latestInst.url && latestInst.url !== pack.installerUrl) {
          installerUrl = latestInst.url;
          installerName = `fabric-installer-${latestInst.version}.jar`;
          updated = true;
        }
      }
    } catch (e) {
      sysLog(`Failed to dynamically resolve Fabric versions: ${e.message}. Using fallbacks.`);
    }

    if (updated || !pack.installerUrl) {
      pack.loaderVersion = loaderVersion;
      pack.installerUrl = installerUrl;
      pack.installerName = installerName;
      await saveCorrectedPackConfig(pack);
    }
  } else if (pack.loaderType === 'quilt') {
    let loaderVersion = pack.loaderVersion || '0.26.3';
    let installerUrl = pack.installerUrl || 'https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.14.1/quilt-installer-0.14.1.jar';
    let installerName = pack.installerName || 'quilt-installer-0.14.1.jar';
    let updated = false;

    if (installerUrl.includes('/quilt-installer/0.9.1/')) {
      installerUrl = 'https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.14.1/quilt-installer-0.14.1.jar';
      installerName = 'quilt-installer-0.14.1.jar';
      updated = true;
    }

    try {
      sysLog(`Fetching latest Quilt loader/installer metadata for ${pack.mcVersion}...`);
      const loaderRes = await axios.get(`https://meta.quiltmc.org/v3/versions/loader/${pack.mcVersion}`, { timeout: 5000 });
      if (loaderRes.data && loaderRes.data.length > 0) {
        const latestLoader = loaderRes.data[0].loader;
        if (latestLoader && latestLoader.version !== pack.loaderVersion) {
          loaderVersion = latestLoader.version;
          updated = true;
        }
      }

      const instRes = await axios.get('https://meta.quiltmc.org/v3/versions/installer', { timeout: 5000 });
      if (instRes.data && instRes.data.length > 0) {
        const latestInst = instRes.data[0];
        if (latestInst && latestInst.url && latestInst.url !== pack.installerUrl) {
          installerUrl = latestInst.url;
          installerName = `quilt-installer-${latestInst.version}.jar`;
          updated = true;
        }
      }
    } catch (e) {
      sysLog(`Failed to dynamically resolve Quilt versions: ${e.message}. Using fallbacks.`);
    }

    if (updated || !pack.installerUrl) {
      pack.loaderVersion = loaderVersion;
      pack.installerUrl = installerUrl;
      pack.installerName = installerName;
      await saveCorrectedPackConfig(pack);
    }
  } else if (pack.loaderType === 'neoforge') {
    let currentUrl = pack.installerUrl || pack.forgeUrl;
    let resolvedVersion = await resolveNeoForgeVersion(pack.mcVersion);
    let newUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${resolvedVersion}/neoforge-${resolvedVersion}-installer.jar`;
    let newName = `neoforge-${resolvedVersion}-installer.jar`;

    if (!currentUrl || !currentUrl.includes(resolvedVersion)) {
      sysLog(`Correcting NeoForge pack "${pack.name}" loader version to "${resolvedVersion}"`);
      pack.forgeUrl = newUrl;
      pack.forgeInstallerName = newName;
      pack.installerUrl = newUrl;
      pack.installerName = newName;
      await saveCorrectedPackConfig(pack);
    }
  }
}

async function ensureInstallerLibraries(event, installerPath, gameRoot) {
  sysLog(`Checking installer libraries for: ${installerPath}`);
  if (!fs.existsSync(installerPath)) return;

  try {
    const zip = new AdmZip(installerPath);
    const profileEntry = zip.getEntry('install_profile.json');
    if (!profileEntry) {
      sysLog(`No install_profile.json found in installer jar.`);
      return;
    }

    const profileData = JSON.parse(profileEntry.getData().toString('utf8'));
    if (!profileData.libraries || profileData.libraries.length === 0) {
      sysLog(`No libraries listed in install_profile.json.`);
      return;
    }

    sysLog(`Found ${profileData.libraries.length} libraries in installer profile.`);
    const missingLibraries = [];

    profileData.libraries.forEach(lib => {
      const art = lib.downloads && lib.downloads.artifact;
      if (art && art.url && art.path) {
        const destPath = path.join(gameRoot, 'libraries', art.path);
        if (!fs.existsSync(destPath)) {
          missingLibraries.push({ url: art.url, destPath });
        }
      }
    });

    if (missingLibraries.length === 0) {
      sysLog(`All installer libraries are already present.`);
      return;
    }

    sysLog(`Downloading ${missingLibraries.length} missing installer libraries...`);
    event.reply('server-log', `Загрузка библиотек ядра...\n`);

    for (let i = 0; i < missingLibraries.length; i++) {
      const item = missingLibraries[i];
      if (i % 10 === 0 || i === missingLibraries.length - 1) {
        const percent = Math.round((i / missingLibraries.length) * 100);
        event.reply('server-log', `Загрузка библиотек ядра: ${percent}%\n`);
      }
      
      const dir = path.dirname(item.destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      sysLog(`Downloading missing library [${i + 1}/${missingLibraries.length}]: ${item.url} -> ${item.destPath}`);
      try {
        await downloadFile(item.url, item.destPath);
      } catch (err) {
        sysLog(`Failed to download library from URL: ${item.url}. Error: ${err.message}. Retrying...`);
        try {
          await downloadFile(item.url, item.destPath);
        } catch (retryErr) {
          throw new Error(`Не удалось загрузить библиотеку ядра: ${path.basename(item.destPath)}. Ошибка: ${retryErr.message}`);
        }
      }
    }
    event.reply('server-log', `Библиотеки ядра загружены 100%\n`);
  } catch (e) {
    sysLog(`Error in ensureInstallerLibraries: ${e.message}`);
    if (e.message.includes('Не удалось загрузить')) {
      throw e;
    }
  }
}

async function ensureLoader(event, pack) {
  await resolveLoaderDetails(pack);
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  let name = pack.serverLoaderName || pack.installerName || pack.forgeInstallerName;
  let url = pack.serverLoaderUrl || pack.installerUrl || pack.forgeUrl;

  if (!url) {
    try {
      let sLoader = pack.serverLoaderType;
      if (!sLoader) {
        const baseLoader = pack.loaderType || 'vanilla';
        if (baseLoader === 'vanilla') sLoader = 'paper';
        else if (baseLoader === 'forge') {
          const arclightVersions = ['1.16.5', '1.18.2', '1.19.2', '1.20.1'];
          sLoader = arclightVersions.includes(pack.mcVersion) ? 'hybrid' : 'forge';
        } else sLoader = baseLoader;
      }
      if (sLoader === 'vanilla') {
        event.reply('server-log', `Поиск официального ядра Minecraft ${pack.mcVersion}...\n`);
        const resolved = await resolveVanillaServerUrl(pack.mcVersion);
        url = resolved.url;
        name = resolved.name;
      } else if (sLoader === 'paper') {
        event.reply('server-log', `Поиск ядра Paper для Minecraft ${pack.mcVersion}...\n`);
        const resolved = await resolvePaperServerUrl(pack.mcVersion);
        url = resolved.url;
        name = resolved.name;
      } else if (sLoader === 'spigot') {
        event.reply('server-log', `Поиск ядра Spigot для Minecraft ${pack.mcVersion}...\n`);
        const resolved = await resolveSpigotServerUrl(pack.mcVersion);
        url = resolved.url;
        name = resolved.name;
      } else if (sLoader === 'hybrid') {
        event.reply('server-log', `Поиск ядра Arclight (Hybrid) для Minecraft ${pack.mcVersion}...\n`);
        const resolved = await resolveArclightServerUrl(pack.mcVersion);
        url = resolved.url;
        name = resolved.name;
      }

      if (url && name) {
        // Cache resolved values back onto the pack object
        pack.installerUrl = url;
        pack.installerName = name;
      }
    } catch (e) {
      throw new Error(`Не удалось найти серверное ядро для ${pack.loaderType}: ${e.message}`);
    }
  }

  if (!name || !url) {
    throw new Error(`Параметры ядра (URL/Имя) не определены для ядра ${pack.loaderType}`);
  }

  const installerPath = path.join(cacheDir, name);
  if (!fs.existsSync(installerPath)) {
    event.reply('server-log', `Скачивание ядра сервера...\n`);
    await downloadFile(url, installerPath, (p) => { if (p % 25 === 0) event.reply('server-log', `Ядро: ${p}%\n`); });
  }

  if (pack.loaderType === 'neoforge' || pack.loaderType === 'forge') {
    const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
    await ensureInstallerLibraries(event, installerPath, serverRoot);
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

async function resolveVanillaServerUrl(mcVersion) {
  try {
    const manifestRes = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const versionObj = manifestRes.data.versions.find(v => v.id === mcVersion);
    if (!versionObj) throw new Error(`Версия ${mcVersion} не найдена в манифесте Mojang`);
    
    const detailsRes = await axios.get(versionObj.url);
    const serverDownload = detailsRes.data.downloads?.server;
    if (!serverDownload) throw new Error(`Серверный JAR не найден для версии ${mcVersion}`);
    
    return {
      url: serverDownload.url,
      name: `minecraft_server.${mcVersion}.jar`
    };
  } catch (err) {
    console.error('Error resolving vanilla server url:', err);
    throw err;
  }
}

async function resolvePaperServerUrl(mcVersion) {
  try {
    const versionUrl = `https://api.papermc.io/v2/projects/paper/versions/${mcVersion}`;
    const versionRes = await axios.get(versionUrl);
    const builds = versionRes.data.builds;
    if (!builds || builds.length === 0) {
      throw new Error(`Для версии ${mcVersion} нет сборок Paper`);
    }
    const latestBuild = builds[builds.length - 1];
    
    const buildUrl = `${versionUrl}/builds/${latestBuild}`;
    const buildRes = await axios.get(buildUrl);
    const filename = buildRes.data.downloads?.application?.name;
    if (!filename) {
      throw new Error(`Файл загрузки не найден в сборке ${latestBuild}`);
    }
    
    const downloadUrl = `${buildUrl}/downloads/${filename}`;
    return {
      url: downloadUrl,
      name: filename
    };
  } catch (err) {
    console.error('Error resolving Paper server url:', err);
    throw err;
  }
}

async function resolveSpigotServerUrl(mcVersion) {
  return {
    url: `https://download.getbukkit.org/spigot/spigot-${mcVersion}.jar`,
    name: `spigot-${mcVersion}.jar`
  };
}

async function resolveArclightServerUrl(mcVersion) {
  const mappings = {
    '1.20.1': {
      url: 'https://github.com/IzzelAliz/Arclight/releases/download/1.20.1-1.0.4/arclight-forge-1.20.1-1.0.4.jar',
      name: 'arclight-forge-1.20.1-1.0.4.jar'
    },
    '1.19.2': {
      url: 'https://github.com/IzzelAliz/Arclight/releases/download/1.19.2-1.0.3/arclight-forge-1.19.2-1.0.3.jar',
      name: 'arclight-forge-1.19.2-1.0.3.jar'
    },
    '1.18.2': {
      url: 'https://github.com/IzzelAliz/Arclight/releases/download/1.18.2-1.0.3/arclight-forge-1.18.2-1.0.3.jar',
      name: 'arclight-forge-1.18.2-1.0.3.jar'
    },
    '1.16.5': {
      url: 'https://github.com/IzzelAliz/Arclight/releases/download/1.16.5-1.0.5/arclight-forge-1.16.5-1.0.5.jar',
      name: 'arclight-forge-1.16.5-1.0.5.jar'
    }
  };

  if (mappings[mcVersion]) {
    return mappings[mcVersion];
  }
  
  throw new Error(`Версия Arclight для Minecraft ${mcVersion} отсутствует в предустановленном списке. Поддерживаются: ${Object.keys(mappings).join(', ')}`);
}

function syncLocalModsHelper(pack) {
  try {
    const clientRoot = path.resolve(app.getPath('userData'), pack.clientDir);
    const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
    
    const clientModsDir = path.join(clientRoot, 'mods');
    const serverModsDir = path.join(serverRoot, 'mods');
    
    if (!fs.existsSync(clientModsDir)) {
      return { success: false, error: 'Папка mods клиента отсутствует. Сначала запустите клиент или добавьте моды.' };
    }
    
    if (!fs.existsSync(serverModsDir)) {
      fs.mkdirSync(serverModsDir, { recursive: true });
    }
    
    const clientOnly = ['embeddium', 'rubidium', 'entity_texture_features', 'echo_compass', 'crashassistant', 'crash_assistant', 'jei-', 'journeymap', 'oculus', 'client'];
    
    const files = fs.readdirSync(clientModsDir).filter(f => f.endsWith('.jar'));
    let copiedCount = 0;
    let skippedCount = 0;
    
    // Clear server mods that are not in client mods folder or are client-side only
    if (fs.existsSync(serverModsDir)) {
      const serverFiles = fs.readdirSync(serverModsDir).filter(f => f.endsWith('.jar'));
      for (const file of serverFiles) {
        const isClientOnly = clientOnly.some(k => file.toLowerCase().includes(k));
        if (!files.includes(file) || isClientOnly) {
          fs.unlinkSync(path.join(serverModsDir, file));
        }
      }
    }
    
    for (const file of files) {
      const isClientOnly = clientOnly.some(k => file.toLowerCase().includes(k));
      if (isClientOnly) {
        skippedCount++;
        continue;
      }
      
      const srcPath = path.join(clientModsDir, file);
      const destPath = path.join(serverModsDir, file);
      
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    }
    
    return { success: true, copiedCount, skippedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = function(ipcMain, mainWindow) {
  app.on('before-quit', () => { if (serverProcess) serverProcess.kill(); });

  // Чтение свойств сервера для UI
  ipcMain.handle('get-server-props', (event, pack) => {
    const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
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
    const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
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
    const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
    const worldDir = path.join(serverRoot, 'world');
    if (!fs.existsSync(worldDir)) {
      event.reply('server-log', '[Бэкап] Ошибка: Папка world пуста или не существует.\n');
      return;
    }
    event.reply('server-log', '[Бэкап] Архивация мира начата...\n');
    try {
      const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      execSync(`tar.exe -a -c -f "${backupName}" "world"`, { cwd: serverRoot, stdio: 'ignore' });
      event.reply('server-log', `[Бэкап] Успешно сохранен в файл: ${backupName}\n`);
    } catch (e) { event.reply('server-log', `[Бэкап] Ошибка: ${e.message}\n`); }
  });

  ipcMain.handle('list-backups', async (event, pack) => {
    try {
      const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
      if (!fs.existsSync(serverRoot)) return [];
      const files = fs.readdirSync(serverRoot);
      const backups = [];
      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.zip')) {
          const filePath = path.join(serverRoot, file);
          const stats = fs.statSync(filePath);
          backups.push({
            name: file,
            size: stats.size,
            time: stats.mtimeMs
          });
        }
      }
      backups.sort((a, b) => b.time - a.time);
      return backups;
    } catch (e) {
      console.error('[Backups] Failed to list backups:', e.message);
      return [];
    }
  });

  ipcMain.handle('delete-backup', async (event, pack, fileName) => {
    try {
      if (fileName.includes('/') || fileName.includes('\\') || !fileName.startsWith('backup_') || !fileName.endsWith('.zip')) {
        throw new Error('Некорректное имя файла бэкапа');
      }
      const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
      const filePath = path.join(serverRoot, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'Файл не найден' };
    } catch (e) {
      console.error('[Backups] Failed to delete backup:', e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('restore-backup', async (event, pack, fileName) => {
    try {
      if (fileName.includes('/') || fileName.includes('\\') || !fileName.startsWith('backup_') || !fileName.endsWith('.zip')) {
        throw new Error('Некорректное имя файла бэкапа');
      }
      if (serverProcess) {
        throw new Error('Невозможно восстановить бэкап, пока сервер запущен!');
      }
      const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
      const filePath = path.join(serverRoot, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error('Файл резервной копии не найден');
      }

      const worldDir = path.join(serverRoot, 'world');
      event.reply('server-log', `[Бэкап] Восстановление мира из ${fileName}...\n`);
      
      if (fs.existsSync(worldDir)) {
        event.reply('server-log', '[Бэкап] Удаление старых файлов мира...\n');
        fs.rmSync(worldDir, { recursive: true, force: true });
      }

      event.reply('server-log', '[Бэкап] Распаковка архива резервной копии...\n');
      const zip = new AdmZip(filePath);
      zip.extractAllTo(serverRoot, true);
      
      event.reply('server-log', '[Бэкап] Мир успешно восстановлен!\n');
      return { success: true };
    } catch (e) {
      console.error('[Backups] Failed to restore backup:', e.message);
      event.reply('server-log', `[Бэкап] Ошибка восстановления: ${e.message}\n`);
      return { success: false, error: e.message };
    }
  });

  async function ensureServerAssets(event, serverRoot, sLoaderType, pack) {
    const supportsPlugins = sLoaderType === 'paper' || sLoaderType === 'spigot' || sLoaderType === 'hybrid';
    const supportsMods = sLoaderType === 'forge' || sLoaderType === 'fabric' || sLoaderType === 'quilt' || sLoaderType === 'neoforge' || sLoaderType === 'hybrid';

    // === ГЛОБАЛЬНЫЕ АССЕТЫ СЕРВЕРА ===
    // Папка, откуда копируются все моды и плагины для каждого сервера
    const globalAssetsDir = path.join(app.getPath('userData'), 'server_assets');
    const globalPluginsDir = path.join(globalAssetsDir, 'plugins');
    const globalModsDir = path.join(globalAssetsDir, 'mods');

    if (!fs.existsSync(globalPluginsDir)) fs.mkdirSync(globalPluginsDir, { recursive: true });
    if (!fs.existsSync(globalModsDir)) fs.mkdirSync(globalModsDir, { recursive: true });

    // 1. Копируем глобальные ПЛАГИНЫ (если сервер их поддерживает)
    if (supportsPlugins) {
      const pluginsDir = path.join(serverRoot, 'plugins');
      if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
      const globalPlugins = fs.readdirSync(globalPluginsDir);
      for (const file of globalPlugins) {
        const fullPath = path.join(globalPluginsDir, file);
        if (fs.statSync(fullPath).isFile()) {
          fs.copyFileSync(fullPath, path.join(pluginsDir, file));
        }
      }
    }

    // 2. Копируем глобальные МОДЫ (если сервер их поддерживает)
    if (supportsMods) {
      const modsDir = path.join(serverRoot, 'mods');
      if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
      const globalMods = fs.readdirSync(globalModsDir);
      for (const file of globalMods) {
        const fullPath = path.join(globalModsDir, file);
        if (fs.statSync(fullPath).isFile()) {
          fs.copyFileSync(fullPath, path.join(modsDir, file));
        }
      }
    }

    // Ниже идёт логика скачивания базовых плагинов DivLauncher (только для серверов с плагинами)
    if (!supportsPlugins) {
      // ПАДАЕМ В РЕЖИМ СКАЧИВАНИЯ МОД-АНАЛОГОВ (если это Fabric / Quilt)
      if (sLoaderType === 'fabric' || sLoaderType === 'quilt') {
        event.reply('server-log', 'Загрузчик не поддерживает плагины. Ищем мод-аналоги базовых плагинов...\n');
        const axios = require('axios');
        const downloadAnalog = async (modId, pluginName, fileName) => {
          try {
            const destPath = path.join(serverRoot, 'mods', fileName);
            if (fs.existsSync(destPath)) return;
            
            const loaderId = sLoaderType === 'fabric' ? 4 : sLoaderType === 'quilt' ? 5 : null;
            const params = {
              gameVersion: pack.mcVersion
            };
            if (loaderId !== null) params.modLoaderType = loaderId;

            const baseUrl = process.env.CURSEFORGE_API_KEY ? 'https://api.curseforge.com/v1' : 'https://api.curse.tools/v1/cf';
            const headers = { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' };
            if (process.env.CURSEFORGE_API_KEY) {
              headers['x-api-key'] = process.env.CURSEFORGE_API_KEY;
            }

            const res = await axios.get(`${baseUrl}/mods/${modId}/files`, {
              params,
              headers,
              timeout: 10000
            });
            const files = res.data?.data || [];
            if (files.length > 0) {
              event.reply('server-log', `Скачивание аналога: ${pluginName} (мод)...\n`);
              await downloadFile(files[0].downloadUrl, destPath, (p) => {
                if (p % 50 === 0) event.reply('server-log', `${pluginName}: ${p}%\n`);
              });
            } else {
              event.reply('server-log', `[ИНФО] Аналог ${pluginName} для версии ${pack.mcVersion} не найден.\n`);
            }
          } catch (e) {
             event.reply('server-log', `[ОШИБКА] Не удалось скачать аналог ${pluginName}: ${e.message}\n`);
          }
        };
        await downloadAnalog(431733, 'LuckPerms', 'LuckPerms-Fabric.jar');
        await downloadAnalog(390114, 'SkinsRestorer', 'FabricTailor.jar');
      }
      return;
    }

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
      const serverRoot = path.resolve(app.getPath('userData'), pack.serverDir);
      if (!fs.existsSync(serverRoot)) fs.mkdirSync(serverRoot, { recursive: true });
      event.reply('server-status', 'starting');

      // 1. EARLY JAVA VERSION RESOLUTION FOR SERVER INSTALLATION & RUN
      const javaVersion = getRequiredJavaVersion(pack.mcVersion);
      
      let activeJavaPath = pack.javaPath && pack.javaPath.trim() !== '' 
        ? pack.javaPath 
        : null;

      if (activeJavaPath) {
        const majorVersion = getJavaMajorVersion(activeJavaPath);
        if (majorVersion && majorVersion < javaVersion) {
          sysLog(`Custom server Java version ${majorVersion} is less than required ${javaVersion}. Falling back to automatic JRE.`);
          activeJavaPath = null;
        }
      }

      if (!activeJavaPath) {
        activeJavaPath = await ensureJava(event, javaVersion, 'java.exe');
      }
      
      const installerPath = await ensureLoader(event, pack);
      if (pack.isCustom) {
        event.reply('server-log', 'Обнаружена пользовательская сборка. Автоматическое подтягивание модов...\n');
        const syncResult = syncLocalModsHelper(pack);
        if (syncResult.success) {
          event.reply('server-log', `Подтянуто модов с клиента: ${syncResult.copiedCount} (клиентских пропущено: ${syncResult.skippedCount})\n`);
        } else {
          event.reply('server-log', `[Предупреждение] Не удалось подтянуть моды: ${syncResult.error}\n`);
        }
      } else {
        await syncServerModpack(event, serverRoot, pack);
      }
      
      const runBatPath = path.join(serverRoot, 'run.bat');
      let sLoaderType = pack.serverLoaderType;
      if (!sLoaderType) {
        const baseLoader = pack.loaderType || 'vanilla';
        if (baseLoader === 'vanilla') sLoaderType = 'paper';
        else if (baseLoader === 'forge') {
          const arclightVersions = ['1.16.5', '1.18.2', '1.19.2', '1.20.1'];
          sLoaderType = arclightVersions.includes(pack.mcVersion) ? 'hybrid' : 'forge';
        } else sLoaderType = baseLoader;
      }

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
          event.reply('server-log', `[ОШИБКА] Не удалось скачать с GitHub: ${e.message}. Пробуем зеркало...\n`);
          try {
            const mirrorUrl = 'https://mirror.ghproxy.com/https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
            await downloadFile(mirrorUrl, injectorDest);
            event.reply('server-log', 'authlib-injector успешно скачан с зеркала!\n');
          } catch (mirrorErr) {
            event.reply('server-log', `[ОШИБКА] Не удалось скачать authlib-injector: ${mirrorErr.message}\n`);
          }
        }
      }

      if (sLoaderType === 'fabric' || sLoaderType === 'quilt') {
        const isFabric = sLoaderType === 'fabric';
        const jarName = isFabric ? 'fabric-server-launch.jar' : 'quilt-server-launch.jar';
        const serverJarPath = path.join(serverRoot, jarName);
        if (!fs.existsSync(serverJarPath)) {
          event.reply('server-log', `Установка ядра ${isFabric ? 'Fabric' : 'Quilt'} (скачивание сервера)...\n`);
          execSync(`"${activeJavaPath}" -jar "${installerPath}" server -dir "${serverRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion} -downloadMinecraft`, { stdio: 'ignore' });
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar ${jarName} nogui\npause`);
      } else if (sLoaderType === 'paper' || sLoaderType === 'spigot' || sLoaderType === 'hybrid') {
        const serverJarName = path.basename(installerPath);
        const serverJarDest = path.join(serverRoot, serverJarName);
        if (!fs.existsSync(serverJarDest)) {
          fs.copyFileSync(installerPath, serverJarDest);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar "${serverJarName}" nogui\npause`);
      } else if (sLoaderType === 'forge' || sLoaderType === 'neoforge') {
        const isForge = sLoaderType === 'forge';
        if (!fs.existsSync(runBatPath)) {
          event.reply('server-log', `Установка библиотек ядра ${isForge ? 'Forge' : 'NeoForge'}...\n`);
          execSync(`"${activeJavaPath}" -jar "${installerPath}" --installServer "${serverRoot}"`, { stdio: 'ignore' });
        }
        if (!fs.existsSync(runBatPath)) {
          // Check if there is a forge universal jar or similar (for older versions)
          const files = fs.readdirSync(serverRoot);
          const forgeJar = files.find(f => (f.startsWith('forge-') || f.startsWith('neoforge-')) && f.endsWith('.jar') && !f.includes('installer'));
          if (forgeJar) {
            fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar "${forgeJar}" nogui\npause`);
          } else {
            // Write a general fallback run.bat just in case
            fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar ${sLoaderType}.jar nogui\npause`);
          }
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
      } else {
        // Vanilla server!
        const serverJarName = pack.installerName || `minecraft_server.${pack.mcVersion}.jar`;
        const serverJarDest = path.join(serverRoot, serverJarName);
        if (!fs.existsSync(serverJarDest) && fs.existsSync(installerPath)) {
          fs.copyFileSync(installerPath, serverJarDest);
        }
        fs.writeFileSync(runBatPath, `java -Xmx4G -Dfile.encoding=UTF-8 -javaagent:authlib-injector.jar=${authServerUrl}/api/yggdrasil -jar "${serverJarName}" nogui\npause`);
      }

      // Автоматическое внедрение глобальных плагинов и модов
      await ensureServerAssets(event, serverRoot, sLoaderType, pack);

      // Внедрение пути к Java (либо из настроек, либо автоскачанная)
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
        const text = data.toString('utf8');
        if (text.includes('[INFO]') || text.includes('[WARN]')) {
          event.reply('server-log', text);
        } else {
          event.reply('server-log', '[ОШИБКА] ' + text);
        }
      });

      serverProcess.on('close', async (code) => {
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
    shell.openPath(path.resolve(app.getPath('userData'), pack.serverDir));
  });

  ipcMain.handle('sync-local-mods', async (event, pack) => {
    return syncLocalModsHelper(pack);
  });

  ipcMain.on('upload-world', async (event, pack) => {
    if (!pack) return;
    const { canceled, filePaths } = await dialog.showOpenDialog({ title: 'Выберите мир', properties: ['openDirectory'] });
    if (!canceled && filePaths.length > 0) {
      const targetFolder = path.resolve(app.getPath('userData'), pack.serverDir, 'world');
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

};