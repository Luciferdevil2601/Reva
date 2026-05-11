# ATS Resume Optimizer

Production-ready Next.js 14 App Router app for ATS resume analysis, AI optimization, live resume previews, five templates, auth scaffolding, and PDF export.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment

Copy `.env.example` to `.env.local`. OpenRouter is used for the AI model:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL=google/gemma-4-31b-it:free`

Supabase/Razorpay keys can be added later. Owner emails have unlimited access in `src/lib/entitlements.ts`.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import in Vercel.
3. Add environment variables from `.env.example`.
4. Deploy.

## Supabase

Run `supabase/schema.sql` in Supabase when enabling auth/history.
