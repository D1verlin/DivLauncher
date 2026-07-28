const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

try {
  const { clientPath, filePath, isOfficial } = workerData;

  if (!clientPath || !filePath) {
    throw new Error('clientPath or filePath is missing in workerData');
  }

  const output = fs.createWriteStream(filePath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
    forceZip64: true
  });

  output.on('close', () => {
    parentPort.postMessage({ success: true, totalBytes: archive.pointer() });
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Archiver warning:', err);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    parentPort.postMessage({ success: false, error: err.message });
  });

  archive.on('progress', (data) => {
    const totalBytes = data.fs.totalBytes || 0;
    const processedBytes = data.fs.processedBytes || 0;
    let progress = 0;
    if (totalBytes > 0) {
      progress = Math.min(99, Math.round((processedBytes / totalBytes) * 100));
    } else if (data.entries.total > 0) {
      progress = Math.min(99, Math.round((data.entries.processed / data.entries.total) * 100));
    }
    parentPort.postMessage({
      stage: 'archiving',
      progress,
      processedBytes,
      totalBytes,
      entries: data.entries
    });
  });

  archive.pipe(output);

  // Walk directory recursively to apply exclude filter
  const addDirectoryRecursively = (dirPath, zipPrefix = '') => {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relPath = zipPrefix ? `${zipPrefix}/${item.name}` : item.name;
      const norm = relPath.replace(/\\/g, '/');

      // Exclude rules
      if (isOfficial) {
        if (
          norm.startsWith('mods/') ||
          norm.startsWith('config/') ||
          norm === 'pack_version.txt'
        ) {
          continue;
        }
      }

      if (
        norm.startsWith('versions/') ||
        norm.startsWith('libraries/') ||
        norm.startsWith('runtime/') ||
        norm.startsWith('assets/indexes/') ||
        norm.startsWith('assets/objects/') ||
        norm.startsWith('assets/skins/')
      ) {
        continue;
      }

      if (item.isDirectory()) {
        addDirectoryRecursively(fullPath, relPath);
      } else if (item.isFile()) {
        archive.file(fullPath, { name: relPath });
      }
    }
  };

  addDirectoryRecursively(clientPath);

  archive.finalize();
} catch (err) {
  parentPort.postMessage({ success: false, error: err.message });
}
