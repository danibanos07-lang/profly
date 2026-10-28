-- Business rules enforced inside the database: role helpers, account
-- provisioning, rate limits, content guards, vote/report bookkeeping and
-- aggregate maintenance.

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'student'::public.user_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and not p.is_banned
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('moderator', 'admin') and not p.is_banned
  );
$$;

-- True when the caller is signed in, has confirmed their email and is not banned.
create or replace function public.can_contribute()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and not p.is_banned
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit log helper
-- ---------------------------------------------------------------------------
create or replace function public.log_moderation(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.moderation_logs (actor_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_reason, coalesce(p_metadata, '{}'));
end;
$$;

-- The audit log is append-only, even for the table owner's API roles.
create or replace function public.prevent_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'moderation_logs is append-only';
end;
$$;

create trigger moderation_logs_append_only
before update or delete on public.moderation_logs
for each row execute function public.prevent_log_mutation();

-- Records every admin change to catalog tables.
create or replace function public.audit_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_action text;
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
  else
    v_id := new.id;
  end if;
  v_action := lower(tg_op) || '_' || tg_table_name;
  insert into public.moderation_logs (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_id,
    case
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      when tg_op = 'DELETE' then jsonb_build_object('before', to_jsonb(old))
      else jsonb_build_object('after', to_jsonb(new))
    end
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'universities', 'campuses', 'departments', 'academic_terms',
    'professors', 'courses', 'course_prerequisites', 'professor_courses', 'blocked_terms'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.audit_catalog_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Account provisioning
-- ---------------------------------------------------------------------------
create or replace function public.university_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.universities u, unnest(u.email_domains) d(domain)
  where lower(split_part(p_email, '@', 2)) = lower(d.domain)
     or lower(split_part(p_email, '@', 2)) like '%.' || lower(d.domain)
  limit 1;
$$;

create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_university uuid;
  v_verified boolean;
begin
  v_university := public.university_for_email(new.email);
  v_verified := v_university is not null and new.email_confirmed_at is not null;

  if tg_op = 'INSERT' then
    insert into public.profiles (id, display_name, university_id, has_university_email, preferred_locale)
    values (
      new.id,
      nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), 60), ''),
      v_university,
      v_verified,
      case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'es' end
    )
    on conflict (id) do nothing;
  else
    update public.profiles
    set has_university_email = v_verified,
        university_id = coalesce(university_id, v_university)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_change();

create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.handle_auth_user_change();

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
create or replace function public.enforce_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    return; -- service role / migrations
  end if;
  select count(*) into v_count
  from public.rate_limit_events
  where user_id = v_user and action = p_action and created_at > now() - p_window;
  if v_count >= p_max then
    raise exception 'rate_limited: too many % actions, try again later', p_action
      using errcode = 'P0429', hint = p_action;
  end if;
  insert into public.rate_limit_events (user_id, action) values (v_user, p_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- Review content guard
-- ---------------------------------------------------------------------------
-- Mirrors src/lib/moderation.ts. The app validates first for good UX; the
-- database enforces the same rules for anyone calling the API directly.
create or replace function public.contains_contact_info(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text is not null and (
    p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    or regexp_replace(p_text, '[\s().-]', '', 'g') ~ '\+?[0-9]{8,}'
    or p_text ~* '(https?://|www\.)'
  );
$$;

create or replace function public.clean_user_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Strip control characters (keeping newlines/tabs), HTML tags and collapse
  -- runs of blank lines.
  select nullif(trim(regexp_replace(
    regexp_replace(
      regexp_replace(p_text, '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'),
      '<[^>]*>', '', 'g'
    ),
    '\n{3,}', E'\n\n', 'g'
  )), '');
$$;

create or replace function public.reviews_content_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
  v_severity text;
begin
  new.body := public.clean_user_text(new.body);
  new.advice := public.clean_user_text(new.advice);

  if new.body is null or char_length(new.body) < 40 then
    raise exception 'review_body_too_short' using errcode = '23514';
  end if;

  if public.contains_contact_info(new.body) or public.contains_contact_info(new.advice) then
    raise exception 'review_contains_personal_info' using errcode = '23514';
  end if;

  v_text := public.normalize_search(new.body || ' ' || coalesce(new.advice, ''));
  select b.severity into v_severity
  from public.blocked_terms b
  where (' ' || v_text || ' ') like ('% ' || public.normalize_search(b.term) || ' %')
  order by case b.severity when 'block' then 0 else 1 end
  limit 1;

  if v_severity = 'block' then
    raise exception 'review_contains_prohibited_language' using errcode = '23514';
  elsif v_severity = 'flag' and new.status = 'published' then
    new.status := 'under_review';
    new.moderation_note := 'Automatically queued: matched a flagged term';
  end if;

  return new;
end;
$$;

create trigger reviews_content_guard
before insert or update of body, advice on public.reviews
for each row execute function public.reviews_content_guard();

-- Consistency and anti-abuse checks on review creation.
create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pc record;
  v_term record;
begin
  select pc.professor_id, pc.course_id, p.university_id, p.merged_into_id as p_merged, c.merged_into_id as c_merged,
         p.is_active as p_active, c.is_active as c_active
  into v_pc
  from public.professor_courses pc
  join public.professors p on p.id = pc.professor_id
  join public.courses c on c.id = pc.course_id
  where pc.id = new.professor_course_id;

  if not found then
    raise exception 'invalid_professor_course' using errcode = '23503';
  end if;
  if v_pc.p_merged is not null or v_pc.c_merged is not null or not v_pc.p_active or not v_pc.c_active then
    raise exception 'profile_not_reviewable' using errcode = '23514';
  end if;

  -- Denormalised columns always come from the assignment, never from the client.
  new.professor_id := v_pc.professor_id;
  new.course_id := v_pc.course_id;
  new.university_id := v_pc.university_id;

  select t.university_id, t.is_open_for_reviews, t.starts_on into v_term
  from public.academic_terms t where t.id = new.term_id;
  if not found or v_term.university_id <> new.university_id then
    raise exception 'invalid_term' using errcode = '23514';
  end if;
  if not v_term.is_open_for_reviews or (v_term.starts_on is not null and v_term.starts_on > current_date) then
    raise exception 'term_not_open_for_reviews' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.campuses c
    where c.id = new.campus_id and c.university_id = new.university_id
  ) then
    raise exception 'invalid_campus' using errcode = '23514';
  end if;

  -- Server-controlled fields.
  if not public.is_moderator() then
    new.status := 'published';
    new.enrollment_verified := false;
    new.helpful_count := 0;
    new.not_helpful_count := 0;
    new.report_count := 0;
    new.moderation_note := null;
  end if;

  perform public.enforce_rate_limit('review', 3, interval '1 hour');
  perform public.enforce_rate_limit('review_daily', 10, interval '1 day');
  return new;
end;
$$;

create trigger reviews_before_insert
before insert on public.reviews
for each row execute function public.reviews_before_insert();

create or replace function public.reviews_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The assignment, term and author of a review are immutable.
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

create trigger reviews_before_update
before update on public.reviews
for each row execute function public.reviews_before_update();

-- Every review must have both score rows by the end of the transaction.
create or replace function public.reviews_require_scores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.reviews r where r.id = new.id) and (
       not exists (select 1 from public.professor_review_scores s where s.review_id = new.id)
       or not exists (select 1 from public.course_review_scores s where s.review_id = new.id)
     ) then
    raise exception 'review_scores_missing' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger reviews_require_scores
after insert on public.reviews
deferrable initially deferred
for each row execute function public.reviews_require_scores();

-- ---------------------------------------------------------------------------
-- Aggregates
-- ---------------------------------------------------------------------------
create or replace function public.refresh_professor_stats(p_professor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_professor_id is null or not exists (select 1 from public.professors where id = p_professor_id) then
    return;
  end if;

  insert into public.professor_stats as s (
    professor_id, review_count, avg_overall, avg_clarity, avg_attitude, avg_grading_fairness,
    avg_availability, avg_organization, avg_engagement, avg_difficulty, avg_weekly_hours,
    would_take_again_pct, rating_distribution, tag_counts, attendance_counts, last_review_at, updated_at
  )
  select
    p_professor_id,
    count(r.id)::int,
    round(avg(ps.overall), 2),
    round(avg(ps.clarity), 2),
    round(avg(ps.attitude), 2),
    round(avg(ps.grading_fairness), 2),
    round(avg(ps.availability), 2),
    round(avg(ps.organization), 2),
    round(avg(ps.engagement), 2),
    round(avg(cs.difficulty), 2),
    round(avg(r.weekly_hours), 1),
    round(100.0 * avg(case when r.would_take_again then 1 else 0 end), 2),
    array[
      count(*) filter (where round(ps.overall) = 1),
      count(*) filter (where round(ps.overall) = 2),
      count(*) filter (where round(ps.overall) = 3),
      count(*) filter (where round(ps.overall) = 4),
      count(*) filter (where round(ps.overall) = 5)
    ]::int[],
    coalesce((
      select jsonb_object_agg(t.tag, t.n)
      from (
        select tag, count(*) as n
        from public.reviews r2, unnest(r2.tags) tag
        where r2.professor_id = p_professor_id and r2.status = 'published'
        group by tag
      ) t
    ), '{}'),
    coalesce((
      select jsonb_object_agg(a.policy, a.n)
      from (
        select r3.attendance_policy::text as policy, count(*) as n
        from public.reviews r3
        where r3.professor_id = p_professor_id and r3.status = 'published' and r3.attendance_policy is not null
        group by r3.attendance_policy
      ) a
    ), '{}'),
    max(r.created_at),
    now()
  from public.reviews r
  join public.professor_review_scores ps on ps.review_id = r.id
  join public.course_review_scores cs on cs.review_id = r.id
  where r.professor_id = p_professor_id and r.status = 'published'
  on conflict (professor_id) do update set
    review_count = excluded.review_count,
    avg_overall = excluded.avg_overall,
    avg_clarity = excluded.avg_clarity,
    avg_attitude = excluded.avg_attitude,
    avg_grading_fairness = excluded.avg_grading_fairness,
    avg_availability = excluded.avg_availability,
    avg_organization = excluded.avg_organization,
    avg_engagement = excluded.avg_engagement,
    avg_difficulty = excluded.avg_difficulty,
    avg_weekly_hours = excluded.avg_weekly_hours,
    would_take_again_pct = excluded.would_take_again_pct,
    rating_distribution = excluded.rating_distribution,
    tag_counts = excluded.tag_counts,
    attendance_counts = excluded.attendance_counts,
    last_review_at = excluded.last_review_at,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_course_stats(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_course_id is null or not exists (select 1 from public.courses where id = p_course_id) then
    return;
  end if;

  insert into public.course_stats as s (
    course_id, review_count, avg_difficulty, avg_workload, avg_content_clarity, avg_usefulness,
    avg_organization, avg_satisfaction, avg_weekly_hours, recommend_pct, avg_exam_count,
    avg_exam_difficulty, programming_pct, math_pct, prior_knowledge_pct, homework_counts,
    teamwork_counts, difficulty_distribution, satisfaction_distribution, last_review_at, updated_at
  )
  select
    p_course_id,
    count(r.id)::int,
    round(avg(cs.difficulty), 2),
    round(avg(cs.workload), 2),
    round(avg(cs.content_clarity), 2),
    round(avg(cs.usefulness), 2),
    round(avg(cs.organization), 2),
    round(avg(cs.satisfaction), 2),
    round(avg(r.weekly_hours), 1),
    round(100.0 * avg(case when r.recommends_course then 1 else 0 end), 2),
    round(avg(r.exam_count), 1),
    round(avg(r.exam_difficulty), 2),
    round(100.0 * avg(case when r.requires_programming then 1 when r.requires_programming = false then 0 end), 2),
    round(100.0 * avg(case when r.requires_math then 1 when r.requires_math = false then 0 end), 2),
    round(100.0 * avg(case when r.prior_knowledge_needed then 1 when r.prior_knowledge_needed = false then 0 end), 2),
    '{}'::jsonb, -- homework histogram is filled in below
    coalesce((
      select jsonb_object_agg(t.k, t.n) from (
        select r3.teamwork_level::text as k, count(*) as n
        from public.reviews r3
        where r3.course_id = p_course_id and r3.status = 'published' and r3.teamwork_level is not null
        group by r3.teamwork_level
      ) t
    ), '{}'),
    array[
      count(*) filter (where cs.difficulty = 1), count(*) filter (where cs.difficulty = 2),
      count(*) filter (where cs.difficulty = 3), count(*) filter (where cs.difficulty = 4),
      count(*) filter (where cs.difficulty = 5)
    ]::int[],
    array[
      count(*) filter (where cs.satisfaction = 1), count(*) filter (where cs.satisfaction = 2),
      count(*) filter (where cs.satisfaction = 3), count(*) filter (where cs.satisfaction = 4),
      count(*) filter (where cs.satisfaction = 5)
    ]::int[],
    max(r.created_at),
    now()
  from public.reviews r
  join public.course_review_scores cs on cs.review_id = r.id
  join public.professor_review_scores ps on ps.review_id = r.id
  where r.course_id = p_course_id and r.status = 'published'
  on conflict (course_id) do update set
    review_count = excluded.review_count,
    avg_difficulty = excluded.avg_difficulty,
    avg_workload = excluded.avg_workload,
    avg_content_clarity = excluded.avg_content_clarity,
    avg_usefulness = excluded.avg_usefulness,
    avg_organization = excluded.avg_organization,
    avg_satisfaction = excluded.avg_satisfaction,
    avg_weekly_hours = excluded.avg_weekly_hours,
    recommend_pct = excluded.recommend_pct,
    avg_exam_count = excluded.avg_exam_count,
    avg_exam_difficulty = excluded.avg_exam_difficulty,
    programming_pct = excluded.programming_pct,
    math_pct = excluded.math_pct,
    prior_knowledge_pct = excluded.prior_knowledge_pct,
    teamwork_counts = excluded.teamwork_counts,
    difficulty_distribution = excluded.difficulty_distribution,
    satisfaction_distribution = excluded.satisfaction_distribution,
    last_review_at = excluded.last_review_at,
    updated_at = excluded.updated_at;

  -- Homework histogram, computed separately to keep the main aggregate simple.
  update public.course_stats
  set homework_counts = coalesce((
    select jsonb_object_agg(x.k, x.n) from (
      select r4.homework_frequency::text as k, count(*) as n
      from public.reviews r4
      where r4.course_id = p_course_id and r4.status = 'published' and r4.homework_frequency is not null
      group by r4.homework_frequency
    ) x
  ), '{}')
  where course_id = p_course_id;
end;
$$;

create or replace function public.refresh_professor_course_stats(p_professor_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pc record;
begin
  select id, professor_id, course_id into v_pc
  from public.professor_courses where id = p_professor_course_id;
  if not found then
    return;
  end if;

  insert into public.professor_course_stats as s (
    professor_course_id, professor_id, course_id, review_count, avg_overall, avg_clarity,
    avg_attitude, avg_grading_fairness, avg_availability, avg_organization, avg_engagement,
    avg_difficulty, avg_workload, avg_satisfaction, avg_weekly_hours, would_take_again_pct,
    recommend_pct, last_review_at, updated_at
  )
  select
    v_pc.id, v_pc.professor_id, v_pc.course_id,
    count(r.id)::int,
    round(avg(ps.overall), 2),
    round(avg(ps.clarity), 2),
    round(avg(ps.attitude), 2),
    round(avg(ps.grading_fairness), 2),
    round(avg(ps.availability), 2),
    round(avg(ps.organization), 2),
    round(avg(ps.engagement), 2),
    round(avg(cs.difficulty), 2),
    round(avg(cs.workload), 2),
    round(avg(cs.satisfaction), 2),
    round(avg(r.weekly_hours), 1),
    round(100.0 * avg(case when r.would_take_again then 1 else 0 end), 2),
    round(100.0 * avg(case when r.recommends_course then 1 else 0 end), 2),
    max(r.created_at),
    now()
  from public.reviews r
  join public.professor_review_scores ps on ps.review_id = r.id
  join public.course_review_scores cs on cs.review_id = r.id
  where r.professor_course_id = v_pc.id and r.status = 'published'
  on conflict (professor_course_id) do update set
    professor_id = excluded.professor_id,
    course_id = excluded.course_id,
    review_count = excluded.review_count,
    avg_overall = excluded.avg_overall,
    avg_clarity = excluded.avg_clarity,
    avg_attitude = excluded.avg_attitude,
    avg_grading_fairness = excluded.avg_grading_fairness,
    avg_availability = excluded.avg_availability,
    avg_organization = excluded.avg_organization,
    avg_engagement = excluded.avg_engagement,
    avg_difficulty = excluded.avg_difficulty,
    avg_workload = excluded.avg_workload,
    avg_satisfaction = excluded.avg_satisfaction,
    avg_weekly_hours = excluded.avg_weekly_hours,
    would_take_again_pct = excluded.would_take_again_pct,
    recommend_pct = excluded.recommend_pct,
    last_review_at = excluded.last_review_at,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_review_targets(p_professor_id uuid, p_course_id uuid, p_professor_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_professor_stats(p_professor_id);
  perform public.refresh_course_stats(p_course_id);
  perform public.refresh_professor_course_stats(p_professor_course_id);
end;
$$;

create or replace function public.reviews_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_review_targets(old.professor_id, old.course_id, old.professor_course_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if tg_op = 'INSERT' or new.professor_course_id <> old.professor_course_id then
      perform public.refresh_review_targets(new.professor_id, new.course_id, new.professor_course_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger reviews_after_change
after insert or delete or update of status, would_take_again, recommends_course, weekly_hours, exam_count,
  exam_difficulty, homework_frequency, teamwork_level, requires_programming, requires_math,
  prior_knowledge_needed, attendance_policy, tags, professor_course_id
on public.reviews
for each row execute function public.reviews_after_change();

create or replace function public.review_scores_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
  v_review record;
begin
  v_review_id := case when tg_op = 'DELETE' then old.review_id else new.review_id end;
  select professor_id, course_id, professor_course_id into v_review
  from public.reviews where id = v_review_id;
  if found then
    perform public.refresh_review_targets(v_review.professor_id, v_review.course_id, v_review.professor_course_id);
  end if;
  return null;
end;
$$;

create trigger professor_review_scores_after_change
after insert or update or delete on public.professor_review_scores
for each row execute function public.review_scores_after_change();

create trigger course_review_scores_after_change
after insert or update or delete on public.course_review_scores
for each row execute function public.review_scores_after_change();

-- Make sure every profile has a stats row (so directories can left join cheaply).
create or replace function public.ensure_stats_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'professors' then
    insert into public.professor_stats (professor_id) values (new.id) on conflict do nothing;
  elsif tg_table_name = 'courses' then
    insert into public.course_stats (course_id) values (new.id) on conflict do nothing;
  elsif tg_table_name = 'professor_courses' then
    insert into public.professor_course_stats (professor_course_id, professor_id, course_id)
    values (new.id, new.professor_id, new.course_id) on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger professors_stats_row after insert on public.professors for each row execute function public.ensure_stats_rows();
create trigger courses_stats_row after insert on public.courses for each row execute function public.ensure_stats_rows();
create trigger professor_courses_stats_row after insert on public.professor_courses for each row execute function public.ensure_stats_rows();

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------
create or replace function public.review_votes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review record;
begin
  select user_id, status into v_review from public.reviews where id = new.review_id;
  if not found or v_review.status <> 'published' then
    raise exception 'review_not_votable' using errcode = '23514';
  end if;
  if v_review.user_id = new.user_id then
    raise exception 'cannot_vote_own_review' using errcode = '23514';
  end if;
  perform public.enforce_rate_limit('vote', 60, interval '1 hour');
  return new;
end;
$$;

create trigger review_votes_guard
before insert or update on public.review_votes
for each row execute function public.review_votes_guard();

create or replace function public.review_votes_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid := case when tg_op = 'DELETE' then old.review_id else new.review_id end;
begin
  update public.reviews r
  set helpful_count = (select count(*) from public.review_votes v where v.review_id = v_review_id and v.value = 1),
      not_helpful_count = (select count(*) from public.review_votes v where v.review_id = v_review_id and v.value = -1)
  where r.id = v_review_id;
  return null;
end;
$$;

create trigger review_votes_after_change
after insert or update or delete on public.review_votes
for each row execute function public.review_votes_after_change();

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create or replace function public.review_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.reviews r where r.id = new.review_id and r.status in ('published', 'under_review')) then
    raise exception 'review_not_reportable' using errcode = '23514';
  end if;
  if exists (select 1 from public.reviews r where r.id = new.review_id and r.user_id = new.reporter_id) then
    raise exception 'cannot_report_own_review' using errcode = '23514';
  end if;
  new.details := public.clean_user_text(new.details);
  if not public.is_moderator() then
    new.status := 'open';
    new.handled_by := null;
    new.handled_at := null;
    new.resolution_note := null;
  end if;
  perform public.enforce_rate_limit('report', 10, interval '1 hour');
  return new;
end;
$$;

create trigger review_reports_before_insert
before insert on public.review_reports
for each row execute function public.review_reports_before_insert();

-- Count open reports and queue the review for moderation when several
-- distinct accounts report it (3 for severe reasons, 5 otherwise). Queued
-- reviews are hidden until a moderator decides; every automatic action is logged.
create or replace function public.review_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_severe integer;
  v_status public.review_status;
begin
  select count(*), count(*) filter (where reason in ('harassment', 'hate_speech', 'threat', 'personal_info'))
  into v_total, v_severe
  from public.review_reports
  where review_id = new.review_id and status = 'open';

  update public.reviews set report_count = v_total where id = new.review_id
  returning status into v_status;

  if v_status = 'published' and (v_severe >= 3 or v_total >= 5) then
    update public.reviews
    set status = 'under_review', moderation_note = 'Automatically queued after multiple reports'
    where id = new.review_id;
    insert into public.moderation_logs (actor_id, action, target_type, target_id, reason, metadata)
    values (null, 'auto_queue_review', 'review', new.review_id, 'report_threshold',
            jsonb_build_object('open_reports', v_total, 'severe_reports', v_severe));
  end if;
  return null;
end;
$$;

create trigger review_reports_after_insert
after insert on public.review_reports
for each row execute function public.review_reports_after_insert();

-- ---------------------------------------------------------------------------
-- Suggestions & correction requests
-- ---------------------------------------------------------------------------
create or replace function public.suggestions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    new.status := 'pending';
    new.reviewer_id := null;
    new.reviewer_note := null;
    new.reviewed_at := null;
  end if;
  perform public.enforce_rate_limit('suggestion', 10, interval '1 day');
  return new;
end;
$$;

create trigger suggestions_before_insert
before insert on public.suggestions
for each row execute function public.suggestions_before_insert();

create or replace function public.correction_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.message := public.clean_user_text(new.message);
  new.requester_name := public.clean_user_text(new.requester_name);
  if not public.is_moderator() then
    new.status := 'open';
    new.handled_by := null;
    new.handled_at := null;
    new.resolution_note := null;
  end if;
  -- Anonymous submissions are throttled globally.
  if auth.uid() is null and (
    select count(*) from public.correction_requests
    where user_id is null and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'rate_limited: too many correction requests' using errcode = 'P0429';
  end if;
  perform public.enforce_rate_limit('correction', 5, interval '1 day');
  return new;
end;
$$;

create trigger correction_requests_before_insert
before insert on public.correction_requests
for each row execute function public.correction_requests_before_insert();
