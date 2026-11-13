# 🧭 UGG Developer & Handover Guide

Welcome to the **UGG (UEM Gamerz Guild)** repository! This guide is written so that **anyone who works on this project after you** can understand the entire architecture, find any file in seconds, modify content safely, and troubleshoot any issue.

---

## ⚡ Quick Start: Running the Project Locally

| Purpose | Command | Notes |
| :--- | :--- | :--- |
| **Start Backend API Server** | `npm run backend` | Runs on `http://localhost:5001` |
| **Start Backend with Auto-Reload** | `npm run dev:backend` | Restarts automatically on code edits |
| **Start Frontend (Vite Dev)** | `npm run frontend` | Live Hot-Reload at `http://localhost:5173` |
| **Compile for Production** | `npm run build` | Compiles React and updates root `index.html` & `assets/` |

---

## 🗺️ Project Architecture & File Map

```
ugg-website/
├── backend/                           # 🚀 Node.js + Express Backend Server
│   ├── server.js                      # REST API endpoints (GET/POST /api/content, /api/upload)
│   ├── data/
│   │   └── content.json               # 💾 MASTER DATABASE: Live site content & saved state
│   ├── uploads/                       # 📁 Uploaded tournament posters, avatars, gallery photos
│   └── defaultContent.js              # Factory reset content template
│
├── react-version/                     # ⚛️ React + Vite Frontend Source Code
│   ├── src/
│   │   ├── App.jsx                    # 🖥️ Main website sections & layout
│   │   ├── Admin.jsx                  # 🎛️ Admin Control Center Dashboard (#admin)
│   │   ├── styles.css                 # 🎨 Global styles, 5:4 poster ratio, animations
│   │   ├── content.js                 # 📦 Default offline content fallback
│   │   ├── util.js                    # 🛠️ Backend API helpers, image fixers, hash utils
│   │   └── main.jsx                   # React DOM entrypoint
│   ├── vite.config.js                 # Proxy config (proxies /api and /uploads to port 5001)
│   └── package.json                   # Frontend dependencies
│
├── index.html                         # 🌐 Production entrypoint (built from react-version)
├── assets/                            # 📦 Production CSS & JS bundles (built from react-version)
├── uploads/                           # 📁 Public uploaded images mirror
├── standalone.html                    # Single-file HTML fallback with no build required
├── DEVELOPER_GUIDE.md                 # 📖 You are here!
└── README.md                          # Repository overview
```

---

## 🔍 Where Do I Find What? (Cheat Sheet)

If you need to change anything in the frontend, refer to this table:

| What do you want to modify? | Which file to open? | Exact location / Component |
| :--- | :--- | :--- |
| **Social handles (Discord, Insta, etc.)** | [`react-version/src/Admin.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/Admin.jsx) OR [`backend/data/content.json`](file:///Users/soumyadeepxd/Developer/ugg-website/backend/data/content.json) | Admin tab `🌐 Socials & Footer` or key `"socials"` |
| **Tournament Posters & Cards** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `<section id="events">` (Line ~365) |
| **Poster 5:4 aspect ratio & hover animations** | [`react-version/src/styles.css`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/styles.css) | `.evg`, `.ev`, `.ev img`, `.ev-sheen` |
| **Hero section (Headline, Canvas/Video)** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `function Hero` (Line ~140) |
| **Event Timeline Roadmap** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `function Timeline` (Line ~167) |
| **Team members & 3D Tilt Cards** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `function Member` (Line ~222) & `<section id="team">` |
| **Photo Gallery Lightbox** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `<section id="gallery">` (Line ~408) |
| **Sponsors marquee ticker** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `<section id="sponsors">` (Line ~421) |
| **Join section & Community badges** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `<section id="join">` (Line ~457) |
| **Footer & copyright lines** | [`react-version/src/App.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/App.jsx) | `<footer>` and `.copy` (Line ~463) |
| **Brand Colors (`--red`, `--bg`)** | [`react-version/src/styles.css`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/styles.css) | `:root` (Line 1) or Admin `Theme` tab |
| **Admin Login & Dashboard logic** | [`react-version/src/Admin.jsx`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/Admin.jsx) | Entire file |

---

## 🌐 Managing Social Handles & Links

Social handles appear in two key places:
1. **Interactive Community Pills** in the `#join` section ("Be A Part Of UGG").
2. **Footer quick links** at the bottom of the page.

### Method 1: Via the Visual Admin Panel (No Coding Required)
1. Open the website and click **"Admin Control"** in the footer (or navigate to `#admin`).
2. Log in with the default passkey: `ugg2026` or `ugg-admin-2026`.
3. Click the **"🌐 Socials & Footer"** tab.
4. Select a platform preset (Discord, Instagram, YouTube, Twitch, WhatsApp, X, LinkedIn, etc.) or choose **Custom**.
5. Paste your link (e.g. `https://discord.gg/yourserver` or `https://instagram.com/ugg_uem`).
6. Click **"+ Add Social Handle"**.
7. Click **"💾 Save & Publish"** at the top right. Done!

### Method 2: Via Code / Content Database
Open [`backend/data/content.json`](file:///Users/soumyadeepxd/Developer/ugg-website/backend/data/content.json) and locate the `"socials"` array:
```json
"socials": [
  { "t": "Discord", "u": "https://discord.gg/yourinvite" },
  { "t": "Instagram", "u": "https://instagram.com/yourhandle" },
  { "t": "YouTube", "u": "https://youtube.com/@yourchannel" },
  { "t": "Twitch", "u": "https://twitch.tv/yourchannel" },
  { "t": "WhatsApp", "u": "https://chat.whatsapp.com/yourgroup" }
]
```

---

## 🖼️ How the 5:4 Poster Section Works

The tournament showcase (`#events`) enforces a strict **5:4 aspect ratio** so posters never stretch or deform:

- **CSS Rules** (in [`react-version/src/styles.css`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/styles.css)):
  - `.ev`: Has `aspect-ratio: 5 / 4;` and `width: 100%;`.
  - `.ev img`: Has `aspect-ratio: 5 / 4;` and `object-fit: cover; object-position: center;`.
  - `.evg`: CSS Grid with `repeat(auto-fit, minmax(min(100%, 320px), 1fr))`.
- **Animations**:
  - `transform: translateY(-8px) scale(1.02);` card lift on hover.
  - `.ev-sheen`: Light beam sweeps across the poster face diagonally.
  - Image scales smoothly to `scale(1.06)`.
  - Live tournament cards feature an active rotating conic neon border (`--a` gradient animation).

---

## 🔄 Content Hierarchy & Data Flow

Understanding how data loads prevents confusion:

```
                  ┌──────────────────────────────┐
                  │ Admin UI (#admin) in browser │
                  └──────────────┬───────────────┘
                                 │ Save
                                 ▼
                 ┌────────────────────────────────┐
                 │ Backend Server (port 5001)     │
                 │ writes to:                     │
                 │ backend/data/content.json      │
                 └───────────────┬────────────────┘
                                 │ Fetch on page load (/api/content)
                                 ▼
                 ┌────────────────────────────────┐
                 │ Frontend UI (App.jsx)          │
                 │ Falls back to:                 │
                 │ 1. sessionStorage / localStorage│
                 │ 2. react-version/src/content.js│
                 └────────────────────────────────┘
```

1. When the page loads, `App.jsx` calls `fetchBackendContent()`.
2. If the backend is running, it returns the master content from [`backend/data/content.json`](file:///Users/soumyadeepxd/Developer/ugg-website/backend/data/content.json).
3. If the backend is offline (e.g. static GitHub Pages), it loads the last saved browser cache or default content in [`react-version/src/content.js`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/content.js).

---

## 🛠️ Common Troubleshooting

### 1. "Port 5001 already in use"
If the backend fails to start because port 5001 is busy:
```bash
lsof -i :5001
kill -9 <PID>
npm run backend
```

### 2. Images uploaded in Admin don't display
Check the URL format. Local uploads are stored in `backend/uploads/` and served at `http://localhost:5001/uploads/filename.jpg`.
Always wrap image URLs with `fixImgUrl(url)` (defined in [`react-version/src/util.js`](file:///Users/soumyadeepxd/Developer/ugg-website/react-version/src/util.js)).

### 3. I made frontend changes in `react-version/src/`, but root `index.html` didn't change!
Remember to run the build command:
```bash
npm run build
```
This automatically compiles React and copies the new bundle to root `index.html` and `assets/`.

### 4. Admin passkey
The default passkeys are:
- `ugg2026`
- `ugg-admin-2026`
You can update this at any time in the Admin panel under **Settings -> Change Password**.

---
*Created with ❤️ for the UEM Gamerz Guild (UGG) Web & Tech Team.*
