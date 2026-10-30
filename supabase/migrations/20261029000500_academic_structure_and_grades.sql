-- Kurso: academic structure, student academic profiles and anonymous
-- self-reported grades.
--
-- What this adds:
--   * University email domains and authentication methods as data, so a
--     university can later require its own email domain or institutional SSO.
--   * Degree programs, curriculum versions and curriculum courses, plus
--     corequisites, so official plans of study can be imported later.
--   * Term-level teaching assignments (who taught what, when, where), kept
--     separate from the timeless professor_courses link that reviews use.
--   * Student academic profile fields and a private record of courses a
--     student has completed, is taking or failed.
--   * Optional self-reported final grades. They are stored apart from the
--     review text, are never readable by other users and are only published
--     as averages over at least five grades.
--   * my_next_semester(): planning suggestions from an official curriculum.
--     It returns nothing until a verified curriculum exists.
--
-- Nothing here changes existing data or behaviour.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.auth_method_kind as enum ('email_password', 'email_magic_link', 'google', 'saml_sso', 'oidc_sso');
create type public.curriculum_requirement as enum ('required', 'elective', 'concentration');
create type public.teaching_source as enum ('official', 'admin', 'student_report');
create type public.course_record_status as enum ('completed', 'in_progress', 'failed', 'withdrawn');

-- ---------------------------------------------------------------------------
-- Universities: grading scale, email domains, authentication methods
-- ---------------------------------------------------------------------------
alter table public.universities
  add column grade_scale_min numeric(6, 2) not null default 0,
  add column grade_scale_max numeric(6, 2) not null default 100,
  add column grade_scale_step numeric(6, 2) not null default 1,
  add constraint universities_grade_scale_check
    check (grade_scale_max > grade_scale_min and grade_scale_step > 0);

-- One row per approved domain. A confirmed address on one of these domains
-- (or a subdomain) marks the account as having a university email. The
-- address must be confirmed by email first; the domain alone is never enough.
create table public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  domain text not null unique check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  -- Optional: addresses on this domain belong to a single campus.
  campus_id uuid references public.campuses (id) on delete set null,
  include_subdomains boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index university_email_domains_university_idx on public.university_email_domains (university_id);

insert into public.university_email_domains (university_id, domain)
select u.id, lower(d.domain)
from public.universities u, unnest(u.email_domains) d(domain)
where lower(d.domain) ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
on conflict (domain) do nothing;

-- How students of a university can sign in. Today every university uses the
-- global email/password (and optional Google) sign-in. A university that
-- adopts SSO gets a 'saml_sso' or 'oidc_sso' row with the Supabase SSO
-- provider id; `required` makes it the only accepted method for its domains.
-- No secrets are stored here.
create table public.university_auth_methods (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  method public.auth_method_kind not null,
  sso_provider_id text check (sso_provider_id is null or char_length(sso_provider_id) <= 200),
  is_enabled boolean not null default false,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, method),
  check (method not in ('saml_sso', 'oidc_sso') or sso_provider_id is not null or not is_enabled)
);
create trigger university_auth_methods_updated_at before update on public.university_auth_methods
  for each row execute function public.set_updated_at();

-- Domain matching now reads the table. The legacy array still works as a
-- fallback so nothing breaks while admins move to the table.
create or replace function public.university_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with dom as (select lower(split_part(p_email, '@', 2)) as d)
  select coalesce(
    (select e.university_id
     from public.university_email_domains e, dom
     where e.is_active
       and (dom.d = e.domain or (e.include_subdomains and dom.d like '%.' || e.domain))
     order by length(e.domain) desc
     limit 1),
    (select u.id
     from public.universities u, unnest(u.email_domains) x(domain), dom
     where dom.d = lower(x.domain) or dom.d like '%.' || lower(x.domain)
     limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- Degree programs and curricula
-- ---------------------------------------------------------------------------
create table public.degree_programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  department_id uuid references public.departments (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Official program code (for example "IIS"), when the university has one.
  code text check (code is null or code ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{0,23}$'),
  name text not null check (char_length(name) between 2 and 200),
  name_en text check (name_en is null or char_length(name_en) between 2 and 200),
  is_fictional boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, slug)
);
create unique index degree_programs_code_idx on public.degree_programs (university_id, upper(code)) where code is not null;

-- Campuses where a program is offered.
create table public.program_campuses (
  program_id uuid not null references public.degree_programs (id) on delete cascade,
  campus_id uuid not null references public.campuses (id) on delete cascade,
  primary key (program_id, campus_id)
);

-- A version of a program's plan of study. New versions are added rather than
-- edited in place, so students on an older plan keep their requirements.
create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.degree_programs (id) on delete cascade,
  version_label text not null check (char_length(version_label) between 1 and 40),
  first_entry_year smallint check (first_entry_year is null or first_entry_year between 1950 and 2100),
  last_entry_year smallint check (last_entry_year is null or last_entry_year between 1950 and 2100),
  total_semesters smallint check (total_semesters is null or total_semesters between 1 and 20),
  -- Only official curricula (with a source) drive recommendations.
  is_official boolean not null default false,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, version_label),
  check (not is_official or source_url is not null),
  check (last_entry_year is null or first_entry_year is null or last_entry_year >= first_entry_year)
);
create index curricula_program_idx on public.curricula (program_id);

create table public.curriculum_courses (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  -- Semester in which the plan expects the course; null for free electives.
  semester smallint check (semester is null or semester between 1 and 20),
  requirement public.curriculum_requirement not null default 'required',
  -- Elective bucket or concentration name, when relevant.
  group_label text check (group_label is null or char_length(group_label) <= 120),
  created_at timestamptz not null default now(),
  unique (curriculum_id, course_id)
);
create index curriculum_courses_course_idx on public.curriculum_courses (course_id);
create index curriculum_courses_semester_idx on public.curriculum_courses (curriculum_id, semester);

-- Prerequisites can now be corequisites, and can apply to a single curriculum.
alter table public.course_prerequisites
  add column relation text not null default 'prerequisite' check (relation in ('prerequisite', 'corequisite')),
  add column curriculum_id uuid references public.curricula (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Term-level teaching assignments
-- ---------------------------------------------------------------------------
-- professor_courses says "this professor has taught this course" and anchors
-- reviews. This table says when and where, so the site never assumes a
-- professor still teaches a course because they once did.
create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  term_id uuid not null references public.academic_terms (id) on delete cascade,
  campus_id uuid references public.campuses (id) on delete set null,
  section_code text check (section_code is null or char_length(section_code) <= 24),
  source public.teaching_source not null default 'admin',
  created_at timestamptz not null default now(),
  unique nulls not distinct (professor_id, course_id, term_id, campus_id, section_code)
);
create index teaching_assignments_combo_idx on public.teaching_assignments (professor_id, course_id);
create index teaching_assignments_term_idx on public.teaching_assignments (term_id);

-- A term assignment implies the timeless link that reviews hang off.
create or replace function public.teaching_assignments_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.professor_courses (professor_id, course_id, campus_id)
  values (new.professor_id, new.course_id, new.campus_id)
  on conflict (professor_id, course_id) do nothing;
  return new;
end;
$$;

create trigger teaching_assignments_link
after insert on public.teaching_assignments
for each row execute function public.teaching_assignments_link();

-- ---------------------------------------------------------------------------
-- Student academic profile
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column program_id uuid references public.degree_programs (id) on delete set null,
  add column curriculum_id uuid references public.curricula (id) on delete set null,
  add column current_semester smallint check (current_semester is null or current_semester between 1 and 20),
  add column start_year smallint check (start_year is null or start_year between 1950 and 2100);

-- Keeps the profile coherent: campus and program belong to the chosen
-- university, and the curriculum belongs to the chosen program.
create or replace function public.profiles_academic_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.campus_id is not null and new.university_id is not null
     and not exists (select 1 from public.campuses c where c.id = new.campus_id and c.university_id = new.university_id) then
    raise exception 'campus_not_in_university' using errcode = '23514';
  end if;
  if new.program_id is not null and (new.university_id is null
     or not exists (select 1 from public.degree_programs p where p.id = new.program_id and p.university_id = new.university_id)) then
    raise exception 'program_not_in_university' using errcode = '23514';
  end if;
  if new.curriculum_id is not null and (new.program_id is null
     or not exists (select 1 from public.curricula c where c.id = new.curriculum_id and c.program_id = new.program_id)) then
    raise exception 'curriculum_not_in_program' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger profiles_academic_guard
before insert or update of university_id, campus_id, program_id, curriculum_id on public.profiles
for each row execute function public.profiles_academic_guard();

-- Courses a student says they completed, are taking, failed or dropped.
-- Private to the student. Used only for their own planning.
create table public.student_course_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status public.course_record_status not null,
  term_id uuid references public.academic_terms (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, course_id, term_id)
);
create index student_course_records_user_idx on public.student_course_records (user_id);
create trigger student_course_records_updated_at before update on public.student_course_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Self-reported grades
-- ---------------------------------------------------------------------------
-- One optional grade per review. Professor, course and term come from the
-- review, so the review's own unique key (student, professor, course, term)
-- also prevents duplicate grades, and merges carry grades along. Nobody but
-- the author can read a row; the public sees only thresholded averages.
create table public.reported_grades (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  grade numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reported_grades_updated_at before update on public.reported_grades
  for each row execute function public.set_updated_at();

-- Minimum number of grades before any average is shown.
create or replace function public.grade_min_sample()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

-- Sets (or with null, clears) the grade on one of the caller's own reviews,
-- validated against the university's grading scale.
create or replace function public.set_review_grade(p_review_id uuid, p_grade numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min numeric;
  v_max numeric;
  v_step numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select u.grade_scale_min, u.grade_scale_max, u.grade_scale_step
  into v_min, v_max, v_step
  from public.reviews r
  join public.universities u on u.id = r.university_id
  where r.id = p_review_id and r.user_id = auth.uid();
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if p_grade is null then
    delete from public.reported_grades where review_id = p_review_id;
    return;
  end if;
  if p_grade < v_min or p_grade > v_max or mod(p_grade - v_min, v_step) <> 0 then
    raise exception 'invalid_grade' using errcode = '22023';
  end if;
  insert into public.reported_grades (review_id, grade)
  values (p_review_id, p_grade)
  on conflict (review_id) do update set grade = excluded.grade
  where public.reported_grades.grade <> excluded.grade;
end;
$$;

-- Professor-course grade averages. Only grades attached to published reviews
-- count. Runs with the owner's rights because reported_grades is private; the
-- view exposes only counts and an average that stays null below the minimum
-- sample. Averages are rounded to limit what a single new grade reveals.
create view public.professor_course_grade_summary
with (security_barrier = true)
as
select
  r.professor_course_id,
  r.professor_id,
  r.course_id,
  count(*)::int as grade_count,
  case when count(*) >= public.grade_min_sample()
    then round(avg(g.grade), case when u.grade_scale_max - u.grade_scale_min > 20 then 0 else 1 end)
  end as avg_grade,
  u.grade_scale_min,
  u.grade_scale_max
from public.reported_grades g
join public.reviews r on r.id = g.review_id and r.status = 'published'
join public.universities u on u.id = r.university_id
group by r.professor_course_id, r.professor_id, r.course_id, u.id;

-- Course grade averages are built only from professor groups that meet the
-- minimum themselves. Otherwise comparing a course average with its visible
-- professor averages could reveal a small group's grades.
create view public.course_grade_summary
with (security_barrier = true)
as
with groups as (
  select r.course_id, r.professor_course_id, u.id as university_id,
         u.grade_scale_min, u.grade_scale_max,
         count(*) as n, sum(g.grade) as total
  from public.reported_grades g
  join public.reviews r on r.id = g.review_id and r.status = 'published'
  join public.universities u on u.id = r.university_id
  group by r.course_id, r.professor_course_id, u.id
)
select
  course_id,
  sum(n) filter (where n >= public.grade_min_sample())::int as grade_count,
  round(
    sum(total) filter (where n >= public.grade_min_sample()) / nullif(sum(n) filter (where n >= public.grade_min_sample()), 0),
    case when max(grade_scale_max - grade_scale_min) > 20 then 0 else 1 end
  ) as avg_grade,
  min(grade_scale_min) as grade_scale_min,
  max(grade_scale_max) as grade_scale_max
from groups
group by course_id, university_id;

-- ---------------------------------------------------------------------------
-- Review API: optional final_grade in the payload
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_ps jsonb := payload -> 'professor_scores';
  v_cs jsonb := payload -> 'course_scores';
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.reviews (
    user_id, professor_course_id, campus_id, term_id, teaching_format,
    would_take_again, recommends_course, weekly_hours, exam_count, exam_difficulty,
    homework_frequency, teamwork_level, requires_programming, requires_math,
    prior_knowledge_needed, attendance_policy, tags, body, advice
  ) values (
    auth.uid(),
    (payload ->> 'professor_course_id')::uuid,
    (payload ->> 'campus_id')::uuid,
    (payload ->> 'term_id')::uuid,
    (payload ->> 'teaching_format')::public.teaching_format,
    (payload ->> 'would_take_again')::boolean,
    (payload ->> 'recommends_course')::boolean,
    (payload ->> 'weekly_hours')::smallint,
    (payload ->> 'exam_count')::smallint,
    (payload ->> 'exam_difficulty')::smallint,
    (payload ->> 'homework_frequency')::public.homework_frequency,
    (payload ->> 'teamwork_level')::public.teamwork_level,
    (payload ->> 'requires_programming')::boolean,
    (payload ->> 'requires_math')::boolean,
    (payload ->> 'prior_knowledge_needed')::boolean,
    (payload ->> 'attendance_policy')::public.attendance_policy,
    coalesce(array(select jsonb_array_elements_text(payload -> 'tags')), '{}'),
    payload ->> 'body',
    nullif(payload ->> 'advice', '')
  )
  returning id into v_id;

  insert into public.professor_review_scores (review_id, clarity, attitude, grading_fairness, availability, organization, engagement)
  values (
    v_id,
    (v_ps ->> 'clarity')::smallint,
    (v_ps ->> 'attitude')::smallint,
    (v_ps ->> 'grading_fairness')::smallint,
    (v_ps ->> 'availability')::smallint,
    (v_ps ->> 'organization')::smallint,
    (v_ps ->> 'engagement')::smallint
  );

  insert into public.course_review_scores (review_id, difficulty, workload, content_clarity, usefulness, organization, satisfaction)
  values (
    v_id,
    (v_cs ->> 'difficulty')::smallint,
    (v_cs ->> 'workload')::smallint,
    (v_cs ->> 'content_clarity')::smallint,
    (v_cs ->> 'usefulness')::smallint,
    (v_cs ->> 'organization')::smallint,
    (v_cs ->> 'satisfaction')::smallint
  );

  if nullif(payload ->> 'final_grade', '') is not null then
    perform public.set_review_grade(v_id, (payload ->> 'final_grade')::numeric);
  end if;

  return v_id;
end;
$$;

create or replace function public.update_review(p_review_id uuid, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ps jsonb := payload -> 'professor_scores';
  v_cs jsonb := payload -> 'course_scores';
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.reviews set
    campus_id = (payload ->> 'campus_id')::uuid,
    teaching_format = (payload ->> 'teaching_format')::public.teaching_format,
    would_take_again = (payload ->> 'would_take_again')::boolean,
    recommends_course = (payload ->> 'recommends_course')::boolean,
    weekly_hours = (payload ->> 'weekly_hours')::smallint,
    exam_count = (payload ->> 'exam_count')::smallint,
    exam_difficulty = (payload ->> 'exam_difficulty')::smallint,
    homework_frequency = (payload ->> 'homework_frequency')::public.homework_frequency,
    teamwork_level = (payload ->> 'teamwork_level')::public.teamwork_level,
    requires_programming = (payload ->> 'requires_programming')::boolean,
    requires_math = (payload ->> 'requires_math')::boolean,
    prior_knowledge_needed = (payload ->> 'prior_knowledge_needed')::boolean,
    attendance_policy = (payload ->> 'attendance_policy')::public.attendance_policy,
    tags = coalesce(array(select jsonb_array_elements_text(payload -> 'tags')), '{}'),
    body = payload ->> 'body',
    advice = nullif(payload ->> 'advice', '')
  where id = p_review_id and user_id = auth.uid();

  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  update public.professor_review_scores set
    clarity = (v_ps ->> 'clarity')::smallint,
    attitude = (v_ps ->> 'attitude')::smallint,
    grading_fairness = (v_ps ->> 'grading_fairness')::smallint,
    availability = (v_ps ->> 'availability')::smallint,
    organization = (v_ps ->> 'organization')::smallint,
    engagement = (v_ps ->> 'engagement')::smallint
  where review_id = p_review_id;

  update public.course_review_scores set
    difficulty = (v_cs ->> 'difficulty')::smallint,
    workload = (v_cs ->> 'workload')::smallint,
    content_clarity = (v_cs ->> 'content_clarity')::smallint,
    usefulness = (v_cs ->> 'usefulness')::smallint,
    organization = (v_cs ->> 'organization')::smallint,
    satisfaction = (v_cs ->> 'satisfaction')::smallint
  where review_id = p_review_id;

  -- Only touch the grade when the caller sends the key; null clears it.
  if payload ? 'final_grade' then
    perform public.set_review_grade(p_review_id, nullif(payload ->> 'final_grade', '')::numeric);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Merges keep curricula, records and teaching history pointing at the
-- surviving course or professor. The merge functions set merged_into_id last,
-- after reviews have moved, so these run once everything else is in place.
-- ---------------------------------------------------------------------------
create or replace function public.courses_after_merge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.curriculum_courses s where s.course_id = old.id
    and exists (select 1 from public.curriculum_courses t where t.curriculum_id = s.curriculum_id and t.course_id = new.merged_into_id);
  update public.curriculum_courses set course_id = new.merged_into_id where course_id = old.id;
  delete from public.student_course_records s where s.course_id = old.id
    and exists (select 1 from public.student_course_records t
                where t.user_id = s.user_id and t.course_id = new.merged_into_id and t.term_id is not distinct from s.term_id);
  update public.student_course_records set course_id = new.merged_into_id where course_id = old.id;
  delete from public.teaching_assignments s where s.course_id = old.id
    and exists (select 1 from public.teaching_assignments t
                where t.course_id = new.merged_into_id and t.professor_id = s.professor_id and t.term_id = s.term_id
                  and t.campus_id is not distinct from s.campus_id and t.section_code is not distinct from s.section_code);
  update public.teaching_assignments set course_id = new.merged_into_id where course_id = old.id;
  return null;
end;
$$;

create trigger courses_after_merge
after update of merged_into_id on public.courses
for each row when (old.merged_into_id is null and new.merged_into_id is not null)
execute function public.courses_after_merge();

create or replace function public.professors_after_merge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.teaching_assignments s where s.professor_id = old.id
    and exists (select 1 from public.teaching_assignments t
                where t.professor_id = new.merged_into_id and t.course_id = s.course_id and t.term_id = s.term_id
                  and t.campus_id is not distinct from s.campus_id and t.section_code is not distinct from s.section_code);
  update public.teaching_assignments set professor_id = new.merged_into_id where professor_id = old.id;
  return null;
end;
$$;

create trigger professors_after_merge
after update of merged_into_id on public.professors
for each row when (old.merged_into_id is null and new.merged_into_id is not null)
execute function public.professors_after_merge();

-- ---------------------------------------------------------------------------
-- Next-semester planning
-- ---------------------------------------------------------------------------
-- Suggestions for the caller from their official curriculum: courses planned
-- for the next semester and required courses from earlier semesters they have
-- not passed yet, minus anything completed or in progress. Prerequisites are
-- checked only against verified prerequisite rows. Returns no rows when the
-- student has no curriculum or the curriculum is not official. This is a
-- planning aid, not an enrollment or eligibility decision.
create or replace function public.my_next_semester()
returns table (
  course_id uuid,
  slug text,
  code text,
  name text,
  planned_semester smallint,
  requirement public.curriculum_requirement,
  group_label text,
  is_catch_up boolean,
  missing_prerequisites text[],
  avg_difficulty numeric,
  avg_workload numeric,
  avg_weekly_hours numeric,
  review_count integer,
  reviewed_professor_count integer,
  avg_grade numeric,
  grade_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.id, p.curriculum_id, p.current_semester
    from public.profiles p
    join public.curricula cu on cu.id = p.curriculum_id and cu.is_official and cu.is_active
    where p.id = auth.uid() and p.current_semester is not null
  ),
  done as (
    select r.course_id from public.student_course_records r, me
    where r.user_id = me.id and r.status in ('completed', 'in_progress')
  ),
  passed as (
    select r.course_id from public.student_course_records r, me
    where r.user_id = me.id and r.status = 'completed'
  ),
  candidates as (
    select cc.course_id, cc.semester, cc.requirement, cc.group_label,
           (cc.semester <= me.current_semester) as is_catch_up
    from public.curriculum_courses cc, me
    where cc.curriculum_id = me.curriculum_id
      and (cc.semester = me.current_semester + 1
           or (cc.semester <= me.current_semester and cc.requirement = 'required'))
      and cc.course_id not in (select course_id from done)
  )
  select
    c.id, c.slug, c.code, c.name, k.semester, k.requirement, k.group_label, k.is_catch_up,
    coalesce((
      select array_agg(pre.code order by pre.code)
      from public.course_prerequisites cp
      join public.courses pre on pre.id = cp.prerequisite_course_id
      where cp.course_id = c.id and cp.is_verified and cp.relation = 'prerequisite'
        and (cp.curriculum_id is null or cp.curriculum_id = (select curriculum_id from me))
        and cp.prerequisite_course_id not in (select course_id from passed)
    ), '{}') as missing_prerequisites,
    s.avg_difficulty, s.avg_workload, s.avg_weekly_hours, coalesce(s.review_count, 0),
    (select count(*)::int from public.professor_course_stats pcs where pcs.course_id = c.id and pcs.review_count > 0),
    g.avg_grade, g.grade_count
  from candidates k
  join public.courses c on c.id = k.course_id and c.merged_into_id is null
  left join public.course_stats s on s.course_id = c.id
  left join public.course_grade_summary g on g.course_id = c.id
  order by k.is_catch_up desc, k.semester, c.code;
$$;

-- ---------------------------------------------------------------------------
-- Professor directory: add the list of courses taught (new last column)
-- ---------------------------------------------------------------------------
create or replace view public.professor_directory
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.display_name,
  p.first_name,
  p.last_name,
  p.honorific,
  p.is_fictional,
  p.university_id,
  u.slug as university_slug,
  u.short_name as university_short_name,
  p.department_id,
  d.name as department_name,
  d.name_en as department_name_en,
  p.primary_campus_id as campus_id,
  c.name as campus_name,
  c.slug as campus_slug,
  coalesce(s.review_count, 0) as review_count,
  s.avg_overall,
  s.avg_clarity,
  s.avg_attitude,
  s.avg_grading_fairness,
  s.avg_availability,
  s.avg_organization,
  s.avg_engagement,
  s.avg_difficulty,
  s.avg_weekly_hours,
  s.would_take_again_pct,
  coalesce(s.rating_distribution, '{0,0,0,0,0}') as rating_distribution,
  coalesce(s.tag_counts, '{}') as tag_counts,
  coalesce(s.attendance_counts, '{}') as attendance_counts,
  s.last_review_at,
  (select count(*)::int from public.professor_courses pc where pc.professor_id = p.id and pc.is_active) as course_count,
  p.search_text,
  -- Names of the courses linked to the professor, most reviewed first, so
  -- search results can show what someone teaches without another query.
  (select coalesce(jsonb_agg(jsonb_build_object('code', c2.code, 'name', c2.name, 'slug', c2.slug)
                             order by coalesce(pcs.review_count, 0) desc, c2.code), '[]'::jsonb)
   from public.professor_courses pc2
   join public.courses c2 on c2.id = pc2.course_id and c2.merged_into_id is null and c2.is_active
   left join public.professor_course_stats pcs on pcs.professor_course_id = pc2.id
   where pc2.professor_id = p.id) as courses_taught
from public.professors p
join public.universities u on u.id = p.university_id
left join public.departments d on d.id = p.department_id
left join public.campuses c on c.id = p.primary_campus_id
left join public.professor_stats s on s.professor_id = p.id
where p.merged_into_id is null and p.is_active;

-- ---------------------------------------------------------------------------
-- Rename the internal merge flag to the Kurso namespace (same functions,
-- only the setting name changes).
-- ---------------------------------------------------------------------------
create or replace function public.reviews_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('kurso.merging', true) = 'on' then
    return new;
  end if;
  if new.user_id <> old.user_id
     or new.professor_course_id <> old.professor_course_id
     or new.term_id <> old.term_id then
    raise exception 'review_identity_immutable' using errcode = '23514';
  end if;
  new.professor_id := old.professor_id;
  new.course_id := old.course_id;
  new.university_id := old.university_id;

  if old.user_id = auth.uid() then
    new.edited_at := now();
    perform public.enforce_rate_limit('review_edit', 20, interval '1 day');
  end if;
  return new;
end;
$$;

create or replace function public.admin_merge_professors(p_source uuid, p_target uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src public.professors;
  v_tgt public.professors;
  v_pc record;
  v_target_pc uuid;
  v_moved integer := 0;
  v_dropped integer := 0;
  v_n integer;
begin
  perform public.require_admin();
  if p_source = p_target then
    raise exception 'cannot_merge_into_self' using errcode = '23514';
  end if;
  select * into v_src from public.professors where id = p_source for update;
  select * into v_tgt from public.professors where id = p_target for update;
  if v_src.id is null or v_tgt.id is null then
    raise exception 'professor_not_found' using errcode = 'P0002';
  end if;
  if v_src.university_id <> v_tgt.university_id then
    raise exception 'different_universities' using errcode = '23514';
  end if;
  if v_tgt.merged_into_id is not null then
    raise exception 'target_already_merged' using errcode = '23514';
  end if;

  perform set_config('kurso.merging', 'on', true);

  for v_pc in select * from public.professor_courses where professor_id = p_source loop
    select id into v_target_pc from public.professor_courses
    where professor_id = p_target and course_id = v_pc.course_id;

    -- Drop source reviews that would duplicate an existing target review.
    delete from public.reviews r
    where r.professor_course_id = v_pc.id
      and exists (
        select 1 from public.reviews t
        where t.professor_id = p_target and t.course_id = r.course_id
          and t.term_id = r.term_id and t.user_id = r.user_id
      );
    get diagnostics v_n = row_count;
    v_dropped := v_dropped + v_n;

    if v_target_pc is null then
      update public.professor_courses set professor_id = p_target where id = v_pc.id;
      update public.professor_course_stats set professor_id = p_target where professor_course_id = v_pc.id;
      update public.reviews set professor_id = p_target where professor_course_id = v_pc.id;
      get diagnostics v_n = row_count;
    else
      update public.reviews set professor_course_id = v_target_pc, professor_id = p_target
      where professor_course_id = v_pc.id;
      get diagnostics v_n = row_count;
      delete from public.professor_courses where id = v_pc.id;
    end if;
    v_moved := v_moved + v_n;
  end loop;

  delete from public.bookmarks b where b.professor_id = p_source
    and exists (select 1 from public.bookmarks t where t.user_id = b.user_id and t.professor_id = p_target);
  update public.bookmarks set professor_id = p_target where professor_id = p_source;
  update public.saved_comparisons set professor_ids = array_replace(professor_ids, p_source, p_target)
  where p_source = any (professor_ids);
  update public.correction_requests set professor_id = p_target where professor_id = p_source;
  update public.professors set merged_into_id = p_target, is_active = false where id = p_source;

  perform set_config('kurso.merging', 'off', true);

  perform public.refresh_professor_stats(p_source);
  perform public.refresh_professor_stats(p_target);
  for v_pc in select id, course_id from public.professor_courses where professor_id = p_target loop
    perform public.refresh_professor_course_stats(v_pc.id);
    perform public.refresh_course_stats(v_pc.course_id);
  end loop;

  perform public.log_moderation('professors_merged', 'professor', p_target, p_reason,
    jsonb_build_object('source_id', p_source, 'source_name', v_src.display_name,
                       'reviews_moved', v_moved, 'duplicate_reviews_dropped', v_dropped));
  return jsonb_build_object('reviews_moved', v_moved, 'duplicate_reviews_dropped', v_dropped);
end;
$$;

create or replace function public.admin_merge_courses(p_source uuid, p_target uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src public.courses;
  v_tgt public.courses;
  v_pc record;
  v_target_pc uuid;
  v_moved integer := 0;
  v_dropped integer := 0;
  v_n integer;
begin
  perform public.require_admin();
  if p_source = p_target then
    raise exception 'cannot_merge_into_self' using errcode = '23514';
  end if;
  select * into v_src from public.courses where id = p_source for update;
  select * into v_tgt from public.courses where id = p_target for update;
  if v_src.id is null or v_tgt.id is null then
    raise exception 'course_not_found' using errcode = 'P0002';
  end if;
  if v_src.university_id <> v_tgt.university_id then
    raise exception 'different_universities' using errcode = '23514';
  end if;
  if v_tgt.merged_into_id is not null then
    raise exception 'target_already_merged' using errcode = '23514';
  end if;

  perform set_config('kurso.merging', 'on', true);

  for v_pc in select * from public.professor_courses where course_id = p_source loop
    select id into v_target_pc from public.professor_courses
    where course_id = p_target and professor_id = v_pc.professor_id;

    delete from public.reviews r
    where r.professor_course_id = v_pc.id
      and exists (
        select 1 from public.reviews t
        where t.course_id = p_target and t.professor_id = r.professor_id
          and t.term_id = r.term_id and t.user_id = r.user_id
      );
    get diagnostics v_n = row_count;
    v_dropped := v_dropped + v_n;

    if v_target_pc is null then
      update public.professor_courses set course_id = p_target where id = v_pc.id;
      update public.professor_course_stats set course_id = p_target where professor_course_id = v_pc.id;
      update public.reviews set course_id = p_target where professor_course_id = v_pc.id;
      get diagnostics v_n = row_count;
    else
      update public.reviews set professor_course_id = v_target_pc, course_id = p_target
      where professor_course_id = v_pc.id;
      get diagnostics v_n = row_count;
      delete from public.professor_courses where id = v_pc.id;
    end if;
    v_moved := v_moved + v_n;
  end loop;

  delete from public.course_prerequisites p where p.course_id = p_source
    and exists (select 1 from public.course_prerequisites t
                where t.course_id = p_target and t.prerequisite_course_id is not distinct from p.prerequisite_course_id);
  update public.course_prerequisites set course_id = p_target where course_id = p_source;
  delete from public.course_prerequisites p where p.prerequisite_course_id = p_source
    and exists (select 1 from public.course_prerequisites t
                where t.course_id = p.course_id and t.prerequisite_course_id = p_target);
  update public.course_prerequisites set prerequisite_course_id = p_target where prerequisite_course_id = p_source;
  delete from public.course_prerequisites where course_id = prerequisite_course_id;

  delete from public.bookmarks b where b.course_id = p_source
    and exists (select 1 from public.bookmarks t where t.user_id = b.user_id and t.course_id = p_target);
  update public.bookmarks set course_id = p_target where course_id = p_source;
  update public.saved_comparisons set course_id = p_target where course_id = p_source;
  update public.correction_requests set course_id = p_target where course_id = p_source;
  update public.courses set merged_into_id = p_target, is_active = false where id = p_source;

  perform set_config('kurso.merging', 'off', true);

  perform public.refresh_course_stats(p_source);
  perform public.refresh_course_stats(p_target);
  for v_pc in select id, professor_id from public.professor_courses where course_id = p_target loop
    perform public.refresh_professor_course_stats(v_pc.id);
    perform public.refresh_professor_stats(v_pc.professor_id);
  end loop;

  perform public.log_moderation('courses_merged', 'course', p_target, p_reason,
    jsonb_build_object('source_id', p_source, 'source_code', v_src.code,
                       'reviews_moved', v_moved, 'duplicate_reviews_dropped', v_dropped));
  return jsonb_build_object('reviews_moved', v_moved, 'duplicate_reviews_dropped', v_dropped);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------
-- Supabase grants new tables to the API roles by default; start from zero.
revoke all on public.university_email_domains, public.university_auth_methods, public.degree_programs,
  public.program_campuses, public.curricula, public.curriculum_courses, public.teaching_assignments,
  public.student_course_records, public.reported_grades
  from anon, authenticated;

alter table public.university_email_domains enable row level security;
alter table public.university_auth_methods enable row level security;
alter table public.degree_programs enable row level security;
alter table public.program_campuses enable row level security;
alter table public.curricula enable row level security;
alter table public.curriculum_courses enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.student_course_records enable row level security;
alter table public.reported_grades enable row level security;

-- Catalog-like tables: public read, admin write, audited.
do $$
declare
  t text;
begin
  foreach t in array array[
    'university_email_domains', 'university_auth_methods', 'degree_programs',
    'program_campuses', 'curricula', 'curriculum_courses', 'teaching_assignments'
  ] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
  -- program_campuses has no id column, so it is not routed through the audit trigger.
  foreach t in array array[
    'university_email_domains', 'university_auth_methods', 'degree_programs',
    'curricula', 'curriculum_courses', 'teaching_assignments'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.audit_catalog_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- Students may update their own academic profile fields.
grant update (program_id, curriculum_id, current_semester, start_year) on public.profiles to authenticated;

-- Course records: owner only.
grant select, insert, update, delete on public.student_course_records to authenticated;
create policy course_records_owner_all on public.student_course_records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Grades: the author can read their own grade (to edit it). No other role,
-- including moderators, can read individual grades through the API. Writes go
-- through set_review_grade only.
grant select on public.reported_grades to authenticated;
create policy reported_grades_owner_read on public.reported_grades for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

grant select on public.professor_course_grade_summary, public.course_grade_summary to anon, authenticated;

revoke execute on function
  public.profiles_academic_guard(),
  public.courses_after_merge(),
  public.professors_after_merge(),
  public.teaching_assignments_link()
from public, anon, authenticated;
revoke execute on function public.set_review_grade(uuid, numeric), public.my_next_semester() from public, anon;
grant execute on function public.set_review_grade(uuid, numeric), public.my_next_semester() to authenticated;
