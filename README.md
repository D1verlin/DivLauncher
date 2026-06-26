<p align="center">
  <img src="icon.png" width="128" height="128" alt="DivLauncher Logo"/>
</p>

<h1 align="center">DivLauncher</h1>

<p align="center">
  <strong>Современный, производительный и безопасный кастомный лаунчер для Minecraft (Electron + React) с интегрированной панелью управления серверами и собственной системой авторизации.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-29.4.6-blue?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-8.0.0-646CFF?style=for-the-badge&logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D16.x-green?style=for-the-badge&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="License"/>
</p>

---

## 🚀 Описание проекта

**DivLauncher** — это готовый к развертыванию шаблон лаунчера Minecraft, разработанный для игровых сообществ и частных проектов. Он объединяет в себе стильный интерфейс в стиле **Glassmorphism**, продвинутые возможности безопасности, гибкую систему синхронизации модов и инструменты для администрирования локальных игровых серверов.

Лаунчер интегрируется со специальным **бэкендом авторизации (Yggdrasil API)**, позволяя игрокам использовать собственные скины и плащи на серверах через `authlib-injector`, а администраторам — синхронизировать ранги с **LuckPerms** и просматривать игровую статистику пользователей.

---

## ✨ Основные возможности

### 🎮 Игровой клиент и синхронизация
* **Поддержка любых ядер и версий:** Forge, Fabric, Quilt, NeoForge и Vanilla.
* **Умный менеджер Java (JRE 8, 16, 17, 21):** Автоматически определяет версию Minecraft, скачивает и настраивает подходящую JRE (Adoptium, Azul Zulu, Amazon Corretto).
* **Чистая синхронизация модов:** Полностью очищает папки `mods` и `config` перед установкой обновлений ZIP-сборок, предотвращая конфликты старых файлов.
* **CurseForge мод-маркетплейс:** Интегрированный поиск, просмотр деталей, установка и удаление модов прямо в интерфейсе лаунчера.

### 🖥️ Панель управления сервером
* **Локальный запуск сервера:** Автоматическое скачивание ядер (Paper, Spigot, Forge, Hybrid/Arclight) и запуск локального игрового сервера в один клик.
* **Встроенный бэкап-менеджер:** Вкладка резервных копий позволяет создавать архивы папки мира (`world`), удалять их и восстанавливать мир до предыдущего сохранения.
* **Цветная консоль и экспорт логов:** Удобный просмотр логов сервера и клиента с подсветкой ошибок (`[ERROR]`), предупреждений (`[WARN]`) и кнопкой сохранения логов в файл.
* **Синхронизация модов с сервером:** Кнопка «Подтянуть моды» для копирования файлов из папки клиента в папку сервера.

### 🔐 Безопасность и администрирование
* **Защита IPC в Preload:** Системные события Electron ограничены строгим белым списком разрешенных каналов.
* **Валидация скинов и плащей:** Бэкенд валидирует PNG-структуру изображений по хедерам IHDR, запрещая загрузку вредоносных файлов, картинок с неверным разрешением или соотношением сторон (Minecraft HD-скины кратны 64 с пропорциями 1:1 или 2:1).
* **LuckPerms интеграция:** Автоматическая синхронизация статусов и значков (ADMIN, DEV, VIP, SPONSOR, HELPER) между лаунчером и LuckPerms MySQL базой данных.
* **Интегрированная админка:** Управление игровыми сборками и списком пользователей (бан, выдача привилегий/значков) прямо из лаунчера.

---

## 🛠️ Требования к окружению

* **Node.js** (версия 18.x или выше)
* **npm** или **yarn**
* **Cloudflare R2** (или любое S3-совместимое хранилище) для хранения модов, сборок и обновлений.
* **MySQL/MariaDB** (опционально, для интеграции с LuckPerms).

---

## 📂 Архитектура проекта

Проект разделен на две основные части:
1. **Клиент (Electron + React):** Корневой каталог. Отвечает за интерфейс, скачивание файлов, выбор Java и запуск игры/сервера.
2. **Бэкап-сервер (`/backend`):** Node.js Express веб-сервер. Обеспечивает Yggdrasil API авторизацию, хранит пользователей в SQLite, управляет загрузкой скинов/плащей и синхронизирует группы с базой данных LuckPerms.

---

## ⚙️ Инструкция по установке и настройке

### Часть 1: Настройка удаленного хранилища (Cloudflare R2)

1. **Создание бакета:** В панели Cloudflare перейдите в **R2 Object Storage** -> **Create bucket** (например, `div-launcher-data`).
2. **Публичный доступ:** Привяжите свой поддомен в настройках бакета (**Public Access** -> **Connect Domain**, например, `mc.yourdomain.com`).
3. **CORS правила:** Во вкладке **Settings** добавьте CORS policy в формате JSON (обязательно для отображения прогресс-бара скачивания):
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **Рекомендуемая структура файлов:**
   ```text
   /
   ├── updates/                         # Обновления самого лаунчера (.exe и latest.yml)
   └── launcher-data/                   # Игровые сборки
       ├── modpacks.json                # Список доступных сборок
       └── stalker/
           ├── assets/                  # Фоны, логотипы, иконки
           └── mods.json                # Список отдельных модов (если не используется ZIP)
   ```

---

### Часть 2: Настройка и запуск бэкенда авторизации

1. Перейдите в папку бэкенда:
   ```bash
   cd backend
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Создайте файл `.env` на основе примера `.env.example` и настройте параметры:
   * Настройки Cloudflare R2 (Access Key, Secret Key, Public URL) для загрузки скинов/плащей.
   * Реквизиты подключения MySQL для LuckPerms.
   * `JWT_SECRET` — секретный ключ для генерации токенов сессий.
4. Запустите сервер:
   ```bash
   npm start
   ```
   *По умолчанию сервер запустится на порту `3000` (`http://localhost:3000`).*

---

### Часть 3: Настройка и сборка лаунчера (Клиента)

1. Вернитесь в корень проекта, установите зависимости:
   ```bash
   cd ..
   npm install
   ```
2. Откройте `package.json` и настройте блок `build` -> `publish`, указав адрес вашей папки `updates` в R2:
   ```json
   "publish": [
     {
       "provider": "generic",
       "url": "https://mc.yourdomain.com/updates"
     }
   ]
   ```
3. Откройте `src/ui/App.jsx` и укажите URL к вашему списку сборок `modpacks.json`:
   ```javascript
   const MODPACKS_URL = "https://mc.yourdomain.com/launcher-data/modpacks.json";
   ```
4. Откройте `.env` лаунчера и укажите URL бэкенда авторизации:
   ```env
   AUTH_SERVER=https://mcauth.yourdomain.com
   ```
5. **Запуск в режиме разработки:**
   ```bash
   npm start
   ```
6. **Сборка готового дистрибутива (.exe):**
   ```bash
   npm run dist
   ```
   *Готовые инсталляторы будут сохранены в папке `/release`.*

---

## 📝 Структура файла `modpacks.json`

Файл определяет список сборок, отображаемый на главном экране лаунчера:

```json
[
  {
    "id": "statech",
    "name": "StaTech Industry",
    "bgImage": "https://mc.yourdomain.com/stalker/assets/bg.jpg",
    "bgVideo": "https://mc.yourdomain.com/stalker/assets/bg_video.webm",
    "logo": "https://mc.yourdomain.com/stalker/assets/logo.png",
    "icon": "https://mc.yourdomain.com/stalker/assets/icon.png",
    "mcVersion": "1.19.2",
    "loaderType": "fabric",
    "loaderVersion": "0.16.10",
    "packVersion": "1.0.0",
    "packZipUrl": "https://mc.yourdomain.com/stalker/stalker_v100.zip",
    "modsJsonUrl": "",
    "useZip": true,
    "clientDir": ".statech-client",
    "serverDir": ".statech-server"
  }
]
```
* **useZip / packZipUrl:** Если установлено `true`, лаунчер скачает и установит сборку одним архивом.
* **modsJsonUrl:** (Опционально) URL к JSON-списку файлов модов для пофайловой синхронизации.
* **clientDir / serverDir:** Имена папок в AppData, куда будут установлены файлы игры и локального сервера соответственно.

---

## 🛡️ Лицензия

Проект распространяется под индивидуальным лицензионным соглашением (Custom EULA), которое строго запрещает коммерческое использование без явного письменного разрешения автора (Diverlin). Подробности в файле [LICENSE](LICENSE).