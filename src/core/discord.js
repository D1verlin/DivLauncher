const DiscordRPC = require('discord-rpc');

const clientId = '1485290282139254794';

DiscordRPC.register(clientId);

let rpc = null;
let startTimestamp = new Date();
let retryTimer = null;
let firstConnectionFailed = false;
let isConnecting = false;
let currentStatus = null;

async function connectWithRetry() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (rpc) {
      try { rpc.destroy(); } catch (_) {}
      rpc = null;
    }

    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      console.log('Discord RPC успешно подключен!');
      isConnecting = false;
      firstConnectionFailed = false;
      if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }

      // Восстанавливаем предыдущий статус если был
      if (currentStatus) {
        if (currentStatus.type === 'playing') {
          setPlayingStatus(...currentStatus.args);
        } else {
          setIdleStatus(...currentStatus.args);
        }
      } else {
        setIdleStatus();
      }
    });

    rpc.on('disconnected', () => {
      rpc = null;
      isConnecting = false;
      scheduleRetry();
    });

    await rpc.login({ clientId });
  } catch (error) {
    if (!firstConnectionFailed) {
      console.log('Не удалось подключиться к Discord (возможно, он не запущен). Фоновые попытки продолжаются...');
      firstConnectionFailed = true;
    }
    rpc = null;
    isConnecting = false;
    scheduleRetry();
  }
}

function scheduleRetry() {
  if (retryTimer) return; // уже запланирован
  retryTimer = setInterval(() => {
    connectWithRetry();
  }, 60000);
}

function initDiscord() {
  connectWithRetry();
}

// Статус: Игрок просто сидит в лаунчере
function setIdleStatus(username, isOffline, lang) {
  currentStatus = { type: 'idle', args: [username, isOffline, lang] };
  if (!rpc || !rpc.transport || !rpc.transport.socket) return;

  const isRu = lang === 'ru';
  const detailsText = isRu ? 'Выбирает сборку' : 'Choosing a modpack';

  let stateText = isRu ? 'В главном меню' : 'In Main Menu';
  if (username) {
    stateText = isRu
      ? `${username}${isOffline ? ' (Офлайн)' : ''}`
      : `${username}${isOffline ? ' (Offline)' : ''}`;
  }

  try {
    rpc.setActivity({
      details: detailsText,
      state: stateText,
      startTimestamp,
      largeImageKey: 'launcher_logo',
      largeImageText: 'DivLauncher',
      instance: false,
    }).catch(err => console.error('Discord RPC setActivity error (async):', err.message));
  } catch (err) {
    console.error('Discord RPC setActivity error (sync):', err.message);
  }
}

// Статус: Игрок запустил Minecraft
function setPlayingStatus(packName, username, isOffline, lang) {
  currentStatus = { type: 'playing', args: [packName, username, isOffline, lang] };
  if (!rpc || !rpc.transport || !rpc.transport.socket) return;

  const isRu = lang === 'ru';
  const detailsText = isRu ? `Играет в ${packName}` : `Playing ${packName}`;

  let stateText = '';
  if (username) {
    stateText = isRu
      ? `${username}${isOffline ? ' (Офлайн)' : ''}`
      : `${username}${isOffline ? ' (Offline)' : ''}`;
  }

  try {
    rpc.setActivity({
      details: detailsText,
      state: stateText,
      startTimestamp: new Date(),
      largeImageKey: 'launcher_logo',
      largeImageText: packName,
      instance: false,
    }).catch(err => console.error('Discord RPC setActivity error (async):', err.message));
  } catch (err) {
    console.error('Discord RPC setActivity error (sync):', err.message);
  }
}

module.exports = { initDiscord, setIdleStatus, setPlayingStatus };