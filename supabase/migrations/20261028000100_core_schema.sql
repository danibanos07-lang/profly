-- UniRate core schema
-- Universities → campuses / departments / terms → professors & courses →
-- professor-course assignments → reviews (+ score tables) → votes / reports.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'moderator', 'admin');
create type public.term_season as enum ('spring', 'summer', 'fall', 'winter');
create type public.teaching_format as enum ('in_person', 'online', 'hybrid');
create type public.review_status as enum ('published', 'under_review', 'hidden', 'removed');
create type public.homework_frequency as enum ('none', 'occasional', 'weekly', 'several_per_week');
create type public.teamwork_level as enum ('none', 'some', 'frequent');
create type public.attendance_policy as enum ('mandatory', 'counts_toward_grade', 'optional');
create type public.report_reason as enum (
  'harassment', 'hate_speech', 'threat', 'personal_info',
  'false_information', 'spam', 'off_topic', 'other'
);
create type public.report_status as enum ('open', 'dismissed', 'actioned');
create type public.suggestion_kind as enum ('professor', 'course', 'assignment', 'prerequisite');
create type public.suggestion_status as enum ('pending', 'approved', 'rejected');
create type public.correction_status as enum ('open', 'resolved', 'rejected');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Accent/case-insensitive normalisation used for search columns.
-- unaccent() is only STABLE, so we pin the dictionary and wrap it as IMMUTABLE.
create or replace function public.normalize_search(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select trim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, input)),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------
create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 200),
  short_name text not null check (char_length(short_name) between 2 and 40),
  country_code char(2) not null default 'MX',
  default_locale text not null default 'es' check (default_locale in ('es', 'en')),
  -- Domains whose confirmed addresses count as a "verified university email".
  email_domains text[] not null default '{}',
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  city text,
  state text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, slug)
);
create index campuses_university_idx on public.campuses (university_id);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  name_en text check (name_en is null or char_length(name_en) between 2 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, slug)
);
create index departments_university_idx on public.departments (university_id);

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  season public.term_season not null,
  label text not null check (char_length(label) between 2 and 60),
  starts_on date,
  ends_on date,
  is_open_for_reviews boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, year, season),
  check (ends_on is null or starts_on is null or ends_on > starts_on)
);
create index academic_terms_university_idx on public.academic_terms (university_id, year desc);

-- ---------------------------------------------------------------------------
-- Professors & courses
-- ---------------------------------------------------------------------------
create table public.professors (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  department_id uuid references public.departments (id) on delete set null,
  primary_campus_id uuid references public.campuses (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 120),
  honorific text check (honorific is null or char_length(honorific) <= 20),
  display_name text generated always as (first_name || ' ' || last_name) stored,
  -- Development/demo records are flagged so the UI can label them clearly.
  is_fictional boolean not null default false,
  is_active boolean not null default true,
  merged_into_id uuid references public.professors (id) on delete set null,
  search_text text generated always as (public.normalize_search(first_name || ' ' || last_name)) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into_id is null or merged_into_id <> id)
);
create index professors_university_idx on public.professors (university_id) where merged_into_id is null;
create index professors_department_idx on public.professors (department_id);
create index professors_campus_idx on public.professors (primary_campus_id);
create index professors_search_trgm_idx on public.professors using gin (search_text extensions.gin_trgm_ops);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  department_id uuid references public.departments (id) on delete set null,
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Official name, stored in its original language.
  name text not null check (char_length(name) between 2 and 200),
  name_language text not null default 'es' check (name_language in ('es', 'en')),
  description text check (description is null or char_length(description) <= 4000),
  credits numeric(4, 1) check (credits is null or credits between 0 and 40),
  -- Curated summary of recommended preparation (not an official requirement).
  recommended_knowledge text check (recommended_knowledge is null or char_length(recommended_knowledge) <= 2000),
  is_fictional boolean not null default false,
  is_active boolean not null default true,
  merged_into_id uuid references public.courses (id) on delete set null,
  search_text text generated always as (
    public.normalize_search(name || ' ' || code) || ' ' || replace(public.normalize_search(code), ' ', '')
  ) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, code),
  check (merged_into_id is null or merged_into_id <> id)
);
create index courses_department_idx on public.courses (department_id);
create index courses_search_trgm_idx on public.courses using gin (search_text extensions.gin_trgm_ops);

-- Official prerequisites. Only rows with is_verified = true are shown as official.
create table public.course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  prerequisite_course_id uuid references public.courses (id) on delete cascade,
  description text check (description is null or char_length(description) <= 500),
  is_verified boolean not null default false,
  source_url text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (prerequisite_course_id is not null or description is not null),
  check (prerequisite_course_id is null or prerequisite_course_id <> course_id),
  unique (course_id, prerequisite_course_id)
);
create index course_prerequisites_course_idx on public.course_prerequisites (course_id);

-- Which professor teaches which course. Reviews always reference one of these.
create table public.professor_courses (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  campus_id uuid references public.campuses (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (professor_id, course_id)
);
create index professor_courses_course_idx on public.professor_courses (course_id);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
-- Private per-user data. Never exposed through public views.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  role public.user_role not null default 'student',
  university_id uuid references public.universities (id) on delete set null,
  campus_id uuid references public.campuses (id) on delete set null,
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'en')),
  -- True when the account's confirmed email belongs to a university domain.
  -- This is NOT proof of enrollment in any specific course.
  has_university_email boolean not null default false,
  is_banned boolean not null default false,
  banned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'student';

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  professor_course_id uuid not null references public.professor_courses (id) on delete restrict,
  professor_id uuid not null references public.professors (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete restrict,
  campus_id uuid not null references public.campuses (id) on delete restrict,
  term_id uuid not null references public.academic_terms (id) on delete restrict,
  teaching_format public.teaching_format not null,
  would_take_again boolean not null,
  recommends_course boolean not null,
  weekly_hours smallint not null check (weekly_hours between 0 and 60),
  exam_count smallint check (exam_count is null or exam_count between 0 and 20),
  exam_difficulty smallint check (exam_difficulty is null or exam_difficulty between 1 and 5),
  homework_frequency public.homework_frequency,
  teamwork_level public.teamwork_level,
  requires_programming boolean,
  requires_math boolean,
  prior_knowledge_needed boolean,
  attendance_policy public.attendance_policy,
  tags text[] not null default '{}' check (
    cardinality(tags) <= 8 and tags <@ array[
      -- keep in sync with src/lib/constants.ts
      'project_based', 'group_work', 'slides_heavy', 'participation_matters', 'exam_heavy',
      'flipped_classroom', 'lots_of_homework', 'real_world_examples',
      'clear_explanations', 'helpful_feedback', 'available_outside_class', 'inspiring',
      'flexible_deadlines', 'fair_grading',
      'tough_grader', 'fast_paced', 'disorganized', 'late_feedback', 'unclear_expectations'
    ]::text[]
  ),
  body text not null check (char_length(body) between 40 and 3000),
  advice text check (advice is null or char_length(advice) <= 1000),
  status public.review_status not null default 'published',
  moderation_note text,
  -- Set only by moderators after verifying enrollment through an approved process.
  enrollment_verified boolean not null default false,
  helpful_count integer not null default 0,
  not_helpful_count integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  -- One review per student per professor-course-term.
  unique (user_id, professor_id, course_id, term_id)
);
create index reviews_professor_idx on public.reviews (professor_id, created_at desc) where status = 'published';
create index reviews_course_idx on public.reviews (course_id, created_at desc) where status = 'published';
create index reviews_combo_idx on public.reviews (professor_course_id) where status = 'published';
create index reviews_recent_idx on public.reviews (created_at desc) where status = 'published';
create index reviews_user_idx on public.reviews (user_id, created_at desc);
create index reviews_status_idx on public.reviews (status) where status <> 'published';

create table public.professor_review_scores (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  clarity smallint not null check (clarity between 1 and 5),
  attitude smallint not null check (attitude between 1 and 5),
  grading_fairness smallint not null check (grading_fairness between 1 and 5),
  availability smallint not null check (availability between 1 and 5),
  organization smallint not null check (organization between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  overall numeric(3, 2) generated always as (
    round((clarity + attitude + grading_fairness + availability + organization + engagement) / 6.0, 2)
  ) stored
);

create table public.course_review_scores (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  difficulty smallint not null check (difficulty between 1 and 5),
  workload smallint not null check (workload between 1 and 5),
  content_clarity smallint not null check (content_clarity between 1 and 5),
  usefulness smallint not null check (usefulness between 1 and 5),
  organization smallint not null check (organization between 1 and 5),
  satisfaction smallint not null check (satisfaction between 1 and 5)
);

create table public.review_votes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
create index review_votes_user_idx on public.review_votes (user_id, created_at desc);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
create index review_reports_status_idx on public.review_reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Student tools
-- ---------------------------------------------------------------------------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  professor_id uuid references public.professors (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(professor_id, course_id) = 1),
  unique (user_id, professor_id),
  unique (user_id, course_id)
);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

create table public.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  professor_ids uuid[] not null check (cardinality(professor_ids) between 2 and 3),
  name text check (name is null or char_length(name) <= 80),
  created_at timestamptz not null default now()
);
create index saved_comparisons_user_idx on public.saved_comparisons (user_id, created_at desc);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind public.suggestion_kind not null,
  university_id uuid not null references public.universities (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) < 8000),
  status public.suggestion_status not null default 'pending',
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index suggestions_status_idx on public.suggestions (status, created_at desc);

-- Requests from professors/staff to correct factual profile information.
-- Can be submitted without an account; only moderators can read them.
create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  professor_id uuid references public.professors (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  requester_name text not null check (char_length(requester_name) between 2 and 120),
  requester_email text not null check (requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(requester_email) <= 200),
  relationship text not null check (relationship in ('professor', 'staff', 'student', 'other')),
  message text not null check (char_length(message) between 20 and 3000),
  status public.correction_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(professor_id, course_id) >= 1)
);
create index correction_requests_status_idx on public.correction_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Moderation & abuse protection
-- ---------------------------------------------------------------------------
create table public.moderation_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null, -- null = system
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index moderation_logs_target_idx on public.moderation_logs (target_type, target_id);
create index moderation_logs_created_idx on public.moderation_logs (created_at desc);

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup_idx on public.rate_limit_events (user_id, action, created_at desc);

-- Terms that send a review to the moderation queue (severity 'flag') or
-- block it outright (severity 'block'). Managed by admins.
create table public.blocked_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique check (char_length(term) between 2 and 80),
  severity text not null default 'flag' check (severity in ('flag', 'block')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Aggregates (maintained by triggers from real review data; read-only to users)
-- ---------------------------------------------------------------------------
create table public.professor_stats (
  professor_id uuid primary key references public.professors (id) on delete cascade,
  review_count integer not null default 0,
  avg_overall numeric(3, 2),
  avg_clarity numeric(3, 2),
  avg_attitude numeric(3, 2),
  avg_grading_fairness numeric(3, 2),
  avg_availability numeric(3, 2),
  avg_organization numeric(3, 2),
  avg_engagement numeric(3, 2),
  avg_difficulty numeric(3, 2),
  avg_weekly_hours numeric(4, 1),
  would_take_again_pct numeric(5, 2),
  rating_distribution integer[] not null default '{0,0,0,0,0}',
  tag_counts jsonb not null default '{}',
  attendance_counts jsonb not null default '{}',
  last_review_at timestamptz,
  updated_at timestamptz not null default now()
);
create index professor_stats_rating_idx on public.professor_stats (avg_overall desc nulls last);
create index professor_stats_count_idx on public.professor_stats (review_count desc);

create table public.course_stats (
  course_id uuid primary key references public.courses (id) on delete cascade,
  review_count integer not null default 0,
  avg_difficulty numeric(3, 2),
  avg_workload numeric(3, 2),
  avg_content_clarity numeric(3, 2),
  avg_usefulness numeric(3, 2),
  avg_organization numeric(3, 2),
  avg_satisfaction numeric(3, 2),
  avg_weekly_hours numeric(4, 1),
  recommend_pct numeric(5, 2),
  avg_exam_count numeric(4, 1),
  avg_exam_difficulty numeric(3, 2),
  programming_pct numeric(5, 2),
  math_pct numeric(5, 2),
  prior_knowledge_pct numeric(5, 2),
  homework_counts jsonb not null default '{}',
  teamwork_counts jsonb not null default '{}',
  difficulty_distribution integer[] not null default '{0,0,0,0,0}',
  satisfaction_distribution integer[] not null default '{0,0,0,0,0}',
  last_review_at timestamptz,
  updated_at timestamptz not null default now()
);
create index course_stats_count_idx on public.course_stats (review_count desc);

create table public.professor_course_stats (
  professor_course_id uuid primary key references public.professor_courses (id) on delete cascade,
  professor_id uuid not null references public.professors (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  review_count integer not null default 0,
  avg_overall numeric(3, 2),
  avg_clarity numeric(3, 2),
  avg_attitude numeric(3, 2),
  avg_grading_fairness numeric(3, 2),
  avg_availability numeric(3, 2),
  avg_organization numeric(3, 2),
  avg_engagement numeric(3, 2),
  avg_difficulty numeric(3, 2),
  avg_workload numeric(3, 2),
  avg_satisfaction numeric(3, 2),
  avg_weekly_hours numeric(4, 1),
  would_take_again_pct numeric(5, 2),
  recommend_pct numeric(5, 2),
  last_review_at timestamptz,
  updated_at timestamptz not null default now()
);
create index professor_course_stats_professor_idx on public.professor_course_stats (professor_id);
create index professor_course_stats_course_idx on public.professor_course_stats (course_id);

-- updated_at triggers
create trigger universities_updated_at before update on public.universities for each row execute function public.set_updated_at();
create trigger campuses_updated_at before update on public.campuses for each row execute function public.set_updated_at();
create trigger departments_updated_at before update on public.departments for each row execute function public.set_updated_at();
create trigger academic_terms_updated_at before update on public.academic_terms for each row execute function public.set_updated_at();
create trigger professors_updated_at before update on public.professors for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();
