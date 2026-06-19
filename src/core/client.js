const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const axios = require('axios');
const extract = require('extract-zip');
const AdmZip = require('adm-zip');

// Устанавливаем стандартный User-Agent браузера для обхода защиты Cloudflare от ботов
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const { app, shell, dialog, Notification } = require('electron'); 
const { execSync } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');

const launcher = new Client();
let gameProcess = null;

const AUTH_SERVER = process.env.AUTH_SERVER || 'https://mcauth.diverlin.ru';
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
    sysLog(`Starting download: ${url} -> ${destPath}`);
    const client = url.startsWith('https') ? https : http;
    const options = { headers: { 'User-Agent': 'DivLauncher/1.0.8' } };
    const req = client.get(url, options, (response) => {
      sysLog(`Download response for ${url}: status = ${response.statusCode}`);
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        sysLog(`Following redirect for ${url} -> ${redirectUrl}`);
        if (!redirectUrl) {
          return reject(new Error(`Redirect location missing for ${url}`));
        }
        return resolve(downloadFile(redirectUrl, destPath, onProgress));
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }

      const file = fs.createWriteStream(destPath);
      file.on('error', (err) => {
        sysLog(`File write stream error for ${destPath}: ${err.message}`);
        file.close();
        fs.unlink(destPath, () => reject(err));
      });

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes && onProgress) {
          onProgress(Math.round((downloadedBytes / totalBytes) * 100));
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        sysLog(`Successfully downloaded: ${url} -> ${destPath}`);
        file.close(resolve);
      });
    });

    req.on('error', (err) => {
      sysLog(`Request error for ${url}: ${err.message}`);
      reject(err);
    });

    // Set a timeout of 30 seconds for connection/idle time
    req.setTimeout(30000, () => {
      sysLog(`Download timeout of 30s exceeded for: ${url}`);
      req.destroy();
      reject(new Error(`Download timeout for ${url}`));
    });
  });
}

function getRequiredJavaVersion(mcVersion) {
  if (!mcVersion) return 17;
  const parts = mcVersion.split('.');
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  if (minor > 20 || (minor === 20 && patch >= 5)) {
    return 21;
  }
  return 17;
}

async function ensureJava(event, version = 17, exeName = 'javaw.exe') {
  sysLog(`ensureJava called for version ${version}, looking for ${exeName}`);
  const jreDir = path.join(app.getPath('userData'), `jre${version}`);
  
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
  if (javaPath) {
    sysLog(`Found existing Java at: ${javaPath}`);
    return javaPath;
  }

  sysLog(`Java not found at ${jreDir}. Proceeding to download...`);
  if (!fs.existsSync(jreDir)) fs.mkdirSync(jreDir, { recursive: true });
  const zipPath = path.join(jreDir, 'jre.zip');
  
  let urls = [];
  if (version === 21) {
    urls = [
      `https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse`,
      `https://cdn.azul.com/zulu/bin/zulu21.34.19-ca-jre21.0.3-win_x64.zip`,
      `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jre_x64_windows_hotspot_21.0.2_13.zip`
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
    sysLog(`Attempting to download Java ${version} from ${sourceName}: ${url} (attempt ${i + 1}/${urls.length})`);
    event.reply('launch-progress', `Подключение к источнику Java ${version} (${sourceName})...`);
    try {
      await downloadFile(url, zipPath, (p) => event.reply('launch-progress', `Загрузка Java ${version}: ${p}%`));
      downloadSuccess = true;
      sysLog(`Successfully downloaded JRE from ${sourceName}`);
      break;
    } catch (err) {
      lastError = err;
      sysLog(`Failed to download from ${sourceName}: ${err.message}. Trying next mirror...`);
      if (fs.existsSync(zipPath)) {
        try { fs.unlinkSync(zipPath); } catch(e){}
      }
    }
  }

  if (!downloadSuccess) {
    sysLog(`All Java download attempts failed! Last error: ${lastError?.message}`);
    throw new Error(`Не удалось загрузить Java ${version} из доступных источников: ${lastError?.message}`);
  }

  event.reply('launch-progress', `Распаковка Java ${version} (один раз)...`);
  sysLog(`Extracting JRE zip: ${zipPath} -> ${jreDir}`);
  await extract(zipPath, { dir: jreDir });
  sysLog(`Extraction complete. Unlinking zip file.`);
  fs.unlinkSync(zipPath);
  
  let newJavaPath = findJava(jreDir);
  if (!newJavaPath) {
    throw new Error(`Java executable not found after extraction in ${jreDir}`);
  }
  sysLog(`Resolved downloaded Java path: ${newJavaPath}`);
  return newJavaPath;
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
    let installerName = pack.installerName || 'fabric-installer-1.1.1.jar';
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

async function syncModpack(event, rootDir, pack) {
  sysLog(`syncModpack called for rootDir: ${rootDir}`);
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });

  if (pack.packZipUrl && pack.packVersion) {
    const versionFile = path.join(rootDir, 'pack_version.txt');
    const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '0';
    sysLog(`Current zip pack version: ${currentVersion}, target version: ${pack.packVersion}`);

    if (currentVersion !== pack.packVersion) {
      const zipPath = path.join(rootDir, 'update.zip');
      event.reply('launch-progress', `Подключение к серверу обновлений...`);
      await downloadFile(pack.packZipUrl, zipPath, (p) => event.reply('launch-progress', `Загрузка архива: ${p}%`));
      event.reply('launch-progress', 'Распаковка файлов...');
      sysLog(`Extracting pack zip: ${zipPath} -> ${rootDir}`);
      await extract(zipPath, { dir: rootDir });
      sysLog(`Extraction complete. Unlinking zip file.`);
      fs.unlinkSync(zipPath);
      fs.writeFileSync(versionFile, pack.packVersion);
    }
  }

  if (pack.modsJsonUrl) {
    const modsDir = path.join(rootDir, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    event.reply('launch-progress', 'Проверка целостности модов...');
    sysLog(`Fetching mods list from: ${pack.modsJsonUrl}`);
    let modsUrls = [];
    try {
      const res = await axios.get(`${pack.modsJsonUrl}?t=${Date.now()}`, { timeout: 15000 });
      modsUrls = res.data;
    } catch (e) {
      sysLog(`Failed to fetch mods.json: ${e.message}`);
      throw new Error(`Не удалось получить список модов: ${e.message}`);
    }

    const expectedModsMap = new Map();
    for (const url of modsUrls) expectedModsMap.set(decodeURIComponent(url.split('/').pop()), url);
    
    const expectedFilenames = Array.from(expectedModsMap.keys());
    const localFiles = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));

    for (const file of localFiles) {
      if (!expectedFilenames.includes(file)) {
        sysLog(`Removing unexpected local mod: ${file}`);
        event.reply('launch-progress', `Удаление лишнего: ${file}`);
        try { fs.unlinkSync(path.join(modsDir, file)); } catch(e){}
      }
    }

    const missingFilenames = expectedFilenames.filter(mod => !localFiles.includes(mod));
    if (missingFilenames.length > 0) {
      sysLog(`Found ${missingFilenames.length} missing mods to download.`);
      for (let i = 0; i < missingFilenames.length; i++) {
        const filename = missingFilenames[i];
        event.reply('launch-progress', `Скачивание: ${filename} (${i + 1}/${missingFilenames.length})`);
        try {
          const modUrl = expectedModsMap.get(filename);
          sysLog(`Downloading mod: ${filename} from ${modUrl}`);
          const res = await axios.get(modUrl, { responseType: 'arraybuffer', timeout: 30000 });
          fs.writeFileSync(path.join(modsDir, filename), res.data);
        } catch (e) {
          sysLog(`Failed to download mod ${filename}: ${e.message}`);
          throw new Error(`Сбой сети при скачивании ${filename}: ${e.message}`);
        }
      }
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
    event.reply('launch-progress', `Загрузка библиотек ядра...`);

    for (let i = 0; i < missingLibraries.length; i++) {
      const item = missingLibraries[i];
      const percent = Math.round((i / missingLibraries.length) * 100);
      event.reply('launch-progress', `Загрузка библиотек ядра: ${percent}%`);
      
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
    event.reply('launch-progress', `Библиотеки ядра загружены 100%`);
  } catch (e) {
    sysLog(`Error in ensureInstallerLibraries: ${e.message}`);
    if (e.message.includes('Не удалось загрузить')) {
      throw e;
    }
  }
}

async function ensureLoader(event, pack) {
  sysLog(`ensureLoader called for pack: ${pack.name}`);
  await resolveLoaderDetails(pack);
  
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const installerName = pack.installerName || pack.forgeInstallerName;
  const installerUrl = pack.installerUrl || pack.forgeUrl;
  
  if (!installerName || !installerUrl) {
    sysLog(`Loader properties missing on pack object!`);
    throw new Error(`Отсутствуют параметры загрузчика (installerName/installerUrl) для сборки ${pack.name}. Попробуйте пересоздать сборку.`);
  }

  const installerPath = path.join(cacheDir, installerName);
  
  if (!fs.existsSync(installerPath)) {
    sysLog(`Downloading loader installer to ${installerPath} from ${installerUrl}`);
    event.reply('launch-progress', `Подключение для загрузки ядра...`);
    await downloadFile(installerUrl, installerPath, (p) => event.reply('launch-progress', `Загрузка ядра: ${p}%`));
  } else {
    sysLog(`Loader installer already cached at: ${installerPath}`);
  }

  if (pack.loaderType === 'neoforge' || pack.loaderType === 'forge') {
    const gameRoot = path.resolve(app.getPath('userData'), pack.clientDir);
    await ensureInstallerLibraries(event, installerPath, gameRoot);
  }

  return installerPath;
}

async function ensureAuthlibInjector(event) {
  sysLog(`ensureAuthlibInjector called`);
  const cacheDir = path.join(app.getPath('userData'), 'loader-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const injectorPath = path.join(cacheDir, 'authlib-injector.jar');
  const injectorUrl = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
  
  if (!fs.existsSync(injectorPath)) {
    sysLog(`Downloading authlib-injector to ${injectorPath}`);
    event.reply('launch-progress', `Подключение для загрузки authlib...`);
    try {
      await downloadFile(injectorUrl, injectorPath, (p) => event.reply('launch-progress', `Загрузка authlib-injector: ${p}%`));
    } catch (e) {
      sysLog(`Download failed from Github, trying mirror: ${e.message}`);
      event.reply('launch-progress', `Ошибка загрузки. Пробуем зеркало...`);
      const mirrorUrl = 'https://mirror.ghproxy.com/https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
      await downloadFile(mirrorUrl, injectorPath, (p) => event.reply('launch-progress', `Загрузка authlib-injector (Зеркало): ${p}%`));
    }
  } else {
    sysLog(`authlib-injector already cached at: ${injectorPath}`);
  }
  return injectorPath;
}

module.exports = function(ipcMain) {
  ipcMain.on('open-client-folder', (event, pack) => {
    if (!pack) return;
    shell.openPath(path.resolve(app.getPath('userData'), pack.clientDir));
  });

  ipcMain.on('upload-client-configs', async (event, pack) => {
    if (!pack) return;
    const { canceled, filePaths } = await dialog.showOpenDialog({ title: 'Выберите папку', properties: ['openDirectory'] });
    if (!canceled && filePaths.length > 0) {
      try {
        event.reply('launch-progress', `Копирование...`);
        fs.cpSync(filePaths[0], path.resolve(app.getPath('userData'), pack.clientDir, 'config'), { recursive: true, force: true });
        event.reply('launch-progress', `Конфиги загружены!`);
        setTimeout(() => event.reply('launch-progress', 'Готово к запуску'), 4000);
      } catch (err) { event.reply('launch-error', `Ошибка: ${err.message}`); }
    }
  });

  ipcMain.on('launch-game', async (event, options) => {
    sysLog("=== [launch-game] START ===");
    sysLog("Options RAM:", options.ram, "PlayMode:", options.playMode, "JavaPath setting:", options.javaPath);
    try {
      const pack = options.pack;
      sysLog(`Pack ID: ${pack.id}, Name: ${pack.name}, Version: ${pack.mcVersion}, Loader: ${pack.loaderType}`);
      const gameRoot = path.resolve(app.getPath('userData'), pack.clientDir);
      sysLog(`Game root directory: ${gameRoot}`);
      launcher.removeAllListeners();
      if (!fs.existsSync(gameRoot)) {
        sysLog(`Creating game root directory: ${gameRoot}`);
        fs.mkdirSync(gameRoot, { recursive: true });
      }

      // === CUSTOM YGGDRASIL AUTH ===
      let auth;
      const cacheFile = path.join(app.getPath('userData'), 'custom_auth_cache.json');
      if (fs.existsSync(cacheFile)) {
        try {
          const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          auth = {
            access_token: cached.accessToken,
            client_token: cached.clientToken || require('crypto').randomUUID(),
            uuid: cached.selectedProfile.id,
            name: cached.selectedProfile.name,
            user_properties: "{}"
          };
          options.username = cached.selectedProfile.name; // Use auth username
          sysLog(`Loaded cached auth profile for: ${options.username}`);
        } catch (e) {
          sysLog(`Failed to parse auth cache: ${e.message}. Falling back to offline mode.`);
          auth = Authenticator.getAuth(options.username);
        }
      } else {
        sysLog(`Auth cache file not found. Launching in offline mode for: ${options.username}`);
        auth = Authenticator.getAuth(options.username);
      }

      // 1. EARLY JAVA VERSION RESOLUTION
      const javaVersion = getRequiredJavaVersion(pack.mcVersion);
      sysLog(`Required Java version: ${javaVersion}`);
      
      let activeJavaPath = options.javaPath && options.javaPath.trim() !== '' 
        ? options.javaPath 
        : null;

      if (activeJavaPath) {
        const majorVersion = getJavaMajorVersion(activeJavaPath);
        if (majorVersion && majorVersion < javaVersion) {
          sysLog(`Custom Java version ${majorVersion} is less than required ${javaVersion}. Falling back to automatic JRE.`);
          activeJavaPath = null;
        }
      }

      if (!activeJavaPath) {
        activeJavaPath = await ensureJava(event, javaVersion, 'javaw.exe');
      }
      sysLog(`Active Java path resolved: ${activeJavaPath}`);

      let installerPath = null;
      const clientLoaderType = (pack.loaderType === 'paper' || pack.loaderType === 'spigot') 
        ? 'vanilla' 
        : (pack.loaderType === 'hybrid' || pack.loaderType === 'neoforge') ? 'forge' : pack.loaderType;
      sysLog(`Client loader type resolved to: ${clientLoaderType}`);

      if (clientLoaderType !== 'vanilla') {
        sysLog(`Resolving installer/loader...`);
        installerPath = await ensureLoader(event, pack);
        sysLog(`Installer path resolved: ${installerPath}`);
      }
      
      sysLog(`Checking authlib injector...`);
      const authlibPath = await ensureAuthlibInjector(event);
      sysLog(`Authlib injector path: ${authlibPath}`);
      
      sysLog(`Syncing modpack files...`);
      await syncModpack(event, gameRoot, pack);
      sysLog(`Modpack sync complete.`);

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

      if (clientLoaderType === 'fabric' || clientLoaderType === 'quilt') {
        const isFabric = clientLoaderType === 'fabric';
        const prefix = isFabric ? 'fabric-loader' : 'quilt-loader';
        const fabricVersionName = `${prefix}-${pack.loaderVersion}-${pack.mcVersion}`;
        const versionDir = path.join(gameRoot, 'versions', fabricVersionName);
        if (!fs.existsSync(versionDir)) {
          sysLog(`Installing ${isFabric ? 'Fabric' : 'Quilt'} core to: ${versionDir}`);
          event.reply('launch-progress', `Установка ядра ${isFabric ? 'Fabric' : 'Quilt'}...`);
          const profilesPath = path.join(gameRoot, 'launcher_profiles.json');
          if (!fs.existsSync(profilesPath)) fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }));
          
          const localJava = activeJavaPath.replace(/javaw\.exe$/i, 'java.exe');
          sysLog(`Running installer command: "${localJava}" -jar "${installerPath}" client -dir "${gameRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion}`);
          execSync(`"${localJava}" -jar "${installerPath}" client -dir "${gameRoot}" -mcversion ${pack.mcVersion} -loader ${pack.loaderVersion}`, { timeout: 120000, stdio: 'ignore' });
          sysLog(`Installer completed successfully.`);
        }
        opts.version = { number: pack.mcVersion, type: "release", custom: fabricVersionName };
      } else if (clientLoaderType === 'forge') {
        sysLog(`Configuring Forge settings. Installer: ${installerPath}`);
        opts.version = { number: pack.mcVersion, type: "release" };
        opts.forge = installerPath;
        opts.customArgs.push('-Dforge.forceNoIgui=true');
      } else {
        sysLog(`Configuring vanilla/plugin client launch.`);
        opts.version = { number: pack.mcVersion, type: "release" };
      }

      if (options.playMode === 'connect' && options.serverIp) {
        sysLog(`Quick play auto-connect enabled. Target Server IP: ${options.serverIp}`);
        opts.quickPlay = { type: "multiplayer", identifier: options.serverIp };
      }

      sysLog(`Setting launcher listeners...`);
      launcher.on('download-status', (e) => {
        sysLog(`[MCLC download-status] Name: ${e.name}, Progress: ${e.current}/${e.total}`);
        event.reply('launch-progress', `Библиотеки: ${e.name}`);
      });
      launcher.on('progress', (e) => {
        sysLog(`[MCLC progress] Type: ${e.type}, Task: ${e.task}/${e.total}`);
        event.reply('launch-progress', `Этап: ${e.type} (${e.task}/${e.total})`);
      });
      launcher.on('close', () => {
        sysLog(`[MCLC close] Game process closed.`);
        event.reply('launch-closed');
      });
      
      launcher.on('debug', (e) => {
        sysLog(`[MC DEBUG]: ${e}`);
        event.reply('launch-progress', '[LOG]' + e);
      });
      launcher.on('data', (e) => {
        sysLog(`[MC DATA]: ${e}`);
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
        sysLog(`Configured CustomSkinLoader configuration successfully.`);
      } catch (e) {
        sysLog(`[WARNING] CustomSkinLoader auto-config error: ${e.message}`);
      }

      sysLog(`Launching game client...`);
      event.reply('launch-progress', 'Запуск Minecraft...');
      
      if (Notification.isSupported()) {
        new Notification({ title: 'DivLauncher', body: `Сборка ${pack.name} успешно установлена и запускается!` }).show();
      }

      gameProcess = await launcher.launch(opts);
      sysLog(`Minecraft launch command completed (process spawned).`);
    } catch (error) {
      sysLog(`[launch-game] CRITICAL ERROR: ${error.stack || error.message}`);
      event.reply('launch-error', error.message);
    }
  });
  ipcMain.on('kill-game', () => {
    if (gameProcess) {
      try {
        sysLog(`kill-game event received. Killing Minecraft process...`);
        gameProcess.kill('SIGKILL');
        gameProcess = null;
      } catch (e) {
        sysLog(`Error during killing game process: ${e.message}`);
      }
    }
  });

  // ─── CUSTOM AUTH для страницы настроек ────────────────────────────────

  const getCustomCacheFile = () => path.join(app.getPath('userData'), 'custom_auth_cache.json');
  // Initialize the log files on start
  try {
    fs.writeFileSync(debugLogPath, `=== DIVLAUNCHER DEBUG LOG STARTED ${new Date().toISOString()} ===\n`);
  } catch(e) {}
  try {
    const userDataLogPath = path.join(app.getPath('userData'), 'debug.log');
    fs.writeFileSync(userDataLogPath, `=== DIVLAUNCHER DEBUG LOG STARTED ${new Date().toISOString()} ===\n`);
  } catch(e) {}

  function createLogger() {
    const logs = [];
    return {
      log: (...args) => {
        sysLog(...args);
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${msg}`;
        logs.push(formatted);
      },
      getLogs: () => logs
    };
  }

  ipcMain.handle('custom-login', async (event, username, password) => {
    const logger = createLogger();
    logger.log("=== [custom-login] START ===");
    logger.log(`Username: "${username}"`);
    try {
      const currentClientToken = require('crypto').randomUUID();
      logger.log(`Sending authentication request to Yggdrasil: ${AUTH_SERVER}/authserver/authenticate`);
      const response = await axios.post(`${AUTH_SERVER}/authserver/authenticate`, {
        agent: { name: 'Minecraft', version: 1 },
        username: username,
        password: password,
        clientToken: currentClientToken
      });
      
      const data = response.data;
      if (!data.clientToken) data.clientToken = currentClientToken;
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
      const currentClientToken = cached.clientToken || require('crypto').randomUUID();
      logger.log(`Sending token refresh request: ${AUTH_SERVER}/authserver/refresh`);
      const response = await axios.post(`${AUTH_SERVER}/authserver/refresh`, {
        accessToken: cached.accessToken,
        clientToken: currentClientToken
      });

      const data = response.data;
      if (!data.clientToken) data.clientToken = currentClientToken;
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
          try { if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile); } catch(e){}
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
        if (err.response.status === 401 || err.response.status === 403) {
          try { if (fs.existsSync(getCustomCacheFile())) fs.unlinkSync(getCustomCacheFile()); logger.log("Cleared invalid auth cache."); } catch(e){}
        }
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

      const gameRoot = path.resolve(app.getPath('userData'), packClientDir || 'div-launcher');
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
          const gameRoot = path.resolve(app.getPath('userData'), clientDir);
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
          const gameRoot = path.resolve(app.getPath('userData'), clientDir);
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

  const getCustomPacksFile = () => path.join(app.getPath('userData'), 'custom_modpacks.json');

  ipcMain.handle('get-custom-packs', async () => {
    try {
      const file = getCustomPacksFile();
      if (!fs.existsSync(file)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      console.error('Error getting custom packs:', err);
      return [];
    }
  });

  ipcMain.handle('save-custom-pack', async (event, pack) => {
    try {
      // 1. Сохраняем ассеты локально внутри папки сборки
      const clientPath = path.resolve(app.getPath('userData'), pack.clientDir);
      const assetsPath = path.join(clientPath, 'assets');
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      const processAsset = (urlProp) => {
        if (pack[urlProp] && pack[urlProp].startsWith('file://')) {
          let sourcePath = decodeURI(pack[urlProp].replace('file://', ''));
          if (sourcePath.startsWith('/') && sourcePath.includes(':')) {
            sourcePath = sourcePath.substring(1);
          }
          if (fs.existsSync(sourcePath)) {
            const fileName = path.basename(sourcePath);
            const destPath = path.join(assetsPath, fileName);
            if (sourcePath !== destPath) {
              fs.copyFileSync(sourcePath, destPath);
            }
            pack[urlProp] = `file://${destPath.replace(/\\/g, '/')}`;
          }
        }
      };

      processAsset('bgImage');
      processAsset('bgVideo');
      processAsset('icon');
      processAsset('logo');

      // 2. Вшиваем divpack.json
      const divpackJsonPath = path.join(clientPath, 'divpack.json');
      fs.writeFileSync(divpackJsonPath, JSON.stringify(pack, null, 2));

      const file = getCustomPacksFile();
      let packs = [];
      if (fs.existsSync(file)) {
        packs = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      const existingIndex = packs.findIndex(p => p.id === pack.id);
      if (existingIndex > -1) {
        packs[existingIndex] = pack;
      } else {
        packs.push(pack);
      }
      fs.writeFileSync(file, JSON.stringify(packs, null, 2));
      return { success: true };
    } catch (err) {
      console.error('Error saving custom pack:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('import-custom-pack', async (event) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите ZIP архив сборки или divpack.json',
        properties: ['openFile'],
        filters: [
          { name: 'DivLauncher Modpack', extensions: ['zip', 'json'] }
        ]
      });

      if (canceled || filePaths.length === 0) return { success: false, error: 'Отменено' };

      const selectedPath = filePaths[0];
      let packData = null;
      let targetClientDir = null;

      if (selectedPath.endsWith('.json')) {
        const content = fs.readFileSync(selectedPath, 'utf8');
        packData = JSON.parse(content);
        if (!packData.id || !packData.clientDir) throw new Error("Неверный формат divpack.json");
        
        targetClientDir = path.resolve(app.getPath('userData'), packData.clientDir);
        const sourceDir = path.dirname(selectedPath);
        
        if (targetClientDir !== sourceDir) {
           fs.cpSync(sourceDir, targetClientDir, { recursive: true, force: true });
        }
      } else if (selectedPath.endsWith('.zip')) {
        const zip = new AdmZip(selectedPath);
        const zipEntries = zip.getEntries();
        const divpackEntry = zipEntries.find(e => e.entryName === 'divpack.json' || e.entryName.endsWith('/divpack.json'));
        if (!divpackEntry) throw new Error("В архиве не найден файл divpack.json!");
        
        const content = zip.readAsText(divpackEntry);
        packData = JSON.parse(content);
        if (!packData.id || !packData.clientDir) throw new Error("Неверный формат divpack.json");

        targetClientDir = path.resolve(app.getPath('userData'), packData.clientDir);
        
        const tempDir = path.join(app.getPath('temp'), 'divlauncher-import-' + Date.now());
        zip.extractAllTo(tempDir, true);
        
        const extractedDivpackPath = path.join(tempDir, divpackEntry.entryName);
        const sourceDir = path.dirname(extractedDivpackPath);
        
        fs.cpSync(sourceDir, targetClientDir, { recursive: true, force: true });
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      if (packData) {
        const fixAsset = (urlProp) => {
          if (packData[urlProp] && packData[urlProp].startsWith('file://')) {
            const fileName = path.basename(packData[urlProp]);
            const newPath = path.join(targetClientDir, 'assets', fileName);
            if (fs.existsSync(newPath)) {
              packData[urlProp] = `file://${newPath.replace(/\\/g, '/')}`;
            }
          }
        };
        fixAsset('bgImage');
        fixAsset('bgVideo');
        fixAsset('icon');
        fixAsset('logo');

        fs.writeFileSync(path.join(targetClientDir, 'divpack.json'), JSON.stringify(packData, null, 2));

        const file = getCustomPacksFile();
        let packs = [];
        if (fs.existsSync(file)) {
          packs = JSON.parse(fs.readFileSync(file, 'utf8'));
        }
        const existingIndex = packs.findIndex(p => p.id === packData.id);
        if (existingIndex > -1) {
          packs[existingIndex] = packData;
        } else {
          packs.push(packData);
        }
        fs.writeFileSync(file, JSON.stringify(packs, null, 2));

        return { success: true, pack: packData };
      }
      
      throw new Error("Не удалось прочитать данные сборки.");
    } catch (err) {
      console.error('Error importing custom pack:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export-custom-pack', async (event, packId) => {
    try {
      const file = getCustomPacksFile();
      if (!fs.existsSync(file)) return { success: false, error: 'Сборки не найдены' };
      const packs = JSON.parse(fs.readFileSync(file, 'utf8'));
      const packToExport = packs.find(p => p.id === packId);
      if (!packToExport) return { success: false, error: 'Сборка не найдена' };

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Экспорт сборки',
        defaultPath: `${packToExport.name || 'modpack'}.zip`,
        filters: [{ name: 'DivLauncher Modpack', extensions: ['zip'] }]
      });

      if (canceled || !filePath) return { success: false, error: 'Отменено' };

      const clientPath = path.resolve(app.getPath('userData'), packToExport.clientDir);
      if (!fs.existsSync(clientPath)) return { success: false, error: 'Директория клиента не найдена' };

      // Ensure divpack.json is up to date in the directory
      fs.writeFileSync(path.join(clientPath, 'divpack.json'), JSON.stringify(packToExport, null, 2));

      const zip = new AdmZip();
      zip.addLocalFolder(clientPath, '');
      zip.writeZip(filePath);

      return { success: true };
    } catch (err) {
      console.error('Error exporting custom pack:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-custom-pack', async (event, id) => {
    try {
      const file = getCustomPacksFile();
      if (fs.existsSync(file)) {
        let packs = JSON.parse(fs.readFileSync(file, 'utf8'));
        const packToDelete = packs.find(p => p.id === id);
        if (packToDelete) {
          const clientPath = packToDelete.clientDir ? path.resolve(app.getPath('userData'), packToDelete.clientDir) : null;
          const serverPath = packToDelete.serverDir ? path.resolve(app.getPath('userData'), packToDelete.serverDir) : null;
          
          if (clientPath && fs.existsSync(clientPath)) {
            fs.rmSync(clientPath, { recursive: true, force: true });
          }
          if (serverPath && fs.existsSync(serverPath)) {
            fs.rmSync(serverPath, { recursive: true, force: true });
          }
        }
        packs = packs.filter(p => p.id !== id);
        fs.writeFileSync(file, JSON.stringify(packs, null, 2));
      }
      return { success: true };
    } catch (err) {
      console.error('Error deleting custom pack:', err);
      return { success: false, error: err.message };
    }
  });

  // --- MODRINTH INTEGRATION ---
  ipcMain.handle('get-installed-mods', async (event, clientDir) => {
    if (!clientDir) return { success: false, error: "No clientDir provided" };
    try {
      const modsPath = path.resolve(app.getPath('userData'), clientDir, 'mods');
      if (!fs.existsSync(modsPath)) return { success: true, mods: [] };
      const files = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar'));
      return { success: true, mods: files };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('download-mod', async (event, url, clientDir, fileName) => {
    if (!url || !clientDir || !fileName) return { success: false, error: "Invalid args" };
    try {
      const modsPath = path.resolve(app.getPath('userData'), clientDir, 'mods');
      if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
      const dest = path.join(modsPath, fileName);
      await downloadFile(url, dest);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-mod', async (event, clientDir, fileName) => {
    if (!clientDir || !fileName) return { success: false, error: "Invalid args" };
    try {
      const dest = path.resolve(app.getPath('userData'), clientDir, 'mods', fileName);
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('search-modrinth', async (event, query, facets, limit, offset) => {
    sysLog(`[IPC search-modrinth] query: "${query}", facets: ${JSON.stringify(facets)}, limit: ${limit}, offset: ${offset}`);
    try {
      const response = await axios.get('https://api.modrinth.com/v2/search', {
        params: {
          query,
          facets: JSON.stringify(facets),
          limit,
          offset
        },
        headers: {
          'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)'
        }
      });
      sysLog(`[IPC search-modrinth] success. Received ${response.data?.hits?.length || 0} hits.`);
      return { success: true, data: response.data };
    } catch (e) {
      sysLog(`[IPC search-modrinth] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-modrinth-versions', async (event, slug, loaders, gameVersions) => {
    sysLog(`[IPC get-modrinth-versions] slug: ${slug}, loaders: ${JSON.stringify(loaders)}, gameVersions: ${JSON.stringify(gameVersions)}`);
    try {
      const response = await axios.get(`https://api.modrinth.com/v2/project/${slug}/version`, {
        params: {
          loaders: JSON.stringify(loaders),
          game_versions: JSON.stringify(gameVersions)
        },
        headers: {
          'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)'
        }
      });
      sysLog(`[IPC get-modrinth-versions] success. Received ${response.data?.length || 0} versions.`);
      return { success: true, data: response.data };
    } catch (e) {
      sysLog(`[IPC get-modrinth-versions] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-modrinth-project', async (event, slug) => {
    sysLog(`[IPC get-modrinth-project] slug: ${slug}`);
    try {
      const response = await axios.get(`https://api.modrinth.com/v2/project/${slug}`, {
        headers: {
          'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)'
        }
      });
      sysLog(`[IPC get-modrinth-project] success.`);
      return { success: true, data: response.data };
    } catch (e) {
      sysLog(`[IPC get-modrinth-project] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.on('open-external-link', (event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url).catch(e => console.error('Failed to open external link:', e));
    }
  });
};
