# Career Navigator – MVP (Next.js + Tailwind)

A minimal Next.js 14 app that embeds your provided component. Local-only with optional Supabase backend, autosave via `localStorage`, export to Markdown or print to PDF.

## Quickstart

```bash
# 1) Install deps
npm i

# 2) Set Supabase env vars (optional)
cp .env.example .env.local  # then fill in your keys

# 3) Run dev server
npm run dev

# 4) Open
http://localhost:3000
```

## Authentication

- The app shows a login/sign up form on first load. Registered users log in with their email and **4-digit PIN**.
- The PIN is sent to Supabase as the password and a session is stored in the browser. After login the user's email appears in the top-right header.
- Run the SQL in `supabase/schema.sql` on your Supabase project and enable email/password sign-in in the dashboard.

## Connect to a real Supabase backend

1. Create a free account at [supabase.com](https://supabase.com) and make a new project.
2. In the project settings turn on email/password sign-in.
3. Open the SQL editor in the dashboard and paste the contents of `supabase/schema.sql`, then run it to create the tables.
4. From **Settings → API** copy the **Project URL** and **anon key**.
5. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from step 4.
6. Install dependencies with `npm install` (this pulls in the real `@supabase/supabase-js` package).
7. Start the dev server with `npm run dev` and open <http://localhost:3000>.
8. Sign up with your email and a four‑digit PIN, then use those details to log in.

### Verify the connection

You can check that the app can reach your Supabase project by running:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key npm run check:supabase
```

If you see an error, confirm the URL and key match the values from your Supabase dashboard and that your network allows outbound HTTPS requests.

## Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Supabase for persistence (configure via environment variables)

## Deploy

You can push this folder to GitHub and import the repo in Vercel.
