# Wildcard

A Persona-Framework personal agent, built on two layers that mirror the two loops the Persona games run on: an always-on protagonist layer for daily life, and a roster of specialized personas summoned for specific tasks.

This is v2 of the scope: in v1, shared memory across personas was invisible backend plumbing. Here, that shared layer is promoted to a first-class, visible feature — useful even on days no persona is summoned at all.

## Getting Started

Expo (React Native + web) + TypeScript, backed by Supabase.

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run web             # or: npm run ios / npm run android
```

Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor to create the protagonist-layer tables (`tasks`, `schedule_events`, `confidants`, `event_log`, `persona_progression`) with per-user RLS.

### Layout

```
App.tsx                 Tab shell wiring the three Layer-1 screens together
src/screens/             Home (schedule + tasks), Confidants, Chat (stub — see below)
src/data/                Protagonist data store: tasks, schedule, confidants, event log
src/personas/registry.ts Layer-2 persona definitions (arcana, domain, system prompt, rank gating)
src/progression/         Rank/XP derived from event_log completions
src/router/handoff.ts    Builds persona session context from a task, writes completions back
src/lib/supabase.ts      Supabase client
supabase/schema.sql      Full protagonist-layer schema + RLS policies
```

This covers build-order step 1 (protagonist core: schedule, tasks, a stubbed agent chat) and lays the plumbing for step 2 (Confidant Log, already scaffolded) and step 3 (first persona hand-off — `src/router/handoff.ts` has the shape, but `ChatScreen` and persona sessions aren't wired to a real model yet).

**Not yet wired:** auth (screens assume a logged-in `auth.uid()`), an actual LLM call in `ChatScreen`/persona sessions, and a real navigation library (the tab bar in `App.tsx` is local state, not `react-navigation`).

## Concept

- **Layer 1 — Protagonist layer**: the daily-life loop. Schedule, tasks, a Confidant-style relationship log, and a central event log that feeds persona sessions with context and gets written back to when a session completes something.
- **Layer 2 — Persona roster**: the task-specific loop. Specialized personas (arcana-mapped) summoned from a task, pre-loaded with context, each with its own domain, rank, and eventual evolution.

Rank now increments from real completions logged centrally in the protagonist layer's event log, rather than from isolated per-persona counters.

## Form Factor

- **Primary**: cross-platform app (mobile + web), not a browser extension. The protagonist layer needs to be checked every morning (schedule, tasks, overdue check-ins), which needs notifications and easy daily access.
- **Stack note**: same shape of build as the Film Log project — Expo/React Native + a backend, offline-first with cloud sync. Reusing that stack is worth considering purely for build efficiency.
- **Secondary (later)**: a lightweight browser extension for quick capture — jot a task, log a note, or summon a persona without leaving what you're doing. Not where the product lives; an accelerant added after the core app works.

## Relationship to the AI Flight Planning Assistant

Keep it as a separate product, or house it as a static, non-rank-gated Justice persona if a single platform is preferred. Safety-adjacent domains shouldn't have capability that scales with a usage-based trust meter.

## Two-Layer Architecture

### Layer 1 — Protagonist Layer (daily-life loop)

Always on; what the user opens first. Owns:

- Daily / weekly schedule and task list
- Confidant Log — per-person relationship notes: questions to ask, last-contact date, follow-ups owed
- A central event log that both feeds persona sessions with context and gets written back to on completion

A single, un-themed agent — no arcana skin — because it needs to be reliable, fast to check, and useful standalone from day one.

### Layer 2 — Persona Roster (task-specific loop)

Summoned from inside the protagonist layer, not opened cold. Tapping a task ("draft the Q3 proposal") opens the relevant persona pre-loaded with context the protagonist layer already has (deadline, prior drafts, related notes).

Arcana mapping (unchanged in concept from v1):

| Arcana | Domain |
|---|---|
| Magician | Coding |
| Empress | Creative / writing |
| Chariot | Task execution |
| Hierophant | Research |
| Justice | Rules / regulated advisory (static, non-rank-gated) |
| Hermit | Personal organization |

**Example day**: open the app, see today's schedule plus a nudge ("haven't talked to [contact] in two weeks — question queued: ask about their trip"). Tap a task, it opens the persona suited to it with context already loaded. Session ends, the task is marked done and the protagonist layer logs it; the persona's rank ticks up from that real completion.

## Build Order

1. **Protagonist layer core** — schedule, task list, and a basic (non-personified) agent chat. No personas yet. Usable as a daily driver on its own.
2. **Confidant Log** — relationship tracking layered onto the protagonist core.
3. **First persona** (Magician or Chariot) summoned from a task, pulling context from the protagonist layer — proves the hand-off between layers works.
4. **Additional personas** + centralized rank tracking.
5. **Evolution mechanic** as a proof of concept on one persona.
6. **Fusion.**
7. **Justice / flight-planning persona** — last, independent of this timeline.

This reorders the v1 plan, which started directly with a single persona. Building the protagonist layer first means every subsequent persona plugs into a shared history that already exists, and the product is useful before the persona-roster complexity is added.

## Feasibility & Effort

| Layer | Difficulty | Notes |
|---|---|---|
| Protagonist layer core (schedule, tasks, chat) | Low–Moderate | Standard CRUD + agent chat, similar shape to Film Log's data patterns. First milestone, not an afterthought. |
| Confidant Log (relationship tracking) | Low | Structured notes tied to contacts; no new architecture beyond the protagonist layer's data model. |
| First persona hand-off from a task | Moderate | The interesting engineering: context needs to flow from the protagonist layer into a persona session and back out again. |
| Additional personas + rank tracking | Low–Moderate | Mostly repeating the pattern from the first persona once it works. |
| Evolution mechanic | Moderate | Tiered prompts/permissions are easy; detecting a genuine "breakthrough" task reliably needs a heuristic or manual flag. |
| Fusion | Moderate–High | Dynamic composition of two personas' prompts and tool permissions — real engineering, not configuration. |
| Justice persona (aviation data) | Moderate–High | Independent of this framework; same complexity as the standalone flight-planning brief. |

**Bottom line**: a usable protagonist-layer MVP (schedule, tasks, Confidant Log, no personas) is roughly 2–3 weeks of part-time work. Adding the first persona hand-off brings a genuinely differentiated MVP to about 3–5 weeks. Evolution, fusion, and a polished summon UI extend that to one to two months beyond that. The Justice/flight-planning persona stays scoped and built independently of this timeline.

## Technical Architecture Components

| Component | Role |
|---|---|
| Protagonist data store | Schedule, tasks, Confidant Log, and the central event log — the single source of truth both layers read and write. |
| Persona modules | Per-arcana system prompt, tool-permission set, and rank-tier variants. |
| Progression store | Per-user, per-persona rank/XP, evolution flags, fusion history — sourced from the protagonist event log. |
| Router / hand-off layer | Passes context from a tapped task into the right persona session, and writes results back to the protagonist layer on completion. |
| Summon UI | Persona selection screen, arcana card visuals, evolution/fusion moments — presentation layer only. |
