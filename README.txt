UGG – UEM Gamerz Guild website
==============================

OPTION A – plain website (easiest, no installs)
-----------------------------------------------
1. Unzip this folder.
2. Double-click  index.html  – it opens in your browser. Everything is inside that one file.
   (In VS Code: install the "Live Server" extension, right-click index.html -> "Open with Live Server".)
3. Needs internet only for the Google Fonts. Without it the site still works with fallback fonts.

OPTION B – React version (folder: react-version)
------------------------------------------------
1. Install Node.js (LTS) from nodejs.org.
2. In VS Code: File -> Open Folder -> choose  react-version
3. Open the terminal (Terminal -> New Terminal) and run:
       npm install
       npm run dev
4. Open the address it prints (usually http://localhost:5173).
   Production build:  npm run build   (output goes to the "dist" folder)

ADMIN PANEL (both versions)
---------------------------
- Click the small "Admin" button in the footer (or open  #admin  at the end of the address).
- Default password:  ugg-admin-2026   (change it: admin -> newPassword -> Save)
- Sponsor button:  sponsors -> email (shown on the button) and sponsors -> link (optional; if filled, the button opens this link instead of email)
- Institute logos (top right):  nav -> logos  (image, name, link)
- Event timeline (8 slots):  timeline -> items
- Edits preview live; Save keeps them in this browser.
- The login is only a front-end gate. To let one admin update the site for every visitor you need a backend
  (for example Firebase or Supabase).

HERO VIDEO
----------
Admin -> hero -> video: upload a short MP4 (under ~2.5 MB) or paste a link to a hosted video.
