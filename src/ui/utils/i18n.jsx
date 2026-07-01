import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  ru: {
    // Shared
    cancel: "Отмена",
    confirm: "Подтвердить",
    error: "Ошибка",
    warning: "Предупреждение",
    save: "Сохранить",
    delete: "Удалить",
    
    // Tabs
    tab_client: "Клиент",
    tab_server: "Сервер",
    tab_settings: "Настройки",
    tab_admin: "Админка",
    tab_users: "Пользователи",
    tab_builds: "Сборки",
    tab_create: "Создать сборку",
    tab_mods: "Каталог модов",
    tab_game: "Игра",
    tab_java: "Java",
    tab_network: "Сеть",
    tab_misc: "Прочее",
    tab_profile: "Профиль",
    
    // Settings
    settings_title: "Настройки",
    settings_ram: "Оперативная память",
    settings_ram_amount: "Объём ОЗУ",
    settings_window: "Окно Minecraft",
    settings_fullscreen: "Полноэкранный режим",
    settings_width: "Ширина (px)",
    settings_height: "Высота (px)",
    settings_quick_select: "Быстрый выбор",
    settings_java_client: "Java для клиента",
    settings_java_client_path: "Путь к Java 17 (Клиент)",
    settings_java_server: "Java для сервера",
    settings_java_server_path: "Путь к Java 17 (Сервер)",
    settings_java_placeholder: "Оставьте пустым для авто-загрузки (Рекомендуется)",
    settings_java_info: "При пустом поле Java 17 скачается автоматически при первом запуске.",
    settings_network_mode: "Режим подключения",
    settings_mode_host: "Я хост",
    settings_mode_connect: "Подключиться",
    settings_server_ip: "IP адрес сервера",
    settings_ip_placeholder: "Например: 26.15.112.5",
    settings_host_info: "Сервер запустится на вашем компьютере. Дайте друзьям свой IP-адрес для подключения.",
    settings_interface: "Интерфейс",
    settings_animated_bg: "Анимированный фон (видео)",
    settings_font: "Шрифт интерфейса",
    settings_font_desc: "Выберите шрифт для оформления лаунчера. Вы можете добавить свой файл шрифта (TTF/OTF).",
    settings_font_add: "Добавить шрифт",
    settings_font_standard: "Стандартные",
    settings_font_system: "Системные",
    settings_font_custom: "Кастомные",
    settings_interface_info: "Изменение применяется мгновенно. Отключите, если лаунчер тормозит.",
    settings_profile_config: "Профиль настроек",
    settings_export: "Экспорт",
    settings_import: "Импорт",
    settings_profile_info: "Скин и аккаунт Xbox не включаются в экспорт.",
    settings_reset: "Сброс",
    settings_reset_all: "Сбросить все настройки",
    settings_reset_confirm_title: "Сбросить настройки?",
    settings_reset_confirm_msg: "Все настройки будут удалены. Это действие нельзя отменить.",
    settings_lang: "Язык интерфейса / Language",

    // Client Page
    client_ready: "Готово к запуску",
    client_launching: "Подготовка к запуску...",
    client_playing: "Игра запущена!",
    client_closed: "Игра закрыта.",
    client_updating: "Начинаем установку...",
    client_needs_install: "Требуется установка: v",
    client_needs_update: "Доступно обновление: v",
    client_playtime: "Игровое время: ",
    client_play: "Играть",
    client_stop: "Выйти",
    client_install: "Установить",
    client_update: "Обновить",
    client_export_logs: "Экспорт логов",
    client_console_title: "Консоль клиента",
    client_playtime_minutes: " мин.",
    client_playtime_hours: " ч. ",
    client_playtime_less_minute: "Меньше минуты",
    client_username_warning: "⚠️ Авторизуйтесь в настройках!",

    // Mods Page
    mods_catalog: "Каталог модов",
    mods_search_placeholder: "Поиск модов...",
    mods_installed: "Установленные",
    mods_install_btn: "Установить",
    mods_uninstall_btn: "Удалить",
    mods_category_all: "Все",
    mods_category_opt: "Оптимизация",
    mods_category_magic: "Магия",
    mods_category_tech: "Технологии",
    mods_category_adv: "Приключения",
    mods_category_dec: "Декор",
    mods_category_lib: "Библиотеки",
    mods_category_gen: "Генерация",
    mods_sort_pop: "Популярные",
    mods_sort_dl: "Скачиваемые",
    mods_sort_upd: "Обновлённые",
    mods_sort_alpha: "А-Я",
    mods_cf_source: "CurseForge",
    mods_mr_source: "Modrinth",
    mods_type_mods: "Моды",
    mods_type_rp: "Ресурс-паки",
    mods_type_shaders: "Шейдеры",
    mods_no_versions: "Нет совместимых версий для этой версии Minecraft!",
    mods_dependencies: "Зависимости",
    mods_license: "Лицензия",
    mods_downloads: "Скачиваний",
    mods_gallery: "Галерея",
    mods_description: "Описание",
    mods_versions: "Версии",
    mods_back: "Назад",

    // Builds Page
    builds_title: "Игровые Сборки",
    builds_subtitle: "выберите или создайте клиент для игры",
    builds_search: "Поиск сборок...",
    builds_export: "Экспортировать сборку",
    builds_edit: "Редактировать оформление",
    builds_delete: "Удалить сборку",
    builds_custom: "Кастом",

    // Import/Export Page
    impexp_title: "Хаб Импорта и Экспорта",
    impexp_import_tab: "Импорт",
    impexp_export_tab: "Экспорт",
    impexp_card_title: "Импорт / Экспорт сборок",
    impexp_card_desc: "Импортируйте из CurseForge, Modrinth, Prism, MultiMC или сделайте резервную копию",
    impexp_platform_div: "DivLauncher",
    impexp_platform_div_desc: "Импортировать резервный ZIP или divpack.json",
    impexp_platform_cf: "CurseForge",
    impexp_platform_cf_desc: "Импорт из ZIP-архива CurseForge с загрузкой модов",
    impexp_platform_mr: "Modrinth",
    impexp_platform_mr_desc: "Импорт из .mrpack с загрузкой модов",
    impexp_platform_prism: "Prism Launcher",
    impexp_platform_prism_desc: "Перенос сборки Prism Launcher со всеми модами",
    impexp_platform_mmc: "MultiMC",
    impexp_platform_mmc_desc: "Перенос сборки MultiMC со всеми модами",
    impexp_drop_zone: "Перетащите файл сюда или нажмите для выбора",
    impexp_drop_zone_active: "Отпустите файл для загрузки...",
    impexp_drop_zone_file: "Выбран файл: ",
    impexp_start_import: "Начать импорт",
    impexp_progress_title: "Импорт сборки в процессе",
    impexp_export_select: "Выберите сборку для экспорта",
    impexp_export_btn: "Экспортировать сборку в ZIP",
    impexp_error_empty: "Пожалуйста, сначала выберите сборку.",
    impexp_success_export: "Сборка успешно экспортирована!",
    impexp_success_import: "Сборка успешно импортирована!",

    // Login Page
    login_title: "авторизация",
    login_btn_tab: "Вход",
    login_reg_tab: "Регистрация",
    login_username_label: "Логин",
    login_username_placeholder: "Введите никнейм",
    login_password_label: "Пароль",
    login_password_placeholder: "Введите пароль",
    login_confirm_label: "Подтвердите пароль",
    login_confirm_placeholder: "Повторите пароль",
    login_loading: "Загрузка...",
    login_submit_btn: "Войти",
    login_register_btn: "Зарегистрироваться",
    login_err_username_len: "Имя пользователя должно быть не менее 3 символов",
    login_err_password_len: "Пароль должен быть не менее 4 символов",
    login_err_password_match: "Пароли не совпадают",
    login_success_reg: "Регистрация успешна! Теперь вы можете войти.",
    login_err_reg: "Ошибка регистрации",
    login_err_login: "Неверный логин или пароль",
  },
  en: {
    // Shared
    cancel: "Cancel",
    confirm: "Confirm",
    error: "Error",
    warning: "Warning",
    save: "Save",
    delete: "Delete",
    
    // Tabs
    tab_client: "Client",
    tab_server: "Server",
    tab_settings: "Settings",
    tab_admin: "Admin",
    tab_users: "Users",
    tab_builds: "Builds",
    tab_create: "Create Build",
    tab_mods: "Mods Catalog",
    tab_game: "Game",
    tab_java: "Java",
    tab_network: "Network",
    tab_misc: "Misc",
    tab_profile: "Profile",

    // Settings
    settings_title: "Settings",
    settings_ram: "RAM Allocation",
    settings_ram_amount: "RAM Amount",
    settings_window: "Minecraft Window",
    settings_fullscreen: "Fullscreen Mode",
    settings_width: "Width (px)",
    settings_height: "Height (px)",
    settings_quick_select: "Quick Select",
    settings_java_client: "Java for Client",
    settings_java_client_path: "Java 17 Path (Client)",
    settings_java_server: "Java for Server",
    settings_java_server_path: "Java 17 Path (Server)",
    settings_java_placeholder: "Leave empty for auto-download (Recommended)",
    settings_java_info: "If empty, Java 17 will be downloaded automatically on first launch.",
    settings_network_mode: "Connection Mode",
    settings_mode_host: "I am Host",
    settings_mode_connect: "Connect to Host",
    settings_server_ip: "Server IP Address",
    settings_ip_placeholder: "Example: 26.15.112.5",
    settings_host_info: "Server will start on your computer. Give friends your IP address to connect.",
    settings_interface: "Interface",
    settings_animated_bg: "Animated Background (Video)",
    settings_font: "Interface Font",
    settings_font_desc: "Select a font for the launcher's layout. You can upload custom font files (TTF/OTF).",
    settings_font_add: "Add Font",
    settings_font_standard: "Standard",
    settings_font_system: "System",
    settings_font_custom: "Custom",
    settings_interface_info: "Changes apply instantly. Disable if launcher lags.",
    settings_profile_config: "Settings Profile",
    settings_export: "Export",
    settings_import: "Import",
    settings_profile_info: "Skin and Xbox account are not included in the export.",
    settings_reset: "Reset",
    settings_reset_all: "Reset All Settings",
    settings_reset_confirm_title: "Reset Settings?",
    settings_reset_confirm_msg: "All settings will be deleted. This action cannot be undone.",
    settings_lang: "Language / Язык интерфейса",

    // Client Page
    client_ready: "Ready to launch",
    client_launching: "Preparing launch...",
    client_playing: "Game is running!",
    client_closed: "Game closed.",
    client_updating: "Starting installation...",
    client_needs_install: "Installation required: v",
    client_needs_update: "Update available: v",
    client_playtime: "Playtime: ",
    client_play: "Play",
    client_stop: "Quit",
    client_install: "Install",
    client_update: "Update",
    client_export_logs: "Export Logs",
    client_console_title: "Client Console",
    client_playtime_minutes: " min.",
    client_playtime_hours: " h. ",
    client_playtime_less_minute: "Less than a minute",
    client_username_warning: "⚠️ Authorize in settings!",

    // Mods Page
    mods_catalog: "Mod Catalog",
    mods_search_placeholder: "Search mods...",
    mods_installed: "Installed",
    mods_install_btn: "Install",
    mods_uninstall_btn: "Delete",
    mods_category_all: "All",
    mods_category_opt: "Optimization",
    mods_category_magic: "Magic",
    mods_category_tech: "Tech",
    mods_category_adv: "Adventure",
    mods_category_dec: "Decoration",
    mods_category_lib: "Libraries",
    mods_category_gen: "Generation",
    mods_sort_pop: "Popular",
    mods_sort_dl: "Downloads",
    mods_sort_upd: "Updated",
    mods_sort_alpha: "A-Z",
    mods_cf_source: "CurseForge",
    mods_mr_source: "Modrinth",
    mods_type_mods: "Mods",
    mods_type_rp: "Resource Packs",
    mods_type_shaders: "Shaders",
    mods_no_versions: "No compatible versions found for your Minecraft version!",
    mods_dependencies: "Dependencies",
    mods_license: "License",
    mods_downloads: "Downloads",
    mods_gallery: "Gallery",
    mods_description: "Description",
    mods_versions: "Versions",
    mods_back: "Back",

    // Builds Page
    builds_title: "Game Builds",
    builds_subtitle: "select or create a client to play",
    builds_search: "Search builds...",
    builds_export: "Export build",
    builds_edit: "Edit layout",
    builds_delete: "Delete build",
    builds_custom: "Custom",

    // Import/Export Page
    impexp_title: "Import & Export Hub",
    impexp_import_tab: "Import",
    impexp_export_tab: "Export",
    impexp_card_title: "Import / Export Builds",
    impexp_card_desc: "Import from CurseForge, Modrinth, Prism, MultiMC or create a backup",
    impexp_platform_div: "DivLauncher",
    impexp_platform_div_desc: "Import backup ZIP or divpack.json",
    impexp_platform_cf: "CurseForge",
    impexp_platform_cf_desc: "Import from CurseForge ZIP and download mods",
    impexp_platform_mr: "Modrinth",
    impexp_platform_mr_desc: "Import from .mrpack and download mods",
    impexp_platform_prism: "Prism Launcher",
    impexp_platform_prism_desc: "Transfer Prism Launcher instance with mods",
    impexp_platform_mmc: "MultiMC",
    impexp_platform_mmc_desc: "Transfer MultiMC instance with mods",
    impexp_drop_zone: "Drag and drop file here or click to select",
    impexp_drop_zone_active: "Release the file to upload...",
    impexp_drop_zone_file: "Selected file: ",
    impexp_start_import: "Start Import",
    impexp_progress_title: "Import in progress",
    impexp_export_select: "Select build to export",
    impexp_export_btn: "Export build to ZIP",
    impexp_error_empty: "Please select a build first.",
    impexp_success_export: "Build successfully exported!",
    impexp_success_import: "Build successfully imported!",

    // Login Page
    login_title: "authorization",
    login_btn_tab: "Login",
    login_reg_tab: "Register",
    login_username_label: "Username",
    login_username_placeholder: "Enter nickname",
    login_password_label: "Password",
    login_password_placeholder: "Enter password",
    login_confirm_label: "Confirm Password",
    login_confirm_placeholder: "Repeat password",
    login_loading: "Loading...",
    login_submit_btn: "Login",
    login_register_btn: "Register",
    login_err_username_len: "Username must be at least 3 characters",
    login_err_password_len: "Password must be at least 4 characters",
    login_err_password_match: "Passwords do not match",
    login_success_reg: "Registration successful! You can now log in.",
    login_err_reg: "Registration error",
    login_err_login: "Invalid username or password",
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(localStorage.getItem('launcher_lang') || 'ru');

  const setLang = (newLang) => {
    localStorage.setItem('launcher_lang', newLang);
    setLangState(newLang);
    window.dispatchEvent(new Event('settings-changed'));
  };

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const stored = localStorage.getItem('launcher_lang');
      if (stored && stored !== lang) {
        setLangState(stored);
      }
    };
    window.addEventListener('settings-changed', handleSettingsUpdate);
    return () => window.removeEventListener('settings-changed', handleSettingsUpdate);
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['ru']?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
