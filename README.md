# Toguz Korgool

A minimal, responsive Toguz Korgool (Toguz Kumalak) board game for web.

Play locally or **share a link** to play with someone else online.

## Play locally

- **Dev:** Run the app and the API in two terminals:
  - Terminal 1: `npm run server` (API on http://localhost:3000)
  - Terminal 2: `npm run dev` (app on http://localhost:5173, proxies `/api` to the server)
- Open http://localhost:5173 → choose “Play locally” or “Create online game”.

## Play online (share link)

1. **Dev:** Same as above (server + dev app).
2. Click **Create online game** → you get a URL like `http://localhost:5173/play/abc123`.
3. Click **Copy link** and send it (e.g. by message). The other person opens the link and joins as the second player.
4. **Production:** Build and run the server so one URL serves both app and API:
   - `npm run build`
   - `npm run server`
   - Open http://localhost:3000. Create a game and share that URL (e.g. `http://localhost:3000/play/abc123`).

## Scripts

- `npm run dev` – Vite dev server (frontend only; use with `npm run server` for online play).
- `npm run server` – Express API (and, if present, serves `dist/` for production).
- `npm run build` – Build frontend to `dist/`.
- `npm run test` – Run game logic tests.

## Tech

- **Frontend:** TypeScript, Vite, vanilla DOM. Responsive, touch-friendly UI.
- **Backend:** Express, in-memory game store. REST: `POST /api/games`, `GET /api/games/:id`, `POST /api/games/:id/join`, `POST /api/games/:id/move`.
