-- Moderation and administration RPCs. Every function checks the caller's
-- role and writes to moderation_logs.

create or replace function public.require_moderator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews & reports
-- ---------------------------------------------------------------------------
-- p_action: publish | queue | hide | remove | verify_enrollment | unverify_enrollment
create or replace function public.moderate_review(p_review_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.reviews;
begin
  perform public.require_moderator();
  select * into v_old from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  case p_action
    when 'publish' then
      update public.reviews set status = 'published', moderation_note = p_reason where id = p_review_id;
      update public.review_reports set status = 'dismissed', handled_by = auth.uid(), handled_at = now(),
        resolution_note = coalesce(p_reason, 'Review restored')
      where review_id = p_review_id and status = 'open';
    when 'queue' then
      update public.reviews set status = 'under_review', moderation_note = p_reason where id = p_review_id;
    when 'hide' then
      update public.reviews set status = 'hidden', moderation_note = p_reason where id = p_review_id;
      update public.review_reports set status = 'actioned', handled_by = auth.uid(), handled_at = now(), resolution_note = p_reason
      where review_id = p_review_id and status = 'open';
    when 'remove' then
      update public.reviews set status = 'removed', moderation_note = p_reason where id = p_review_id;
      update public.review_reports set status = 'actioned', handled_by = auth.uid(), handled_at = now(), resolution_note = p_reason
      where review_id = p_review_id and status = 'open';
    when 'verify_enrollment' then
      update public.reviews set enrollment_verified = true where id = p_review_id;
    when 'unverify_enrollment' then
      update public.reviews set enrollment_verified = false where id = p_review_id;
    else
      raise exception 'invalid_action' using errcode = '22023';
  end case;

  update public.reviews r set report_count = (
    select count(*) from public.review_reports rr where rr.review_id = r.id and rr.status = 'open'
  ) where r.id = p_review_id;

  perform public.log_moderation(
    'review_' || p_action, 'review', p_review_id, p_reason,
    jsonb_build_object('previous_status', v_old.status, 'professor_id', v_old.professor_id, 'course_id', v_old.course_id)
  );
end;
$$;

create or replace function public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review uuid;
begin
  perform public.require_moderator();
  update public.review_reports
  set status = p_status, handled_by = auth.uid(), handled_at = now(), resolution_note = p_note
  where id = p_report_id
  returning review_id into v_review;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
  update public.reviews r set report_count = (
    select count(*) from public.review_reports rr where rr.review_id = r.id and rr.status = 'open'
  ) where r.id = v_review;
  perform public.log_moderation('report_' || p_status::text, 'review_report', p_report_id, p_note,
    jsonb_build_object('review_id', v_review));
end;
$$;

create or replace function public.review_suggestion(p_suggestion_id uuid, p_status public.suggestion_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  update public.suggestions
  set status = p_status, reviewer_id = auth.uid(), reviewed_at = now(), reviewer_note = p_note
  where id = p_suggestion_id;
  if not found then
    raise exception 'suggestion_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('suggestion_' || p_status::text, 'suggestion', p_suggestion_id, p_note);
end;
$$;

create or replace function public.resolve_correction(p_request_id uuid, p_status public.correction_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  update public.correction_requests
  set status = p_status, handled_by = auth.uid(), handled_at = now(), resolution_note = p_note
  where id = p_request_id;
  if not found then
    raise exception 'correction_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('correction_' || p_status::text, 'correction_request', p_request_id, p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.user_role;
begin
  perform public.require_admin();
  select role into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin' and not is_banned) <= 1 then
    raise exception 'cannot_remove_last_admin' using errcode = '23514';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  perform public.log_moderation('user_role_changed', 'profile', p_user_id, null,
    jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

-- Banning hides every published review by the account; unbanning does not
-- automatically restore them.
create or replace function public.admin_set_user_ban(p_user_id uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hidden integer := 0;
begin
  perform public.require_moderator();
  if p_user_id = auth.uid() then
    raise exception 'cannot_ban_self' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.profiles set is_banned = p_banned, banned_reason = case when p_banned then p_reason end
  where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if p_banned then
    update public.reviews set status = 'hidden', moderation_note = 'Author account suspended'
    where user_id = p_user_id and status in ('published', 'under_review');
    get diagnostics v_hidden = row_count;
  end if;
  perform public.log_moderation(case when p_banned then 'user_banned' else 'user_unbanned' end,
    'profile', p_user_id, p_reason, jsonb_build_object('reviews_hidden', v_hidden));
end;
$$;

-- ---------------------------------------------------------------------------
-- Merging duplicate profiles
-- ---------------------------------------------------------------------------
-- reviews_before_update normally forbids changing a review's assignment.
-- Merges set a transaction-local flag to allow it.
create or replace function public.reviews_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('unirate.merging', true) = 'on' then
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

  perform set_config('unirate.merging', 'on', true);

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

  perform set_config('unirate.merging', 'off', true);

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

  perform set_config('unirate.merging', 'on', true);

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

  perform set_config('unirate.merging', 'off', true);

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
-- Maintenance & analytics
-- ---------------------------------------------------------------------------
create or replace function public.admin_refresh_all_stats()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_admin();
  for v_id in select id from public.professors loop perform public.refresh_professor_stats(v_id); end loop;
  for v_id in select id from public.courses loop perform public.refresh_course_stats(v_id); end loop;
  for v_id in select id from public.professor_courses loop perform public.refresh_professor_course_stats(v_id); end loop;
  perform public.log_moderation('stats_rebuilt', 'system', null);
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return jsonb_build_object(
    'open_reports', (select count(*) from public.review_reports where status = 'open'),
    'queued_reviews', (select count(*) from public.reviews where status = 'under_review'),
    'pending_suggestions', (select count(*) from public.suggestions where status = 'pending'),
    'open_corrections', (select count(*) from public.correction_requests where status = 'open'),
    'published_reviews', (select count(*) from public.reviews where status = 'published'),
    'reviews_last_7_days', (select count(*) from public.reviews where created_at > now() - interval '7 days'),
    'accounts', (select count(*) from public.profiles),
    'accounts_with_university_email', (select count(*) from public.profiles where has_university_email),
    'professors', (select count(*) from public.professors where merged_into_id is null and is_active),
    'courses', (select count(*) from public.courses where merged_into_id is null and is_active),
    'reviews_per_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', d.n) order by d.day)
      from (
        select g.day::date as day, count(r.id) as n
        from generate_series(current_date - 29, current_date, interval '1 day') g(day)
        left join public.reviews r on r.created_at::date = g.day::date
        group by g.day
      ) d
    ), '[]')
  );
end;
$$;

-- Heuristic signals for manipulation. They are leads for a human moderator,
-- not automatic verdicts.
create or replace function public.admin_suspicious_activity(p_days integer default 30)
returns table (
  signal text,
  target_type text,
  target_id uuid,
  label text,
  detail jsonb,
  last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return query
  -- Many reviews from one account within 24 hours.
  select 'review_burst'::text, 'profile'::text, r.user_id,
         coalesce(p.display_name, left(r.user_id::text, 8)),
         jsonb_build_object('reviews_24h', count(*)), max(r.created_at)
  from public.reviews r join public.profiles p on p.id = r.user_id
  where r.created_at > now() - interval '24 hours'
  group by r.user_id, p.display_name
  having count(*) >= 4

  union all
  -- Accounts younger than 2 days that already wrote several reviews.
  select 'new_account_activity', 'profile', p.id, coalesce(p.display_name, left(p.id::text, 8)),
         jsonb_build_object('account_age_hours', round(extract(epoch from now() - p.created_at) / 3600), 'reviews', count(r.id)),
         max(r.created_at)
  from public.profiles p join public.reviews r on r.user_id = p.id
  where p.created_at > now() - interval '2 days'
  group by p.id, p.display_name, p.created_at
  having count(r.id) >= 2

  union all
  -- Accounts whose reviews are uniformly extreme (all ≤ 1.5 or all ≥ 4.8).
  select 'uniform_extreme_ratings', 'profile', r.user_id, coalesce(p.display_name, left(r.user_id::text, 8)),
         jsonb_build_object('reviews', count(*), 'avg_overall', round(avg(s.overall), 2)),
         max(r.created_at)
  from public.reviews r
  join public.professor_review_scores s on s.review_id = r.id
  join public.profiles p on p.id = r.user_id
  where r.created_at > now() - make_interval(days => p_days)
  group by r.user_id, p.display_name
  having count(*) >= 3 and (max(s.overall) <= 1.5 or min(s.overall) >= 4.8)

  union all
  -- Sudden spike of reviews for a professor.
  select 'professor_review_spike', 'professor', r.professor_id, pr.display_name,
         jsonb_build_object('reviews_24h', count(*), 'avg_overall', round(avg(s.overall), 2)),
         max(r.created_at)
  from public.reviews r
  join public.professors pr on pr.id = r.professor_id
  join public.professor_review_scores s on s.review_id = r.id
  where r.created_at > now() - interval '24 hours'
  group by r.professor_id, pr.display_name
  having count(*) >= 5

  union all
  -- Heavy voting from one account.
  select 'vote_burst', 'profile', v.user_id, coalesce(p.display_name, left(v.user_id::text, 8)),
         jsonb_build_object('votes_1h', count(*)), max(v.created_at)
  from public.review_votes v join public.profiles p on p.id = v.user_id
  where v.created_at > now() - interval '1 hour'
  group by v.user_id, p.display_name
  having count(*) >= 30

  union all
  -- One account voting the same direction on many reviews of one professor.
  select 'one_sided_voting', 'profile', v.user_id, coalesce(p.display_name, left(v.user_id::text, 8)),
         jsonb_build_object('professor_id', r.professor_id, 'votes', count(*), 'direction', min(v.value)),
         max(v.created_at)
  from public.review_votes v
  join public.reviews r on r.id = v.review_id
  join public.profiles p on p.id = v.user_id
  where v.created_at > now() - make_interval(days => p_days)
  group by v.user_id, p.display_name, r.professor_id
  having count(*) >= 8 and min(v.value) = max(v.value);
end;
$$;

-- Lookup used by the admin user-management page: moderators may see the
-- email of an account they are acting on, never students.
create or replace function public.admin_list_users(p_query text default null, p_limit integer default 50)
returns table (
  id uuid,
  email text,
  display_name text,
  role public.user_role,
  has_university_email boolean,
  is_banned boolean,
  review_count bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return query
  select p.id, u.email::text, p.display_name, p.role, p.has_university_email, p.is_banned,
         (select count(*) from public.reviews r where r.user_id = p.id), p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p_query is null or p_query = ''
     or u.email ilike '%' || p_query || '%'
     or p.display_name ilike '%' || p_query || '%'
     or p.id::text = p_query
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke execute on function public.require_moderator(), public.require_admin() from public, anon, authenticated;
revoke execute on function
  public.moderate_review(uuid, text, text),
  public.resolve_report(uuid, public.report_status, text),
  public.review_suggestion(uuid, public.suggestion_status, text),
  public.resolve_correction(uuid, public.correction_status, text),
  public.admin_set_user_role(uuid, public.user_role),
  public.admin_set_user_ban(uuid, boolean, text),
  public.admin_merge_professors(uuid, uuid, text),
  public.admin_merge_courses(uuid, uuid, text),
  public.admin_refresh_all_stats(),
  public.admin_overview(),
  public.admin_suspicious_activity(integer),
  public.admin_list_users(text, integer)
from public, anon;
grant execute on function
  public.moderate_review(uuid, text, text),
  public.resolve_report(uuid, public.report_status, text),
  public.review_suggestion(uuid, public.suggestion_status, text),
  public.resolve_correction(uuid, public.correction_status, text),
  public.admin_set_user_role(uuid, public.user_role),
  public.admin_set_user_ban(uuid, boolean, text),
  public.admin_merge_professors(uuid, uuid, text),
  public.admin_merge_courses(uuid, uuid, text),
  public.admin_refresh_all_stats(),
  public.admin_overview(),
  public.admin_suspicious_activity(integer),
  public.admin_list_users(text, integer)
to authenticated;
revoke execute on function public.reviews_before_update() from public, anon, authenticated;
