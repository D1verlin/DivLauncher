import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

const DEFAULT_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1280";

// --- Shared CSS/Styles ---
const glassPanelStyle = {
  background: 'rgba(10, 10, 16, 0.45)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '24px',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '20px',
  color: '#fff',
  overflow: 'hidden'
};

const inputStyle = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '13px',
  color: '#fff',
  padding: '11px 15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Montserrat',
  fontSize: '13px',
  fontWeight: 600,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block',
  color: '#a1a1aa',
  fontSize: '10px',
  textTransform: 'uppercase',
  fontWeight: 800,
  marginBottom: '6px',
  letterSpacing: '1px',
};

// ────────────────────────────────────────────────────────────
// Dropdown Select with search support
// ────────────────────────────────────────────────────────────
function FormSelect({ label, value, options, onChange, placeholder, showSearch = false }) {
  const { lang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = showSearch
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isOpen && (
        <div onClick={() => { setIsOpen(false); setSearchQuery(''); }}
          style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }} />
      )}
      <label style={labelStyle}>{label}</label>
      <div onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderColor: isOpen ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
          boxShadow: isOpen ? '0 0 10px rgba(16,185,129,0.15)' : 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fa-solid ${isOpen ? 'fa-angle-up' : 'fa-angle-down'}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: '68px',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'rgba(20, 20, 25, 0.98)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              maxHeight: '220px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {showSearch && (
              <div style={{ padding: '4px', position: 'sticky', top: 0, background: 'rgba(20, 20, 25, 0.98)', zIndex: 1001, marginBottom: '4px' }}>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'Поиск...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    ...inputStyle,
                    padding: '8px 12px',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.08)'
                  }}
                />
              </div>
            )}
            
            <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                  {lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: opt.value === value ? '#34d399' : '#fff',
                      background: opt.value === value ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? 'rgba(255, 255, 255, 0.06)' : 'transparent'}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <i className="fa-solid fa-check" style={{ color: '#34d399', fontSize: '11px' }} />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function AdminModpacksSection({ onModpacksUpdate, onManageMods }) {
  const { t, lang } = useTranslation();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Editor view states
  const [editingPack, setEditingPack] = useState(null); // Modpack object, or null (list view)
  const [isNew, setIsNew] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('basic'); // 'basic' | 'assets' | 'server'
  
  // Form fields
  const [packId, setPackId] = useState('');
  const [name, setName] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [packVersion, setPackVersion] = useState('1.0.0');
  const [loaderType, setLoaderType] = useState('vanilla');
  const [loaderVersion, setLoaderVersion] = useState('');
  const [installerUrl, setInstallerUrl] = useState('');
  const [installerName, setInstallerName] = useState('');
  const [forgeUrl, setForgeUrl] = useState('');
  const [forgeInstallerName, setForgeInstallerName] = useState('');
  
  const [clientDir, setClientDir] = useState('');
  const [serverDir, setServerDir] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [bgVideo, setBgVideo] = useState('');
  const [logo, setLogo] = useState('');
  const [icon, setIcon] = useState('');
  
  const [useZip, setUseZip] = useState(false);
  const [packZipUrl, setPackZipUrl] = useState('');
  const [modsJsonUrl, setModsJsonUrl] = useState('');
  
  const [serverLoaderType, setServerLoaderType] = useState('none');
  const [serverLoaderUrl, setServerLoaderUrl] = useState('');
  const [serverLoaderName, setServerLoaderName] = useState('');
  const [autoInstallSkinsRestorer, setAutoInstallSkinsRestorer] = useState(false);
  
  // Upload status states
  const [uploadProgress, setUploadProgress] = useState({}); // field -> progress percentage
  const [uploadingField, setUploadingField] = useState(null); // current field being uploaded
  
  // Manifest files
  const [versions, setVersions] = useState([]);
  const [promos, setPromos] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingServerLoader, setLoadingServerLoader] = useState(false);
  
  const cleanId = packId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  
  // Fetch modpacks list from R2
  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.r2GetModsJson('DivLauncher/modpacks.json');
      if (res.success) {
        setPacks(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res.error || 'Не удалось получить список сборок с R2');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
    
    // Load Mojang Minecraft releases
    fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
      .then(res => res.json())
      .then(data => {
        const releases = data.versions
          .filter(v => v.type === 'release')
          .map(v => v.id);
        const cutOff = releases.indexOf('1.7.10');
        setVersions(cutOff > -1 ? releases.slice(0, cutOff + 1) : releases);
      })
      .catch(err => console.error("Mojang manifest fetch error:", err));

    // Load Forge promos slim
    fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json')
      .then(res => res.json())
      .then(data => setPromos(data.promos || {}))
      .catch(err => console.error("Forge promos fetch error:", err));

    // Register upload progress listener
    const progressHandler = (_, percent) => {
      if (uploadingField) {
        setUploadProgress(prev => ({ ...prev, [uploadingField]: percent }));
      }
    };
    window.electronAPI.onR2UploadProgress(progressHandler);
    return () => window.electronAPI.removeAllListeners?.('r2-upload-progress');
  }, [uploadingField]);

  // Handle uploading files (images, webm or zips) to R2
  const handleR2Upload = async (field, assetNameTarget, fileExtension) => {
    if (!cleanId) {
      alert(lang === 'ru' ? 'Пожалуйста, сначала укажите ID сборки, чтобы сформировать правильные пути на сервере!' : 'Please specify the pack ID first to set up the correct paths on the server!');
      return;
    }
    setUploadingField(field);
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));
    
    // Construct target uploader key
    // Assets are stored in DivLauncher/{cleanId}/assets/
    // ZIPs are stored in DivLauncher/{cleanId}/
    const isZip = field === 'packZipUrl';
    const folder = isZip ? `DivLauncher/${cleanId}/` : `DivLauncher/${cleanId}/assets/`;
    const targetKey = `${folder}${assetNameTarget}.${fileExtension}`;
    
    try {
      const res = await window.electronAPI.r2UploadFile(targetKey);
      if (res && res.success) {
        const publicUrl = res.url || `https://mc.diverlin.ru/${targetKey}`;
        if (field === 'bgImage') setBgImage(publicUrl);
        if (field === 'bgVideo') setBgVideo(publicUrl);
        if (field === 'logo') setLogo(publicUrl);
        if (field === 'icon') setIcon(publicUrl);
        if (field === 'packZipUrl') setPackZipUrl(publicUrl);
      } else if (res && !res.canceled) {
        alert(res.error || (lang === 'ru' ? 'Ошибка загрузки файла' : 'File upload error'));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingField(null);
    }
  };

  // Derive public URL domain from existing packs
  const getPublicBaseUrl = () => {
    if (packs.length > 0) {
      const sample = packs.find(p => p.modsJsonUrl);
      if (sample) {
        try { return new URL(sample.modsJsonUrl).origin; } catch {}
      }
    }
    return 'https://mc.diverlin.ru';
  };

  // Auto-generation of paths & configs
  useEffect(() => {
    if (isNew && cleanId) {
      setClientDir(`.${cleanId}-client`);
      setServerDir(`.${cleanId}-server`);
      
      const domain = getPublicBaseUrl();
      if (!useZip) {
        setModsJsonUrl(`${domain}/DivLauncher/${cleanId}/mods.json`);
      } else {
        setPackZipUrl(`${domain}/DivLauncher/${cleanId}/${cleanId}_V100.zip`);
      }
    }
  }, [cleanId, isNew, useZip]);

  // Auto-fill Forge installer parameters based on MC version
  const handleAutoFillLoader = () => {
    if (!mcVersion) {
      alert(lang === 'ru' ? 'Сначала выберите версию Minecraft!' : 'Please select Minecraft version first!');
      return;
    }
    if (loaderType === 'fabric') {
      setLoaderVersion('0.16.10');
      setInstallerUrl('https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar');
      setInstallerName('fabric-installer-1.0.1.jar');
    } else if (loaderType === 'forge') {
      const forgeRec = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`] || promos[mcVersion];
      if (forgeRec) {
        const fullVersion = `${mcVersion}-${forgeRec}`;
        setForgeUrl(`https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/forge-${fullVersion}-installer.jar`);
        setForgeInstallerName(`forge-${fullVersion}-installer.jar`);
      } else {
        alert(lang === 'ru' ? `Не удалось найти рекомендуемую версию Forge для Minecraft ${mcVersion}. Пожалуйста, укажите параметры вручную.` : `Could not find recommended Forge version for Minecraft ${mcVersion}. Please specify settings manually.`);
      }
    } else if (loaderType === 'neoforge') {
      // standard version format
      setLoaderVersion('21.0.33');
      setInstallerUrl(`https://maven.neoforged.net/releases/net/neoforged/neoforge/21.0.33/neoforge-21.0.33-installer.jar`);
      setInstallerName('neoforge-21.0.33-installer.jar');
    } else {
      alert(lang === 'ru' ? 'Для Ванильного ядра автозаполнение не требуется.' : 'Autofill is not required for Vanilla.');
    }
  };

  // Auto-fill server loader params based on MC version & loader type
  const handleAutoFillServerLoader = async (type) => {
    const targetType = type || serverLoaderType;
    if (targetType === 'none') return;
    if (!mcVersion) {
      alert(lang === 'ru' ? 'Пожалуйста, сначала выберите версию Minecraft на первой вкладке!' : 'Please select Minecraft version on the first tab first!');
      return;
    }
    
    setLoadingServerLoader(true);
    try {
      if (targetType === 'vanilla') {
        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        const manifest = await manifestRes.json();
        const versionInfo = manifest.versions.find(v => v.id === mcVersion);
        if (versionInfo && versionInfo.url) {
          const detailRes = await fetch(versionInfo.url);
          const detail = await detailRes.json();
          if (detail.downloads && detail.downloads.server) {
            setServerLoaderUrl(detail.downloads.server.url);
            setServerLoaderName(`minecraft_server.${mcVersion}.jar`);
          } else {
            alert(lang === 'ru' ? 'Не удалось найти ссылку на серверную часть в манифесте Mojang.' : 'Failed to find server download link in Mojang manifest.');
          }
        } else {
          alert(lang === 'ru' ? 'Версия Minecraft не найдена в манифесте Mojang.' : 'Minecraft version not found in Mojang manifest.');
        }
      } else if (targetType === 'fabric') {
        if (installerUrl) {
          setServerLoaderUrl(installerUrl);
          setServerLoaderName(installerName || 'fabric-installer-1.0.1.jar');
        } else {
          setServerLoaderUrl('https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar');
          setServerLoaderName('fabric-installer-1.0.1.jar');
        }
      } else if (targetType === 'forge') {
        if (forgeUrl) {
          setServerLoaderUrl(forgeUrl);
          setServerLoaderName(forgeInstallerName || `forge-${mcVersion}-installer.jar`);
        } else {
          const forgeRec = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`] || promos[mcVersion];
          if (forgeRec) {
            const fullVersion = `${mcVersion}-${forgeRec}`;
            setServerLoaderUrl(`https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/forge-${fullVersion}-installer.jar`);
            setServerLoaderName(`forge-${fullVersion}-installer.jar`);
          } else {
            alert(lang === 'ru' ? 'Сначала выполните автонастройку загрузчика клиента (Forge) на первой вкладке!' : 'Please autofill the client loader (Forge) on the first tab first!');
          }
        }
      } else if (targetType === 'neoforge') {
        if (installerUrl) {
          setServerLoaderUrl(installerUrl);
          setServerLoaderName(installerName || 'neoforge-installer.jar');
        } else {
          setServerLoaderUrl('https://maven.neoforged.net/releases/net/neoforged/neoforge/21.0.33/neoforge-21.0.33-installer.jar');
          setServerLoaderName('neoforge-21.0.33-installer.jar');
        }
      } else if (targetType === 'hybrid') {
        // Try MohistMC API first
        try {
          const mohistRes = await fetch(`https://mohistmc.com/api/v2/projects/mohist/${mcVersion}/builds`);
          if (mohistRes.ok) {
            const data = await mohistRes.json();
            if (data && data.builds && data.builds.length > 0) {
              const latestBuild = data.builds[data.builds.length - 1];
              const downloadUrl = `https://mohistmc.com/api/v2/projects/mohist/${mcVersion}/builds/${latestBuild.number}/download`;
              setServerLoaderUrl(downloadUrl);
              setServerLoaderName(`mohist-${mcVersion}-${latestBuild.number}-server.jar`);
              setLoadingServerLoader(false);
              return;
            }
          }
        } catch (mohistErr) {
          console.error("Mohist fetch error:", mohistErr);
        }

        // Fallbacks for Arclight (very popular)
        if (mcVersion === '1.20.1') {
          setServerLoaderUrl('https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.6/arclight-forge-1.20.1-1.0.6.jar');
          setServerLoaderName('arclight-forge-1.20.1-1.0.6.jar');
        } else if (mcVersion === '1.18.2') {
          setServerLoaderUrl('https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.6/arclight-forge-1.18.2-1.0.6.jar');
          setServerLoaderName('arclight-forge-1.18.2-1.0.6.jar');
        } else if (mcVersion === '1.16.5') {
          setServerLoaderUrl('https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.6/arclight-forge-1.16.5-1.0.6.jar');
          setServerLoaderName('arclight-forge-1.16.5-1.0.6.jar');
        } else {
          alert(lang === 'ru' ? 'Не удалось автоматически подобрать гибридное ядро для этой версии Minecraft. Укажите параметры вручную.' : 'Could not automatically find hybrid core for this Minecraft version. Please specify settings manually.');
        }
      }
    } catch (err) {
      alert(lang === 'ru' ? `Ошибка автонастройки серверного ядра: ${err.message}` : `Server core autofill error: ${err.message}`);
    } finally {
      setLoadingServerLoader(false);
    }
  };

  const handleEditClick = (pack) => {
    setEditingPack(pack);
    setIsNew(false);
    setActiveFormTab('basic');
    
    // Load values into form state
    setPackId(pack.id || '');
    setName(pack.name || '');
    setMcVersion(pack.mcVersion || '');
    setPackVersion(pack.packVersion || '1.0.0');
    setLoaderType(pack.loaderType || 'vanilla');
    setLoaderVersion(pack.loaderVersion || '');
    setInstallerUrl(pack.installerUrl || '');
    setInstallerName(pack.installerName || '');
    setForgeUrl(pack.forgeUrl || '');
    setForgeInstallerName(pack.forgeInstallerName || '');
    setClientDir(pack.clientDir || '');
    setServerDir(pack.serverDir || '');
    setBgImage(pack.bgImage || '');
    setBgVideo(pack.bgVideo || '');
    setLogo(pack.logo || '');
    setIcon(pack.icon || '');
    setUseZip(!!pack.useZip);
    setPackZipUrl(pack.packZipUrl || '');
    setModsJsonUrl(pack.modsJsonUrl || '');
    setServerLoaderType(pack.serverLoaderType || 'none');
    setServerLoaderUrl(pack.serverLoaderUrl || '');
    setServerLoaderName(pack.serverLoaderName || '');
    setAutoInstallSkinsRestorer(!!pack.autoInstallSkinsRestorer);
  };

  const handleCreateClick = () => {
    setEditingPack({});
    setIsNew(true);
    setActiveFormTab('basic');
    
    // Clear state
    setPackId('');
    setName('');
    setMcVersion(versions[0] || '1.20.1');
    setPackVersion('1.0.0');
    setLoaderType('vanilla');
    setLoaderVersion('');
    setInstallerUrl('');
    setInstallerName('');
    setForgeUrl('');
    setForgeInstallerName('');
    setClientDir('');
    setServerDir('');
    setBgImage('');
    setBgVideo('');
    setLogo('');
    setIcon('');
    setUseZip(false);
    setPackZipUrl('');
    setModsJsonUrl('');
    setServerLoaderType('none');
    setServerLoaderUrl('');
    setServerLoaderName('');
    setAutoInstallSkinsRestorer(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!cleanId || !name.trim() || !mcVersion) {
      alert(lang === 'ru' ? 'Заполните обязательные поля: ID, Название и Версия Minecraft!' : 'Please fill in all required fields: ID, Name, and Minecraft Version!');
      return;
    }
    
    setSaving(true);
    
    // Construct pack object
    const packObj = {
      id: cleanId,
      name: name.trim(),
      mcVersion,
      loaderType,
      packVersion,
      clientDir: clientDir.trim() || `.${cleanId}-client`,
      serverDir: serverDir.trim() || `.${cleanId}-server`,
      bgImage: bgImage.trim() || DEFAULT_BG,
      bgVideo: bgVideo.trim() || undefined,
      logo: logo.trim() || undefined,
      icon: icon.trim() || undefined,
      useZip
    };

    if (loaderType === 'forge') {
      packObj.forgeUrl = forgeUrl.trim() || undefined;
      packObj.forgeInstallerName = forgeInstallerName.trim() || undefined;
    } else if (loaderType === 'fabric' || loaderType === 'quilt' || loaderType === 'neoforge') {
      packObj.loaderVersion = loaderVersion.trim() || undefined;
      packObj.installerUrl = installerUrl.trim() || undefined;
      packObj.installerName = installerName.trim() || undefined;
    }

    if (useZip) {
      packObj.packZipUrl = packZipUrl.trim() || undefined;
      packObj.modsJsonUrl = "";
    } else {
      packObj.modsJsonUrl = modsJsonUrl.trim() || `https://mc.diverlin.ru/DivLauncher/${cleanId}/mods.json`;
      packObj.packZipUrl = "";
    }

    if (serverLoaderType !== 'none') {
      packObj.serverLoaderType = serverLoaderType;
      packObj.serverLoaderUrl = serverLoaderUrl.trim() || undefined;
      packObj.serverLoaderName = serverLoaderName.trim() || undefined;
      packObj.autoInstallSkinsRestorer = autoInstallSkinsRestorer;
    }

    try {
      // 1. Fetch latest array from R2
      const listRes = await window.electronAPI.r2GetModsJson('DivLauncher/modpacks.json');
      let currentList = [];
      if (listRes.success && Array.isArray(listRes.data)) {
        currentList = listRes.data;
      }
      
      // Check ID clash for new packs
      if (isNew && currentList.some(p => p.id === cleanId)) {
        alert(lang === 'ru' ? `Сборка с ID "${cleanId}" уже существует! Выберите другой ID.` : `Pack with ID "${cleanId}" already exists! Please choose another ID.`);
        setSaving(false);
        return;
      }

      // Update or insert
      const idx = currentList.findIndex(p => p.id === cleanId);
      if (idx > -1) {
        currentList[idx] = packObj;
      } else {
        currentList.push(packObj);
      }

      // 2. Save modpacks.json back to R2
      const saveRes = await window.electronAPI.r2SaveModsJson('DivLauncher/modpacks.json', currentList);
      if (!saveRes.success) {
        alert(saveRes.error || (lang === 'ru' ? 'Ошибка при сохранении modpacks.json на R2' : 'Error saving modpacks.json to R2'));
        setSaving(false);
        return;
      }

      // 3. AUTO-INITIALIZE mods.json if uploader uses modsJsonUrl and it's a new pack
      if (isNew && !useZip) {
        const modsKey = `DivLauncher/${cleanId}/mods.json`;
        // Check if mods.json exists first, if not - initialize empty array
        const modsCheck = await window.electronAPI.r2GetModsJson(modsKey);
        if (!modsCheck.success) {
          await window.electronAPI.r2SaveModsJson(modsKey, []);
        }
      }

      alert(lang === 'ru' ? 'Сборка успешно сохранена на R2!' : 'Pack successfully saved to R2!');
      setEditingPack(null);
      loadPacks();
      if (onModpacksUpdate) onModpacksUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pack) => {
    if (!confirm(lang === 'ru' 
      ? `Вы действительно хотите удалить официальную сборку "${pack.name}" (ID: ${pack.id})?\nВнимание! Это удалит её только из списка сборок. Файлы на R2 останутся.`
      : `Are you sure you want to delete the official pack "${pack.name}" (ID: ${pack.id})?\nWarning! This will only remove it from the pack list. Files on R2 will remain.`
    )) {
      return;
    }

    try {
      setLoading(true);
      // Fetch latest list
      const listRes = await window.electronAPI.r2GetModsJson('DivLauncher/modpacks.json');
      if (listRes.success && Array.isArray(listRes.data)) {
        const newList = listRes.data.filter(p => p.id !== pack.id);
        const saveRes = await window.electronAPI.r2SaveModsJson('DivLauncher/modpacks.json', newList);
        if (saveRes.success) {
          alert(lang === 'ru' ? 'Сборка удалена!' : 'Pack deleted!');
          loadPacks();
          if (onModpacksUpdate) onModpacksUpdate();
        } else {
          alert(saveRes.error || (lang === 'ru' ? 'Ошибка сохранения на R2' : 'Error saving to R2'));
        }
      } else {
        alert(listRes.error || (lang === 'ru' ? 'Ошибка получения списка сборок' : 'Error getting modpacks list'));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CSS classes simulated inline
  const glassCard = {
    background: 'rgba(10, 10, 16, 0.45)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  };

  const uploadBtnStyle = (field) => ({
    background: uploadingField === field ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
    border: `1px solid ${uploadingField === field ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
    color: uploadingField === field ? '#f59e0b' : '#818cf8',
    padding: '11px 16px',
    borderRadius: '13px',
    cursor: uploadingField === field ? 'default' : 'pointer',
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: 'Montserrat',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  });

  // ────────────────────────────────────────────────────────────
  // RENDER LIST VIEW
  // ────────────────────────────────────────────────────────────
  if (!editingPack) {
    return (
      <div style={{ ...glassCard, flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lang === 'ru' ? 'Официальные сборки' : 'Official Packs'}
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
              {lang === 'ru' ? 'Управление глобальным списком официальных сборок DivLauncher (modpacks.json)' : 'Manage the global official modpacks list for DivLauncher (modpacks.json)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleCreateClick}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                color: '#fff', padding: '9px 16px', borderRadius: '12px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className="fa-solid fa-plus" /> {lang === 'ru' ? 'Создать сборку' : 'Create Pack'}
            </motion.button>
            <button onClick={loadPacks} disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', padding: '9px 15px', borderRadius: '12px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 800, fontFamily: 'Montserrat'
              }}
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
            <i className="fa-solid fa-triangle-exclamation" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ width: '36px', height: '36px', border: '3px solid rgba(167, 139, 250, 0.1)', borderTopColor: '#a78bfa', borderRadius: '50%' }} />
              <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600 }}>{lang === 'ru' ? 'Загрузка сборок с R2...' : 'Loading packs from R2...'}</span>
            </div>
          ) : packs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#52525b' }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: '42px' }} />
              <span style={{ fontSize: '14px', fontWeight: 700 }}>{lang === 'ru' ? 'Официальных сборок пока нет' : 'No official packs yet'}</span>
              <button onClick={handleCreateClick} style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}>
                {lang === 'ru' ? 'Создать первую сборку' : 'Create first pack'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {packs.map(pack => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Banner background */}
                  <div style={{
                    height: '80px',
                    background: `linear-gradient(rgba(10, 10, 16, 0.2), rgba(10, 10, 16, 0.8)), url('${pack.bgImage || DEFAULT_BG}') center/cover`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '12px'
                  }}>
                    {pack.logo ? (
                      <img src={pack.logo} alt="Logo" style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }} />
                    ) : (
                      <span style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>{pack.name}</span>
                    )}
                  </div>
                  
                  {/* Body info */}
                  <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', gap: '10px', background: 'rgba(10, 10, 16, 0.25)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa' }}>MC {pack.mcVersion}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#71717a' }} />
                        <span style={{
                          fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', padding: '1px 5px', borderRadius: '5px',
                          color: pack.loaderType === 'fabric' ? '#34d399' : pack.loaderType === 'forge' ? '#f59e0b' : pack.loaderType === 'neoforge' ? '#a78bfa' : '#60a5fa',
                          background: pack.loaderType === 'fabric' ? 'rgba(52, 211, 153, 0.1)' : pack.loaderType === 'forge' ? 'rgba(245, 158, 11, 0.1)' : pack.loaderType === 'neoforge' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                          border: `1px solid ${pack.loaderType === 'fabric' ? 'rgba(52, 211, 153, 0.2)' : pack.loaderType === 'forge' ? 'rgba(245, 158, 11, 0.2)' : pack.loaderType === 'neoforge' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(96, 165, 250, 0.2)'}`
                        }}>
                          {pack.loaderType}
                        </span>
                        {pack.useZip ? (
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', color: '#ec4899', padding: '1px 5px', borderRadius: '5px' }}>ZIP</span>
                        ) : (
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', padding: '1px 5px', borderRadius: '5px' }}>R2 mods</span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#52525b', fontFamily: 'monospace' }}>ID: {pack.id}</p>
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!pack.useZip && (
                        <button onClick={() => onManageMods(pack)}
                          style={{
                            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
                            color: '#34d399', width: '32px', height: '32px', borderRadius: '9px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                          }} title={lang === 'ru' ? 'Управление модами и R2' : 'Manage mods and R2'}
                        >
                          <i className="fa-solid fa-puzzle-piece" style={{ fontSize: '12px' }} />
                        </button>
                      )}
                      
                      <button onClick={() => handleEditClick(pack)}
                        style={{
                          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
                          color: '#60a5fa', width: '32px', height: '32px', borderRadius: '9px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }} title={lang === 'ru' ? 'Редактировать параметры' : 'Edit settings'}
                      >
                        <i className="fa-solid fa-pen" style={{ fontSize: '12px' }} />
                      </button>
                      
                      <button onClick={() => handleDelete(pack)}
                        style={{
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                          color: '#f87171', width: '32px', height: '32px', borderRadius: '9px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }} title={lang === 'ru' ? 'Удалить сборку' : 'Delete pack'}
                      >
                        <i className="fa-solid fa-trash-can" style={{ fontSize: '12px' }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER FORM (CREATE / EDIT) VIEW
  // ────────────────────────────────────────────────────────────
  return (
    <div style={{ ...glassCard, flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '15px' }}>
      {/* Form Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button onClick={() => setEditingPack(null)}
          style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: '12px' }} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isNew ? (lang === 'ru' ? 'Создание официальной сборки' : 'Create Official Pack') : (lang === 'ru' ? `Настройка: ${name}` : `Settings: ${name}`)}
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#71717a', fontWeight: 600 }}>
            {isNew ? (lang === 'ru' ? 'Заполните параметры новой сборки' : 'Fill in the parameters for the new pack') : (lang === 'ru' ? `Редактирование конфигурации с ID: ${packId}` : `Editing configuration with ID: ${packId}`)}
          </p>
        </div>
      </div>

      {/* Form Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {[
          { id: 'basic', label: lang === 'ru' ? 'Основные параметры' : 'Basic Parameters', icon: 'fa-gears' },
          { id: 'assets', label: lang === 'ru' ? 'Оформление (R2)' : 'Design (R2)', icon: 'fa-images' },
          { id: 'server', label: lang === 'ru' ? 'Сервер & Сеть' : 'Server & Network', icon: 'fa-network-wired' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveFormTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 800, fontFamily: 'Montserrat',
              background: activeFormTab === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)',
              color: activeFormTab === t.id ? '#818cf8' : '#71717a',
              border: `1px solid ${activeFormTab === t.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.2s'
            }}
          >
            <i className={`fa-solid ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSave} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '15px' }}>
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TAB 1: BASIC CONFIG */}
          {activeFormTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'ID Сборки (уникальный, латиница)*' : 'Pack ID (unique, alphanumeric)*'}</label>
                  <input type="text" placeholder={lang === 'ru' ? 'например: stalker' : 'e.g. stalker'}
                    value={packId} onChange={e => setPackId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} disabled={!isNew}
                    style={{ ...inputStyle, textTransform: 'lowercase' }} required />
                </div>
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'Название сборки*' : 'Pack Name*'}</label>
                  <input type="text" placeholder={lang === 'ru' ? 'например: S.T.A.L.K.E.R BATTLE' : 'e.g. S.T.A.L.K.E.R BATTLE'}
                    value={name} onChange={e => setName(e.target.value)} style={inputStyle} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                <FormSelect
                  label={lang === 'ru' ? 'Версия Minecraft*' : 'Minecraft Version*'}
                  value={mcVersion}
                  options={versions.map(v => ({ value: v, label: `Minecraft ${v}` }))}
                  onChange={setMcVersion}
                  placeholder={lang === 'ru' ? 'Выберите версию...' : 'Select version...'}
                  showSearch={true}
                />
                
                <FormSelect
                  label={lang === 'ru' ? 'Загрузчик модов*' : 'Mod Loader*'}
                  value={loaderType}
                  options={[
                    { value: 'vanilla', label: 'Vanilla' },
                    { value: 'forge', label: 'Forge' },
                    { value: 'fabric', label: 'Fabric' },
                    { value: 'neoforge', label: 'NeoForge' }
                  ]}
                  onChange={setLoaderType}
                  placeholder={lang === 'ru' ? 'Загрузчик...' : 'Loader...'}
                />

                <div>
                  <button type="button" onClick={handleAutoFillLoader}
                    style={{
                      ...inputStyle, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', cursor: 'pointer', fontWeight: 800, textAlign: 'center'
                    }}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '6px' }} /> {lang === 'ru' ? 'Автонастройка' : 'Autofill'}
                  </button>
                </div>
              </div>

              {/* Loader-specific fields */}
              {loaderType === 'forge' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <label style={labelStyle}>Forge Installer URL</label>
                    <input type="text" placeholder={lang === 'ru' ? 'Ссылка на установщик Forge .jar' : 'Forge installer .jar link'}
                      value={forgeUrl} onChange={e => setForgeUrl(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Forge Installer File Name</label>
                    <input type="text" placeholder="forge-xxx-installer.jar"
                      value={forgeInstallerName} onChange={e => setForgeInstallerName(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              {(loaderType === 'fabric' || loaderType === 'neoforge') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Версия загрузчика' : 'Loader Version'}</label>
                    <input type="text" placeholder={lang === 'ru' ? 'например: 0.16.10' : 'e.g. 0.16.10'}
                      value={loaderVersion} onChange={e => setLoaderVersion(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Installer URL</label>
                    <input type="text" placeholder={lang === 'ru' ? 'Ссылка на установщик' : 'Installer URL'}
                      value={installerUrl} onChange={e => setInstallerUrl(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Installer File Name</label>
                    <input type="text" placeholder="installer-xxx.jar"
                      value={installerName} onChange={e => setInstallerName(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'Директория клиента (папка в AppData)*' : 'Client Directory (folder in AppData)*'}</label>
                  <input type="text" placeholder={lang === 'ru' ? 'например: .stalker-client' : 'e.g. .stalker-client'}
                    value={clientDir} onChange={e => setClientDir(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'Директория сервера' : 'Server Directory'}</label>
                  <input type="text" placeholder={lang === 'ru' ? 'например: .stalker-server' : 'e.g. .stalker-server'}
                    value={serverDir} onChange={e => setServerDir(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'Версия сборки (для обновлений)*' : 'Pack Version (for updates)*'}</label>
                  <input type="text" placeholder="1.0.0"
                    value={packVersion} onChange={e => setPackVersion(e.target.value)} style={inputStyle} required />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                    <input type="checkbox" checked={useZip} onChange={e => setUseZip(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }} />
                    {lang === 'ru' ? 'Использовать единый ZIP архив вместо поштучной синхронизации модов через mods.json' : 'Use a single ZIP archive instead of individual mod synchronization via mods.json'}
                  </label>
                </div>
              </div>

              {!useZip ? (
                <div>
                  <label style={labelStyle}>{lang === 'ru' ? 'Ссылка на файл mods.json на R2*' : 'Link to mods.json file on R2*'}</label>
                  <input type="text" placeholder="https://mc.diverlin.ru/.../mods.json"
                    value={modsJsonUrl} onChange={e => setModsJsonUrl(e.target.value)} style={inputStyle} required={!useZip} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>{lang === 'ru' ? 'Ссылка на ZIP архив сборки на R2*' : 'Link to pack ZIP archive on R2*'}</label>
                    <input type="text" placeholder="https://mc.diverlin.ru/.../pack.zip"
                      value={packZipUrl} onChange={e => setPackZipUrl(e.target.value)} style={inputStyle} required={useZip} />
                  </div>
                  <button type="button" onClick={() => handleR2Upload('packZipUrl', `${cleanId}_V${packVersion.replace(/\./g, '')}`, 'zip')}
                    disabled={uploadingField === 'packZipUrl'}
                    style={uploadBtnStyle('packZipUrl')}
                  >
                    {uploadingField === 'packZipUrl' ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> {uploadProgress.packZipUrl || 0}%</>
                    ) : (
                      <><i className="fa-solid fa-cloud-arrow-up" /> {lang === 'ru' ? 'Загрузить ZIP' : 'Upload ZIP'}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VISUAL ASSETS (R2) */}
          {activeFormTab === 'assets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '15px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', padding: '12px', borderRadius: '14px', alignItems: 'center' }}>
                <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#818cf8', fontSize: '20px' }} />
                <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                  {lang === 'ru' 
                    ? `Все медиафайлы сборки будут автоматически загружены на Cloudflare R2 по пути: DivLauncher/${cleanId || 'id'}/assets/. Просто нажмите кнопку "Загрузить" рядом с соответствующим полем!`
                    : `All media files for this pack will be automatically uploaded to Cloudflare R2 at: DivLauncher/${cleanId || 'id'}/assets/. Just click the "Upload" button next to the field!`}
                </span>
              </div>

              {/* Background image */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{lang === 'ru' ? 'Изображение фона (bgImage)' : 'Background Image (bgImage)'}</label>
                  <input type="text" placeholder="https://mc.diverlin.ru/.../bg.jpg"
                    value={bgImage} onChange={e => setBgImage(e.target.value)} style={inputStyle} />
                </div>
                <button type="button" onClick={() => handleR2Upload('bgImage', 'bg', 'jpg')}
                  disabled={uploadingField === 'bgImage'}
                  style={uploadBtnStyle('bgImage')}
                >
                  {uploadingField === 'bgImage' ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> {uploadProgress.bgImage || 0}%</>
                  ) : (
                    <><i className="fa-solid fa-cloud-arrow-up" /> {lang === 'ru' ? 'Загрузить' : 'Upload'}</>
                  )}
                </button>
              </div>

              {/* Background video */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{lang === 'ru' ? 'Видео фона (.webm - bgVideo)' : 'Background Video (.webm - bgVideo)'}</label>
                  <input type="text" placeholder={lang === 'ru' ? 'https://mc.diverlin.ru/.../bg.webm (необязательно)' : 'https://mc.diverlin.ru/.../bg.webm (optional)'}
                    value={bgVideo} onChange={e => setBgVideo(e.target.value)} style={inputStyle} />
                </div>
                <button type="button" onClick={() => handleR2Upload('bgVideo', 'bg_video', 'webm')}
                  disabled={uploadingField === 'bgVideo'}
                  style={uploadBtnStyle('bgVideo')}
                >
                  {uploadingField === 'bgVideo' ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> {uploadProgress.bgVideo || 0}%</>
                  ) : (
                    <><i className="fa-solid fa-cloud-arrow-up" /> {lang === 'ru' ? 'Загрузить' : 'Upload'}</>
                  )}
                </button>
              </div>

              {/* Logo */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{lang === 'ru' ? 'Логотип сборки (logo - прозрачный PNG)' : 'Pack Logo (logo - transparent PNG)'}</label>
                  <input type="text" placeholder="https://mc.diverlin.ru/.../logo.png"
                    value={logo} onChange={e => setLogo(e.target.value)} style={inputStyle} />
                </div>
                <button type="button" onClick={() => handleR2Upload('logo', 'logo', 'png')}
                  disabled={uploadingField === 'logo'}
                  style={uploadBtnStyle('logo')}
                >
                  {uploadingField === 'logo' ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> {uploadProgress.logo || 0}%</>
                  ) : (
                    <><i className="fa-solid fa-cloud-arrow-up" /> {lang === 'ru' ? 'Загрузить' : 'Upload'}</>
                  )}
                </button>
              </div>

              {/* Icon */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{lang === 'ru' ? 'Иконка сборки (icon - квадратный PNG)' : 'Pack Icon (icon - square PNG)'}</label>
                  <input type="text" placeholder="https://mc.diverlin.ru/.../icon.png"
                    value={icon} onChange={e => setIcon(e.target.value)} style={inputStyle} />
                </div>
                <button type="button" onClick={() => handleR2Upload('icon', 'icon', 'png')}
                  disabled={uploadingField === 'icon'}
                  style={uploadBtnStyle('icon')}
                >
                  {uploadingField === 'icon' ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> {uploadProgress.icon || 0}%</>
                  ) : (
                    <><i className="fa-solid fa-cloud-arrow-up" /> {lang === 'ru' ? 'Загрузить' : 'Upload'}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SERVER CONFIG */}
          {activeFormTab === 'server' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                <FormSelect
                  label={lang === 'ru' ? 'Ядро сервера' : 'Server Core'}
                  value={serverLoaderType}
                  options={[
                    { value: 'none', label: lang === 'ru' ? 'Не настраивать сервер' : 'Do not configure server' },
                    { value: 'vanilla', label: 'Vanilla' },
                    { value: 'forge', label: 'Forge' },
                    { value: 'fabric', label: 'Fabric' },
                    { value: 'neoforge', label: 'NeoForge' },
                    { value: 'hybrid', label: 'Hybrid (Arclight / Mohist)' }
                  ]}
                  onChange={(val) => {
                    setServerLoaderType(val);
                    if (val !== 'none') {
                      handleAutoFillServerLoader(val);
                    }
                  }}
                  placeholder={lang === 'ru' ? 'Выберите тип...' : 'Select type...'}
                />
                
                <div>
                  <button type="button" onClick={() => handleAutoFillServerLoader(serverLoaderType)}
                    disabled={loadingServerLoader || serverLoaderType === 'none'}
                    style={{
                      ...inputStyle,
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      color: '#34d399',
                      cursor: serverLoaderType === 'none' ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                      textAlign: 'center',
                      opacity: serverLoaderType === 'none' ? 0.5 : 1
                    }}
                  >
                    {loadingServerLoader ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> {lang === 'ru' ? 'Поиск...' : 'Searching...'}</>
                    ) : (
                      <><i className="fa-solid fa-wand-magic-sparkles" /> {lang === 'ru' ? 'Автонастройка' : 'Autofill'}</>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                    <input type="checkbox" checked={autoInstallSkinsRestorer} onChange={e => setAutoInstallSkinsRestorer(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }} />
                    {lang === 'ru' ? 'SkinsRestorer на сервер' : 'SkinsRestorer on server'}
                  </label>
                </div>
              </div>

              {serverLoaderType !== 'none' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'URL Скачивания ядра сервера' : 'Server Core Download URL'}</label>
                    <input type="text" placeholder="https://github.com/.../arclight.jar"
                      value={serverLoaderUrl} onChange={e => setServerLoaderUrl(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Имя файла серверного ядра' : 'Server Core File Name'}</label>
                    <input type="text" placeholder="arclight-forge-xxxx.jar"
                      value={serverLoaderName} onChange={e => setServerLoaderName(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Form buttons footer */}
        <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', flexShrink: 0 }}>
          <button type="button" onClick={() => setEditingPack(null)} disabled={saving}
            style={{
              flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#a1a1aa', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', fontFamily: 'Montserrat'
            }}
          >
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving}
            style={{
              flex: 1.5, padding: '11px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              fontWeight: 800, fontSize: '13px', cursor: 'pointer', fontFamily: 'Montserrat',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin" /> {lang === 'ru' ? 'Сохранение...' : 'Saving...'}</>
            ) : (
              <><i className="fa-solid fa-floppy-disk" /> {lang === 'ru' ? 'Сохранить в modpacks.json' : 'Save to modpacks.json'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
