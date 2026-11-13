import { DEF } from './content.js';

export const DEFAULT_RENDER_API = 'https://ugg-backend.onrender.com';

/** Returns the active backend API host */
export const getApiHost = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('ugg-api-host');
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  }
  return import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? (window.location.port === '5173' ? '' : 'http://localhost:5001')
      : DEFAULT_RENDER_API
  );
};

export const API_HOST = getApiHost();

export const setCustomApiHost = (url) => {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem('ugg-api-host');
  } else {
    localStorage.setItem('ugg-api-host', url.trim().replace(/\/+$/, ''));
  }
};

export const fixImgUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    const host = getApiHost();
    return host ? `${host}${url}` : '.' + url;
  }
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
  const host = getApiHost();
  if (!host && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return false;
  }
  try {
    const res = await fetch(`${host}/api/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

/** Fetches latest content from: 1) Online API -> 2) Static content.json -> 3) LocalStorage -> 4) DEF */
export const fetchBackendContent = async () => {
  const host = getApiHost();

  // 1. Try configured backend API first (local or remote)
  if (host || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    try {
      const res = await fetch(`${host}/api/content`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const merged = merge(DEF, data);
        save(merged);
        return merged;
      }
    } catch {
      console.info('Backend API unreachable, checking static content.json...');
    }
  }

  // 2. Try fetching static content.json directly from GitHub Pages
  try {
    const res = await fetch(`./content.json?_t=${Date.now()}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const merged = merge(DEF, data);
      save(merged);
      return merged;
    }
  } catch {
    console.info('Static content.json not reachable, loading cached local storage.');
  }

  // 3. Fallback to localStorage or default
  return load();
};

/** Saves content to backend server AND localStorage */
export const saveToBackend = async (content) => {
  save(content);
  const host = getApiHost();
  let savedToBackend = false;
  try {
    const res = await fetch(`${host}/api/content`, {
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

/** Publishes content via the local/cloud Node backend which commits & pushes to GitHub */
export const publishViaBackend = async (content) => {
  const host = getApiHost();
  const res = await fetch(`${host}/api/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
    signal: AbortSignal.timeout(90000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Publish request failed (HTTP ${res.status})`);
  }
  return data;
};

/** Directly commits updated content to GitHub repository via GitHub REST API (No server required!) */
export const publishToGitHub = async (token, content) => {
  if (!token || !token.trim()) throw new Error('Please enter your GitHub Personal Access Token.');

  const repo = 'SoumyadeepXD/UGG';
  const filePath = 'backend/data/content.json';
  const cleanToken = token.trim();
  const headers = {
    'Authorization': `Bearer ${cleanToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  // 1. Fetch current file SHA
  let sha = undefined;
  try {
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=main&_t=${Date.now()}`, { headers });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }
  } catch (e) {
    console.warn('Could not retrieve current SHA:', e);
  }

  // 2. Put updated content
  const contentStr = JSON.stringify(content, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(contentStr)));

  const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'chore(content): update website content via UGG Admin Portal [skip ci]',
      content: base64Content,
      sha,
      branch: 'main',
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    if (putRes.status === 401 || putRes.status === 403) {
      throw new Error('Invalid GitHub Token or token lacks "repo" permissions.');
    }
    throw new Error(err.message || `GitHub API returned error HTTP ${putRes.status}`);
  }

  // 3. Also update public/content.json so GitHub Pages static serves it immediately
  try {
    const pubPath = 'react-version/public/content.json';
    const pubGet = await fetch(`https://api.github.com/repos/${repo}/contents/${pubPath}?ref=main&_t=${Date.now()}`, { headers });
    let pubSha = undefined;
    if (pubGet.ok) {
      const pubData = await pubGet.json();
      pubSha = pubData.sha;
    }
    await fetch(`https://api.github.com/repos/${repo}/contents/${pubPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'chore(content): sync public content.json via UGG Admin Portal',
        content: base64Content,
        sha: pubSha,
        branch: 'main',
      }),
    });
  } catch (e) {
    console.warn('Could not update public/content.json directly:', e);
  }

  return await putRes.json();
};

/** Uploads file to backend server or falls back to DataURL */
export const uploadFile = async (file) => {
  if (!file) return null;
  const host = getApiHost();

  // Try backend file upload first if host is available
  if (host || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${host}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const json = await res.json();
        const fullUrl = json.url.startsWith('http') ? json.url : `${host}${json.url}`;
        return fullUrl;
      }
    } catch (err) {
      console.warn('Backend file upload failed, falling back to DataURL:', err);
    }
  }

  // Fallback to FileReader base64 DataURL (works 100% offline and on static GitHub Pages)
  return new Promise((resolve, reject) => {
    if (file.size > 2.5 * 1024 * 1024) {
      return reject(new Error('File exceeds 2.5 MB limit for browser-only mode. Use a smaller image/poster or deploy the backend.'));
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
  const host = getApiHost();

  // Try backend sync first if available
  if (host) {
    try {
      const res = await fetch(`${host}/api/sync-sheet`, {
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
