import { DEF } from './content.js';

export const API_HOST = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '5173' ? '' : 'http://localhost:5001')
    : ''
);

export const fixImgUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return '.' + url;
  return url;
};

export const merge = (a, b) => {
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b === undefined ? a : b;
  const o = { ...a };
  for (const k in b || {}) o[k] = merge(a[k], b[k]);
  return o;
};

export const sha = async (t) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ugg:' + t)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

export const load = () => {
  try {
    const local = localStorage.getItem('ugg-content');
    if (local) return merge(DEF, JSON.parse(local));
  } catch (e) {
    console.warn('Could not read from localStorage:', e);
  }
  return structuredClone(DEF);
};

export const save = (c) => {
  try {
    localStorage.setItem('ugg-content', JSON.stringify(c));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
};

/** Checks if the backend server is reachable */
export const checkBackendStatus = async () => {
  try {
    const res = await fetch(`${API_HOST}/api/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

/** Fetches latest content from backend, updating localStorage, or falls back to local */
export const fetchBackendContent = async () => {
  try {
    const res = await fetch(`${API_HOST}/api/content`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const merged = merge(DEF, data);
      save(merged);
      return merged;
    }
  } catch (err) {
    console.info('Backend unreachable, using local content storage.');
  }
  return load();
};

/** Saves content to backend server AND localStorage */
export const saveToBackend = async (content) => {
  save(content);
  let savedToBackend = false;
  try {
    const res = await fetch(`${API_HOST}/api/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      savedToBackend = true;
    }
  } catch (err) {
    console.warn('Failed to sync to backend server:', err);
  }
  return { success: true, backend: savedToBackend };
};

/** Uploads file to backend server or falls back to DataURL */
export const uploadFile = async (file) => {
  if (!file) return null;

  // Try backend file upload first
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_HOST}/api/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      // Prefix with API_HOST if relative
      const fullUrl = json.url.startsWith('http') ? json.url : `${API_HOST}${json.url}`;
      return fullUrl;
    }
  } catch (err) {
    console.warn('Backend file upload failed, falling back to DataURL:', err);
  }

  // Fallback to FileReader base64 DataURL
  return new Promise((resolve, reject) => {
    if (file.size > 2.5 * 1024 * 1024) {
      return reject(new Error('File exceeds 2.5 MB limit for local mode. Run the backend server for large files.'));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file locally.'));
    reader.readAsDataURL(file);
  });
};

/** Syncs tournaments from Google Sheet CSV */
export const syncGoogleSheet = async (sheetUrl) => {
  if (!sheetUrl) throw new Error('Sheet URL is required.');

  // Try backend sync first
  try {
    const res = await fetch(`${API_HOST}/api/sync-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.tournaments;
    }
  } catch (err) {
    console.warn('Backend Google Sheet sync failed, trying direct browser fetch:', err);
  }

  // Client-side fallback
  const response = await fetch(sheetUrl);
  if (!response.ok) throw new Error(`Google Sheet returned HTTP ${response.status}`);
  const csv = await response.text();
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV is empty or missing headers.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
  const tournaments = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const values = [];
    let inQuotes = false;
    let cur = '';
    for (let j = 0; j < row.length; j++) {
      const c = row[j];
      if (c === '"' || c === "'") inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { values.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    values.push(cur.trim());

    const getVal = (name, fallback = '') => {
      const idx = headers.findIndex((h) => h.includes(name));
      return idx !== -1 && values[idx] ? values[idx].replace(/^["']|["']$/g, '') : fallback;
    };

    const title = getVal('title') || getVal('name');
    if (!title) continue;

    tournaments.push({
      title,
      game: getVal('game', 'Esports'),
      date: getVal('date', 'TBA'),
      meta: getVal('prize', 'Open Bracket'),
      img: getVal('poster', ''),
      url: getVal('form', getVal('link', '#')),
      status: (getVal('status', 'upcoming').toLowerCase()) || 'upcoming',
      cta: 'Register',
    });
  }

  if (tournaments.length === 0) throw new Error('No valid tournaments found in CSV.');
  return tournaments;
};
