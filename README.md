# GymTracker

Mobile-first workout tracking app built with Next.js, Supabase, and Tailwind CSS.

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase project URL, anon key, and service role key

# 3. Apply database migrations (requires Supabase CLI)
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.ts

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database & Auth:** Supabase (PostgreSQL + RLS)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **i18n:** next-intl (TR default, EN)
- **Deployment:** Coolify on VPS (Dockerfile + standalone output)

## Deployment

See `CLAUDE.md` in the repo root for full Coolify setup instructions (Section 9).
