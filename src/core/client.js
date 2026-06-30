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
const { Worker } = require('worker_threads');
const { Client, Authenticator } = require('minecraft-launcher-core');

const launcher = new Client();
let gameProcess = null;

const AUTH_SERVER = process.env.AUTH_SERVER || 'https://mcauth.diverlin.ru';

function sysLog(...args) {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
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

async function downloadFile(url, destPath, onProgress) {
  sysLog(`Starting download (axios): ${url} -> ${destPath}`);
  const writer = fs.createWriteStream(destPath);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 45000
    });

    const totalBytes = parseInt(response.headers['content-length'], 10);
    let downloadedBytes = 0;

    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes && onProgress) {
        onProgress(Math.round((downloadedBytes / totalBytes) * 100));
      }
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', () => {
        writer.close();
        sysLog(`Successfully downloaded: ${url} -> ${destPath}`);
        resolve();
      });
      writer.on('error', (err) => {
        writer.close();
        fs.unlink(destPath, () => reject(err));
      });
    });
  } catch (err) {
    writer.close();
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch {}
    }
    sysLog(`Download error for ${url}: ${err.message}`);
    throw err;
  }
}

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
      
      // Clean up mods and config directory to prevent old files conflicts
      const modsPath = path.join(rootDir, 'mods');
      const configPath = path.join(rootDir, 'config');
      sysLog(`Clearing mods/ and config/ folders before extraction...`);
      if (fs.existsSync(modsPath)) {
        try { fs.rmSync(modsPath, { recursive: true, force: true }); } catch (e) { sysLog(`Error clearing mods directory: ${e.message}`); }
      }
      if (fs.existsSync(configPath)) {
        try { fs.rmSync(configPath, { recursive: true, force: true }); } catch (e) { sysLog(`Error clearing config directory: ${e.message}`); }
      }

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

  ipcMain.handle('get-badges', async () => {
    const logger = createLogger();
    logger.log("=== [get-badges] START ===");
    try {
      logger.log(`Fetching badges from Web API: ${AUTH_SERVER}/api/badges`);
      const response = await axios.get(`${AUTH_SERVER}/api/badges`);
      return { success: true, badges: response.data };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("get-badges failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('create-admin-badge', async (event, badge) => {
    const logger = createLogger();
    logger.log("=== [create-admin-badge] START ===");
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

      logger.log(`Creating badge via Web API: ${AUTH_SERVER}/api/admin/badges`);
      const response = await axios.post(`${AUTH_SERVER}/api/admin/badges`, badge, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, badge: response.data };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("create-admin-badge failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('update-admin-badge', async (event, id, badge) => {
    const logger = createLogger();
    logger.log(`=== [update-admin-badge] START (id: ${id}) ===`);
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

      logger.log(`Updating badge ${id} via Web API: ${AUTH_SERVER}/api/admin/badges/${id}`);
      const response = await axios.put(`${AUTH_SERVER}/api/admin/badges/${id}`, badge, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, badge: response.data };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("update-admin-badge failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('delete-admin-badge', async (event, id) => {
    const logger = createLogger();
    logger.log(`=== [delete-admin-badge] START (id: ${id}) ===`);
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

      logger.log(`Deleting badge ${id} via Web API: ${AUTH_SERVER}/api/admin/badges/${id}`);
      const response = await axios.delete(`${AUTH_SERVER}/api/admin/badges/${id}`, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("delete-admin-badge failed:", errMsg);
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

  ipcMain.handle('start-google-auth', async (event, action) => {
    const logger = createLogger();
    logger.log(`=== [start-google-auth] START === Action: ${action}`);
    const http = require('http');
    const { shell } = require('electron');
    
    return new Promise((resolve) => {
      const server = http.createServer();
      
      let serverClosed = false;
      const closeServer = () => {
        if (!serverClosed) {
          server.close();
          serverClosed = true;
          logger.log("Local OAuth server closed.");
        }
      };

      const timeout = setTimeout(() => {
        closeServer();
        resolve({ success: false, error: 'Время ожидания авторизации истекло.' });
      }, 5 * 60 * 1000);

      server.on('request', async (req, res) => {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        if (urlObj.pathname === '/auth-callback') {
          const status = urlObj.searchParams.get('status');
          const email = urlObj.searchParams.get('email');
          const errorMsg = urlObj.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          
          if (status === 'success') {
            if (action === 'login') {
              const token = urlObj.searchParams.get('token');
              const accessToken = urlObj.searchParams.get('accessToken');
              const clientToken = urlObj.searchParams.get('clientToken');
              const username = urlObj.searchParams.get('username');
              const uuid = urlObj.searchParams.get('uuid');
              const id = parseInt(urlObj.searchParams.get('id'));
              const is_admin = parseInt(urlObj.searchParams.get('is_admin'));
              const badge = urlObj.searchParams.get('badge');

              const cacheData = {
                accessToken,
                clientToken,
                selectedProfile: { id: uuid, name: username },
                availableProfiles: [{ id: uuid, name: username }],
                webToken: token
              };

              fs.writeFileSync(getCustomCacheFile(), JSON.stringify(cacheData));
              logger.log("Auth credentials written to cache file successfully via Google Auth.");
              
              resolve({
                success: true,
                id,
                name: username,
                uuid,
                accessToken,
                webToken: token,
                is_admin,
                badge
              });
            } else {
              resolve({ success: true, action: 'link', email });
            }

            res.end(`
              <html>
                <head>
                  <title>DivLauncher Authorization</title>
                  <style>
                    body {
                      background: #09090e;
                      color: #fff;
                      font-family: 'Montserrat', sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      margin: 0;
                    }
                    .card {
                      background: rgba(10, 10, 16, 0.6);
                      backdrop-filter: blur(20px);
                      border: 1px solid rgba(167, 139, 250, 0.2);
                      border-radius: 20px;
                      padding: 40px;
                      text-align: center;
                      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                      max-width: 400px;
                    }
                    h1 { color: #10b981; margin-top: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                    p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>DivLauncher</h1>
                    <p>Авторизация успешно пройдена! Вы можете закрыть эту вкладку и вернуться в лаунчер.</p>
                  </div>
                </body>
              </html>
            `);
          } else {
            resolve({ success: false, error: errorMsg || 'Неизвестная ошибка Google авторизации.' });
            res.end(`
              <html>
                <head>
                  <title>DivLauncher Authorization Error</title>
                  <style>
                    body {
                      background: #09090e;
                      color: #fff;
                      font-family: 'Montserrat', sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      margin: 0;
                    }
                    .card {
                      background: rgba(10, 10, 16, 0.6);
                      backdrop-filter: blur(20px);
                      border: 1px solid rgba(239, 68, 68, 0.2);
                      border-radius: 20px;
                      padding: 40px;
                      text-align: center;
                      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                      max-width: 400px;
                    }
                    h1 { color: #ef4444; margin-top: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                    p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>Ошибка авторизации</h1>
                    <p>${errorMsg || 'Что-то пошло не так при авторизации через Google.'}</p>
                  </div>
                </body>
              </html>
            `);
          }
          
          clearTimeout(timeout);
          closeServer();
        }
      });

      server.listen(0, 'localhost', () => {
        const port = server.address().port;
        logger.log(`Local OAuth loopback server listening on port ${port}`);
        
        let url = `${AUTH_SERVER}/api/auth/google?port=${port}&action=${action}`;
        if (action === 'link') {
          try {
            const cacheFile = getCustomCacheFile();
            if (fs.existsSync(cacheFile)) {
              const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
              if (cached.webToken) {
                url += `&token=${cached.webToken}`;
              }
            }
          } catch (e) {
            logger.log("Error reading token for link action:", e.message);
          }
        }
        
        logger.log(`Opening browser to URL: ${url}`);
        shell.openExternal(url).catch(e => {
          logger.log("Failed to open external browser:", e.message);
          clearTimeout(timeout);
          closeServer();
          resolve({ success: false, error: 'Не удалось открыть веб-браузер: ' + e.message });
        });
      });
    });
  });

  ipcMain.handle('update-profile-customization', async (event, updates) => {
    const logger = createLogger();
    logger.log("=== [update-profile-customization] START ===");
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

      logger.log(`Updating profile customization via Web API: ${AUTH_SERVER}/api/profile/customize`);
      const response = await axios.post(`${AUTH_SERVER}/api/profile/customize`, updates, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, user: response.data.user };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("update-profile-customization failed:", errMsg);
      return { success: false, error: errMsg };
    }
  });

  ipcMain.handle('upload-background', async (event) => {
    const logger = createLogger();
    logger.log("=== [upload-background] START ===");
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

      logger.log("Opening background selection dialog...");
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите изображение фона профиля (PNG/JPG/GIF)',
        filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        logger.log("Background selection canceled by user.");
        return { success: false, error: 'Выбор отменен', logs: logger.getLogs() };
      }

      const filePath = filePaths[0];
      const fileBuffer = fs.readFileSync(filePath);

      const boundary = `----ElectronBoundary${Math.random().toString(36).substring(2)}`;
      const mime = filePath.toLowerCase().endsWith('.gif') ? 'image/gif' : (filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      const filename = filePath.toLowerCase().endsWith('.gif') ? 'bg.gif' : (filePath.toLowerCase().endsWith('.png') ? 'bg.png' : 'bg.jpg');
      
      const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="background"; filename="${filename}"\r\n` +
        `Content-Type: ${mime}\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const payload = Buffer.concat([header, fileBuffer, footer]);

      logger.log(`Uploading background image to: ${AUTH_SERVER}/api/profile/background`);
      const responseData = await uploadFileNative(`${AUTH_SERVER}/api/profile/background`, webToken, boundary, payload);
      return { success: true, profile_bg_value: responseData.profile_bg_value, logs: logger.getLogs() };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("upload-background failed:", errMsg);
      return { success: false, error: errMsg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('upload-avatar', async (event) => {
    const logger = createLogger();
    logger.log("=== [upload-avatar] START ===");
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

      logger.log("Opening avatar selection dialog...");
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите изображение аватара (PNG/JPG/GIF)',
        filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        logger.log("Avatar selection canceled by user.");
        return { success: false, error: 'Выбор отменен', logs: logger.getLogs() };
      }

      const filePath = filePaths[0];
      const fileBuffer = fs.readFileSync(filePath);

      const boundary = `----ElectronBoundary${Math.random().toString(36).substring(2)}`;
      const mime = filePath.toLowerCase().endsWith('.gif') ? 'image/gif' : (filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      const filename = filePath.toLowerCase().endsWith('.gif') ? 'avatar.gif' : (filePath.toLowerCase().endsWith('.png') ? 'avatar.png' : 'avatar.jpg');
      
      const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="avatar"; filename="${filename}"\r\n` +
        `Content-Type: ${mime}\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const payload = Buffer.concat([header, fileBuffer, footer]);

      logger.log(`Uploading avatar image to: ${AUTH_SERVER}/api/profile/avatar`);
      const responseData = await uploadFileNative(`${AUTH_SERVER}/api/profile/avatar`, webToken, boundary, payload);
      return { success: true, avatar_url: responseData.avatar_url, logs: logger.getLogs() };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("upload-avatar failed:", errMsg);
      return { success: false, error: errMsg, logs: logger.getLogs() };
    }
  });

  ipcMain.handle('unlink-google', async () => {
    const logger = createLogger();
    logger.log("=== [unlink-google] START ===");
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

      logger.log(`Unlinking Google via Web API: ${AUTH_SERVER}/api/profile/google/unlink`);
      const response = await axios.post(`${AUTH_SERVER}/api/profile/google/unlink`, {}, {
        headers: { 'Authorization': `Bearer ${webToken}` }
      });

      return { success: true, message: response.data.message };
    } catch (err) {
      let errMsg = err.message;
      if (err.response && err.response.data) {
        const resData = err.response.data;
        errMsg = resData.errorMessage || resData.error || errMsg;
      }
      logger.log("unlink-google failed:", errMsg);
      return { success: false, error: errMsg };
    }
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
        if (pack[urlProp] && pack[urlProp].startsWith('local-file://')) {
          let sourcePath = decodeURI(pack[urlProp].replace('local-file://', ''));
          if (sourcePath.startsWith('/') && sourcePath.includes(':')) {
            sourcePath = sourcePath.substring(1);
          }
          if (fs.existsSync(sourcePath)) {
            const fileName = path.basename(sourcePath);
            const destPath = path.join(assetsPath, fileName);
            if (sourcePath !== destPath) {
              fs.copyFileSync(sourcePath, destPath);
            }
            pack[urlProp] = `local-file://${destPath.replace(/\\/g, '/')}`;
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
          if (packData[urlProp] && packData[urlProp].startsWith('local-file://')) {
            const fileName = path.basename(packData[urlProp]);
            const newPath = path.join(targetClientDir, 'assets', fileName);
            if (fs.existsSync(newPath)) {
              packData[urlProp] = `local-file://${newPath.replace(/\\/g, '/')}`;
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

      return new Promise((resolve) => {
        const workerPath = path.join(__dirname, 'export-worker.js');
        sysLog(`[IPC export-custom-pack] spawning worker thread for zipping. workerPath: ${workerPath}`);
        
        const worker = new Worker(workerPath, {
          workerData: { clientPath, filePath }
        });

        worker.on('message', (msg) => {
          sysLog(`[IPC export-custom-pack] worker message: ${JSON.stringify(msg)}`);
          if (msg.success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: msg.error || 'Ошибка при архивации сборки' });
          }
        });

        worker.on('error', (err) => {
          sysLog(`[IPC export-custom-pack] worker error: ${err.message}`);
          resolve({ success: false, error: err.message });
        });

        worker.on('exit', (code) => {
          sysLog(`[IPC export-custom-pack] worker exited with code ${code}`);
          // Resolve if message handler hasn't already resolved it (e.g. crash/forced exit)
          resolve({ success: false, error: `Воркер завершился с ошибкой (код: ${code})` });
        });
      });
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

  // --- CURSEFORGE INTEGRATION ---
  ipcMain.handle('get-installed-mods', async (event, clientDir, projectType = 'mod') => {
    if (!clientDir) return { success: false, error: "No clientDir provided" };
    try {
      let subFolder = 'mods';
      let extensionFilter = '.jar';
      if (projectType === 'resourcepack') {
        subFolder = 'resourcepacks';
        extensionFilter = '.zip';
      } else if (projectType === 'shader') {
        subFolder = 'shaderpacks';
        extensionFilter = '.zip';
      }

      const folderPath = path.resolve(app.getPath('userData'), clientDir, subFolder);
      if (!fs.existsSync(folderPath)) return { success: true, mods: [] };
      
      const files = fs.readdirSync(folderPath).filter(f => {
        const lower = f.toLowerCase();
        if (projectType === 'resourcepack') {
          // Resourcepacks can be zip files or folders
          return lower.endsWith('.zip') || fs.statSync(path.join(folderPath, f)).isDirectory();
        }
        return lower.endsWith(extensionFilter);
      });
      return { success: true, mods: files };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('download-mod', async (event, url, clientDir, fileName, projectType = 'mod') => {
    if (!url || !clientDir || !fileName) return { success: false, error: "Invalid args" };
    try {
      let subFolder = 'mods';
      if (projectType === 'resourcepack') subFolder = 'resourcepacks';
      else if (projectType === 'shader') subFolder = 'shaderpacks';

      const folderPath = path.resolve(app.getPath('userData'), clientDir, subFolder);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
      const dest = path.join(folderPath, fileName);
      await downloadFile(url, dest);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-mod', async (event, clientDir, fileName, projectType = 'mod') => {
    if (!clientDir || !fileName) return { success: false, error: "Invalid args" };
    try {
      let subFolder = 'mods';
      if (projectType === 'resourcepack') subFolder = 'resourcepacks';
      else if (projectType === 'shader') subFolder = 'shaderpacks';

      const dest = path.resolve(app.getPath('userData'), clientDir, subFolder, fileName);
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  const getCurseBaseUrl = () => {
    if (process.env.CURSEFORGE_API_KEY) {
      return 'https://api.curseforge.com/v1';
    }
    return 'https://api.curse.tools/v1/cf';
  };

  const getCurseHeaders = () => {
    const headers = {
      'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)'
    };
    if (process.env.CURSEFORGE_API_KEY) {
      headers['x-api-key'] = process.env.CURSEFORGE_API_KEY;
    }
    return headers;
  };

  const getCurseLoaderId = (loader) => {
    if (!loader) return null;
    const l = loader.toLowerCase();
    if (l === 'forge') return 1;
    if (l === 'fabric') return 4;
    if (l === 'quilt') return 5;
    if (l === 'neoforge') return 6;
    return null;
  };

  const getCurseCategoryId = (categorySlug) => {
    if (!categorySlug) return undefined;
    const mapping = {
      'magic': 407,
      'technology': 406,
      'adventure': 408,
      'decoration': 409,
      'library': 421,
      'worldgen': 412,
      'optimization': 4843
    };
    return mapping[categorySlug.toLowerCase()] || undefined;
  };

  ipcMain.handle('search-curse', async (event, query, options) => {
    const { mcVersion, loader, category, limit, offset, sortField, sortOrder } = options || {};
    sysLog(`[IPC search-curse] query: "${query}", options: ${JSON.stringify(options)}`);
    try {
      const loaderId = getCurseLoaderId(loader);
      const categoryId = getCurseCategoryId(category);
      
      const params = {
        gameId: 432,
        classId: 6,
        index: offset || 0,
        pageSize: limit || 12
      };
      
      if (query && query.trim()) params.searchFilter = query;
      if (mcVersion) params.gameVersion = mcVersion;
      if (loaderId !== null) params.modLoaderType = loaderId;
      if (categoryId !== undefined) params.categoryId = categoryId;
      if (sortField !== undefined) params.sortField = sortField;
      if (sortOrder !== undefined) params.sortOrder = sortOrder;

      const response = await axios.get(`${getCurseBaseUrl()}/mods/search`, {
        params,
        headers: getCurseHeaders()
      });
      
      const data = response.data || {};
      const hits = (data.data || []).map(mod => ({
        project_id: mod.id,
        id: mod.id,
        slug: mod.slug,
        icon_url: mod.logo?.url || mod.logo?.thumbnailUrl || '',
        title: mod.name,
        name: mod.name,
        author: mod.authors?.[0]?.name || 'Неизвестен',
        downloads: mod.downloadCount || 0,
        description: mod.summary || '',
        categories: (mod.categories || []).map(cat => cat.name)
      }));
      
      sysLog(`[IPC search-curse] success. Received ${hits.length} hits.`);
      return { success: true, data: { hits } };
    } catch (e) {
      sysLog(`[IPC search-curse] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-curse-versions', async (event, modId, loaders, gameVersions) => {
    sysLog(`[IPC get-curse-versions] modId: ${modId}, loaders: ${JSON.stringify(loaders)}, gameVersions: ${JSON.stringify(gameVersions)}`);
    try {
      const loaderName = loaders && loaders[0];
      const loaderId = getCurseLoaderId(loaderName);
      const gameVersion = gameVersions && gameVersions[0];
      
      const params = {};
      if (gameVersion) params.gameVersion = gameVersion;
      if (loaderId !== null) params.modLoaderType = loaderId;
      
      const response = await axios.get(`${getCurseBaseUrl()}/mods/${modId}/files`, {
        params,
        headers: getCurseHeaders()
      });
      
      const files = response.data?.data || [];
      const mappedVersions = files.map(file => ({
        id: file.id,
        displayName: file.displayName || file.fileName,
        fileName: file.fileName,
        fileDate: file.fileDate,
        releaseType: file.releaseType, // 1 = Release, 2 = Beta, 3 = Alpha
        downloadUrl: file.downloadUrl,
        gameVersions: file.gameVersions,
        files: [
          {
            url: file.downloadUrl,
            filename: file.fileName,
            primary: true
          }
        ]
      }));
      
      sysLog(`[IPC get-curse-versions] success. Received ${mappedVersions.length} versions.`);
      return { success: true, data: mappedVersions };
    } catch (e) {
      sysLog(`[IPC get-curse-versions] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-curse-project', async (event, modId) => {
    sysLog(`[IPC get-curse-project] modId: ${modId}`);
    try {
      const [modRes, descRes] = await Promise.all([
        axios.get(`${getCurseBaseUrl()}/mods/${modId}`, { headers: getCurseHeaders() }),
        axios.get(`${getCurseBaseUrl()}/mods/${modId}/description`, { headers: getCurseHeaders() })
      ]);
      
      const mod = modRes.data?.data || {};
      const description = descRes.data?.data || '';
      
      // Resolve dependencies asynchronously
      const dependencies = mod.dependencies || [];
      const relevantDeps = dependencies.filter(dep => dep.relationType === 3 || dep.relationType === 2).slice(0, 5);
      
      const resolvedDeps = await Promise.all(
        relevantDeps.map(async (dep) => {
          try {
            const depRes = await axios.get(`${getCurseBaseUrl()}/mods/${dep.modId}`, { headers: getCurseHeaders(), timeout: 5000 });
            const d = depRes.data?.data;
            if (d) {
              return {
                id: d.id,
                name: d.name,
                slug: d.slug,
                icon_url: d.logo?.url || d.logo?.thumbnailUrl || '',
                relationType: dep.relationType
              };
            }
          } catch (err) {
            sysLog(`[IPC get-curse-project] failed to resolve dependency ${dep.modId}: ${err.message}`);
          }
          return { id: dep.modId, name: `ID: ${dep.modId}`, relationType: dep.relationType };
        })
      );
      
      const mapped = {
        id: mod.id,
        slug: mod.slug,
        title: mod.name,
        name: mod.name,
        icon_url: mod.logo?.url || mod.logo?.thumbnailUrl || '',
        downloads: mod.downloadCount || 0,
        body: description,
        gallery: (mod.screenshots || []).map(scr => ({ url: scr.url || scr.thumbnailUrl })),
        client_side: 'optional',
        server_side: 'optional',
        license: { name: 'См. на CurseForge' },
        dependencies: resolvedDeps
      };
      
      sysLog(`[IPC get-curse-project] success. Resolved ${resolvedDeps.length} dependencies.`);
      return { success: true, data: mapped };
    } catch (e) {
      sysLog(`[IPC get-curse-project] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('search-modrinth', async (event, query, options) => {
    const { mcVersion, loader, category, limit, offset, sortField, sortOrder, projectType = 'mod' } = options || {};
    sysLog(`[IPC search-modrinth] query: "${query}", options: ${JSON.stringify(options)}`);
    try {
      const facets = [];
      
      // Project type filter
      facets.push([`project_type:${projectType}`]);
      
      // Game version filter
      if (mcVersion) {
        facets.push([`versions:${mcVersion}`]);
      }
      
      // Mod loader filter
      if (loader && projectType === 'mod') {
        facets.push([`categories:${loader.toLowerCase()}`]);
      }
      
      // Category filter
      if (category) {
        let cat = category.toLowerCase();
        if (cat === 'technology') cat = 'tech';
        else if (cat === 'library') cat = 'utility';
        facets.push([`categories:${cat}`]);
      }

      // Sorting
      let index = 'relevance';
      if (sortField === 'downloads') index = 'downloads';
      else if (sortField === 'updated') index = 'updated';
      else if (sortField === 'newest') index = 'newest';

      const params = {
        query: query || '',
        index: index,
        offset: offset || 0,
        limit: limit || 12
      };

      if (facets.length > 0) {
        params.facets = JSON.stringify(facets);
      }

      const response = await axios.get('https://api.modrinth.com/v2/search', {
        params,
        headers: { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' }
      });

      const data = response.data || {};
      const hits = (data.hits || []).map(hit => ({
        id: hit.project_id,
        project_id: hit.project_id,
        slug: hit.slug,
        icon_url: hit.icon_url || '',
        title: hit.title,
        name: hit.title,
        author: hit.author || 'Неизвестен',
        downloads: hit.downloads || 0,
        description: hit.description || '',
        categories: hit.categories || [],
        project_type: hit.project_type
      }));

      sysLog(`[IPC search-modrinth] success. Received ${hits.length} hits.`);
      return { success: true, data: { hits } };
    } catch (e) {
      sysLog(`[IPC search-modrinth] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-modrinth-versions', async (event, modId, loaders, gameVersions) => {
    sysLog(`[IPC get-modrinth-versions] modId: ${modId}, loaders: ${JSON.stringify(loaders)}, gameVersions: ${JSON.stringify(gameVersions)}`);
    try {
      const params = {};
      if (loaders && loaders.length > 0) {
        params.loaders = JSON.stringify(loaders.map(l => l.toLowerCase()));
      }
      if (gameVersions && gameVersions.length > 0) {
        params.game_versions = JSON.stringify(gameVersions);
      }

      const response = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`, {
        params,
        headers: { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' }
      });

      const versions = response.data || [];
      const mappedVersions = versions.map(v => {
        const primaryFile = v.files.find(f => f.primary) || v.files[0];
        return {
          id: v.id,
          displayName: v.name,
          fileName: primaryFile?.filename || 'unknown.jar',
          fileDate: v.date_published,
          releaseType: v.version_type === 'release' ? 1 : v.version_type === 'beta' ? 2 : 3,
          downloadUrl: primaryFile?.url || '',
          gameVersions: v.game_versions,
          files: v.files.map(f => ({
            url: f.url,
            filename: f.filename,
            primary: f.primary
          }))
        };
      });

      sysLog(`[IPC get-modrinth-versions] success. Received ${mappedVersions.length} versions.`);
      return { success: true, data: mappedVersions };
    } catch (e) {
      sysLog(`[IPC get-modrinth-versions] error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-modrinth-project', async (event, modId) => {
    sysLog(`[IPC get-modrinth-project] modId: ${modId}`);
    try {
      const response = await axios.get(`https://api.modrinth.com/v2/project/${modId}`, {
        headers: { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' }
      });

      const project = response.data || {};
      
      let resolvedDeps = [];
      try {
        const versionsResponse = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`, {
          headers: { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' }
        });
        const latestVersion = versionsResponse.data?.[0];
        if (latestVersion && latestVersion.dependencies) {
          const deps = latestVersion.dependencies.filter(d => d.dependency_type === 'required').slice(0, 5);
          resolvedDeps = await Promise.all(
            deps.map(async (dep) => {
              if (dep.project_id) {
                try {
                  const depProjectResponse = await axios.get(`https://api.modrinth.com/v2/project/${dep.project_id}`, {
                    headers: { 'User-Agent': 'D1verlin/DivLauncher/1.0.0 (contact@diverlin.ru)' },
                    timeout: 5000
                  });
                  const d = depProjectResponse.data;
                  return {
                    id: d.id,
                    name: d.title,
                    slug: d.slug,
                    icon_url: d.icon_url || '',
                    relationType: 3
                  };
                } catch (e) {
                  return { id: dep.project_id, name: `ID: ${dep.project_id}`, relationType: 3 };
                }
              }
              return { id: dep.version_id, name: `Version ID: ${dep.version_id}`, relationType: 3 };
            })
          );
        }
      } catch (depErr) {
        sysLog(`[IPC get-modrinth-project] dependency check warning: ${depErr.message}`);
      }

      const mapped = {
        id: project.id,
        slug: project.slug,
        title: project.title,
        name: project.title,
        icon_url: project.icon_url || '',
        downloads: project.downloads || 0,
        body: project.body || '',
        gallery: (project.gallery || []).map(g => ({ url: g.url })),
        client_side: project.client_side || 'optional',
        server_side: project.server_side || 'optional',
        license: { name: project.license?.name || 'Open Source' },
        dependencies: resolvedDeps
      };

      sysLog(`[IPC get-modrinth-project] success.`);
      return { success: true, data: mapped };
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

  // --- R2 ADMIN FILE MANAGER ---

  function getWebToken() {
    const cacheFile = getCustomCacheFile();
    if (!fs.existsSync(cacheFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8')).webToken || null;
    } catch { return null; }
  }

  // List files/folders in R2 prefix
  ipcMain.handle('r2-list-files', async (event, prefix) => {
    const token = getWebToken();
    if (!token) return { success: false, error: 'Не авторизован' };
    try {
      const resp = await axios.get(`${AUTH_SERVER}/api/admin/r2/list`, {
        params: { prefix },
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, ...resp.data };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      return { success: false, error: msg };
    }
  });

  // Upload file to R2 — opens dialog if filePath not provided
  ipcMain.handle('r2-upload-file', async (event, key, filePath) => {
    const token = getWebToken();
    if (!token) return { success: false, error: 'Не авторизован' };

    let targetPath = filePath;
    let fileName = filePath ? path.basename(filePath) : null;

    // If no path provided, open file dialog
    if (!targetPath) {
      const { BrowserWindow } = require('electron');
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(focusedWindow, {
        title: 'Выберите файл для загрузки',
        properties: ['openFile'],
        filters: [
          { name: 'Jar файлы', extensions: ['jar'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      });
      if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
      targetPath = result.filePaths[0];
      fileName = path.basename(targetPath);
    }

    const resolvedKey = key.endsWith('/') ? key + fileName : key;

    try {
      const fileBuffer = fs.readFileSync(targetPath);
      // Build multipart/form-data manually (no external dep needed)
      const boundary = `----FormBoundary${require('crypto').randomBytes(8).toString('hex')}`;
      const CRLF = '\r\n';
      const header = Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
        `Content-Type: application/octet-stream${CRLF}${CRLF}`
      );
      const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
      const body = Buffer.concat([header, fileBuffer, footer]);

      const resp = await axios.post(`${AUTH_SERVER}/api/admin/r2/upload`, body, {
        params: { key: resolvedKey },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            event.sender.send('r2-upload-progress', percent);
          }
        }
      });
      return { success: true, ...resp.data, fileName };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      return { success: false, error: msg };
    }
  });

  // Delete file from R2
  ipcMain.handle('r2-delete-file', async (event, key) => {
    const token = getWebToken();
    if (!token) return { success: false, error: 'Не авторизован' };
    try {
      const resp = await axios.delete(`${AUTH_SERVER}/api/admin/r2/delete`, {
        params: { key },
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, ...resp.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  });

  // Get mods.json from R2
  ipcMain.handle('r2-get-mods-json', async (event, key) => {
    const token = getWebToken();
    if (!token) return { success: false, error: 'Не авторизован' };
    try {
      const resp = await axios.get(`${AUTH_SERVER}/api/admin/r2/mods-json`, {
        params: { key },
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: resp.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  });

  // Select multiple files dialog
  ipcMain.handle('r2-select-multiple-files', async () => {
    const { BrowserWindow } = require('electron');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow, {
      title: 'Выберите файлы для загрузки',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Jar файлы', extensions: ['jar'] },
        { name: 'Все файлы', extensions: ['*'] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  // Save mods.json to R2
  ipcMain.handle('r2-save-mods-json', async (event, key, content) => {
    const token = getWebToken();
    if (!token) return { success: false, error: 'Не авторизован' };
    try {
      const resp = await axios.put(`${AUTH_SERVER}/api/admin/r2/mods-json`, content, {
        params: { key },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, ...resp.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  });
};
