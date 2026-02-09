# Render Vue Root Cause Report

## Symptoms
- The chat UI displayed Vue moustache expressions like `{{ lang === 'ar' ? ... }}` as raw text.
- Interactive bindings (`v-if`, `v-model`, computed labels) did not execute.

## Root Cause
- The server applied global `helmet()` with default Content Security Policy, then applied another route-level CSP on `/chat`.
- In production this can result in restrictive CSP behavior for external scripts, which blocks Vue CDN (`unpkg`) and `marked` CDN initialization.
- When Vue fails to load, template expressions remain raw text.

## Fix Implemented
1. Disabled global CSP header in `src/app.js` by using:
   - `helmet({ contentSecurityPolicy: false })`
2. Kept strict CSP only on `/chat` route and explicitly allowed required CDNs:
   - `https://unpkg.com`
   - `https://cdn.jsdelivr.net`
   - `https://cdn.tailwindcss.com`
3. Left `/chat` static hosting path unchanged (`src/chat`) to avoid regressions.

## Verification Checklist
- [x] `GET /chat` returns HTTP 200.
- [x] `Content-Security-Policy` on `/chat` includes allowed script sources.
- [x] Vue template renders without raw moustache output.
- [x] Chat scripts (`app.js`, `key-status-display.js`) are loaded.

## Notes
- This keeps CSP protection where needed while avoiding double-policy conflicts.
