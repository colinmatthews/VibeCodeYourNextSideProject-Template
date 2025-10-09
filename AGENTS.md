# Repository Guidelines

## Project Structure & Modules
- `client/`: React + Vite app (components, hooks, pages, assets in `client/src/`).
- `server/`: Express API (`routes/`, `services/`, `db/`, `middleware/`, `storage/`, tests in `server/__tests__/`).
- `shared/`: Cross‑package TypeScript utilities used by both client and server.
- `migrations/` + `drizzle.config.ts`: Database schema and migration config.
- Build output in `dist/`; environment files: `.env`, `.env.example`, `.env.test`.

## Build, Test, Run
- `npm run dev`: Start server with Vite dev client on port 5000 (configurable via PORT env).
- `npm run build`: Build client via Vite and bundle server to `dist/`.
- `npm start`: Run production server from `dist/index.js`.
- `npm test`: Run Jest tests (Node, TypeScript). Add `--coverage` for report.
- `npm run check`: Type-check with `tsc`.
- DB utilities: `npm run db:push|generate|migrate|studio|check` (drizzle-kit).

## Coding Style & Naming
- Language: TypeScript (strict mode, ESNext modules). Paths: `@/*` → `client/src/*`, `@shared/*` → `shared/*`.
- Indentation: 2 spaces; keep imports sorted logically; prefer explicit types on public APIs.
- React components: PascalCase files (e.g., `UserProfileForm.tsx`). Hooks: `useX.ts(x)`.
- Avoid introducing new patterns; mirror existing server/controller/service separation and client folder layout.

## Testing Guidelines
- Frameworks: Jest + ts-jest; Supertest for API; RTL for components; jsdom for browser APIs.
- Locations: Server tests in `server/__tests__/`; client tests under `client/src/**/__tests__/`.
- Coverage targets (global): Lines 80%, Functions 75%, Branches 70%, Statements 80%.
- Commands: `npm test`, `npm run test:watch`, or target a file: `npm test -- server/__tests__/auth-workflow.test.ts`.

## Commit & PR Guidelines
- Commits: Short, imperative subject (e.g., "add streaming fetch to query client"). Group related changes.
- PRs: Clear description, linked issues, test plan, and screenshots/GIFs for UI changes. Note env or migration impacts.
- CI: Ensure tests pass locally; include coverage-sensitive changes where relevant.

## Security & Configuration
- Do not commit secrets. Copy `.env.example` to `.env` for local dev.
- Required keys include Stripe, Firebase, and PostHog; set webhook secret for `/api/webhook`.
- CORS is strict in prod; use `http://localhost:5173` during dev. Web server runs on `http://localhost:5000`.

