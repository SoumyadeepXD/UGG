# UGG – UEM Gamerz Guild (React + Vite)

## Run it
```bash
npm install
npm run dev       # local dev server
npm run build     # production build in /dist
```

## Files
- `src/content.js`  – all default text, links, images and settings (edit here or from the Admin panel)
- `src/App.jsx`     – the whole site (hero, events, about, esports/game dev, timeline, gallery, sponsors, team, footer)
- `src/Admin.jsx`   – the admin editor (edits every text, link, image, list item and colour)
- `src/styles.css`  – all styling and animations
- `src/util.js`     – helpers + storage

## Admin panel
- Click the small **Admin** button in the footer (or open `/#admin`).
- Default password: `ugg-admin-2026` – change it in the panel under `admin → newPassword`, then Save.
- Changes preview live. **Save** stores them in this browser (localStorage). Use **Export / Import** to move the content JSON between devices.

## Important
The login is a front-end gate only. To let one admin change the site for every visitor,
store the content on a backend (Firebase, Supabase, your own API) by replacing `load()` and `save()` in `src/util.js`
and protect writes there with real authentication.

## Hero video
Admin → `hero → video` (upload a short MP4, or paste a hosted video URL). Uploaded files are stored as data in the browser, so keep them small (under ~2.5 MB) or host the video elsewhere.
