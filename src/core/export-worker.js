const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

try {
  const { clientPath, filePath } = workerData;

  if (!clientPath || !filePath) {
    throw new Error('clientPath or filePath is missing in workerData');
  }

  const normalizedClientPath = clientPath.replace(/\\/g, '/');

  const zip = new AdmZip();

  // Exclude filter function
  const filter = (localFilePath) => {
    const norm = localFilePath.replace(/\\/g, '/');
    const relativePath = norm.substring(normalizedClientPath.length).replace(/^\//, '');

    if (
      relativePath.startsWith('versions') ||
      relativePath.startsWith('libraries') ||
      relativePath.startsWith('runtime') ||
      relativePath.startsWith('assets/indexes') ||
      relativePath.startsWith('assets/objects') ||
      relativePath.startsWith('assets/skins')
    ) {
      return false;
    }
    return true;
  };

  // Add client folder content recursively with filter
  zip.addLocalFolder(clientPath, '', filter);

  // Write ZIP file asynchronously (worker thread context protects main process)
  zip.writeZip(filePath);

  parentPort.postMessage({ success: true });
} catch (err) {
  parentPort.postMessage({ success: false, error: err.message });
}
