# Repository Guidelines

## Project Structure & Module Organization
`app/` contains App Router entries, layouts, and client/server components; journey-specific UI lives in `features/career-navigator/` (components, hooks, phases, feature types). Helpers sit in `lib/` plus `utils/`, shared contracts in `types/`, static assets + manifest in `public/`, Supabase SQL/scripts in `supabase/`, contributor/context docs in `docs/`, and regression tests with their config in `tests/` + `tsconfig.test.json`.

## Page Reference
Route handles: `Root Gate ("/")` checks Supabase and redirects to `/start`; `Login Hero ("/login")` is the cinematic login; `Signup Modal ("/signup")` is the compact registration. `Track Picker ("/start")` chooses journeys and resumes deep work; `Fast Track Flow ("/start/fast")` is the 3-step async pathway; `Deep Redirect ("/start/deep")` forwards to `Deep Workspace ("/deep")`, the full navigator shell with sidebar + loader.

## Build, Test, and Development Commands
Install once with `npm install`. `npm run dev` serves hot reload on `localhost:3000`; `npm run build` plus `npm start` produce and host the prod bundle. `npm run lint` runs `next lint`. `npm test` emits to `.tmp-tests/` and executes the Node regressions. `npm run check:supabase` validates env keys, and `npm run docs:sync` refreshes the Context7 cache when `docs/` changes.

## Coding Style & Naming Conventions
Stick to strict TypeScript, 2-space indents, and ESLint-clean diffs. Components stay PascalCase, hooks are `useThing`, and files live with their feature. Prefer server components unless interactivity demands `"use client"`. Keep Tailwind mobile-first and reuse semantic tokens from `tailwind.config.mjs` (e.g., `text-semantic-error-base`). Import via `@/*` instead of long relatives.

## Testing Guidelines
Place tests in `tests/` as `*.test.ts`. Node runs them, so avoid DOM globals unless you shim (see `lib/progress` + `MemoryStorage`). Update `tsconfig.test.json` if more folders need emission, and ensure `npm test` leaves only `.tmp-tests/` artifacts.

## Commit & Pull Request Guidelines
Follow the repo pattern: imperative subject plus `type(scope): detail` suffix (e.g., `Improve resume URL chore(main): tighten validation`). Reference issues with `Fixes #123`. PRs need a short summary, manual test notes/screenshots for UI, schema or env callouts, and tag Supabase reviewers when auth or storage shifts.

## Security & Configuration Tips
Do not commit `.env.local`; copy `.env.example`, fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and document new keys there. Keep schema edits in `supabase/schema.sql`. When touching auth, Supabase, or PWA metadata, run `npm run check:supabase` and re-test the iOS Add to Home Screen flow.
