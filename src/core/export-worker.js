const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

try {
  const { clientPath, filePath, isOfficial } = workerData;

  if (!clientPath || !filePath) {
    throw new Error('clientPath or filePath is missing in workerData');
  }

  const normalizedClientPath = clientPath.replace(/\\/g, '/');

  const zip = new AdmZip();

  // Exclude filter function (adm-zip passes path relative to localPath)
  const filter = (relativePath) => {
    const norm = relativePath.replace(/\\/g, '/');
    if (isOfficial) {
      // Exclude mods, config, and pack_version.txt for official packs since they are downloaded from the server
      if (
        norm.startsWith('mods/') ||
        norm.startsWith('config/') ||
        norm === 'pack_version.txt'
      ) {
        return false;
      }
    }
    return !(
      norm.startsWith('versions/') ||
      norm.startsWith('libraries/') ||
      norm.startsWith('runtime/') ||
      norm.startsWith('assets/indexes/') ||
      norm.startsWith('assets/objects/') ||
      norm.startsWith('assets/skins/')
    );
  };

  // Add client folder content recursively with filter
  zip.addLocalFolder(clientPath, '', filter);

  // Write ZIP file asynchronously (worker thread context protects main process)
  zip.writeZip(filePath);

  parentPort.postMessage({ success: true });
} catch (err) {
  parentPort.postMessage({ success: false, error: err.message });
}
