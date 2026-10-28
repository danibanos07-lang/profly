-- Row Level Security, grants, public read views and the RPC API.
--
-- Privacy model:
--   * `reviews` is readable only by its author and moderators. Everyone else
--     reads published reviews through `review_feed`, which never exposes
--     user_id or any account data.
--   * `profiles` is readable only by its owner and moderators.
--   * Aggregate tables are read-only for every API role; they are written
--     exclusively by SECURITY DEFINER triggers.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.universities enable row level security;
alter table public.campuses enable row level security;
alter table public.departments enable row level security;
alter table public.academic_terms enable row level security;
alter table public.professors enable row level security;
alter table public.courses enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.professor_courses enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.professor_review_scores enable row level security;
alter table public.course_review_scores enable row level security;
alter table public.review_votes enable row level security;
alter table public.review_reports enable row level security;
alter table public.bookmarks enable row level security;
alter table public.saved_comparisons enable row level security;
alter table public.suggestions enable row level security;
alter table public.correction_requests enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.blocked_terms enable row level security;
alter table public.professor_stats enable row level security;
alter table public.course_stats enable row level security;
alter table public.professor_course_stats enable row level security;

-- Start from zero privileges and grant only what each role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catalog: public read, admin write
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'universities', 'campuses', 'departments', 'academic_terms',
    'professors', 'courses', 'course_prerequisites', 'professor_courses'
  ] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end;
$$;

-- Aggregates: read-only for everyone.
grant select on public.professor_stats, public.course_stats, public.professor_course_stats to anon, authenticated;
create policy professor_stats_public_read on public.professor_stats for select to anon, authenticated using (true);
create policy course_stats_public_read on public.course_stats for select to anon, authenticated using (true);
create policy professor_course_stats_public_read on public.professor_course_stats for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (display_name, university_id, campus_id, preferred_locale) on public.profiles to authenticated;
create policy profiles_self_or_moderator_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_moderator());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reviews and scores
-- ---------------------------------------------------------------------------
grant select on public.reviews to authenticated;
grant insert (
  user_id, professor_course_id, professor_id, course_id, university_id, campus_id, term_id,
  teaching_format, would_take_again, recommends_course, weekly_hours, exam_count, exam_difficulty,
  homework_frequency, teamwork_level, requires_programming, requires_math, prior_knowledge_needed,
  attendance_policy, tags, body, advice
) on public.reviews to authenticated;
grant update (
  teaching_format, would_take_again, recommends_course, weekly_hours, exam_count, exam_difficulty,
  homework_frequency, teamwork_level, requires_programming, requires_math, prior_knowledge_needed,
  attendance_policy, tags, body, advice, campus_id
) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

create policy reviews_owner_or_moderator_read on public.reviews
  for select to authenticated using (user_id = auth.uid() or public.is_moderator());
create policy reviews_owner_insert on public.reviews
  for insert to authenticated with check (user_id = auth.uid() and public.can_contribute());
create policy reviews_owner_update on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_owner_or_admin_delete on public.reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.professor_review_scores, public.course_review_scores to authenticated;
create policy professor_scores_owner_read on public.professor_review_scores for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and (r.user_id = auth.uid() or public.is_moderator())));
create policy professor_scores_owner_insert on public.professor_review_scores for insert to authenticated
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));
create policy professor_scores_owner_update on public.professor_review_scores for update to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));
create policy course_scores_owner_read on public.course_review_scores for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and (r.user_id = auth.uid() or public.is_moderator())));
create policy course_scores_owner_insert on public.course_review_scores for insert to authenticated
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));
create policy course_scores_owner_update on public.course_review_scores for update to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Votes, reports, bookmarks, comparisons, suggestions, corrections
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.review_votes to authenticated;
grant update (value) on public.review_votes to authenticated;
create policy votes_owner_read on public.review_votes for select to authenticated using (user_id = auth.uid());
create policy votes_owner_insert on public.review_votes for insert to authenticated
  with check (user_id = auth.uid() and public.can_contribute());
create policy votes_owner_update on public.review_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy votes_owner_delete on public.review_votes for delete to authenticated using (user_id = auth.uid());

grant select on public.review_reports to authenticated;
grant insert (review_id, reporter_id, reason, details) on public.review_reports to authenticated;
create policy reports_owner_or_moderator_read on public.review_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_owner_insert on public.review_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.can_contribute());

grant select, insert, delete on public.bookmarks to authenticated;
create policy bookmarks_owner_all on public.bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.saved_comparisons to authenticated;
create policy comparisons_owner_all on public.saved_comparisons for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.suggestions to authenticated;
grant insert (user_id, kind, university_id, payload) on public.suggestions to authenticated;
create policy suggestions_owner_or_moderator_read on public.suggestions for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy suggestions_owner_insert on public.suggestions for insert to authenticated
  with check (user_id = auth.uid() and public.can_contribute());

grant insert (professor_id, course_id, requester_name, requester_email, relationship, message)
  on public.correction_requests to anon, authenticated;
grant select on public.correction_requests to authenticated;
create policy corrections_anyone_insert on public.correction_requests for insert to anon, authenticated with check (true);
create policy corrections_moderator_read on public.correction_requests for select to authenticated using (public.is_moderator());

grant select on public.moderation_logs to authenticated;
create policy moderation_logs_moderator_read on public.moderation_logs for select to authenticated using (public.is_moderator());

grant select, insert, update, delete on public.blocked_terms to authenticated;
create policy blocked_terms_moderator_read on public.blocked_terms for select to authenticated using (public.is_moderator());
create policy blocked_terms_admin_insert on public.blocked_terms for insert to authenticated with check (public.is_admin());
create policy blocked_terms_admin_update on public.blocked_terms for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blocked_terms_admin_delete on public.blocked_terms for delete to authenticated using (public.is_admin());

-- rate_limit_events: no grants, no policies. Only definer functions touch it.

-- ---------------------------------------------------------------------------
-- Public read views
-- ---------------------------------------------------------------------------
create view public.professor_directory
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
  p.search_text
from public.professors p
join public.universities u on u.id = p.university_id
left join public.departments d on d.id = p.department_id
left join public.campuses c on c.id = p.primary_campus_id
left join public.professor_stats s on s.professor_id = p.id
where p.merged_into_id is null and p.is_active;

create view public.course_directory
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.code,
  c.name,
  c.name_language,
  c.description,
  c.credits,
  c.recommended_knowledge,
  c.is_fictional,
  c.university_id,
  u.slug as university_slug,
  u.short_name as university_short_name,
  c.department_id,
  d.name as department_name,
  d.name_en as department_name_en,
  coalesce(s.review_count, 0) as review_count,
  s.avg_difficulty,
  s.avg_workload,
  s.avg_content_clarity,
  s.avg_usefulness,
  s.avg_organization,
  s.avg_satisfaction,
  s.avg_weekly_hours,
  s.recommend_pct,
  s.avg_exam_count,
  s.avg_exam_difficulty,
  s.programming_pct,
  s.math_pct,
  s.prior_knowledge_pct,
  coalesce(s.homework_counts, '{}') as homework_counts,
  coalesce(s.teamwork_counts, '{}') as teamwork_counts,
  coalesce(s.difficulty_distribution, '{0,0,0,0,0}') as difficulty_distribution,
  coalesce(s.satisfaction_distribution, '{0,0,0,0,0}') as satisfaction_distribution,
  s.last_review_at,
  (select count(*)::int from public.professor_courses pc where pc.course_id = c.id and pc.is_active) as professor_count,
  c.search_text
from public.courses c
join public.universities u on u.id = c.university_id
left join public.departments d on d.id = c.department_id
left join public.course_stats s on s.course_id = c.id
where c.merged_into_id is null and c.is_active;

create view public.professor_course_directory
with (security_invoker = true)
as
select
  pc.id,
  pc.professor_id,
  p.slug as professor_slug,
  p.display_name as professor_name,
  p.is_fictional as professor_is_fictional,
  pc.course_id,
  c.slug as course_slug,
  c.code as course_code,
  c.name as course_name,
  c.is_fictional as course_is_fictional,
  pc.campus_id,
  cp.name as campus_name,
  pc.is_active,
  coalesce(s.review_count, 0) as review_count,
  s.avg_overall,
  s.avg_clarity,
  s.avg_attitude,
  s.avg_grading_fairness,
  s.avg_availability,
  s.avg_organization,
  s.avg_engagement,
  s.avg_difficulty,
  s.avg_workload,
  s.avg_satisfaction,
  s.avg_weekly_hours,
  s.would_take_again_pct,
  s.recommend_pct,
  s.last_review_at
from public.professor_courses pc
join public.professors p on p.id = pc.professor_id and p.merged_into_id is null and p.is_active
join public.courses c on c.id = pc.course_id and c.merged_into_id is null and c.is_active
left join public.campuses cp on cp.id = pc.campus_id
left join public.professor_course_stats s on s.professor_course_id = pc.id;

-- Published reviews without any account data. Runs with the view owner's
-- rights (intentionally not security_invoker) because the underlying
-- `reviews` table is private; the WHERE clause and column list are the
-- privacy boundary.
create view public.review_feed
with (security_barrier = true)
as
select
  r.id,
  r.professor_id,
  p.slug as professor_slug,
  p.display_name as professor_name,
  r.course_id,
  c.slug as course_slug,
  c.code as course_code,
  c.name as course_name,
  r.professor_course_id,
  r.university_id,
  r.campus_id,
  cp.name as campus_name,
  r.term_id,
  t.label as term_label,
  t.year as term_year,
  t.season as term_season,
  r.teaching_format,
  r.would_take_again,
  r.recommends_course,
  r.weekly_hours,
  r.exam_count,
  r.exam_difficulty,
  r.homework_frequency,
  r.teamwork_level,
  r.requires_programming,
  r.requires_math,
  r.prior_knowledge_needed,
  r.attendance_policy,
  r.tags,
  r.body,
  r.advice,
  r.enrollment_verified,
  pr.has_university_email as author_has_university_email,
  r.helpful_count,
  r.not_helpful_count,
  (r.helpful_count - r.not_helpful_count) as helpful_score,
  ps.overall as professor_overall,
  ps.clarity,
  ps.attitude,
  ps.grading_fairness,
  ps.availability,
  ps.organization as professor_organization,
  ps.engagement,
  cs.difficulty,
  cs.workload,
  cs.content_clarity,
  cs.usefulness,
  cs.organization as course_organization,
  cs.satisfaction,
  (p.is_fictional or c.is_fictional) as is_demo,
  r.created_at,
  r.edited_at,
  (r.user_id = auth.uid()) as is_own
from public.reviews r
join public.professors p on p.id = r.professor_id
join public.courses c on c.id = r.course_id
join public.campuses cp on cp.id = r.campus_id
join public.academic_terms t on t.id = r.term_id
join public.professor_review_scores ps on ps.review_id = r.id
join public.course_review_scores cs on cs.review_id = r.id
join public.profiles pr on pr.id = r.user_id
where r.status = 'published';

-- Professors with the most published reviews in the last 30 days.
create view public.trending_professors
with (security_barrier = true)
as
select d.*, recent.recent_reviews
from public.professor_directory d
join (
  select r.professor_id, count(*)::int as recent_reviews
  from public.reviews r
  where r.status = 'published' and r.created_at > now() - interval '30 days'
  group by r.professor_id
) recent on recent.professor_id = d.id;

grant select on public.professor_directory, public.course_directory, public.professor_course_directory,
  public.review_feed, public.trending_professors to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
-- Internal helpers must not be callable through the API.
revoke execute on function
  public.log_moderation(text, text, uuid, text, jsonb),
  public.enforce_rate_limit(text, integer, interval),
  public.refresh_professor_stats(uuid),
  public.refresh_course_stats(uuid),
  public.refresh_professor_course_stats(uuid),
  public.refresh_review_targets(uuid, uuid, uuid),
  public.university_for_email(text),
  public.handle_auth_user_change(),
  public.audit_catalog_change(),
  public.reviews_content_guard(),
  public.reviews_before_insert(),
  public.reviews_before_update(),
  public.reviews_require_scores(),
  public.reviews_after_change(),
  public.review_scores_after_change(),
  public.ensure_stats_rows(),
  public.review_votes_guard(),
  public.review_votes_after_change(),
  public.review_reports_before_insert(),
  public.review_reports_after_insert(),
  public.suggestions_before_insert(),
  public.correction_requests_before_insert(),
  public.prevent_log_mutation()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------
create or replace function public.search_suggest(
  p_query text,
  p_university_id uuid default null,
  p_limit integer default 8
)
returns table (
  kind text,
  id uuid,
  slug text,
  title text,
  subtitle text,
  code text,
  rating numeric,
  review_count integer,
  score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select public.normalize_search(coalesce(p_query, '')) as nq,
           replace(public.normalize_search(coalesce(p_query, '')), ' ', '') as compact
  ),
  matches as (
    select 'professor'::text as kind, d.id, d.slug, d.display_name as title,
           d.department_name as subtitle, null::text as code, d.avg_overall as rating, d.review_count,
           greatest(
             extensions.word_similarity(q.nq, d.search_text),
             case when d.search_text like q.nq || '%' or d.search_text like '% ' || q.nq || '%' then 1.0 else 0 end
           )::real as score
    from public.professor_directory d, q
    where char_length(q.nq) >= 2
      and (p_university_id is null or d.university_id = p_university_id)
      and (d.search_text like '%' || q.nq || '%' or extensions.word_similarity(q.nq, d.search_text) > 0.35)
    union all
    select 'course'::text, c.id, c.slug, c.name, c.department_name, c.code, c.avg_satisfaction, c.review_count,
           greatest(
             extensions.word_similarity(q.nq, c.search_text),
             case when c.search_text like '%' || q.compact || '%' and char_length(q.compact) >= 3 then 0.95 else 0 end,
             case when c.search_text like q.nq || '%' or c.search_text like '% ' || q.nq || '%' then 1.0 else 0 end
           )::real
    from public.course_directory c, q
    where char_length(q.nq) >= 2
      and (p_university_id is null or c.university_id = p_university_id)
      and (c.search_text like '%' || q.nq || '%'
           or (char_length(q.compact) >= 3 and c.search_text like '%' || q.compact || '%')
           or extensions.word_similarity(q.nq, c.search_text) > 0.35)
  )
  select * from matches
  order by score desc, review_count desc, title
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

create or replace function public.search_professors(
  p_query text default null,
  p_university_id uuid default null,
  p_campus_id uuid default null,
  p_department_id uuid default null,
  p_course_id uuid default null,
  p_min_rating numeric default null,
  p_max_difficulty numeric default null,
  p_min_reviews integer default null,
  p_min_take_again numeric default null,
  p_max_weekly_hours numeric default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.professor_directory
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select public.normalize_search(coalesce(p_query, '')) as nq)
  select d.*
  from public.professor_directory d, q
  where (p_university_id is null or d.university_id = p_university_id)
    and (p_campus_id is null or d.campus_id = p_campus_id
         or exists (select 1 from public.professor_courses pc where pc.professor_id = d.id and pc.campus_id = p_campus_id))
    and (p_department_id is null or d.department_id = p_department_id)
    and (p_course_id is null or exists (
      select 1 from public.professor_courses pc where pc.professor_id = d.id and pc.course_id = p_course_id and pc.is_active))
    and (p_min_rating is null or d.avg_overall >= p_min_rating)
    and (p_max_difficulty is null or d.avg_difficulty <= p_max_difficulty)
    and (p_min_reviews is null or d.review_count >= p_min_reviews)
    and (p_min_take_again is null or d.would_take_again_pct >= p_min_take_again)
    and (p_max_weekly_hours is null or d.avg_weekly_hours <= p_max_weekly_hours)
    and (char_length(q.nq) < 2
         or d.search_text like '%' || q.nq || '%'
         or extensions.word_similarity(q.nq, d.search_text) > 0.35
         or exists (
           select 1 from public.professor_courses pc join public.courses c on c.id = pc.course_id
           where pc.professor_id = d.id and (c.search_text like '%' || q.nq || '%')))
  order by
    case when p_sort = 'relevance' and char_length(q.nq) >= 2
      then extensions.word_similarity(q.nq, d.search_text) end desc nulls last,
    case when p_sort = 'rating' then d.avg_overall end desc nulls last,
    case when p_sort = 'difficulty' then d.avg_difficulty end asc nulls last,
    case when p_sort = 'take_again' then d.would_take_again_pct end desc nulls last,
    case when p_sort = 'name' then d.last_name end asc,
    d.review_count desc,
    d.display_name asc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.search_courses(
  p_query text default null,
  p_university_id uuid default null,
  p_campus_id uuid default null,
  p_department_id uuid default null,
  p_max_difficulty numeric default null,
  p_max_workload numeric default null,
  p_max_weekly_hours numeric default null,
  p_min_reviews integer default null,
  p_min_recommend numeric default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.course_directory
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select public.normalize_search(coalesce(p_query, '')) as nq,
           replace(public.normalize_search(coalesce(p_query, '')), ' ', '') as compact
  )
  select c.*
  from public.course_directory c, q
  where (p_university_id is null or c.university_id = p_university_id)
    and (p_campus_id is null or exists (
      select 1 from public.professor_courses pc
      join public.professors p on p.id = pc.professor_id
      where pc.course_id = c.id and coalesce(pc.campus_id, p.primary_campus_id) = p_campus_id))
    and (p_department_id is null or c.department_id = p_department_id)
    and (p_max_difficulty is null or c.avg_difficulty <= p_max_difficulty)
    and (p_max_workload is null or c.avg_workload <= p_max_workload)
    and (p_max_weekly_hours is null or c.avg_weekly_hours <= p_max_weekly_hours)
    and (p_min_reviews is null or c.review_count >= p_min_reviews)
    and (p_min_recommend is null or c.recommend_pct >= p_min_recommend)
    and (char_length(q.nq) < 2
         or c.search_text like '%' || q.nq || '%'
         or (char_length(q.compact) >= 3 and c.search_text like '%' || q.compact || '%')
         or extensions.word_similarity(q.nq, c.search_text) > 0.35)
  order by
    case when p_sort = 'relevance' and char_length(q.nq) >= 2
      then extensions.word_similarity(q.nq, c.search_text) end desc nulls last,
    case when p_sort = 'rating' then c.avg_satisfaction end desc nulls last,
    case when p_sort = 'difficulty' then c.avg_difficulty end asc nulls last,
    case when p_sort = 'workload' then c.avg_weekly_hours end asc nulls last,
    case when p_sort = 'name' then c.name end asc,
    c.review_count desc,
    c.code asc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------------
-- Review API (SECURITY INVOKER: RLS and column grants stay in force)
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
end;
$$;

-- value: 1 helpful, -1 not helpful, 0 clears the vote.
create or replace function public.cast_review_vote(p_review_id uuid, p_value integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_value = 0 then
    delete from public.review_votes where review_id = p_review_id and user_id = auth.uid();
  elsif p_value in (-1, 1) then
    insert into public.review_votes (review_id, user_id, value)
    values (p_review_id, auth.uid(), p_value)
    on conflict (review_id, user_id) do update set value = excluded.value
    where public.review_votes.value <> excluded.value;
  else
    raise exception 'invalid_vote' using errcode = '22023';
  end if;
end;
$$;

-- Deletes the caller's auth account; profile, reviews, votes and bookmarks
-- cascade. Reports they filed are kept with reporter_id set to null.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.moderation_logs (actor_id, action, target_type, target_id)
  values (null, 'account_deleted_by_owner', 'account', null);
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.submit_review(jsonb), public.update_review(uuid, jsonb),
  public.cast_review_vote(uuid, integer) from public, anon;
grant execute on function public.submit_review(jsonb), public.update_review(uuid, jsonb),
  public.cast_review_vote(uuid, integer) to authenticated;
