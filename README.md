# 🎮 UGG (UEM Gamerz Guild) Website & Control Center

Official web portal and full-stack management system for **UGG (UEM Gamerz Guild)**, premier collegiate gaming & esports guild of the **University of Engineering & Management, Kolkata**.

> 📖 **Handover Documentation:** For a complete file map and developer guide on where to change any frontend feature, see [**DEVELOPER_GUIDE.md**](./DEVELOPER_GUIDE.md).

---

## ⚡ Quick Start

### 1. Start the Backend API Server
```bash
# From workspace root:
npm run backend
# or:
cd backend && npm install && npm start
```
The server will boot at **`http://localhost:5001`**:
- **API Base:** `http://localhost:5001/api/`
- **Uploads Directory:** `http://localhost:5001/uploads/`
- **Data Persistence:** `backend/data/content.json`

### 2. Start the Frontend (React + Vite)
```bash
# In another terminal:
npm run frontend
# or:
cd react-version && npm install && npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔐 Admin Control Center (`#admin`)

Access the full admin dashboard by clicking the **"Admin"** button in the footer or opening `http://localhost:5173/#admin` (or `index.html#admin`).

- **Default Passkeys:** `ugg2026` or `ugg-admin-2026` (configurable in settings)
- **Status Indicator:** Shows `🟢 Server Online` when connected to the backend or `🟡 Local Mode` when offline.

---

## 🎛️ What You Can Control From Admin

### 🏆 1. Tournaments & Events
- **Add New Tournament:** Title, Game title (Valorant, BGMI, EA FC 25, Free Fire, CS2, etc.), Status (`live`, `registering`, `upcoming`, `completed`), Date & Time, Prize Pool, Format, Platform, Registration Google Form URL, and Poster Image (file upload or URL).
- **Manage Existing Tournaments:** Change status directly, reorder with ↑/↓, or delete.
- **Auto-Sync:** Real-time updates reflect across the site.

### 👥 2. Team & Designations
- **Add Team Member:** Full name, Designation / Role (President, Vice President, Esports Lead, Tech Lead, Media Lead, etc.), Profile Photo upload/URL, and Social / Portfolio link.
- **Roster Hierarchy:** Arrange leadership order with ↑/↓ reorder buttons.
- **Delete / Edit:** Instant card updates.

### 🖼️ 3. Gallery Showcase
- **Upload Photos:** Drag & drop / file upload directly to backend disk storage or paste image URLs.
- **Captions:** Add and edit event captions (e.g. *BGMI LAN Finals – auditorium packed*).
- **Responsive Grid:** Full visual preview grid with instant removal.

### ⏳ 4. Event Timeline & Milestones
- **Roadmap Slots:** Add date, milestone title, and status badges (`live`, `upcoming`, `registering`, `completed`).

### 🤝 5. Sponsors & Partners
- **Add Sponsors:** Brand name, logo upload/URL, and official website URL.
- **Sponsorship CTA:** Update inquiries email and custom link.

### 🌐 6. Social Media Handles & Footer Details
- **Manage Handles:** Add or update Discord, Instagram, YouTube, Twitch, WhatsApp, X (Twitter), LinkedIn, or custom platforms with direct link testing.
- **Join Section:** Live interactive social pills in the `#join` community section.
- **Footer Details:** Configure location, club tagline, copyright text, and footer summary.

### ⚡ 7. Hero & Brand Identity
- **Brand Names & Subtitles:** Customize guild name, subtext, and institute logos.
- **Rotating Keywords:** Add or remove headline dynamic words (e.g. *PLAY.*, *COMPETE.*, *CREATE.*, *CONQUER.*).
- **Hero Background:** Upload background video (MP4) or toggle dynamic cyberpunk canvas particle grid.

### 🎨 7. Theme Colors
- **Accent Color:** Neon Crimson (`--red`) hex picker.
- **Background Tone:** Deep Dark (`--bg`) hex picker.

### 📊 8. Google Sheets Live Synchronization
- Integrated from `SoumyadeepXD/UGG_UEM-GAMERZ-GUILD`.
- Paste your published Google Sheet CSV URL and click **Sync Now** to populate tournaments directly from spreadsheets.

### 💾 9. Backup & Persistence
- **Save & Publish:** Commits changes to the backend server (`backend/data/content.json`) so every visitor sees the updates.
- **Offline Backup:** Export full state to `ugg-content-backup.json` and restore via Import.
- **Password Manager:** Update your admin passkey with SHA-256 encryption.

---

## 🏗️ Project Architecture

```
ugg-website/
├── backend/
│   ├── data/
│   │   └── content.json       # Persistent database of all site content & events
│   ├── uploads/               # Stored image posters, avatars, and gallery files
│   ├── defaultContent.js      # Base fallback template
│   ├── package.json           # Express, CORS, Multer dependencies
│   └── server.js              # REST API on port 5001
├── react-version/
│   ├── src/
│   │   ├── Admin.jsx          # Full-featured Cyber Admin Control Center
│   │   ├── App.jsx            # Main site layout, canvas hero, and sections
│   │   ├── content.js         # Frontend default data
│   │   ├── styles.css         # Complete styling, animations, and admin theme
│   │   └── util.js            # API communication, file upload & sync helpers
│   ├── index.html
│   ├── package.json           # React 18 & Vite 5
│   └── vite.config.js         # Configured with proxy to port 5001
├── index.html                 # Option A: Standalone single-file version
├── README.md                  # Project documentation
└── package.json               # Root convenience runner scripts
```
