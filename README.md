# Inner Circle — Backend Architecture

## Stack
- **Frontend**: React + Vite
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Mobile**: Capacitor (when ready to deploy)

## Setup

### 1. Create Supabase Project
Go to [supabase.com](https://supabase.com), create a new project.

### 2. Run the Migration
In Supabase Dashboard → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, triggers, and realtime subscriptions.

### 3. Configure Environment
```bash
cp src/.env.example .env
```
Fill in your Supabase URL and anon key from the project settings.

### 4. Install & Run
```bash
npm create vite@latest inner-circle -- --template react
cd inner-circle

# Copy src/ files into the project
npm install @supabase/supabase-js
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────┐
│  React App (Vite)                       │
│                                         │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐  │
│  │  Auth    │ │ Presence │ │ Thoughts│  │
│  │  Screen  │ │   Tab    │ │   Tab   │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘  │
│       │             │            │       │
│  ┌────┴─────────────┴────────────┴────┐  │
│  │         hooks.js                   │  │
│  │  useAuth · useCircle · usePresence │  │
│  │  useThoughts · useMessages         │  │
│  │  useSharedContent · useRequests    │  │
│  └────────────────┬───────────────────┘  │
│                   │                      │
│  ┌────────────────┴───────────────────┐  │
│  │       supabase.js (client)         │  │
│  └────────────────┬───────────────────┘  │
└───────────────────┼──────────────────────┘
                    │
        ┌───────────┴───────────┐
        │    Supabase Cloud     │
        │                       │
        │  ┌─────────────────┐  │
        │  │   Auth (email)  │  │
        │  └─────────────────┘  │
        │  ┌─────────────────┐  │
        │  │    Postgres     │  │
        │  │  ┌───────────┐  │  │
        │  │  │ profiles  │  │  │
        │  │  │ circles   │  │  │
        │  │  │ presence  │  │  │
        │  │  │ thoughts  │  │  │
        │  │  │ messages  │  │  │
        │  │  │ shared    │  │  │
        │  │  │ requests  │  │  │
        │  │  └───────────┘  │  │
        │  └─────────────────┘  │
        │  ┌─────────────────┐  │
        │  │   Realtime      │  │
        │  │  (postgres CDC) │  │
        │  └─────────────────┘  │
        └───────────────────────┘
```

## Database Tables

| Table | Purpose | Realtime |
|-------|---------|----------|
| `profiles` | User identity (name, initial) — auto-created on signup | No |
| `circles` | Friend groups with invite codes | No |
| `circle_members` | Junction table for circle membership | No |
| `presence` | Awake/sleep status with timestamps | ✅ |
| `thoughts` | Moodboard posts (max 500 chars) | ✅ |
| `messages` | Group chat messages (max 2000 chars) | ✅ |
| `shared_content` | Links and videos with metadata | ✅ |
| `requests` | Favors with open/claimed/done status | ✅ |

## Key Design Decisions

**Single circle MVP**: Users belong to one circle for now. The schema supports multiple circles but the UI focuses on one.

**Invite codes**: 8-char hex codes auto-generated. Share with friends to join.

**Presence via DB, not websockets**: Presence is stored in Postgres and broadcast via Supabase Realtime CDC. This means presence survives disconnects and page refreshes — if you marked yourself awake, you stay awake until you toggle off. This is intentional: the "I'm awake" action is a deliberate signal, not a passive connection status.

**RLS everywhere**: Every table has row-level security. Users can only see data from circles they belong to. Authors can only modify their own content.

**Auto-cascade triggers**:
- New auth user → profile created → presence row created
- New circle → creator added as admin member

## RPC Functions

| Function | Purpose |
|----------|---------|
| `toggle_awake()` | Flips your awake status and updates timestamps |
| `claim_request(request_id)` | Claims an open request |
| `join_circle(code)` | Joins a circle by invite code |

## Next Steps

- [ ] Push notifications (Supabase Edge Functions + Expo/Capacitor push)
- [ ] Image uploads for shared content (Supabase Storage)
- [ ] Read receipts on messages
- [ ] "Sleep timer" — auto-toggle off after X hours
- [ ] Multiple circles per user
- [ ] Capacitor build for iOS/Android
