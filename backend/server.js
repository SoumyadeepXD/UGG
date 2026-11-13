import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEF } from './defaultContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure data and uploads directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize content.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEF, null, 2), 'utf8');
  console.log('[UGG Backend] Initialized default content database.');
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (req, file, cb) => {
    // accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are supported.'));
    }
  },
});

// Helper: read content
function readContent() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[UGG Backend] Error reading content.json, falling back to DEF:', err);
    return structuredClone(DEF);
  }
}

// Helper: save content
function writeContent(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[UGG Backend] Error writing content.json:', err);
    return false;
  }
}

// Helper: sync content to GitHub repository via REST API (if GITHUB_TOKEN configured)
async function syncToGitHub(contentData) {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  if (!token) {
    return { synced: false, reason: 'no_token' };
  }

  const repo = process.env.GITHUB_REPO || 'SoumyadeepXD/UGG';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filesToSync = [
    'backend/data/content.json',
    'react-version/public/content.json',
    'content.json'
  ];

  const contentStr = JSON.stringify(contentData, null, 2);
  const base64Content = Buffer.from(contentStr).toString('base64');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'UGG-Backend-Sync',
  };

  const results = [];
  for (const filePath of filesToSync) {
    try {
      let sha = undefined;
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`, { headers });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `chore(content): update ${filePath} via UGG Admin Portal [skip ci]`,
          content: base64Content,
          sha,
          branch,
        }),
      });

      results.push({ path: filePath, ok: putRes.ok, status: putRes.status });
    } catch (err) {
      console.warn(`[UGG Backend] Error committing ${filePath} to GitHub:`, err.message);
      results.push({ path: filePath, ok: false, error: err.message });
    }
  }

  const success = results.some((r) => r.ok);
  return { synced: success, details: results };
}

/* ========================================================
   API ROUTES
======================================================== */

// 1. Health & Server Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'UGG (UEM Gamerz Guild) Backend',
    githubSyncEnabled: !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
    timestamp: new Date().toISOString(),
  });
});

// 2. Full Content API
app.get('/api/content', (req, res) => {
  const content = readContent();
  res.json(content);
});

app.post('/api/content', async (req, res) => {
  const newContent = req.body;
  if (!newContent || typeof newContent !== 'object') {
    return res.status(400).json({ error: 'Invalid content data payload.' });
  }

  const ok = writeContent(newContent);
  if (!ok) {
    return res.status(500).json({ error: 'Failed to write content to disk.' });
  }

  // Attempt GitHub commit if token is configured in environment
  let ghSync = { synced: false };
  try {
    ghSync = await syncToGitHub(newContent);
  } catch (err) {
    console.warn('[UGG Backend] GitHub sync error:', err.message);
  }

  res.json({
    success: true,
    message: 'Content saved successfully.',
    githubSynced: ghSync.synced,
    content: newContent,
  });
});

// 2b. Publish & Push to GitHub Pages
app.post('/api/publish', async (req, res) => {
  try {
    const newContent = req.body;
    if (newContent && typeof newContent === 'object' && Object.keys(newContent).length > 0) {
      writeContent(newContent);
    }
    const contentData = readContent();

    // 1. If GITHUB_TOKEN is available on the server (e.g. Render environment), sync via REST API!
    const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
    if (token) {
      console.log('[UGG Backend] Publishing to GitHub via REST API token...');
      const ghRes = await syncToGitHub(contentData);
      if (ghRes.synced) {
        return res.json({
          success: true,
          message: 'Published successfully to GitHub via API! GitHub Pages is building now (~30s).',
        });
      }
    }

    // 2. Otherwise, if running locally in developer workspace, try local git push
    const rootDir = path.join(__dirname, '..');
    const contentJsPath = path.join(rootDir, 'react-version', 'src', 'content.js');
    const contentJsCode = `export const DEF = ${JSON.stringify(contentData, null, 2)};\n`;

    try {
      fs.writeFileSync(contentJsPath, contentJsCode, 'utf8');
      fs.writeFileSync(path.join(rootDir, 'react-version', 'public', 'content.json'), JSON.stringify(contentData, null, 2), 'utf8');
      fs.writeFileSync(path.join(rootDir, 'content.json'), JSON.stringify(contentData, null, 2), 'utf8');
    } catch (e) {
      console.warn('[UGG Backend] Could not sync static files locally:', e.message);
    }

    if (fs.existsSync(path.join(rootDir, '.git'))) {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);

      console.log('[UGG Backend] Running build before git push...');
      await execPromise('npm run build', { cwd: rootDir });

      console.log('[UGG Backend] Committing and pushing to GitHub...');
      await execPromise('git add -A && git commit -m "chore(content): update website content via admin portal" && git push origin main', { cwd: rootDir });

      return res.json({
        success: true,
        message: 'Published successfully to GitHub! GitHub Pages will update in ~30 seconds.',
      });
    }

    return res.json({
      success: true,
      message: 'Saved to cloud server! Add GITHUB_TOKEN to Render environment to enable automatic GitHub Pages builds.',
    });
  } catch (err) {
    console.error('[UGG Backend] Error during publish:', err);
    return res.status(500).json({
      error: err.message || 'Failed to publish to GitHub',
      details: err.stderr || err.stdout,
    });
  }
});

// 3. Tournaments / Events Endpoints
app.get('/api/tournaments', (req, res) => {
  const content = readContent();
  res.json(content.events?.items || []);
});

app.post('/api/tournaments', (req, res) => {
  const content = readContent();
  if (!content.events) content.events = { items: [] };
  if (!Array.isArray(content.events.items)) content.events.items = [];

  const tournament = req.body;
  if (!tournament.title) {
    return res.status(400).json({ error: 'Tournament title is required.' });
  }

  // Ensure default structure
  const item = {
    title: tournament.title,
    game: tournament.game || 'Esports',
    status: tournament.status || 'upcoming',
    date: tournament.date || 'TBA',
    meta: tournament.meta || tournament.prizePool || 'Open',
    img: tournament.img || tournament.posterUrl || '',
    url: tournament.url || tournament.formUrl || '#',
    cta: tournament.cta || (tournament.status === 'live' ? 'Register now' : 'Details'),
    description: tournament.description || '',
    format: tournament.format || '',
    platform: tournament.platform || '',
    prizePool: tournament.prizePool || '',
    formUrl: tournament.formUrl || tournament.url || '#',
    id: tournament.id || `ugg-${Date.now()}`,
  };

  content.events.items.unshift(item);
  writeContent(content);
  res.status(201).json({ success: true, item, tournaments: content.events.items });
});

app.put('/api/tournaments/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.events?.items?.[index]) {
    return res.status(404).json({ error: 'Tournament not found at given index.' });
  }

  content.events.items[index] = { ...content.events.items[index], ...req.body };
  writeContent(content);
  res.json({ success: true, item: content.events.items[index], tournaments: content.events.items });
});

app.delete('/api/tournaments/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.events?.items?.[index]) {
    return res.status(404).json({ error: 'Tournament not found at index.' });
  }

  const removed = content.events.items.splice(index, 1);
  writeContent(content);
  res.json({ success: true, removed: removed[0], tournaments: content.events.items });
});

// 4. Team Members & Designations Endpoints
app.get('/api/team', (req, res) => {
  const content = readContent();
  res.json(content.team?.items || []);
});

app.post('/api/team', (req, res) => {
  const content = readContent();
  if (!content.team) content.team = { items: [] };
  if (!Array.isArray(content.team.items)) content.team.items = [];

  const member = req.body;
  if (!member.name || !member.role) {
    return res.status(400).json({ error: 'Name and designation (role) are required.' });
  }

  const newMember = {
    name: member.name,
    role: member.role,
    img: member.img || '',
    link: member.link || '',
  };

  content.team.items.push(newMember);
  writeContent(content);
  res.status(201).json({ success: true, item: newMember, team: content.team.items });
});

app.put('/api/team/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.team?.items?.[index]) {
    return res.status(404).json({ error: 'Member not found at given index.' });
  }

  content.team.items[index] = { ...content.team.items[index], ...req.body };
  writeContent(content);
  res.json({ success: true, item: content.team.items[index], team: content.team.items });
});

app.delete('/api/team/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.team?.items?.[index]) {
    return res.status(404).json({ error: 'Member not found at index.' });
  }

  const removed = content.team.items.splice(index, 1);
  writeContent(content);
  res.json({ success: true, removed: removed[0], team: content.team.items });
});

// 5. Gallery Endpoints
app.get('/api/gallery', (req, res) => {
  const content = readContent();
  res.json(content.gallery?.items || []);
});

app.post('/api/gallery', (req, res) => {
  const content = readContent();
  if (!content.gallery) content.gallery = { items: [] };
  if (!Array.isArray(content.gallery.items)) content.gallery.items = [];

  const item = req.body;
  if (!item.img && !item.caption) {
    return res.status(400).json({ error: 'Image URL/Data or Caption is required.' });
  }

  const newGalleryItem = {
    img: item.img || '',
    caption: item.caption || 'UGG Community Moment',
  };

  content.gallery.items.unshift(newGalleryItem);
  writeContent(content);
  res.status(201).json({ success: true, item: newGalleryItem, gallery: content.gallery.items });
});

app.put('/api/gallery/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.gallery?.items?.[index]) {
    return res.status(404).json({ error: 'Gallery item not found at index.' });
  }

  content.gallery.items[index] = { ...content.gallery.items[index], ...req.body };
  writeContent(content);
  res.json({ success: true, item: content.gallery.items[index], gallery: content.gallery.items });
});

app.delete('/api/gallery/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const content = readContent();
  if (!content.gallery?.items?.[index]) {
    return res.status(404).json({ error: 'Gallery item not found at index.' });
  }

  const removed = content.gallery.items.splice(index, 1);
  writeContent(content);
  res.json({ success: true, removed: removed[0], gallery: content.gallery.items });
});

// 6. File Upload Endpoint (Posters, Avatars, Gallery Images, Videos)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const relativeUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: relativeUrl,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// 7. Google Sheet CSV Sync (from SoumyadeepXD/UGG_UEM-GAMERZ-GUILD)
app.post('/api/sync-sheet', async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl || !sheetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'A valid HTTP(S) Google Sheet CSV URL is required.' });
  }

  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Google Sheets returned HTTP ${response.status}` });
    }

    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or missing headers.' });
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
    const importedTournaments = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const values = [];
      let inQuotes = false;
      let cur = '';

      for (let j = 0; j < row.length; j++) {
        const c = row[j];
        if (c === '"' || c === "'") {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      values.push(cur.trim());

      const getVal = (name, fallback = '') => {
        const idx = headers.findIndex((h) => h.includes(name));
        return idx !== -1 && values[idx] ? values[idx].replace(/^["']|["']$/g, '') : fallback;
      };

      const title = getVal('title') || getVal('name');
      if (!title) continue;

      importedTournaments.push({
        title,
        game: getVal('game', 'Esports'),
        date: getVal('date', 'TBA'),
        meta: getVal('prize', getVal('meta', 'Prize & Glory')),
        img: getVal('poster', getVal('image', '')),
        url: getVal('form', getVal('link', getVal('url', '#'))),
        status: getVal('status', 'upcoming').toLowerCase(),
        cta: getVal('cta', 'Register'),
        prizePool: getVal('prize', ''),
        format: getVal('format', ''),
        platform: getVal('platform', ''),
        description: getVal('description', ''),
      });
    }

    if (importedTournaments.length === 0) {
      return res.status(400).json({ error: 'No tournaments could be parsed from the CSV.' });
    }

    const content = readContent();
    if (!content.events) content.events = { items: [] };
    content.events.items = importedTournaments;
    writeContent(content);

    res.json({
      success: true,
      count: importedTournaments.length,
      tournaments: importedTournaments,
    });
  } catch (err) {
    console.error('[UGG Backend] Failed to sync Google Sheet:', err);
    res.status(500).json({ error: 'Failed to fetch and parse Google Sheet: ' + err.message });
  }
});

// 8. Reset to Defaults
app.post('/api/reset', (req, res) => {
  const ok = writeContent(DEF);
  if (ok) {
    res.json({ success: true, message: 'Database reset to default template.', content: DEF });
  } else {
    res.status(500).json({ error: 'Failed to reset database.' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🎮 UGG Backend Server running at http://localhost:${PORT}`);
  console.log(`📁 Uploads available at http://localhost:${PORT}/uploads`);
  console.log(`📡 API Endpoints active at http://localhost:${PORT}/api/`);
  console.log(`===============================================`);
});
