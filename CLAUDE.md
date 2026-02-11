# Inner Circle

A close-friends app. Presence-first, minimal, intimate.

## Stack
- React 19 + Vite
- Supabase (Postgres, Auth, Realtime)
- Capacitor for mobile (not yet added)

## Design Rules
- Minimal. No icons in nav — lowercase words only.
- Day mode: black text on #FAFAFA background
- Night mode: white text on #0A0A0A background
- Fonts: DM Sans (body) + DM Mono (labels, timestamps, UI chrome)
- Auto-detect day/night by time of day, manual toggle available
- No emojis in UI. No gradients. No shadows except subtle cards.
- Green (#4ADE80) only for "awake" indicators

## Architecture
- All data access through custom hooks in `src/lib/hooks.js`
- Supabase client singleton in `src/lib/supabase.js`
- Every table uses Supabase RLS — never bypass it
- Realtime via Postgres CDC on: presence, thoughts, messages, shared_content, requests
- Schema and migrations in `supabase/migrations/`

## Key Design Decisions
- Presence is DB-persisted, not websocket-based. "I'm awake" is a deliberate signal, not a passive connection status.
- Single circle per user for MVP. Schema supports multiple.
- Invite codes are 8-char hex, auto-generated per circle.
- Thoughts are capped at 500 chars, messages at 2000.
- No likes, no comments on thoughts. Just posts.

## Dev
```bash
npm install
npm run dev
```

Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
