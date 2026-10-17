# Wildcard

A Persona-Framework personal agent, built on two layers that mirror the two loops the Persona games run on: an always-on protagonist layer for daily life, and a roster of specialized personas summoned for specific tasks.

On top of those two core layers sits a Persona-native gamification layer — Protagonist Status, Arcana XP, Calendar streak, Arcs, Requests, Activities, Buffs, and Status Effects — porting vocabulary and systems directly from the games so the terminology is consistent throughout.

## Getting Started

Expo (React Native + web) + TypeScript, backed by Supabase.

```bash
npm install
cp .env.example .env   # fill in your Supabase URL, anon key, and Anthropic key
npm run web             # or: npm run ios / npm run android
```

Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor to create the core tables with per-user RLS. Additional migration files are listed in the [SQL Migrations](#sql-migrations) section below.

### Layout

```
App.tsx                          Tab shell + auth gate + PASSWORD_RECOVERY handler
src/screens/
  AuthScreen.tsx                 Sign-in / sign-up / forgot-password (three screen states)
  ResetPasswordScreen.tsx        Shown on PASSWORD_RECOVERY event; updates password
  HomeScreen.tsx                 Today's schedule, open tasks, overdue Confidant nudges
  ConfidantsScreen.tsx           Relationship list; opens ConfidantDetailScreen as slide modal
  ConfidantDetailScreen.tsx      Per-confidant: log-contact, follow-ups, queued questions, delete
  ChatScreen.tsx                 Protagonist agent chat (Anthropic API, full history, Enter-to-submit on web)
src/data/
  tasks.ts                       listTasks / createTask / completeTask / deleteTask
  schedule.ts                    listTodaysEvents / createEvent
  confidants.ts                  listConfidants / createConfidant / logContact / updateFollowUps / updateQuestionsQueued / deleteConfidant / listOverdueConfidants
  eventLog.ts                    logEvent (central write for all completion events)
src/personas/registry.ts         All persona definitions (arcana, domain, system prompt, rank gating)
src/progression/index.ts         Rank / XP math derived from event_log completions
src/router/handoff.ts            Builds persona session context from a task; writes completions back
src/lib/supabase.ts              Supabase client (detectSessionInUrl: Platform.OS === 'web')
src/lib/anthropic.ts             sendChatMessage — proxies via Supabase Edge Function (claude-sonnet-5, handles extended thinking blocks)
src/types/index.ts               Shared TypeScript types + EventLogType union
supabase/schema.sql              Core schema: tasks, schedule_events, confidants, event_log, persona_progression
supabase/functions/chat/index.ts Server-side Anthropic API proxy (avoids browser CORS; reads ANTHROPIC_API_KEY from Supabase secret)
```

## Concept

### Layer 1 — Protagonist Layer

Always on; what the user opens first. Owns the daily-life loop:

- **Schedule** — today's events
- **Task list** — open tasks with optional persona assignment; Requests (is_request = true) route to a mandatory persona and award double XP
- **Confidant Log** — per-person notes: last-contact date, follow-ups owed, queued questions; overdue nudges surface in the home screen
- **Central event log** — single source of truth; both feeds persona sessions with context and gets written back to on completion

A single, un-themed protagonist agent handles the chat — no arcana skin — because it needs to be fast, reliable, and useful standalone from day one.

### Layer 2 — Persona Roster

Summoned from inside the protagonist layer, not opened cold. Tapping a task opens the matched persona pre-loaded with context the protagonist layer already has (deadline, prior completions, related notes). Session ends → task marked done, event logged, persona XP ticks up.

| Arcana | Domain |
|---|---|
| Magician | Coding |
| Empress | Creative / writing |
| Chariot | Execution & discipline |
| Hierophant | Research |
| Hermit | Personal organization |
| Justice | Rules / regulated advisory (static, non-rank-gated) |

### Layer 3 — Gamification (Persona-Native)

All vocabulary matches the games.

| Concept | What it does |
|---|---|
| **Protagonist Status** | The user's own stat sheet — overall level, Arcana XP bars, Calendar streak |
| **Arcana** | Five task categories (Power, Thinking, Spirit, Hustle, Social) that route to a persona |
| **Calendar** | Consecutive-day streak tracked via daily `calendar_day` event log entries |
| **Activities** | Real-life free-time blocks (Reading, Training, Coding…) that award Arcana XP with a single tap; 4-hour cooldown per type |
| **Arcs** | Multi-step goals spanning several days; Confidant Arc when tied to a relationship |
| **Requests** | Single-sitting harder tasks (Mementos-style); mandatory persona, double XP |
| **Buffs** | Positive milestone unlocks (first task, first arc, 7-day Calendar streak, first evolution…) |
| **Status Effects** | Named, recoverable setbacks — "Fatigued" on streak break, "Dormant — [Arcana]" on 7-day inactivity; framed as resolvable exactly as the games do |
| **Velvet Room** | Central hub housing Protagonist Status, Persona Roster, and Compendium |

**Example day**: open the app, see today's schedule plus a nudge ("haven't talked to [contact] in two weeks"). Tap a Chariot task → PersonaSessionScreen opens pre-loaded with context. Session ends → task done, event logged, Chariot XP ticks up, Power Arcana XP on Protagonist Status increments. Log "Training" in Activities → Power Arcana gets +15 XP and clears a "Dormant — Power" Status Effect if one was active.

## Build Order

> **MVP:** the near-term target is a gamified, Notion-style workspace with an agent that can act and a working progression loop. See [MVP.md](MVP.md) for scope, data model, milestones and the acceptance demo. The phases below are the long-term roadmap.

| # | Phase | Status |
|---|---|---|
| 1 | **Protagonist Layer Core** — auth, schedule, tasks, Chat → Anthropic API, react-navigation | Complete |
| 2 | **Confidant Log** — add confidant form, log-contact, detail screen, overdue nudges | Complete |
| 3 | **First Persona Hand-Off** — task detail → persona picker → PersonaSessionScreen | Scaffolded (hand-off functions written; no screen yet) |
| 4 | **Velvet Room** — Roster (10-slot cap), Compendium (release / re-summon), Justice always-on | Not started |
| 5 | **Evolution** — rank threshold or breakthrough flag triggers evolved system prompt | Not started |
| 6 | **Fusion** — compose two personas; both must be rank 3+ | Not started |
| 7 | **Justice Persona** — disclaimer banner, source citations, non-rank-gated | Scaffolded |
| 8 | **Protagonist Status & Calendar** — ProtagonistStatusScreen, Arcana XP breakdown, Calendar streak | Not started |
| 9 | **Arcs & Requests** — arcs + arc_stages tables, ArcScreen, ArcDetailScreen, Confidant Arc variant | Not started |
| 10 | **Activities, Buffs & Status Effects** — 15 Activities, milestone Buffs gallery, Status Effect engine | Not started |
| 11 | **Expo Push Notifications** — Calendar reminders, Confidant nudges, Status Effect alerts, Arc deadlines | Not started |

## SQL Migrations

Only `supabase/schema.sql` exists today; the other files below are planned and will be added with their phase.

| File | Creates / Alters | Phase |
|---|---|---|
| `supabase/schema.sql` | tasks, schedule_events, confidants, event_log, persona_progression + RLS | 1 |
| `supabase/phase4-compendium.sql` | ALTER persona_progression: status, last_context, released_at | 4 |
| `supabase/phase5-tasks.sql` | ALTER tasks: is_breakthrough | 5 |
| `supabase/phase9-arcs.sql` | CREATE arcs, arc_stages; ALTER tasks: is_request | 9 |
| `supabase/phase10-gamification.sql` | CREATE buffs, status_effects | 10 |
| `supabase/phase11-notifications.sql` | CREATE user_settings (push_token, notification prefs) | 11 |

## Supabase Configuration

- **Email auth**: enabled (Supabase Dashboard → Authentication → Providers → Email)
- **Site URL**: your Expo web origin (e.g. `http://localhost:8081`)
- **Redirect URL**: same origin — Supabase appends `#access_token=...&type=recovery` to it on password reset
- **`detectSessionInUrl`**: set to `Platform.OS === 'web'` in `src/lib/supabase.ts` so the `PASSWORD_RECOVERY` event fires on web but doesn't cause issues on native

## Technical Architecture

| Component | Role |
|---|---|
| Protagonist data store | Schedule, tasks, Confidant Log, and the central event log — single source of truth both layers read and write |
| Persona modules | Per-arcana system prompt, tool-permission set, and rank-tier variants in `src/personas/registry.ts` |
| Progression store | Per-user, per-persona rank/XP, evolution flags — sourced from the protagonist event log |
| Router / hand-off layer | Passes context from a tapped task into the right persona session; writes results back on completion |
| Velvet Room | Persona selection, Roster, Compendium, and Protagonist Status — presentation layer for both persona layers |
| Protagonist Status engine | Arcana XP grouped from persona_progression; Calendar streak from consecutive `calendar_day` event_log entries |
| Gamification engine | Activity cooldown checks, Buff milestone detection, Status Effect auto-apply/clear logic |

## Relationship to the AI Flight Planning Assistant

House it as the static, non-rank-gated Justice persona. Safety-adjacent domains should not have capability that scales with a usage-based trust meter — Justice is always summoned at the same tier.

## Form Factor

- **Primary**: cross-platform app (iOS + Android + web via Expo), not a browser extension. The protagonist layer needs to be checked every morning, which needs native notifications and easy daily access.
- **Notifications**: Expo's native notification stack throughout — no third-party service.
- **Secondary (later)**: a lightweight browser extension for quick capture — jot a task, log a note, or summon a persona without leaving what you're doing. An accelerant added after the core app works.
