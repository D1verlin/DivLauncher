const DiscordRPC = require('discord-rpc');

// ВСТАВЬ СЮДА СВОЙ CLIENT ID
const clientId = '1485290282139254794'; 

DiscordRPC.register(clientId);

let rpc;
let startTimestamp = new Date();

async function initDiscord() {
  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    console.log('Discord RPC успешно подключен!');
    setIdleStatus(); // Сразу ставим статус "В лаунчере"
  });

  try {
    await rpc.login({ clientId });
  } catch (error) {
    console.log('Не удалось подключиться к Discord (возможно, он не запущен).');
  }
}

// Статус: Игрок просто сидит в лаунчере
function setIdleStatus() {
  if (!rpc || !rpc.transport || !rpc.transport.socket) return;
  try {
    rpc.setActivity({
      details: 'Выбирает сборку',
      state: 'В главном меню',
      startTimestamp,
      largeImageKey: 'launcher_logo', // Имя картинки из Art Assets (если загрузил)
      largeImageText: 'DivLauncher',
      instance: false,
    }).catch(err => console.error("Discord RPC setActivity error (async):", err.message));
  } catch (err) {
    console.error("Discord RPC setActivity error (sync):", err.message);
  }
}

// Статус: Игрок запустил Minecraft
function setPlayingStatus(packName) {
  if (!rpc || !rpc.transport || !rpc.transport.socket) return;
  try {
    rpc.setActivity({
      details: `Играет в ${packName}`,
      state: '',
      startTimestamp: new Date(), // Сбрасываем таймер для новой игровой сессии
      largeImageKey: 'launcher_logo',
      largeImageText: packName,
      instance: false,
    }).catch(err => console.error("Discord RPC setActivity error (async):", err.message));
  } catch (err) {
    console.error("Discord RPC setActivity error (sync):", err.message);
  }
}

module.exports = { initDiscord, setIdleStatus, setPlayingStatus };