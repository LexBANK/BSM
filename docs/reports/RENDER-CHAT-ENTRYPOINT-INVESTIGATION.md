# Render Chat Entrypoint Investigation

## Scope
This report verifies which HTML entrypoint is actually served on Render and why moustache templates (`{{ ... }}`) may appear unprocessed.

## 1) Actual entrypoint served by Render
- `render.yaml` configures a **Node web service** (`type: web`) with:
  - `buildCommand: npm ci`
  - `startCommand: npm start`
- `npm start` runs `node src/server.js`, so Render serves whatever Express exposes (not a static `docs/` publish by default).
- In Express:
  - `/` redirects to `/chat`
  - `/chat` statically serves files from `src/chat`

**Conclusion:** for the Render web service defined in this repo, the effective UI entrypoint is **`src/chat/index.html`** (served at `/chat`), **not** `docs/index.html`.

## 2) Deployment settings vs Vue file locations

### Current deployment settings (from repo)
- **Build:** `npm ci`
- **Start:** `npm start`
- **Static publish path:** not configured in `render.yaml` (this is a web service, not a static site service)

### Vue chat file locations
- `src/chat/index.html`
- `src/chat/app.js`

### Comparison / risk
- The current Render web-service config is **aligned** with `src/chat/*` because Express serves that folder at `/chat`.
- A mismatch would happen only if Render dashboard is manually set to a **Static Site** with publish path like `docs/`, which would serve `docs/index.html` instead of the Vue chat entrypoint.

## 3) Script loading check on published page behavior

### Required scripts in `src/chat/index.html`
- Vue CDN: `https://unpkg.com/vue@3/dist/vue.global.prod.js`
- App script: `app.js`
- Other scripts: `tailwind.config.js`, Tailwind CDN, Marked CDN, `key-status-display.js`

### Runtime verification (local server mirroring Render web-service behavior)
- `GET /chat/` returns the Vue template page.
- `GET /chat/app.js` returns `200 OK`.
- Browser evaluation confirms:
  - `typeof window.Vue === 'object'`
  - moustache text is not displayed in rendered UI (Vue mounted and compiled template)

### Early-error check
- Console shows a 404 for `/status/ai-keys.json` requested by `key-status-display.js`.
- This does **not** stop app boot because errors are caught in that script; it only shows a warning badge.

## 4) Symptoms / Root Cause / Fix / Verification

### Symptom
- User sees raw moustache templates (`{{ ... }}`) in UI instead of rendered values.

### Root Cause
- Most likely deployment mismatch:
  - published entrypoint is not the Vue chat entry (`src/chat/index.html`) and instead another static page (e.g., `docs/index.html`), **or**
  - required script (especially Vue CDN or `app.js`) fails to load.

### Fix
1. Keep Render deployment as **Web Service** with:
   - Build: `npm ci`
   - Start: `npm start`
2. Ensure traffic lands on `/chat` (or keep `/` redirect as implemented).
3. If using Static Site deployment in Render dashboard, publish the folder that contains the Vue entrypoint and assets together (or avoid static-site mode for this app).
4. Keep script paths relative to `src/chat/index.html` as currently implemented (`app.js`, `styles.css`, etc.) so they resolve under `/chat`.

### Verification
1. Open `/chat` and confirm dynamic labels render (no visible `{{ ... }}`).
2. Confirm `window.Vue` is available in browser console.
3. Confirm `app.js` returns HTTP 200.
4. Optional: verify no blocking console errors during initial load.

## 5) Post-fix checklist
- [ ] Hard refresh browser (Ctrl/Cmd + Shift + R).
- [ ] Check browser Console for errors (especially failed script loads).
- [ ] Verify `window.Vue` is defined.
- [ ] Verify `/chat/app.js` loads successfully (200).
- [ ] Verify chat endpoint works:
  - `POST /api/chat/direct`
  - if using agents mode, also `POST /api/chat`
- [ ] Confirm UI text is rendered dynamically and moustache templates are not visible.

