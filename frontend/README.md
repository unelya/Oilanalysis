# Frontend (Lovable baseline)

Kanban-style UI for tracking wells, samples, lab work, and technological actions. This is the frozen baseline from the Lovable template.

## Quick start

```sh
cd final-project/frontend
npm install
npm run dev
```

Then open http://localhost:8080/ to view the app. The board includes multiple role views (warehouse, lab, action supervision, admin). Click any card to open its detail panel and status history.

## Scripts

- `npm run dev` – start the dev server (port 8080)
- `npm run build` – production build
- `npm run preview` – preview the production build

## Security note

`npm audit fix` leaves 2 moderate advisories (esbuild via Vite). Resolving them requires a breaking upgrade to Vite 7 (`npm audit fix --force`). Plan a Vite/esbuild upgrade later and rerun `npm run build` afterward.
