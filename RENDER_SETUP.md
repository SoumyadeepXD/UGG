# 🚀 UGG Render Backend Deployment Guide

This guide allows anyone in the **UEM Gamerz Guild (UGG)** to deploy the free 24/7 backend API on **Render.com** in under 2 minutes.

Once deployed, any admin can update tournaments, posters, roles, and links directly on the website **without needing anyone's personal GitHub account or GitHub tokens!**

---

## ⚡ 2-Minute Setup Steps

### Step 1: Sign up / Log in to Render
1. Go to **[https://dashboard.render.com](https://dashboard.render.com)**.
2. Click **"Sign in with GitHub"** (using the club's or your GitHub account).

---

### Step 2: Create the Web Service
You can set this up using either **Method A (Blueprint - 1 click)** or **Method B (Manual)**:

#### Method A: Using the Pre-configured Blueprint (Easiest)
1. On your Render Dashboard, click **New +** → **Blueprint**.
2. Select the repository **`SoumyadeepXD/UGG`**.
3. Render will automatically detect [`render.yaml`](./render.yaml).
4. Click **Apply**. Render will automatically build and start the backend service!

#### Method B: Manual Web Service
1. On your Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: **`SoumyadeepXD/UGG`**.
3. Fill in these exact settings:
   - **Name:** `ugg-backend` *(or any name you choose)*
   - **Region:** `Singapore` *(fastest for Kolkata / India)*
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
4. Click **Create Web Service**.

---

### Step 3: Connect It to the Website
1. Once Render finishes building, you will see your live URL at the top of your Render service page:
   ```
   https://ugg-backend.onrender.com
   ```
   *(Or whatever service name you gave it)*.
2. Open the UGG website Admin Control Center:
   👉 **[https://soumyadeepxd.github.io/UGG/#admin](https://soumyadeepxd.github.io/UGG/#admin)**
3. Go to the **"⚙️ Sync & Cloud"** tab.
4. Under **"☁️ Render Cloud Backend"**, paste your Render URL and click **Connect Render Backend**.
5. The badge will immediately turn **🟢 Connected to Render**!

---

## ⚡ Optional: Enable Automated GitHub Pages Auto-Sync
If you want saves in the Admin Portal to **also automatically commit to the GitHub repository and rebuild GitHub Pages**, add this one environment variable on Render:
1. In your Render Dashboard, click your `ugg-backend` service → **Environment**.
2. Click **Add Environment Variable**:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** Your GitHub Personal Access Token (with `repo` or `contents:write` permission).
3. Click **Save Changes**.

Now, whenever ANY club coordinator clicks "Save & Publish" in the Admin Portal:
1. The backend saves to Render immediately (live for all visitors in seconds).
2. The backend also commits the updated content directly to GitHub.
3. GitHub Pages automatically rebuilds via GitHub Actions!
Future coordinators never need to know the token or have GitHub accounts — Render handles it securely behind the scenes!

---

## 🎉 You're Done!
- Any coordinator can now open `https://soumyadeepxd.github.io/UGG/#admin`, log in with the admin password, and save changes.
- All tournaments, posters, sponsors, and maintainers will be saved to the live cloud backend and visible to **all visitors worldwide in real-time**!
- Zero personal GitHub access required!
