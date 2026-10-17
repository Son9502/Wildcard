# Wildcard — MVP

**One line:** Wildcard is a gamified, Notion-style workspace that keeps you on track. You write in pages; tasks, schedule and people live inside those pages; an AI agent (and a roster of personas) can read and act on all of it; and every completion feeds a progression system that rewards follow-through.

This document defines the **minimum version that delivers that promise end to end**. Everything not listed here is post-MVP (see [Out of scope](#7-out-of-scope-post-mvp)). For the long-term vision and full Persona vocabulary, see [README.md](README.md); for the current code structure, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Where things stand

| Area | Status today |
|---|---|
| Auth (sign-in, sign-up, password reset) | ✅ Built |
| Tasks, today's schedule, Confidant Log + overdue nudges | ✅ Built |
| Postgres schema with per-user RLS (5 tables) | ✅ Built |
| Central `event_log` (task completed, confidant contacted) | ✅ Built, written on completion |
| Chat → Anthropic API via Supabase Edge Function | ✅ Built — plain chat, no tools |
| Persona registry (6 personas, one-line prompts) | 🟡 Data only — no UI, no tools |
| Hand-off (`buildSessionContext` / `completeSession`) | 🟡 Code exists, not wired to any screen |
| XP / rank math (`recordCompletion`) | 🟡 Code exists, never called |
| Pages / blocks (the Notion-like part) | ❌ Not started |
| Streaks, milestones, any progression UI | ❌ Not started |

---

## 2. MVP pillars

The MVP is five pillars. Each one has a concrete definition of done.

### Pillar A — Workspace (the Notion-like layer)

Pages are the primary surface. Everything else is something you can put on a page.

- **Pages**: title, emoji icon, optional parent page (one level of nesting is enough for MVP). A sidebar/list shows all pages.
- **Blocks** (ordered within a page):

  | Block type | Content |
  |---|---|
  | `heading` | text |
  | `paragraph` | text (plain; no inline formatting in MVP) |
  | `todo` | text + checked flag — a lightweight checkbox |
  | `task` | reference to a row in `tasks` — shows title, due date, persona, completion; tapping opens the persona hand-off |
  | `confidant` | reference to a row in `confidants` — shows last contact + follow-ups |
  | `divider` | — |

- **Inserting blocks**: a "+" menu (and `/` shortcut on web) listing block types. Reordering via move up / move down (drag-and-drop is post-MVP).
- **Daily page**: each day, a "Today — Mon 14 Oct" page is generated with today's schedule, due/overdue tasks, and Confidant nudges as live blocks. This replaces the current Home screen and is what the app opens to.

**Done when:** a user can create a page, add each block type, check off a `todo`, complete a `task` from inside a page, and open today's Daily page.

### Pillar B — An agent that can act

The always-on protagonist agent gets **tools**, so it manages the workspace instead of only chatting about it.

- The tool-use loop runs **server-side in the Edge Function**: call the Messages API → if `stop_reason` is `tool_use`, run each tool, return all `tool_result` blocks in one user message → repeat until `end_turn` (cap at ~8 iterations). Append the full `response.content` each turn (not just text) so thinking blocks are preserved.
- Tools run against Supabase **with the caller's JWT**, so every tool call is constrained by the same RLS policies as the app — the agent can never touch another user's rows.
- MVP tool set:

  | Tool | Effect |
  |---|---|
  | `list_tasks`, `create_task`, `complete_task` | Tasks |
  | `list_schedule`, `create_event` | Schedule |
  | `list_confidants`, `log_contact` | Confidant Log |
  | `search_pages`, `create_page`, `append_blocks` | Workspace |
  | `get_status` | XP, ranks, streak (read-only) |

- Every write tool also writes an `event_log` row (`type = 'agent_action'`), so agent work is visible and auditable.
- Use `tool_choice: auto` and `strict: true` tool schemas (current Claude 5.5-generation models reject forced `tool_choice`). Handle `stop_reason: "refusal"` with a friendly message.
- **Model**: keep the model ID in one constant. The function currently uses `claude-sonnet-5` (previous generation). Moving to `claude-opus-5-5` (most capable) or `claude-sonnet-5-5` (cheaper) is a cost/quality call to make before the MVP ships.

**Done when:** "add a task to call Mom on Friday and put it on my Family page" results in a real task row, a `task` block on the right page, and an `agent_action` event.

### Pillar C — Personas with tool permissions and hand-off

- **Server-side registry.** Persona definitions (system prompt, domain, `allowedTools`, `rankGated`) move to a module the Edge Function imports. The client sends only a `personaId`; it can no longer send an arbitrary system prompt. This closes the current hole where any signed-in user can use the function as an unrestricted Claude proxy.
- **Tool-permission sets** (enforced in the function — tools not in the set are never offered to the model):

  | Persona | Domain | Tools |
  |---|---|---|
  | Protagonist (always-on) | Everything | All MVP tools |
  | Chariot | Execution | tasks, schedule |
  | Hermit | Organization | pages, blocks, tasks |
  | Empress | Writing | pages, blocks |
  | Magician | Coding | pages, blocks (notes/snippets) |
  | Hierophant | Research | pages, blocks |
  | Justice | Rules / advisory | read-only: `search_pages`, `list_tasks`. Never rank-gated. |

- **Hand-off flow**: tap a `task` block (or task row) with a persona → `PersonaSessionScreen` opens with context injected: the task, the page it lives on, and the last few `event_log` entries for that task/persona. Ending the session calls `completeSession` → task completed, `persona_session_completed` logged, XP awarded.
- **Rank gating (MVP-sized)**: one gate only — a persona's rank-2 prompt variant adds a short "memory" paragraph built from its recent completions. Evolution/Fusion are post-MVP.

**Done when:** a Chariot task opens a Chariot session that can create/complete tasks but cannot edit pages, and finishing it awards Chariot XP.

### Pillar D — Progression (XP, streaks, milestone states)

All progression is **derived from `event_log`**, computed in Postgres, and shown in a Status page.

- **XP rules** (single table in code + DB function, so they're tunable):

  | Event | XP |
  |---|---|
  | `task_completed` | 10 |
  | `persona_session_completed` | 15 (to that persona) |
  | `confidant_contacted` | 10 |
  | `todo_checked` | 2 |
  | `daily_page_reviewed` (first open per day) | 5 |

- **Award in the database**: an `AFTER INSERT` trigger on `event_log` updates `persona_progression` (and an overall protagonist total), replacing the unused client-side `recordCompletion`. Ranks: every 100 XP, max rank 10.
- **Streak**: consecutive days with at least one completion event, computed by a SQL function `get_streak()` from `event_log` (no stored counter to drift).
- **Milestone states** — recorded once in a `milestones` table so the UI can toast them a single time:
  - *Buffs* (positive): First Task, First Persona Session, 3-day streak, 7-day streak, first rank-up.
  - *Status Effects* (recoverable): **Fatigued** when a ≥3-day streak breaks (clears on next completion); **Dormant — [Persona]** after 7 days without a session for a persona you've used (clears on next session).
- **Status page** (a built-in page, not a separate app section): protagonist level, XP bar per persona, current streak, active Buffs and Status Effects.
- **Feedback**: a toast on XP gain, rank-up, Buff unlock, Status Effect applied/cleared.

**Done when:** completing tasks across two days shows a 2-day streak, rank-ups trigger a toast, and skipping a day after a 3-day streak shows "Fatigued" until the next completion.

### Pillar E — Hardening & presentation

- Edge Function: require a valid JWT, build prompts server-side (Pillar C), cap requests per user per hour (count recent `agent_action` / chat events).
- Unit tests for XP/rank/streak math and the tool-permission filter.
- README and ARCHITECTURE updated to match what's actually built; a short demo GIF or video in the README.
- App deployed to web (Expo web export) so it can be linked from a portfolio.

---

## 3. Data model changes

```sql
-- Pages & blocks (Notion-like layer)
pages(id uuid pk, user_id uuid default auth.uid(), title text, icon text,
      parent_id uuid null references pages, is_daily boolean default false,
      daily_date date null, position int, created_at, updated_at)
      unique (user_id, daily_date)

blocks(id uuid pk, user_id uuid default auth.uid(), page_id uuid references pages on delete cascade,
       type text check (type in ('heading','paragraph','todo','task','confidant','divider')),
       content jsonb,            -- { text, checked } | { task_id } | { confidant_id }
       position int, created_at, updated_at)

-- Progression
milestones(user_id uuid default auth.uid(), key text, kind text check (kind in ('buff','status_effect')),
           persona_id text null, unlocked_at timestamptz, cleared_at timestamptz null,
           primary key (user_id, key))

-- event_log.type gains: 'todo_checked', 'daily_page_reviewed', 'agent_action'
-- Trigger: award_xp() AFTER INSERT ON event_log → upsert persona_progression
-- Function: get_streak() → int
```

Every new table gets the same `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` policy as the existing schema. New SQL goes in numbered files under `supabase/` (e.g. `supabase/01_pages_blocks.sql`, `02_progression.sql`).

---

## 4. Screens

| Screen | MVP role |
|---|---|
| Auth / Reset password | Unchanged |
| **Pages** (list + sidebar) | New — all pages, Daily pages grouped by date |
| **Page editor** | New — renders and edits blocks |
| **Today** | Becomes the generated Daily page |
| **PersonaSessionScreen** | New — persona chat with injected context + "End session" |
| **Chat** | Protagonist agent, now with tools; shows tool actions inline ("✓ Created task …") |
| **Status** | New built-in page — level, XP bars, streak, Buffs, Status Effects |
| Confidants / Confidant detail | Unchanged, plus embeddable as `confidant` blocks |

Tabs: **Today · Pages · Chat · Status**. Confidants is reachable from Pages and via blocks.

---

## 5. Milestones

| # | Milestone | Delivers | Pillars |
|---|---|---|---|
| M1 | **Workspace** | `pages`/`blocks` schema + RLS, page list, page editor, all six block types | A |
| M2 | **Daily page & progression core** | Daily page generation, XP trigger, `get_streak()`, Status page, XP toasts | A, D |
| M3 | **Agent tools** | Server-side tool loop, MVP tool set, `agent_action` events, inline tool results in Chat | B |
| M4 | **Personas & hand-off** | Server-side registry, tool-permission sets, PersonaSessionScreen, hand-off from `task` blocks | C |
| M5 | **Milestone states & hardening** | Buffs/Status Effects + `milestones` table, rate limiting, tests, docs, web deploy | D, E |

Order rationale: the workspace (M1) is the surface everything else attaches to; progression (M2) depends only on `event_log`, which already exists, so it can ship early and make the app feel alive; the agent (M3) needs pages to act on; personas (M4) are a filtered version of M3's tool loop.

---

## 6. MVP acceptance — the demo day

The MVP is done when this script works start to finish on web and on a phone:

1. Open the app → today's **Daily page** shows two schedule events, three due tasks, and a nudge: "You haven't talked to Sam in 15 days."
2. Check a `todo` → "+2 XP" toast.
3. In Chat: *"Plan my study session for the algorithms exam on Thursday and put it on my School page."* → the agent creates two tasks and appends them as `task` blocks on the School page; Chat shows each action.
4. Tap one of those tasks (assigned to **Chariot**) → PersonaSessionScreen opens already knowing the task and its page. Chariot can update tasks but refuses to edit the page (not in its tool set).
5. End the session → task marked done, "+15 Chariot XP", **Chariot rank 2** toast.
6. Log a contact with Sam from the nudge → nudge disappears, "+10 XP".
7. Open **Status** → protagonist level, Chariot rank 2, the current streak (a demo account seeded with activity on the two previous days shows 3 days), and the "3-Day Streak" Buff.

---

## 7. Out of scope (post-MVP)

Kept from the README roadmap, deliberately deferred:

- Velvet Room roster cap, Compendium (release / re-summon)
- Persona Evolution and Fusion
- Arcs (multi-day goals), Requests (double-XP tasks), Activities (cooldown-based XP)
- Push notifications
- Rich text (bold, links, inline mentions), drag-and-drop reordering, deep page nesting, databases/table views
- Real-time collaboration / sharing pages
- Browser-extension quick capture
