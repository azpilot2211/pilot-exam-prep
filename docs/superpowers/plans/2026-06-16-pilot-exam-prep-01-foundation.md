# Pilot Exam Prep — Plan 1: Foundation & Schema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Next.js + TypeScript app wired to Supabase, with the full database schema, row-level security, generated types, and a working unit-test harness.

**Architecture:** A single Next.js (App Router) project. Supabase provides Postgres, Auth, and Storage. Database schema is managed as versioned SQL migrations via the Supabase CLI and pushed to the cloud project. Pure logic (mastery math) is unit-tested with Vitest; database wiring is verified with explicit query commands.

**Tech Stack:** Next.js 15 (App Router, TypeScript), `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI, Vitest.

This is Plan 1 of 3. It depends on nothing. Plans 2 (generation pipeline) and 3 (web app) build on the schema and clients created here.

---

## Prerequisites (human, one-time)

These must be done before Task 3:

- A Supabase project exists. From its dashboard → Project Settings → API, copy: Project URL, `anon` public key, `service_role` secret key.
- From Project Settings → General, copy the Project Reference ID (the `xxxx` in `xxxx.supabase.co`).
- The database password (set at project creation) is available for `supabase link`.

---

## File Structure (this plan)

- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `.env.local` (gitignored)
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/lib/supabase/client.ts` (browser client)
- Create: `src/lib/supabase/server.ts` (server client)
- Create: `src/lib/supabase/types.ts` (generated DB types)
- Create: `src/lib/scoring.ts` + `src/lib/scoring.test.ts` (pure mastery logic)
- Create: `supabase/migrations/0001_initial_schema.sql`
- Create: `supabase/seed.sql`

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create the Next.js app non-interactively**

Run from the repo root (the directory already contains `README.md` and `docs/`):

```bash
npx create-next-app@latest . --typescript --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm --yes
```

If it refuses because the directory is not empty, accept its prompt to proceed (the existing `README.md`/`docs/` are preserved). If it still blocks, run in a temp dir and copy `package.json`, `next.config.ts`, `tsconfig.json`, `src/`, `public/`, `.gitignore` into the repo root.

- [ ] **Step 2: Verify the dev server boots**

Run:

```bash
npm run dev
```

Expected: terminal prints `Ready` and a local URL (e.g. `http://localhost:3000`). Stop it with Ctrl+C.

- [ ] **Step 3: Replace the home page with a placeholder**

Overwrite `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Pilot Exam Prep</h1>
      <p>Foundation is up. Screens arrive in Plan 3.</p>
    </main>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run:

```bash
npm run build
```

Expected: build completes with `Compiled successfully` and no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript app"
```

---

## Task 2: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json` (scripts)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add a `test` script to `package.json`**

In the `"scripts"` object add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify Vitest runs (with no tests yet)**

```bash
npm test
```

Expected: Vitest exits 0 with "No test files found" (acceptable) OR runs zero tests. Either is fine — it confirms the harness is wired.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Supabase SDK and Vitest test harness"
```

---

## Task 3: Environment configuration

**Files:**
- Create: `.env.example`, `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Ensure secrets are gitignored**

Confirm `.gitignore` contains `.env*.local` (create-next-app adds it). If absent, append:

```
.env*.local
```

- [ ] **Step 2: Create `.env.example` (committed, no secrets)**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Create `.env.local` (gitignored, real values)**

Fill in the values copied during Prerequisites:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

- [ ] **Step 4: Verify `.env.local` is ignored**

```bash
git status --porcelain .env.local
```

Expected: no output (the file is ignored).

- [ ] **Step 5: Commit the example only**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

---

## Task 4: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Initialize and link the Supabase CLI**

```bash
npx supabase init
npx supabase link --project-ref <project-ref>
```

`init` creates the `supabase/` directory. `link` prompts for the database password from Prerequisites.

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/0001_initial_schema.sql` with the full schema and row-level security:

```sql
create extension if not exists "pgcrypto";

create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  stem text not null,
  acs_code text,
  figure_ref text,
  figure_image_url text,
  display_order int not null default 0,
  content_version text,
  created_at timestamptz not null default now()
);

create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C')),
  text text not null,
  is_correct boolean not null default false,
  why text,
  created_at timestamptz not null default now(),
  unique (question_id, label)
);

create table question_content (
  question_id uuid primary key references questions(id) on delete cascade,
  concept_tested text,
  explanation text,
  source_citation text,
  memory_aid text,
  key_takeaway text,
  illustration_svg text,
  audio_url text,
  published boolean not null default false,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_label text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
create index attempts_user_question_idx on attempts (user_id, question_id);

alter table chapters enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table question_content enable row level security;
alter table profiles enable row level security;
alter table attempts enable row level security;

create policy "chapters are public" on chapters
  for select using (true);

create policy "questions are public" on questions
  for select using (true);

create policy "answer options are public" on answer_options
  for select using (true);

create policy "published content is public" on question_content
  for select using (published = true);

create policy "users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "users upsert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "users read own attempts" on attempts
  for select using (auth.uid() = user_id);
create policy "users insert own attempts" on attempts
  for insert with check (auth.uid() = user_id);
```

Note: the pipeline (Plan 2) writes with the `service_role` key, which bypasses RLS, so no write policies are needed for content tables.

- [ ] **Step 3: Push the migration to the cloud project**

```bash
npx supabase db push
```

Expected: CLI lists `0001_initial_schema.sql` and reports it applied successfully.

- [ ] **Step 4: Verify the tables exist**

```bash
npx supabase db dump --schema public --data-only=false -f -
```

Expected: output includes `create table ... chapters`, `questions`, `answer_options`, `question_content`, `profiles`, `attempts`. (Alternatively, confirm visually in the Supabase dashboard → Table Editor.)

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema and RLS policies"
```

---

## Task 5: Generate TypeScript types from the schema

**Files:**
- Create: `src/lib/supabase/types.ts`
- Modify: `package.json` (add `types:gen` script)

- [ ] **Step 1: Add a type-generation script to `package.json`**

In `"scripts"` add (replace `<project-ref>`):

```json
"types:gen": "supabase gen types typescript --project-id <project-ref> --schema public > src/lib/supabase/types.ts"
```

- [ ] **Step 2: Generate the types**

```bash
npm run types:gen
```

Expected: `src/lib/supabase/types.ts` is created and contains `export type Database = {` with `chapters`, `questions`, `answer_options`, `question_content`, `profiles`, `attempts` under `Tables`.

- [ ] **Step 3: Verify the types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/types.ts package.json
git commit -m "feat: generate Supabase TypeScript types"
```

---

## Task 6: Supabase client modules

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Create the browser client**

`src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create the server client**

`src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; safe to ignore when middleware refreshes sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Verify they compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 7: Mastery scoring logic (TDD)

This pure module powers per-chapter mastery and exam-readiness in Plan 3. Building it now establishes the unit-test pattern.

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `src/lib/scoring.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { masteryPercent, examReadiness } from "./scoring";

describe("masteryPercent", () => {
  it("returns 0 when no questions attempted", () => {
    expect(masteryPercent(0, 0)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(masteryPercent(2, 3)).toBe(67);
  });

  it("caps at 100", () => {
    expect(masteryPercent(5, 5)).toBe(100);
  });
});

describe("examReadiness", () => {
  it("averages chapter mastery, ignoring untouched chapters", () => {
    const result = examReadiness([
      { correct: 8, total: 10 },
      { correct: 6, total: 10 },
      { correct: 0, total: 0 },
    ]);
    expect(result).toBe(70);
  });

  it("returns 0 when nothing attempted anywhere", () => {
    expect(examReadiness([{ correct: 0, total: 0 }])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot import `masteryPercent`/`examReadiness` (module not found).

- [ ] **Step 3: Write the minimal implementation**

`src/lib/scoring.ts`:

```ts
export function masteryPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((correct / total) * 100));
}

export interface ChapterScore {
  correct: number;
  total: number;
}

export function examReadiness(chapters: ChapterScore[]): number {
  const attempted = chapters.filter((c) => c.total > 0);
  if (attempted.length === 0) return 0;
  const sum = attempted.reduce(
    (acc, c) => acc + masteryPercent(c.correct, c.total),
    0
  );
  return Math.round(sum / attempted.length);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: add mastery scoring logic with tests"
```

---

## Task 8: Seed a sample chapter and question (smoke data)

Gives Plans 2 and 3 real data to read, and verifies end-to-end DB connectivity.

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create the seed file**

`supabase/seed.sql`:

```sql
insert into chapters (slug, title, description, display_order)
values ('navigation', 'Navigation', 'VOR, GPS, charts, and dead reckoning.', 3)
on conflict (slug) do nothing;

with ch as (select id from chapters where slug = 'navigation')
insert into questions (chapter_id, stem, acs_code, display_order, content_version)
select ch.id,
  'While checking a VOR receiver with a VOT, the CDI centers. The OBS and TO/FROM indicator should read:',
  'PA.VI.B', 1, 'seed-v1'
from ch
on conflict do nothing;
```

- [ ] **Step 2: Apply the seed to the cloud project**

```bash
npx supabase db push --include-seed
```

Expected: CLI reports the seed ran. (If your CLI version lacks `--include-seed`, paste `seed.sql` into the dashboard SQL editor and run it.)

- [ ] **Step 3: Verify the row is readable with the anon key**

Create a throwaway check (do not commit) `scripts/check.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const { data, error } = await supabase.from("chapters").select("slug, title");
console.log({ data, error });
```

Run:

```bash
npm install -D dotenv
node --env-file=.env.local scripts/check.mjs
```

Expected: logs `{ data: [ { slug: 'navigation', title: 'Navigation' } ], error: null }`. This confirms RLS allows public reads and the keys work.

- [ ] **Step 4: Remove the throwaway script**

```bash
rm scripts/check.mjs
```

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql package.json package-lock.json
git commit -m "feat: seed sample navigation chapter and question"
```

---

## Self-Review Notes

- **Spec coverage (Plan 1 scope):** data model §5 → Task 4 (all six tables + RLS); tech stack §4 → Tasks 1–2, 6; cost/decoupling needs no foundation work. Pipeline §8 and screens §7 are intentionally deferred to Plans 2 and 3.
- **Deferred to Plan 2:** generation pipeline, prompts, TTS, content validation, `published` flip workflow, Supabase Storage bucket for audio.
- **Deferred to Plan 3:** all five screens, Supabase Auth flows + middleware session refresh, recording attempts, progress UI.
- **Type consistency:** `Database` type from `types.ts` is consumed by both clients; `ChapterScore { correct, total }` is the single shape used by `masteryPercent` and `examReadiness`.
