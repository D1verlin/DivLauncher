const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const getConfigPath = () => {
  return path.join(app.getPath('userData'), 'builds_config.json');
};

const getDefaultBuildsDir = () => {
  return path.join(app.getPath('userData'), 'packs');
};

const getBuildsDir = () => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.buildsDir && typeof data.buildsDir === 'string' && data.buildsDir.trim()) {
        return data.buildsDir;
      }
    }
  } catch (e) {
    console.error('Error reading builds_config.json:', e);
  }
  return getDefaultBuildsDir();
};

const setBuildsDir = (newDir) => {
  try {
    const configPath = getConfigPath();
    const targetDir = newDir && newDir.trim() ? newDir.trim() : getDefaultBuildsDir();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const config = { buildsDir: targetDir };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return targetDir;
  } catch (e) {
    console.error('Error writing builds_config.json:', e);
    return getDefaultBuildsDir();
  }
};

const resolveClientPath = (clientDir) => {
  if (!clientDir) return '';
  if (path.isAbsolute(clientDir)) return clientDir;
  const baseDir = getBuildsDir();
  return path.resolve(baseDir, clientDir);
};

const resolveServerPath = (serverDir) => {
  if (!serverDir) return '';
  if (path.isAbsolute(serverDir)) return serverDir;
  const baseDir = getBuildsDir();
  return path.resolve(baseDir, serverDir);
};

module.exports = {
  getDefaultBuildsDir,
  getBuildsDir,
  setBuildsDir,
  resolveClientPath,
  resolveServerPath
};
