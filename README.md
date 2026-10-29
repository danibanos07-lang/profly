# UniRate

Anonymous student reviews of university professors and courses. It starts with Tecnológico de Monterrey, Campus Santa Fe, and is built to take more campuses and universities without schema changes.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn-style components on Radix, Supabase (Postgres, Auth, Row Level Security), Lucide icons. It deploys to Vercel.

> **Status:** Phase 1 (MVP) plus most of Phases 2 and 3 are implemented. The database layer is tested against PostgreSQL. **No Supabase project is connected yet**: see [What you still need to provide](#what-you-still-need-to-provide).

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Local development](#local-development)
4. [Setting up Supabase](#setting-up-supabase)
5. [Deploying to Vercel](#deploying-to-vercel)
6. [Admin and moderation](#admin-and-moderation)
7. [Importing real data](#importing-real-data)
8. [Testing](#testing)
9. [Security model](#security-model)
10. [Roadmap](#roadmap)
11. [What you still need to provide](#what-you-still-need-to-provide)

---

## Features

**Browsing (no account needed)**
- Landing page with a large search box, campus chips, trending professors, most-reviewed courses, recent reviews and a how-it-works section.
- Search across professors and courses with autocomplete. It tolerates partial words, missing accents, typos (trigram similarity) and course codes with or without spaces. Filters: department, campus, minimum rating, maximum difficulty, maximum workload, minimum review count, take-again %. Sort by relevance, rating, number of reviews, difficulty or workload.
- Professor profile: overall and six category ratings, take-again %, attendance, teaching methods, strengths and weaknesses (tags), rating distribution, courses taught, and reviews showing the course and semester.
- Course profile: six course categories, workload and weekly hours, exams, homework, teamwork, programming and math, prior knowledge, recommendation %, student tips, and **verified official prerequisites kept separate from student-recommended preparation**.
- Professor + course page: how this course works with this professor.
- Compare up to three professors who teach the same course, side by side, with the best value highlighted.
- Low-confidence warning when a profile has fewer than 5 reviews. Fictional demo records carry a "Demo" badge.

**Accounts**
- Email and password signup with email verification, login, password recovery, and optional Google sign-in.
- University email badge (`@tec.mx`): this only proves the person controls a university address. It is **not** proof they took a course. Enrollment can be marked verified only by a moderator.
- Student dashboard: my reviews (edit and delete), saved professors and courses, saved comparisons, settings (display name, campus, language) and account deletion.

**Reviews**
- Only signed-in users with a confirmed email can write. Reviews are anonymous by default and never show the author.
- One review per student, professor, course and semester (database unique constraint).
- Server-side validation (zod, then database constraints and triggers). Contact info, links and phone numbers are rejected. A blocked-vocabulary list either rejects the text or holds it for moderation.
- Rate limits enforced in the database: 3 reviews per hour, 10 per day, 20 edits per day, 60 votes per hour.
- Helpful votes (not on your own reviews), reports with a reason. 3 severe reports or 5 total move a review to the moderation queue automatically.
- Aggregates are recomputed by triggers from published reviews only. Nobody, including admins, can write averages directly.

**Admin (`/admin`, moderators and admins)**
- Overview with queues and a 30-day reviews chart.
- Reports and review queue: publish, hold, hide, remove, verify or unverify enrollment, each with a reason.
- CRUD for professors, courses, official prerequisites (verification requires a source URL), professor–course assignments, universities, campuses, departments and semesters.
- CSV import with a dry-run mode.
- Suggestions and correction requests from the community.
- User management (role changes by admins only; suspending a user hides their reviews).
- Suspicious-activity signals (review bursts, extreme-only raters, vote brigading, spikes).
- Merge duplicate professors or courses: reviews, assignments and bookmarks move to the target, and the old URL redirects.
- Blocked vocabulary and an append-only audit log of every moderation action and catalog change.

**Everywhere**
- Spanish by default, English available (cookie-based switcher, browser language detection).
- Light and dark themes, responsive down to 360 px, keyboard accessible, ARIA combobox search.
- Community guidelines, privacy notice, and a correction-request form for professors.

## Architecture

```
src/
  app/
    (site)/                 public pages, dashboard and admin (shared header/footer)
      admin/                moderation and catalog management
      dashboard/            student area
      professors/[slug]/    profile, and /[courseSlug] for professor+course
      courses/[slug]/
      search/  compare/  reviews/new  reviews/[id]/edit  …
    api/search/             autocomplete endpoint
    auth/callback, confirm  Supabase auth redirects
  components/
    ui/                     shadcn-style primitives (button, dialog, table…)
    rating/ catalog/ reviews/ search/ compare/ dashboard/ admin/ layout/ auth/
  lib/
    supabase/               server/browser clients, session proxy, generated DB types
    data/                   server-only read models (catalog, admin, review form)
    actions/                server actions (reviews, auth, bookmarks, admin…)
    i18n/                   dictionaries (es is the source of the Dictionary type)
    validation.ts           zod schemas for user input
    admin-validation.ts     zod schemas for admin forms and CSV import
  proxy.ts                  refreshes the Supabase session; guards /dashboard, /admin…
supabase/
  migrations/               schema, functions/triggers, RLS + API, moderation/admin
  seed.sql                  development data (fictional professors and courses)
  tests/                    SQL test suite run against plain PostgreSQL
scripts/
  test-db.sh                applies migrations + seed + tests in a scratch database
  gen-db-types.ts           regenerates src/lib/supabase/database.types.ts
```

**Key design decisions**

- **The database is the security boundary.** Every table has RLS. Public pages read from views (`professor_directory`, `course_directory`, `professor_course_directory`, `review_feed`) that expose no `user_id`. Review creation and editing go through `SECURITY INVOKER` RPCs, so RLS still applies. Moderation RPCs are `SECURITY DEFINER`, check the caller's role, and write to `moderation_logs`.
- **Aggregates are derived.** `professor_stats`, `course_stats` and `professor_course_stats` are maintained by triggers when reviews or scores change. Only published reviews count.
- **Search** uses `pg_trgm` and `unaccent` over generated, normalized `search_text` columns with GIN indexes.
- **Multi-university.** Universities, campuses, departments and terms are data. `NEXT_PUBLIC_DEFAULT_UNIVERSITY_SLUG` chooses the one the site shows. Each university's `email_domains` decides the university-email badge.
- **Works without configuration.** With no Supabase variables, every page renders with a setup notice instead of crashing.

## Local development

Requirements: Node.js 20.9+ (22 recommended) and npm.

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values (next section)
npm run dev                  # http://localhost:3000
```

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generates route types and runs `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules) |
| `npm test` | Unit and component tests (Vitest) |
| `npm run db:test` | SQL test suite against a local PostgreSQL (see [Testing](#testing)) |
| `npm run db:types` | Regenerates DB types from a database (`DATABASE_URL`) |
| `npm run check` | typecheck + lint + tests |

### Using the Supabase CLI locally (optional)

```bash
npx supabase start        # needs Docker; prints a local URL and keys
npx supabase db reset     # applies supabase/migrations and supabase/seed.sql
```

Put the printed API URL and publishable (or anon) key in `.env.local`.

## Setting up Supabase

1. **Create a project** at [supabase.com](https://supabase.com). A region near Mexico (for example `us-east-1`) is a good default.
2. **Apply the migrations**, in order. Either:
   - `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - paste each file from `supabase/migrations/` into the SQL editor, oldest first.
3. **Seed data (development or staging only).** `supabase/seed.sql` creates the real Tec university with its campuses, departments and terms, plus **clearly fictional** professors (with surnames such as "Ficticia" and "Ejemplo"), `DEMO-` courses and demo reviews from accounts that cannot log in. **Do not run it in production.** For production, run only the first block of `seed.sql` (university, campuses, departments, terms) or create those in the admin UI, then import real data.
4. **Auth settings** (Authentication → URL configuration and providers):
   - Site URL: your production URL, for example `https://unirate.example.com`.
   - Redirect URLs: `https://<your-domain>/auth/callback`, `https://<your-domain>/auth/confirm`, and the same for `http://localhost:3000` during development.
   - Email provider: enable **Confirm email**. Minimum password length 8.
   - Recommended: configure custom SMTP (the built-in sender is heavily rate-limited) and turn on leaked-password protection.
   - Optional email template change, for links that also work across devices. In *Confirm signup*, use
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. In *Reset password*, use
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
     The default templates also work through `/auth/callback`.
5. **Google sign-in (optional).** Create OAuth credentials in Google Cloud. The authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`. Enable the Google provider in Supabase and set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`.
6. **Environment variables.** Copy the values into `.env.local` (and Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API.
   - The app never needs the service-role key.
7. **Create the first admin.** Sign up through the app, confirm your email, then run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   After that, manage roles from **Admin → Users**.

If you change the schema, regenerate the TypeScript types with `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` or `npm run db:types`.

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel (framework preset: Next.js).
2. Add the environment variables from `.env.example`, with `NEXT_PUBLIC_SITE_URL` set to the production URL.
3. Deploy, then add the production URL to Supabase's Site URL and redirect URLs (step 4 above).

No other services are required. Anonymous endpoints (autocomplete, correction requests) also have a per-instance in-memory limit. For strict global limits, swap `src/lib/rate-limit.ts` for a shared store such as Upstash Redis.

## Admin and moderation

Roles: `student` (default), `moderator` (moderation queues, suggestions, corrections, suspending users) and `admin` (everything, including the catalog, imports, merges, roles and vocabulary). The `/admin` area returns 404 to students.

Moderation workflow:
1. Reviews publish immediately unless they contain flagged vocabulary or collect enough reports. Then they go to **Review queue** and stop counting toward averages.
2. **Reports** groups reports by review. Resolving a report and acting on the review are separate decisions, and both are logged with a reason.
3. **Verify enrollment** only with official evidence. It adds a "Verified enrollment" badge. A university email alone never does.
4. **Correction requests** come from the public form linked on every profile. Contact details are visible only to moderators.

## Importing real data

**Admin → CSV import** accepts UTF-8 CSV files with a header row (max 2,000 rows). Run with **Validate only** first.

| Type | Columns (`*` = required) | Matching |
| --- | --- | --- |
| Professors | `first_name*`, `last_name*`, `honorific`, `department_slug`, `campus_slug`, `slug` | A row with an explicit `slug` updates that professor. Without one, a new professor is created, and a name collision is reported instead of silently merging two people. |
| Courses | `code*`, `name*`, `name_language` (`es`/`en`), `department_slug`, `credits`, `description` | Updates by course code within the university. |
| Assignments | `professor_slug*`, `course_code*`, `campus_slug` | Duplicates are ignored. |

Only import real, verifiable data from public sources (official directory, schedules, curriculum). Official prerequisites are added per course in the admin, and marking one as verified requires a source URL.

## Testing

- **Unit and component tests:** `npm test` (Vitest + Testing Library) covers validation, content moderation helpers, CSV import validation, formatting, rate limiting, comparison logic, an accessible rating input, and Spanish/English dictionary parity (same keys and placeholders).
- **Database tests:** `supabase/tests/01_security_and_reviews.sql` has 59 assertions run inside a rolled-back transaction. They cover RLS and privacy (no author IDs leak through views), uniqueness, contact-info rejection, flagging, rate limits, voting rules, automatic queueing after reports, moderator-only actions, audit logging, the append-only log, merges, account deletion and fuzzy or accent-insensitive search.
  `scripts/test-db.sh` creates a scratch database and installs a small shim for Supabase's `auth` schema and roles (`supabase/tests/local_supabase_shim.sql`). It then applies the migrations, the seed and the tests. It needs PostgreSQL 15+ with the `pg_trgm` and `unaccent` extensions, run as a superuser:
  ```bash
  PGHOST=localhost PGUSER=postgres ./scripts/test-db.sh   # recreates the unirate_test database each run
  ```

## Security model

- RLS on every table, column-level grants on writable tables, and views as the public read surface.
- Emails live only in `auth.users`. Moderators see them only through `admin_list_users`.
- Reviews never expose `user_id` publicly. Authors see their own reviews through `is_own`.
- Input is validated in the browser and on the server (zod) and again in the database (constraints and triggers). Text is stripped of HTML and control characters, and React escapes all output.
- Rate limits live in the database for authenticated actions and in memory for anonymous endpoints. A honeypot field guards the correction form.
- The session is refreshed in `src/proxy.ts`. Protected routes use the verified user (`getUser`), never an unverified cookie.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy`.
- Account deletion removes the auth user, which cascades to the profile, reviews, votes, bookmarks and comparisons. Statistics are recomputed.

## Roadmap

- **Phase 1 – MVP (done):** schema and RLS, auth, search, professor, course and combination pages, reviews with moderation basics, ES/EN, light and dark themes.
- **Phase 2 (done):** comparison, saved items and comparisons, dashboard, helpful votes, reports.
- **Phase 3 (done):** admin dashboard, imports, merges, suspicious-activity signals, audit log.
- **Phase 4 (next):** enrollment-verification workflow (for example, students uploading proof for moderator review), professor replies, email notifications for moderators, shared rate-limit store, analytics, E2E tests against a staging project, and activating the other Tec campuses once real data is imported.

## What you still need to provide

| Item | Where | Why |
| --- | --- | --- |
| Supabase project URL and publishable key | `.env.local` and Vercel | Without them the app shows a setup notice and no data |
| Migrations applied to that project | Supabase | Creates the schema, policies and functions |
| Auth redirect URLs and Site URL | Supabase → Authentication | Email confirmation and password reset links |
| Custom SMTP (recommended) | Supabase → Authentication → SMTP | The default sender allows only a few emails per hour |
| Google OAuth client (optional) | Google Cloud + Supabase | "Continue with Google" |
| First admin account | SQL editor (see above) | Access to `/admin` |
| Real catalog data | Admin → CSV import | The seed has only fictional demo professors and courses |
| Production URL | `NEXT_PUBLIC_SITE_URL` | Correct links in auth emails |

UniRate is an independent project and is not affiliated with, sponsored or endorsed by Tecnológico de Monterrey or any other university.
