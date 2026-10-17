# Architecture — Wildcard

Wildcard is an Expo (React Native + web) personal-agent app backed by Supabase. The system has three layers that mirror the two loops the Persona games run on, plus a gamification layer porting Persona-native vocabulary directly into the UX.

---

## 1. Three-Layer Model

```
┌────────────────────────────────────────────────────────────────┐
│  Layer 3 — Gamification                                         │
│  Protagonist Status · Arcana XP · Calendar streak · Buffs ·    │
│  Status Effects · Activities · Arcs · Requests                  │
├────────────────────────────────────────────────────────────────┤
│  Layer 2 — Persona Roster                                       │
│  Summoned per-task; injects context from Layer 1;              │
│  writes completions back on session end                         │
├────────────────────────────────────────────────────────────────┤
│  Layer 1 — Protagonist Layer (always-on)                        │
│  Schedule · Tasks · Confidant Log · Central event log ·         │
│  Protagonist agent chat                                         │
└────────────────────────────────────────────────────────────────┘
```

Layer 2 is never opened cold — it is summoned from inside Layer 1. Tapping a task with a `personaId` assigned opens the matched persona pre-loaded with context the protagonist layer already has. On session end, the task is completed, the event is logged, and persona XP ticks up.

Layer 3 is a presentation/rule layer on top of Layers 1 and 2. Its data is derived from the central event log and the `persona_progression` table.

---

## 2. Module Map

### App shell

| File | Role |
|---|---|
| `App.tsx` | Tab navigator, auth gate, `PASSWORD_RECOVERY` deep-link handler |
| `index.ts` | Expo entry point |
| `app.json` | Expo project config (slug, icon, Android adaptive icon, web favicon) |

### Screens

| File | Rendered when |
|---|---|
| `src/screens/AuthScreen.tsx` | User is not authenticated; three states: sign-in / sign-up / forgot-password |
| `src/screens/ResetPasswordScreen.tsx` | `PASSWORD_RECOVERY` event fires (email link → web redirect) |
| `src/screens/HomeScreen.tsx` | Home tab; loads tasks, today's schedule, overdue Confidant nudges in one `Promise.all` |
| `src/screens/ConfidantsScreen.tsx` | Confidant Log tab; list view + add modal; opens ConfidantDetailScreen as a full-screen slide modal |
| `src/screens/ConfidantDetailScreen.tsx` | Per-confidant detail; log-contact, add/remove follow-ups and queued questions, two-stage delete |
| `src/screens/ChatScreen.tsx` | Chat tab; full message history, Protagonist agent, Enter-to-submit on web |

### Data layer

All data functions follow the same shape: they call the Supabase JS client, throw on error, and return typed objects mapped through a `fromRow()` helper.

| File | Functions |
|---|---|
| `src/data/tasks.ts` | `listTasks` · `createTask` · `completeTask` · `deleteTask` |
| `src/data/schedule.ts` | `listTodaysEvents` · `createEvent` |
| `src/data/confidants.ts` | `listConfidants` · `createConfidant` · `logContact` · `updateFollowUps` · `updateQuestionsQueued` · `deleteConfidant` · `listOverdueConfidants` |
| `src/data/eventLog.ts` | `logEvent` — central write for all completion events; accepts `EventLogType` union |

### Persona / progression layer

| File | Role |
|---|---|
| `src/personas/registry.ts` | Static map of all persona definitions: id, name, domain, system prompt, `rankGated` flag |
| `src/progression/index.ts` | `listProgression` · `recordCompletion` — reads/upserts `persona_progression`; 10 XP per completion, 100 XP per rank |
| `src/router/handoff.ts` | `buildSessionContext` — assembles a `PersonaSessionContext` from a task; `completeSession` — marks task done, logs event, increments progression |

### Infrastructure

| File | Role |
|---|---|
| `src/lib/supabase.ts` | Supabase JS client; `detectSessionInUrl: Platform.OS === 'web'` so `PASSWORD_RECOVERY` fires on web only |
| `src/lib/anthropic.ts` | `sendChatMessage` — calls Supabase Edge Function `chat`; handles extended thinking blocks (`content.find(b => b.type === 'text')`) |
| `src/constants/colors.ts` | Design token map — all screens import `COLORS` from here |
| `src/types/index.ts` | Shared TypeScript types: `Task`, `ScheduleEvent`, `Confidant`, `EventLogEntry`, `PersonaProgression`, `PersonaId`, `EventLogType` |

### Supabase Edge Functions

| Function | File | Purpose |
|---|---|---|
| `chat` | `supabase/functions/chat/index.ts` | Server-side Anthropic API proxy; avoids browser CORS block; reads `ANTHROPIC_API_KEY` from Supabase secret; handles `claude-sonnet-5` extended thinking response shape |

---

## 3. Data Flows

### Protagonist daily loop

```
HomeScreen.load()
  ├─ listTasks()           → tasks table (RLS: user_id = auth.uid())
  ├─ listTodaysEvents()    → schedule_events table
  └─ listOverdueConfidants() → confidants where last_contact_at IS NULL
                               OR last_contact_at < now() - 14 days
```

### Chat message flow

```
ChatScreen → sendChatMessage(messages)
  └─ supabase.functions.invoke('chat', { body: { messages, systemPrompt } })
       └─ Edge Function: fetch api.anthropic.com/v1/messages
            model: claude-sonnet-5
            content: [{type:'thinking',...}, {type:'text',...}]
            ↓ finds text block by type
       ← { text: string }
```

### Persona hand-off loop (Phase 3+)

```
Task tapped (personaId set)
  └─ buildSessionContext(task) → PersonaSessionContext { task, persona, relatedNotes }
       └─ PersonaSessionScreen opens with persona.systemPrompt injected
            ↓ session ends
       └─ completeSession(personaId, taskId)
            ├─ completeTask(taskId)
            ├─ logEvent({ type: 'persona_session_completed', personaId, taskId })
            └─ recordCompletion(personaId)  →  upsert persona_progression
```

---

## 4. Database Schema

All tables live in `public` schema with Row Level Security enabled. Every policy is `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.

| Table | Key columns | Phase |
|---|---|---|
| `tasks` | `id, user_id, title, due_at, persona_id, completed_at` | 1 |
| `schedule_events` | `id, user_id, title, starts_at, ends_at` | 1 |
| `confidants` | `id, user_id, name, last_contact_at, follow_ups_owed TEXT[], questions_queued TEXT[]` | 2 |
| `event_log` | `id, user_id, type, persona_id, task_id, confidant_id, payload JSONB` | 1 |
| `persona_progression` | `user_id, persona_id, rank, xp, evolved_at` · PK: `(user_id, persona_id)` | 1 |

Planned future tables (migration files in `supabase/`):

| Table | Migration file | Phase |
|---|---|---|
| `persona_progression` columns: `status, last_context, released_at` | `phase4-compendium.sql` | 4 |
| `tasks` column: `is_breakthrough` | `phase5-tasks.sql` | 5 |
| `arcs`, `arc_stages`; `tasks.is_request` | `phase9-arcs.sql` | 9 |
| `buffs`, `status_effects` | `phase10-gamification.sql` | 10 |
| `user_settings` (push_token, notification prefs) | `phase11-notifications.sql` | 11 |

---

## 5. Key Design Decisions

**Central event log as single source of truth.** All completions — task done, persona session ended, confidant contacted — write to `event_log`. The gamification layer (Arcana XP, Calendar streak, Buffs, Status Effects) is derived entirely from this log, not stored redundantly.

**Layer 2 is never opened cold.** A persona session always begins with context injected from Layer 1 (the task, its deadline, related notes). This prevents cold-start irrelevance from the persona agent.

**Anthropic API proxied via Supabase Edge Function.** Browser CORS blocks direct `fetch` to `api.anthropic.com`. The Edge Function (`supabase/functions/chat/index.ts`) runs server-side and reads `ANTHROPIC_API_KEY` from a Supabase secret — never a client env var.

**`keyboardShouldPersistTaps="handled"` on all ScrollViews with inputs.** Without it, tapping a button while a TextInput is focused consumes the tap on keyboard dismiss rather than firing `onPress`.

**Justice persona is never rank-gated.** Safety-adjacent domains should not scale capability with a usage-based trust meter. `rankGated: false` in the registry; always summoned at the same tier.

**`detectSessionInUrl: Platform.OS === 'web'`** keeps the password-recovery deep-link working on web without breaking the native session listener.

---

## 6. Environment & Secrets

| Variable | Where it lives | Visibility |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (gitignored) | Embedded in JS bundle by Expo — intentionally public |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` (gitignored) | Embedded in JS bundle — protected by RLS, not a secret |
| `ANTHROPIC_API_KEY` | Supabase Dashboard → Project Settings → Edge Functions → Secrets | Server-side only — never in client code |

Copy `.env.example` to `.env` and fill in your Supabase project values. The Anthropic key is set once in the Supabase dashboard and is never needed locally.

---

## 7. Supabase Project Configuration

- **Auth provider**: Email (Supabase Dashboard → Authentication → Providers → Email)
- **Site URL**: your Expo web origin — e.g. `http://localhost:8081`
- **Redirect URLs**: same origin — Supabase appends `#access_token=...&type=recovery` on password reset
- **Edge Function deploy**: `supabase functions deploy chat --project-ref <ref>`
