# Frontend E2E Smoke Tests (Playwright)

These tests cover critical UI workflows on top of your existing backend integration tests.

## What is covered

- Admin authentication bootstrap (including forced first password change)
- Admin page smoke (users + event log visible)
- Board role switching from top bar (Admin -> Warehouse -> Lab -> Action)
- Language switch EN -> RU + Settings language displayed read-only

Files:

- `frontend/playwright.config.ts`
- `frontend/tests/e2e/auth.setup.ts`
- `frontend/tests/e2e/admin-smoke.spec.ts`
- `frontend/tests/e2e/board-role-switch.spec.ts`
- `frontend/tests/e2e/i18n-settings.spec.ts`

## One-time install

From `frontend/`:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Run

From `frontend/`:

```bash
npm run test:e2e
```

Optional:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

## Notes

- Playwright config starts backend and frontend automatically.
- Backend is started against a fresh SQLite DB at `/tmp/labsync_e2e.db` for deterministic runs.
- The setup test writes auth state to `frontend/tests/e2e/.auth/admin.json`.

