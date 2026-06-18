# Budget OS

A React + TypeScript + Tailwind CSS app for paycheck allocation and financial forecasting.

## Setup

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`

## Persistence

Budget OS now saves editable app data in two layers:

1. Local browser storage by default, so refreshes and browser restarts do not wipe your changes.
2. Optional Supabase sync, so changes can survive new deploys and move across devices.

Without any extra setup, the app already persists locally in your browser.

To enable cloud sync, use the safer server-proxy path below.

### Exact setup steps

1. Create a Supabase project.
2. In Supabase, open the SQL editor.
3. Run the SQL from `supabase/app_state.sql`.
4. In Supabase, open Project Settings > API.
5. Copy these values:
   - Project URL
   - `anon` public key
   - `service_role` secret key
6. In your local repo, copy `.env.example` to `.env`.
7. Fill in these values in `.env`:
   - `VITE_ENABLE_REMOTE_SYNC=true`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_SUPABASE_APP_STATE_ROW_ID=default`
   - `SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `SUPABASE_APP_STATE_ROW_ID=default`
8. Restart the dev server after editing `.env`.
9. Make a change in the app.
10. Open Settings and confirm the save status is no longer “Saving locally only”.

### Vercel deployment steps

1. Open your Vercel project.
2. Go to Settings > Environment Variables.
3. Add all seven env vars listed above.
4. Redeploy the site.
5. Open the deployed app.
6. Make one change in the UI.
7. Refresh the page and confirm the change remains.
8. Push a new git commit and let Vercel redeploy.
9. Refresh again and confirm the change still remains.

### Notes

- The client will try the Vercel `/api/app-state` endpoint first when `VITE_ENABLE_REMOTE_SYNC=true`.
- If that endpoint is unavailable during local development, the app can still fall back to direct Supabase browser calls when the public URL and anon key are present.
- The singleton row id defaults to `default`, but you can change it if you want separate datasets.

## Project structure

- `src/App.tsx` — application routes and layout
- `src/components` — reusable layout and card components
- `src/pages` — page shells for Dashboard, Pay Periods, Forecast, Accounts, and Settings

## Notes

Cloud sync in no-login mode is intended as a private single-dataset setup. For stronger production security, route writes through a server-side proxy instead of exposing broad anonymous write access.
