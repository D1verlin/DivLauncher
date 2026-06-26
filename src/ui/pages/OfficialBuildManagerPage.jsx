import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// Extract filename from URL (handles URL-encoded names)
function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split('/').pop());
  } catch {
    return url.split('/').pop();
  }
}

// Derives R2 keys from modsJsonUrl
// e.g. "https://mc.diverlin.ru/DivLauncher/stalker/mods.json"
//   → modsKey:    "DivLauncher/stalker/mods.json"
//   → modsPrefix: "DivLauncher/stalker/mods/"
//   → rootPrefix: "DivLauncher/stalker/"
function deriveKeys(pack) {
  if (!pack.modsJsonUrl) return { modsKey: null, modsPrefix: null, rootPrefix: null, publicBase: null };
  try {
    const url = new URL(pack.modsJsonUrl);
    const modsKey = url.pathname.replace(/^\//, '');
    const dir = modsKey.replace(/\/[^/]+$/, '');
    const modsPrefix = dir + '/mods/';
    const rootPrefix = dir + '/';
    const publicBase = url.origin; // e.g. https://mc.diverlin.ru
    return { modsKey, modsPrefix, rootPrefix, publicBase };
  } catch {
    return { modsKey: null, modsPrefix: null, rootPrefix: null, publicBase: null };
  }
}

// ────────────────────────────────────────────────────────────
// Shared UI atoms
// ────────────────────────────────────────────────────────────
function StatusBadge({ text, type = 'info' }) {
  const colors = {
    info:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  color: '#60a5fa' },
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
    warn:    { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  color: '#fbbf24' },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
      whiteSpace: 'nowrap'
    }}>{text}</span>
  );
}

function Spinner({ size = 22, color = '#6366f1' }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      style={{
        width: size, height: size, flexShrink: 0,
        border: `3px solid ${color}22`,
        borderTopColor: color, borderRadius: '50%'
      }}
    />
  );
}

function ErrorBanner({ msg, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center',
        gap: '10px', flexShrink: 0
      }}>
      <i className="fa-solid fa-circle-exclamation" style={{ color: '#f87171', fontSize: '14px' }} />
      <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 600, flex: 1 }}>{msg}</span>
      {onClose && (
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </motion.div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'mods',  icon: 'fa-puzzle-piece', label: 'Моды' },
    { id: 'json',  icon: 'fa-code',         label: 'mods.json' },
    { id: 'files', icon: 'fa-folder-open',  label: 'Файлы сборки' },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
      {tabs.map(t => (
        <motion.button key={t.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onChange(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '12px', cursor: 'pointer',
            fontWeight: 700, fontSize: '12px', border: 'none', letterSpacing: '0.3px',
            background: active === t.id ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
            color: active === t.id ? '#fff' : '#71717a',
            boxShadow: active === t.id ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
            transition: 'all 0.2s'
          }}>
          <i className={`fa-solid ${t.icon}`} />{t.label}
        </motion.button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab 1: Mods — driven by mods.json (array of URL strings)
// ────────────────────────────────────────────────────────────
function ModsTab({ modsKey, modsPrefix, publicBase }) {
  const [urls, setUrls]             = useState([]);   // string[]
  const [r2Files, setR2Files]       = useState({});   // key -> { size, lastModified }
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dragOver, setDragOver]     = useState(false);

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  // Load mods.json → extract URL array + load R2 files mapping
  const load = useCallback(async () => {
    if (!modsKey) return;
    setLoading(true);
    setError('');

    const [resJson, resFiles] = await Promise.all([
      window.electronAPI.r2GetModsJson(modsKey),
      modsPrefix ? window.electronAPI.r2ListFiles(modsPrefix) : Promise.resolve({ success: false })
    ]);

    setLoading(false);

    if (!resJson.success) {
      setError(resJson.error || 'Ошибка загрузки mods.json');
      return;
    }

    const data = resJson.data;
    if (Array.isArray(data)) {
      setUrls(data.map(item => typeof item === 'string' ? item : item.url || '').filter(Boolean));
    } else {
      setUrls([]);
    }

    if (resFiles.success && resFiles.files) {
      const fileMap = {};
      for (const f of resFiles.files) {
        fileMap[f.key] = f;
      }
      setR2Files(fileMap);
    } else {
      setR2Files({});
    }
  }, [modsKey, modsPrefix]);

  useEffect(() => {
    load();
    const handler = (_, pct) => setUploadPct(pct);
    window.electronAPI.onR2UploadProgress(handler);
    
    const preventGlobal = (e) => e.preventDefault();
    window.addEventListener('dragover', preventGlobal);
    window.addEventListener('drop', preventGlobal);

    return () => {
      window.electronAPI.removeAllListeners?.('r2-upload-progress');
      window.removeEventListener('dragover', preventGlobal);
      window.removeEventListener('drop', preventGlobal);
    };
  }, [load]);

  // Save updated URL array back to mods.json
  const save = async (newUrls) => {
    if (!modsKey) return;
    setSaving(true);
    const res = await window.electronAPI.r2SaveModsJson(modsKey, newUrls);
    setSaving(false);
    if (!res.success) setError(res.error || 'Ошибка сохранения');
    return res.success;
  };

  // Upload multiple files → R2, then add URLs to mods.json
  const doUploadMultiple = async (filePaths) => {
    if (!modsPrefix) { setError('Не удалось определить путь модов на R2'); return; }
    if (!filePaths || filePaths.length === 0) return;

    setUploading(true);
    setError('');

    let currentUrls = [...urls];
    let successCount = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const path = filePaths[i];
      const fileName = path.split(/[\\/]/).pop();
      setUploadPct(0);
      setSuccessMsg(`Загрузка (${i + 1}/${filePaths.length}): ${fileName}...`);

      const res = await window.electronAPI.r2UploadFile(modsPrefix, path);
      if (res.canceled) {
        break; // stop on cancel
      }
      if (!res.success) {
        setError(`Ошибка загрузки "${fileName}": ${res.error || 'неизвестная ошибка'}`);
        continue;
      }

      const newUrl = res.url || `${publicBase}/${res.key}`;
      if (!currentUrls.includes(newUrl)) {
        currentUrls.push(newUrl);
        successCount++;
      }
    }

    setUploading(false);
    setUploadPct(0);
    setSuccessMsg('');

    if (successCount > 0) {
      setUrls(currentUrls);
      const saved = await save(currentUrls);
      if (saved) {
        flash(`✓ Загружено модов: ${successCount}`);
        load(); // Reload files mapping
      }
    }
  };

  const handleSelectFiles = async () => {
    if (uploading || saving) return;
    const paths = await window.electronAPI.r2SelectMultipleFiles();
    if (paths && paths.length > 0) {
      await doUploadMultiple(paths);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const paths = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean);
    if (paths.length > 0) {
      await doUploadMultiple(paths);
    }
  };

  const handleDelete = async (url) => {
    // 1. Remove the R2 object
    try {
      const u = new URL(url);
      const key = decodeURIComponent(u.pathname.replace(/^\//, ''));
      await window.electronAPI.r2DeleteFile(key);
    } catch (e) {
      // ignore deletion errors — still remove from json
    }
    // 2. Remove from mods.json
    const newUrls = urls.filter(u => u !== url);
    setUrls(newUrls);
    await save(newUrls);
    setConfirmDelete(null);
    flash('Мод удалён');
    load(); // Reload to refresh both lists
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Drop zone / upload button */}
      <div
        onDragEnter={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleSelectFiles}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '14px', padding: '16px 20px',
          background: dragOver ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', gap: '14px',
          transition: 'all 0.2s', cursor: uploading ? 'default' : 'pointer', flexShrink: 0
        }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          {uploading
            ? <Spinner size={18} color="#818cf8" />
            : <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#818cf8', fontSize: '16px' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
          {uploading ? (
            <>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#e4e4e7' }}>Загрузка файлов на R2...</p>
              <div style={{ marginTop: '6px', width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${uploadPct}%` }} transition={{ ease: 'linear', duration: 0.2 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: '10px' }} />
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>{uploadPct}%</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#e4e4e7' }}>
                Перетащите файлы .jar сюда или нажмите для выбора
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#52525b', fontWeight: 600 }}>
                Файлы загрузятся в <code style={{ color: '#818cf8', fontSize: '10px' }}>{modsPrefix}</code> и автоматически добавятся в mods.json
              </p>
            </>
          )}
        </div>
        {successMsg && <StatusBadge text={successMsg} type="success" />}
        {saving && !uploading && <StatusBadge text="Сохранение..." type="warn" />}
      </div>

      <AnimatePresence>{error && <ErrorBanner msg={error} onClose={() => setError('')} />}</AnimatePresence>

      {/* Mod list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#52525b' }}>
            <Spinner /><span style={{ fontSize: '13px', fontWeight: 600 }}>Загрузка модов...</span>
          </div>
        ) : urls.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#3f3f46' }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: '36px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Список модов пуст</p>
          </div>
        ) : (
          <AnimatePresence>
            {urls.map((url, i) => {
              const name = fileNameFromUrl(url);
              let s3Key = '';
              try {
                const u = new URL(url);
                s3Key = decodeURIComponent(u.pathname.replace(/^\//, ''));
              } catch (e) {}

              const meta = s3Key ? r2Files[s3Key] : null;

              return (
                <motion.div key={url}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.025 } }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '11px', padding: '9px 12px'
                  }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <i className="fa-solid fa-cube" style={{ color: meta ? '#818cf8' : '#fbbf24', fontSize: '13px' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '12px', color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '10px', color: meta ? '#a1a1aa' : '#fbbf24', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta ? `${formatBytes(meta.size)} · ${formatDate(meta.lastModified)}` : '⚠️ Нет файла на R2 (только в mods.json)'}
                    </p>
                  </div>
                  <AnimatePresence mode="wait">
                    {confirmDelete === url ? (
                      <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>Удалить?</span>
                        <button onClick={() => handleDelete(url)}
                          style={{ padding: '4px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                          Да
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          style={{ padding: '4px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: '#71717a' }}>
                          Нет
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button key="del" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setConfirmDelete(url)} title="Удалить мод"
                        style={{ background: 'transparent', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '13px', padding: '3px', flexShrink: 0, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}>
                        <i className="fa-solid fa-trash" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {!loading && urls.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <StatusBadge text={`${urls.length} модов`} type="info" />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={load}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }} />Обновить
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab 2: mods.json raw/structured editor
// ────────────────────────────────────────────────────────────
function ModsJsonTab({ modsKey, publicBase, modsPrefix }) {
  const [raw, setRaw]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [parseError, setParseError] = useState('');
  const [parsed, setParsed]       = useState(null);
  const [viewMode, setViewMode]   = useState('list'); // 'list' | 'raw'
  const [newUrl, setNewUrl]       = useState('');

  const load = useCallback(async () => {
    if (!modsKey) return;
    setLoading(true);
    setError('');
    const res = await window.electronAPI.r2GetModsJson(modsKey);
    setLoading(false);
    if (!res.success) { setError(res.error || 'Ошибка загрузки'); return; }
    const txt = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    setRaw(txt);
    tryParse(txt);
  }, [modsKey]);

  useEffect(() => { load(); }, [load]);

  function tryParse(text) {
    try { setParsed(JSON.parse(text)); setParseError(''); }
    catch (e) { setParsed(null); setParseError(e.message); }
  }

  const handleRawChange = (val) => {
    setRaw(val); tryParse(val); setSaved(false);
  };

  const handleSave = async () => {
    if (parseError) return;
    setSaving(true); setError('');
    let content;
    try { content = JSON.parse(raw); } catch { setError('Невалидный JSON'); setSaving(false); return; }
    const res = await window.electronAPI.r2SaveModsJson(modsKey, content);
    setSaving(false);
    if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError(res.error || 'Ошибка сохранения');
  };

  // For list view: parsed should be string[]
  const urlList = Array.isArray(parsed) ? parsed.map(x => typeof x === 'string' ? x : (x.url || '')).filter(Boolean) : [];

  const addUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const newList = [...urlList, trimmed];
    const txt = JSON.stringify(newList, null, 2);
    setRaw(txt); tryParse(txt); setSaved(false); setNewUrl('');
  };

  const removeUrl = (idx) => {
    const newList = urlList.filter((_, i) => i !== idx);
    const txt = JSON.stringify(newList, null, 2);
    setRaw(txt); tryParse(txt); setSaved(false);
  };

  const updateUrl = (idx, val) => {
    const newList = urlList.map((u, i) => i === idx ? val : u);
    const txt = JSON.stringify(newList, null, 2);
    setRaw(txt); tryParse(txt); setSaved(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        <code style={{ fontSize: '10px', color: '#3f3f46', background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: '6px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {modsKey}
        </code>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '2px', gap: '2px', flexShrink: 0 }}>
          {[{ id: 'list', icon: 'fa-list', label: 'Список' }, { id: 'raw', icon: 'fa-code', label: 'JSON' }].map(m => (
            <motion.button key={m.id} whileTap={{ scale: 0.95 }} onClick={() => setViewMode(m.id)}
              style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                background: viewMode === m.id ? 'rgba(99,102,241,0.3)' : 'transparent',
                color: viewMode === m.id ? '#818cf8' : '#52525b' }}>
              <i className={`fa-solid ${m.icon}`} style={{ marginRight: '4px' }} />{m.label}
            </motion.button>
          ))}
        </div>
        {parseError && <StatusBadge text="Ошибка JSON" type="error" />}
        {saved && <StatusBadge text="Сохранено ✓" type="success" />}
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={handleSave} disabled={saving || !!parseError}
          style={{
            padding: '7px 14px', borderRadius: '10px', border: 'none',
            cursor: parseError ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            background: parseError ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: parseError ? '#3f3f46' : '#fff',
            boxShadow: parseError ? 'none' : '0 4px 14px rgba(99,102,241,0.3)'
          }}>
          {saving ? <Spinner size={14} color="#fff" /> : <i className="fa-solid fa-floppy-disk" />}
          Сохранить
        </motion.button>
      </div>

      <AnimatePresence>{error && <ErrorBanner msg={error} onClose={() => setError('')} />}</AnimatePresence>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#52525b' }}>
          <Spinner /><span style={{ fontSize: '13px', fontWeight: 600 }}>Загрузка mods.json...</span>
        </div>
      ) : viewMode === 'raw' ? (
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <textarea value={raw} onChange={e => handleRawChange(e.target.value)} spellCheck={false}
            style={{
              flex: 1, width: '100%', background: 'rgba(0,0,0,0.35)',
              color: parseError ? '#fca5a5' : '#a5f3fc',
              border: `1px solid ${parseError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '12px', padding: '14px',
              fontFamily: '"JetBrains Mono","Fira Code",monospace',
              fontSize: '12px', lineHeight: '1.7', resize: 'none', outline: 'none', boxSizing: 'border-box'
            }} />
          {parseError && (
            <div style={{ position: 'absolute', bottom: '10px', right: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '7px', padding: '3px 9px' }}>
              <span style={{ color: '#f87171', fontSize: '10px', fontFamily: 'monospace' }}>{parseError}</span>
            </div>
          )}
        </div>
      ) : (
        /* List view — URL strings */
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' }}>
          {/* Add new URL row */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginBottom: '4px' }}>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder={`${publicBase || 'https://mc.diverlin.ru'}/${modsPrefix || ''}имя_мода.jar`}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '9px', padding: '7px 12px', color: '#e4e4e7', fontSize: '12px',
                fontFamily: 'monospace', outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={addUrl} disabled={!newUrl.trim()}
              style={{ padding: '7px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800, background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <i className="fa-solid fa-plus" />
            </motion.button>
          </div>

          {urlList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#3f3f46' }}>
              <i className="fa-solid fa-file-code" style={{ fontSize: '32px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>mods.json пуст</p>
            </div>
          ) : urlList.map((url, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.02 } }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '28px', textAlign: 'right', fontSize: '10px', color: '#3f3f46', fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>
                {idx + 1}
              </span>
              <input value={url} onChange={e => updateUrl(idx, e.target.value)}
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px', padding: '6px 10px', color: '#a5f3fc', fontSize: '11px',
                  fontFamily: 'monospace', outline: 'none', minWidth: 0
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
              />
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => removeUrl(idx)}
                style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '12px', padding: '3px', flexShrink: 0, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}>
                <i className="fa-solid fa-trash" />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab 3: Generic R2 file browser
// ────────────────────────────────────────────────────────────
function FileBrowserTab({ rootPrefix }) {
  const [prefix, setPrefix]         = useState(rootPrefix || '');
  const [files, setFiles]           = useState([]);
  const [folders, setFolders]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingKey, setDeletingKey]   = useState(null);
  const [dragOver, setDragOver]     = useState(false);

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = useCallback(async (p) => {
    const target = (p !== undefined ? p : prefix) || rootPrefix || '';
    setLoading(true); setError('');
    const res = await window.electronAPI.r2ListFiles(target);
    setLoading(false);
    if (res.success) { setFiles(res.files || []); setFolders(res.folders || []); }
    else setError(res.error || 'Ошибка получения списка файлов');
  }, [prefix, rootPrefix]);

  useEffect(() => {
    setPrefix(rootPrefix || '');
    load(rootPrefix || '');
    const handler = (_, pct) => setUploadPct(pct);
    window.electronAPI.onR2UploadProgress(handler);

    const preventGlobal = (e) => e.preventDefault();
    window.addEventListener('dragover', preventGlobal);
    window.addEventListener('drop', preventGlobal);

    return () => {
      window.electronAPI.removeAllListeners?.('r2-upload-progress');
      window.removeEventListener('dragover', preventGlobal);
      window.removeEventListener('drop', preventGlobal);
    };
  }, [rootPrefix]);

  const navigate = (newPrefix) => { setPrefix(newPrefix); load(newPrefix); };
  const goUp = () => {
    const parts = prefix.replace(/\/$/, '').split('/');
    parts.pop();
    const up = parts.length ? parts.join('/') + '/' : '';
    navigate(up || rootPrefix);
  };

  const doUploadMultiple = async (filePaths) => {
    if (!filePaths || filePaths.length === 0) return;
    setUploading(true);
    setError('');
    let successCount = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const path = filePaths[i];
      const fileName = path.split(/[\\/]/).pop();
      setUploadPct(0);
      setSuccessMsg(`Загрузка (${i + 1}/${filePaths.length}): ${fileName}...`);

      const res = await window.electronAPI.r2UploadFile(prefix, path);
      if (res.canceled) break;
      if (res.success) {
        successCount++;
      } else {
        setError(`Ошибка загрузки "${fileName}": ${res.error || 'неизвестная ошибка'}`);
      }
    }

    setUploading(false);
    setUploadPct(0);
    setSuccessMsg('');
    if (successCount > 0) {
      flash(`✓ Загружено файлов: ${successCount}`);
      load(prefix);
    }
  };

  const handleSelectFiles = async () => {
    if (uploading) return;
    const paths = await window.electronAPI.r2SelectMultipleFiles();
    if (paths && paths.length > 0) {
      await doUploadMultiple(paths);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault(); setDragOver(false);
    if (uploading) return;
    const paths = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean);
    if (paths.length > 0) {
      await doUploadMultiple(paths);
    }
  };

  const handleDelete = async (key) => {
    setDeletingKey(key);
    const res = await window.electronAPI.r2DeleteFile(key);
    setDeletingKey(null); setConfirmDelete(null);
    if (res.success) load(prefix);
    else setError(res.error || 'Ошибка удаления');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={goUp} disabled={prefix === rootPrefix}
          style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: prefix === rootPrefix ? '#3f3f46' : '#a1a1aa', cursor: prefix === rootPrefix ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }} />
        </motion.button>
        <code style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          /{prefix}
        </code>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={handleSelectFiles}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8', flexShrink: 0 }}>
          {uploading ? <><Spinner size={14} color="#818cf8" />{uploadPct}%</> : <><i className="fa-solid fa-cloud-arrow-up" />Загрузить</>}
          {successMsg && <span style={{ color: '#34d399', marginLeft: '4px' }}>{successMsg}</span>}
        </motion.button>
      </div>

      <AnimatePresence>{error && <ErrorBanner msg={error} onClose={() => setError('')} />}</AnimatePresence>

      {/* File list */}
      <div
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px',
          border: dragOver ? '2px dashed rgba(99,102,241,0.5)' : '2px dashed transparent',
          borderRadius: '12px', transition: 'border 0.2s'
        }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#52525b' }}>
            <Spinner /><span style={{ fontSize: '13px', fontWeight: 600 }}>Загрузка...</span>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#3f3f46' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '34px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Папка пуста</p>
          </div>
        ) : (
          <>
            {folders.map((folder, i) => (
              <motion.div key={folder.key}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.02 } }}
                onClick={() => navigate(folder.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px', padding: '8px 12px', cursor: 'pointer' }}
                whileHover={{ background: 'rgba(255,255,255,0.05)' }}>
                <i className="fa-solid fa-folder" style={{ color: '#fbbf24', fontSize: '15px' }} />
                <span style={{ fontWeight: 700, fontSize: '12px', color: '#e4e4e7', flex: 1 }}>{folder.name}/</span>
                <i className="fa-solid fa-chevron-right" style={{ color: '#3f3f46', fontSize: '10px' }} />
              </motion.div>
            ))}
            {files.map((file, i) => (
              <motion.div key={file.key}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: (folders.length + i) * 0.02 } }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '9px', padding: '8px 12px' }}>
                <i className="fa-solid fa-file" style={{ color: '#52525b', fontSize: '13px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '12px', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#3f3f46', fontWeight: 600 }}>{formatBytes(file.size)} · {formatDate(file.lastModified)}</p>
                </div>
                <AnimatePresence mode="wait">
                  {confirmDelete === file.key ? (
                    <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>Удалить?</span>
                      <button onClick={() => handleDelete(file.key)} disabled={deletingKey === file.key}
                        style={{ padding: '3px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                        {deletingKey === file.key ? '...' : 'Да'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ padding: '3px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: '#71717a' }}>
                        Нет
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button key="d" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setConfirmDelete(file.key)}
                      style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '12px', padding: '3px', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}>
                      <i className="fa-solid fa-trash" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Root component
// ────────────────────────────────────────────────────────────
export default function OfficialBuildManagerPage({ currentPack, onBack }) {
  const [tab, setTab] = useState('mods');
  const { modsKey, modsPrefix, rootPrefix, publicBase } = deriveKeys(currentPack);
  const noUrl = !currentPack.modsJsonUrl;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'rgba(10,10,16,0.55)', backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0
      }}>
        <motion.button whileHover={{ scale: 1.08, x: -2 }} whileTap={{ scale: 0.92 }} onClick={onBack}
          style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: '12px' }} />
        </motion.button>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="fa-solid fa-cloud" style={{ color: '#818cf8', fontSize: '14px' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#fff' }}>Управление сборкой</h2>
          <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#52525b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentPack.name} · {rootPrefix || '—'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>R2</span>
        </div>
      </div>

      {!noUrl && (
        <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
          <TabBar active={tab} onChange={setTab} />
        </div>
      )}

      <div style={{ flex: 1, padding: '14px 18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {noUrl ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '14px', color: '#71717a', textAlign: 'center',
                padding: '40px 20px', background: 'rgba(255,255,255,0.01)',
                border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '16px'
              }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', fontSize: '22px' }} />
              </div>
              <h3 style={{ margin: 0, color: '#e4e4e7', fontSize: '15px', fontWeight: 800 }}>modsJsonUrl не настроен</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#71717a', lineHeight: '1.6', maxWidth: '360px' }}>
                В настройках этой сборки не указан адрес файла <code style={{ color: '#fbbf24', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>mods.json</code>.
                Пожалуйста, пропишите его, чтобы разблокировать доступ к управлению R2 и модам.
              </p>
            </motion.div>
          ) : (
            <motion.div key={tab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.16 } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
              style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {tab === 'mods'  && <ModsTab  modsKey={modsKey} modsPrefix={modsPrefix} publicBase={publicBase} />}
              {tab === 'json'  && <ModsJsonTab modsKey={modsKey} publicBase={publicBase} modsPrefix={modsPrefix} />}
              {tab === 'files' && <FileBrowserTab rootPrefix={rootPrefix} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
