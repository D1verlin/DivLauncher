# План изменений DivLauncher

В данном документе описан подробный технический план реализации запрошенных функций в лаунчере DivLauncher:
1. Выбор пути установки сборок (при первом старте Onboarding и в Настройках).
2. Выбор и скачивание конкретной версии ядра модов (Forge, Fabric, Quilt, NeoForge, Vanilla).
3. Перевод кастомных сборок в статус официальных (для администраторов) с выгрузкой на хостинг + гибкая настройка пути, названия и стиля при импорте сторонних сборок.
4. Снятие ограничения в 2 ГБ при экспорте сборок (переход на стриминговый `archiver` с поддержкой Zip64).

Вся реализация выполняется в соответствии с существующей дизайн-системой DivLauncher (`DIVLAUNCHER_DESIGN_SYSTEM.md`: Montserrat, Glassmorphism `backdrop-filter`, акцентные цвета, анимации `framer-motion`, иконки FontAwesome 6).

---

## 1. Выбор пути установки сборок по умолчанию (Onboarding + Настройки)

### Описание
Сейчас лаунчер устанавливает клиенты и серверы сборок по стандартным путям (в `userData` или папку исполняемого файла). Пользователь должен иметь возможность:
- Выбрать директорию для сборок перед началом использования программы (Onboarding).
- Изменить директорию в любой момент в настройках программы.

### Реализация
1. **Первичная настройка (Onboarding Modal)**:
   - При первом запуске (или при отсутствии сохранённого параметра `launcher_builds_dir`), поверх интерфейса отображается стиль модальное окно с выбором пути установки.
   - Пользователю предлагается стандартный путь (например, `%AppData%\DivLauncher\packs` / `userData/packs`) с кнопкой «Изменить...» для вызова диалога выбора папки `select-folder`.
   - Кнопка «Продолжить» сохраняет выбор в `localStorage` (`launcher_builds_dir`) и передает его в IPC.
2. **Раздел в Настройках (`SettingsPage.jsx`)**:
   - В вкладку «Игра» (или специальный блок «Папки и сборки») добавляется поле просмотра текущего пути установки сборок с кнопкой «Обзор...» (`fa-folder-open`) и кнопкой «Сбросить на стандартный».
3. **Бэкенд лаунчера (`client.js`, `server.js`)**:
   - Обновить функции `resolveClientPath` и `resolveServerPath`, чтобы при относительном пути или указании по умолчанию использовать сохранённый `launcher_builds_dir`.

---

## 2. Выбор и скачивание версий ядра для модов

### Описание
Предоставление пользователю списка всех доступных версий ядер (Forge, Fabric, Quilt, NeoForge) для выбранной версии Minecraft с возможностью скачивания и смены ядра у создаваемых/существующих сборок.

### Реализация
1. **Интеграция API загрузчиков**:
   - **Fabric**: `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`
   - **Quilt**: `https://meta.quiltmc.org/v3/versions/loader/${mcVersion}`
   - **Forge**: `https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json` + `https://maven.minecraftforge.net/...`
   - **NeoForge**: `https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge`
2. **Компонент выбора версии ядра**:
   - Добавить выпадение списка (Dropdown) конкретных сборщиков/билдов для выбранного загрузчика в `CreatePackPage.jsx` и в карточке настроек сборки (`ModsPage.jsx`).
   - Показывать метки `Latest` и `Recommended` возле соответствующий версий.
3. **Скачивание и замена ядра**:
   - При сохранении изменений обновлять параметры `loaderType` и `loaderVersion` в `divpack.json`.
   - В `client.js` и `server.js` при подготовке к запуску использовать выкачку выбранной версии installer/loader JAR файла.

---

## 3. Перевод кастомных сборок в официальные (для Админа) и Настройка импорта

### Описание
1. Администраторы могут переводить локальные кастомные сборки в разряд официальных, автоматически упаковывая и загружая их на хостинг (Cloudflare R2 / S3) и обновляя `modpacks.json`.
2. При импорте сборок не из DivLauncher (CurseForge, Modrinth, Prism, MultiMC, ZIP) перед стартом распаковки показывать модальное окно преднастройки.

### Реализация
1. **Перенос сборки на хостинг (Promote to Official)**:
   - В карточке кастомной сборки (или в `AdminModpacksSection.jsx`) при условии `profile.is_admin === 1` добавляется кнопка «Опубликовать как официальную» (`fa-cloud-arrow-up`).
   - Диалоговое окно подтверждения показывает статус выгрузки:
     - Архивация файлов клиента/сервера.
     - Загрузка архива и обложек на хостинг через AWS S3 SDK.
     - Добавление записи в `modpacks.json` на сервере.
2. **Окно настройки перед импортом (`ImportExportPage.jsx`)**:
   - При выборе файла импорта (стороннего формата) открыть модальный мастер «Настройка импортируемой сборки».
   - Настраиваемые параметры:
     - **Название сборки** (Title)
     - **Путь установки** (Destination folder)
     - **Оформление** (Выбор иконки, фонового изображения/видео, акцентного цвета)
     - **Описание и теги**
   - После клика «Импортировать» запускается фоновый процесс `importPackExtended` с переданными кастомными метаданными.

---

## 4. Расширение лимита экспорта сборок > 2 ГБ

### Описание
Библиотека `adm-zip` генерирует в памяти единый V8 `Buffer`. В Node.js макс. размер `Buffer` составляет 2 ГБ, что приводило к ошибке при экспорте сборок с тяжёлыми ресурспаками и модами.

### Реализация
1. **Установка и замена на `archiver`**:
   - Установить модуль `archiver` с поддержкой потоковой записи (Stream) и включенным Zip64 (`forceZip64: true`).
2. **Обновление `export-worker.js`**:
   - Переписать `export-worker.js` на создание файлового потока записи `fs.createWriteStream(filePath)`.
   - Использовать `archiver('zip', { zlib: { level: 9 }, forceZip64: true })`.
   - Передавать прогресс архивации в основной процесс через `parentPort.postMessage({ progress, stage })`.
3. **Индикатор прогресса экспорта в UI**:
   - Отображать реальный процент выполнения экспорта больших файлов в `ImportExportPage.jsx`.

---

## Предлагаемые изменения по файлам

### [Component: UI - Onboarding & Path Selection]
#### [MODIFY] [App.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/App.jsx)
- Добавление проверки первого запуска и показа `InitialPathModal.jsx`.

#### [NEW] [InitialPathModal.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/components/InitialPathModal.jsx)
- Красивое модальное окно выбор пути установки по умолчанию при первом запуске в стиле Glassmorphism.

#### [MODIFY] [SettingsPage.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/pages/SettingsPage.jsx)
- Добавление в раздел «Игра» настройки «Путь установки сборок» с диалогом выбора папки.

---

### [Component: Core - Modloader Engine Versions]
#### [MODIFY] [CreatePackPage.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/pages/CreatePackPage.jsx)
- Интеграция динамического выпадающего списка версий ядер для Fabric, Quilt, Forge, NeoForge.

#### [MODIFY] [ModsPage.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/pages/ModsPage.jsx)
- Возможность смены типа и версии ядра для существующей сборки.

#### [MODIFY] [client.js](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/core/client.js)
- Поддержка установки точных версий loader'ов и учет динамического пути установок сборок.

---

### [Component: Admin - Custom Pack Promotion & Pre-Import Customization]
#### [MODIFY] [AdminModpacksSection.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/pages/AdminModpacksSection.jsx)
- Добавление мастера переноса кастомной сборки в официальную с выгрузкой на R2/S3.

#### [MODIFY] [ImportExportPage.jsx](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/ui/pages/ImportExportPage.jsx)
- Модальное окно преднастройки названия, пути и оформления для сторонних сборок пред импортом.
- Отображение прогресса экспорта для больших файлов.

---

### [Component: Core - Export Streaming Engine]
#### [MODIFY] [export-worker.js](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/src/core/export-worker.js)
- Переход с `adm-zip` на `archiver` с поддержкой потоков и Zip64 (снятие лимита 2 ГБ).

#### [MODIFY] [package.json](file:///c:/Users/Lenovo/Desktop/Projects/DivLauncher/package.json)
- Добавление зависимости `archiver`.

---

## План верификации

### Автоматическая проверка / Build Check
- Запуск `npm run dev:ui` или сборки Vite для проверки отсутствия ошибок компиляции JSX и CSS.
- Проверка синтаксиса `export-worker.js` и вызовов IPC handlers в `client.js`.

### Ручная верификация
1. **Проверка выбора пути**:
   - При старте приложения проверить работу окна с выбором пути.
   - Сменить путь в Настройках и проверить, что новые сборки устанавливаются в выбранную папку.
2. **Проверка версий ядра**:
   - Открыть страницу создания/редактирования сборки. Выбрать Fabric/Forge/NeoForge, убедиться в загрузке списка доступных версий ядра.
3. **Проверка импорта и переноса в официальные**:
   - Выполнить импорт ZIP/CurseForge архива, проверить появление модального окна настройки названия, пути и стилей.
   - Под аккаунтом админа нажать «Перевести в официальную» и проверить процесс выгрузки на хостинг.
4. **Проверка экспорта > 2 ГБ**:
   - Выполнить экспорт крупной сборки (> 2 ГБ) и убедиться в успешном создании ZIP-файла без ошибок выделения памяти.
