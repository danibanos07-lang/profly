-- Database behaviour tests. Run with scripts/test-db.sh (plain PostgreSQL +
-- shim) after migrations and seed. Everything runs in one transaction that
-- is rolled back at the end.

begin;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end;
$$;

create function tests.as_owner() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function tests.assert(p_ok boolean, p_message text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;

-- Runs SQL and asserts it fails with an error whose SQLSTATE or message
-- matches p_expect.
create function tests.throws(p_sql text, p_expect text, p_message text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_expect or sqlerrm ilike '%' || p_expect || '%' then
      raise notice 'ok - %', p_message;
      return;
    end if;
    raise exception 'ASSERTION FAILED: % (got % / %)', p_message, sqlstate, sqlerrm;
  end;
  raise exception 'ASSERTION FAILED: % (no error raised)', p_message;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Test fixtures --------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-4111-8111-111111111111', 'alice@tec.mx', now()),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.com', now()),
  ('33333333-3333-4333-8333-333333333333', 'unconfirmed@example.com', null),
  ('44444444-4444-4444-8444-444444444444', 'admin@example.com', now());
update public.profiles set role = 'admin' where id = '44444444-4444-4444-8444-444444444444';

create temp table fx as
select
  (select id from public.professor_courses
     where professor_id = '00000000-0000-4000-b000-000000000001'
       and course_id = '00000000-0000-4000-c000-000000000001') as pc_id,
  '00000000-0000-4000-a100-000000000001'::uuid as campus_id,
  '00000000-0000-4000-a300-000000000003'::uuid as term_id,
  '00000000-0000-4000-a300-000000000002'::uuid as term2_id;
grant select on fx to anon, authenticated;

create function tests.payload(p_term uuid, p_body text default null) returns jsonb language sql as $$
  select jsonb_build_object(
    'professor_course_id', (select pc_id from fx),
    'campus_id', (select campus_id from fx),
    'term_id', p_term,
    'teaching_format', 'in_person',
    'would_take_again', true,
    'recommends_course', true,
    'weekly_hours', 6,
    'exam_count', 3,
    'exam_difficulty', 3,
    'homework_frequency', 'weekly',
    'teamwork_level', 'some',
    'requires_programming', false,
    'requires_math', true,
    'prior_knowledge_needed', true,
    'attendance_policy', 'mandatory',
    'tags', jsonb_build_array('clear_explanations', 'helpful_feedback'),
    'body', coalesce(p_body, 'Una profesora muy clara al explicar, con ejemplos útiles y exámenes justos en general.'),
    'advice', 'Practica los ejercicios.',
    'professor_scores', jsonb_build_object('clarity', 5, 'attitude', 5, 'grading_fairness', 4, 'availability', 4, 'organization', 5, 'engagement', 4),
    'course_scores', jsonb_build_object('difficulty', 3, 'workload', 3, 'content_clarity', 4, 'usefulness', 5, 'organization', 4, 'satisfaction', 5)
  );
$$;
grant execute on function tests.payload(uuid, text) to authenticated;

-- 1. Provisioning ------------------------------------------------------------
select tests.assert(
  (select has_university_email from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'confirmed @tec.mx account is flagged as university email');
select tests.assert(
  not (select has_university_email from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'non-university email is not flagged');

-- 2. Anonymous visitors --------------------------------------------------------
select tests.as_anon();
select tests.assert((select count(*) from public.review_feed) > 0, 'anon can read published reviews');
select tests.assert((select count(*) from public.professor_directory) = 10, 'anon can read professor directory');
select tests.throws('select * from public.reviews limit 1', '42501', 'anon cannot read raw reviews table');
select tests.throws('select * from public.profiles limit 1', '42501', 'anon cannot read profiles');
select tests.throws('select user_id from public.review_feed limit 1', '42703', 'review_feed exposes no user_id');
select tests.throws('select public.submit_review(''{}''::jsonb)', '42501', 'anon cannot call submit_review');
select tests.throws('insert into public.professors (university_id, slug, first_name, last_name) values (''00000000-0000-4000-a000-000000000001'', ''x-y'', ''X'', ''Y'')', '42501', 'anon cannot write catalog');
select tests.throws('select * from public.moderation_logs', '42501', 'anon cannot read moderation logs');

-- 3. Submitting reviews --------------------------------------------------------
select tests.as_owner();
create temp table before_stats as
select review_count, avg_overall from public.professor_course_stats where professor_course_id = (select pc_id from fx);
grant select on before_stats to authenticated;

select tests.login('11111111-1111-4111-8111-111111111111');
select tests.assert((select count(*) from public.reviews) = 0, 'student sees none of the other reviews in the raw table');
select tests.assert(public.submit_review(tests.payload((select term_id from fx))) is not null, 'student can submit a review');
select tests.assert((select count(*) from public.reviews) = 1, 'student sees own review');
select tests.assert(
  (select review_count from public.professor_course_stats where professor_course_id = (select pc_id from fx))
    = (select review_count + 1 from before_stats),
  'combination stats are recalculated from stored reviews');
select tests.assert((select bool_or(is_own) from public.review_feed), 'feed marks own review');
select tests.assert(
  (select author_has_university_email from public.review_feed where is_own),
  'feed shows the university-email badge');
select tests.assert(
  not (select enrollment_verified from public.review_feed where is_own),
  'enrollment is never verified by default');

select tests.throws(
  'select public.submit_review(tests.payload((select term_id from fx)))', '23505',
  'cannot review the same professor-course-term twice');
select tests.throws(
  'select public.submit_review(tests.payload((select term2_id from fx), ''Escríbeme a alguien@correo.com para pasarte las respuestas del examen.''))',
  'review_contains_personal_info', 'reviews with contact information are rejected');
select tests.throws(
  'select public.submit_review(tests.payload((select term2_id from fx), ''muy corto''))',
  'review_body_too_short', 'short reviews are rejected');

-- Students cannot touch server-controlled columns or aggregates.
select tests.throws('update public.reviews set status = ''published'', helpful_count = 999', '42501', 'cannot update protected review columns');
select tests.throws('update public.reviews set enrollment_verified = true', '42501', 'cannot self-verify enrollment');
select tests.throws('update public.professor_stats set avg_overall = 5', '42501', 'cannot write aggregates');
select tests.throws('insert into public.course_stats (course_id) values (gen_random_uuid())', '42501', 'cannot insert aggregates');
select tests.throws('update public.profiles set role = ''admin''', '42501', 'cannot escalate own role');

-- Editing an own review recalculates and marks it edited.
select public.update_review(
  (select id from public.reviews limit 1),
  jsonb_set(tests.payload((select term_id from fx)), '{professor_scores,clarity}', '1')
);
select tests.assert((select edited_at is not null from public.reviews limit 1), 'edits are timestamped');
select tests.assert((select clarity from public.professor_review_scores limit 1) = 1, 'own scores can be edited');

-- Flagged vocabulary sends the review to the moderation queue.
select public.submit_review(tests.payload((select term2_id from fx),
  'El profesor es un idiota y no explica nada de lo que viene en el examen final del curso.'));
select tests.assert(
  (select status from public.reviews where term_id = (select term2_id from fx)) = 'under_review',
  'flagged terms queue the review');
select tests.assert(
  not exists (select 1 from public.review_feed where term_id = (select term2_id from fx) and is_own),
  'queued review is not public');

-- 4. Unconfirmed accounts ------------------------------------------------------
select tests.login('33333333-3333-4333-8333-333333333333');
select tests.throws('select public.submit_review(tests.payload((select term_id from fx)))', '42501',
  'unconfirmed accounts cannot review');

-- 5. Votes ---------------------------------------------------------------------
select tests.login('11111111-1111-4111-8111-111111111111');
select tests.throws(
  'select public.cast_review_vote((select id from public.reviews where term_id = (select term_id from fx)), 1)',
  'cannot_vote_own_review', 'cannot vote on own review');

select tests.as_owner();
create temp table target_review as
select id from public.reviews where user_id::text like '00000000-0000-4000-d000-%' and status = 'published' limit 1;
grant select on target_review to authenticated;

select tests.login('22222222-2222-4222-8222-222222222222');
select public.cast_review_vote((select id from target_review), 1);
select tests.assert(
  exists (select 1 from public.review_votes where review_id = (select id from target_review)),
  'vote recorded');
select tests.as_owner();
select tests.assert(
  (select helpful_count from public.reviews where id = (select id from target_review))
    = (select count(*) from public.review_votes where review_id = (select id from target_review) and value = 1),
  'helpful_count equals stored helpful votes');
select tests.login('22222222-2222-4222-8222-222222222222');
select public.cast_review_vote((select id from target_review), -1);
select public.cast_review_vote((select id from target_review), 0);
select tests.as_owner();
select tests.assert(
  not exists (select 1 from public.review_votes where review_id = (select id from target_review)
              and user_id = '22222222-2222-4222-8222-222222222222'),
  'vote can be changed and cleared');

-- 6. Reports & automatic queueing ----------------------------------------------
insert into auth.users (id, email, email_confirmed_at)
select gen_random_uuid(), 'reporter' || i || '@example.com', now() from generate_series(1, 3) i;
do $$
declare
  v_user uuid;
begin
  for v_user in select id from auth.users where email like 'reporter%' loop
    perform tests.login(v_user);
    insert into public.review_reports (review_id, reporter_id, reason, details)
    values ((select id from target_review), v_user, 'harassment', 'Ataque personal');
    perform tests.as_owner();
  end loop;
end;
$$;
select tests.assert(
  (select status from public.reviews where id = (select id from target_review)) = 'under_review',
  'three severe reports queue a review for moderation');
select tests.assert(
  exists (select 1 from public.moderation_logs where action = 'auto_queue_review' and target_id = (select id from target_review)),
  'automatic queueing is logged');

select tests.login('22222222-2222-4222-8222-222222222222');
select tests.throws(
  'insert into public.review_reports (review_id, reporter_id, reason, status) values ((select id from target_review), ''22222222-2222-4222-8222-222222222222'', ''spam'', ''actioned'')',
  '42501', 'reporters cannot set report status');

-- 7. Moderation permissions ----------------------------------------------------
select tests.throws('select public.moderate_review((select id from target_review), ''publish'', null)', '42501',
  'students cannot moderate');
select tests.throws('select public.admin_overview()', '42501', 'students cannot see admin overview');

select tests.login('44444444-4444-4444-8444-444444444444');
select public.moderate_review((select id from target_review), 'publish', 'Reports were not valid');
select tests.assert(
  (select status from public.reviews where id = (select id from target_review)) = 'published',
  'admin can restore a review');
select tests.assert(
  (select count(*) from public.review_reports where review_id = (select id from target_review) and status = 'dismissed') = 3,
  'restoring dismisses open reports');
select tests.assert((select (public.admin_overview() ->> 'published_reviews')::int) > 100, 'admin overview works');
select tests.assert((select count(*) from public.admin_list_users(null, 10)) > 0, 'admin can list users');

-- Admin catalog writes are audited.
insert into public.professors (university_id, slug, first_name, last_name, is_fictional)
values ('00000000-0000-4000-a000-000000000001', 'duplicado-ficticia', 'Mariana', 'Ficticia (duplicado)', true);
select tests.assert(
  exists (select 1 from public.moderation_logs where action = 'insert_professors'
          and actor_id = '44444444-4444-4444-8444-444444444444'),
  'admin catalog changes are audited');

-- 8. Merging duplicates --------------------------------------------------------
select tests.as_owner();
insert into public.professor_courses (professor_id, course_id, campus_id)
select id, '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a100-000000000001'
from public.professors where slug = 'duplicado-ficticia';
insert into public.reviews (user_id, professor_course_id, campus_id, term_id, teaching_format,
  would_take_again, recommends_course, weekly_hours, body)
select '22222222-2222-4222-8222-222222222222', pc.id, '00000000-0000-4000-a100-000000000001',
  '00000000-0000-4000-a300-000000000001', 'online', true, true, 5,
  'Reseña escrita en el perfil duplicado que debe moverse al perfil correcto al fusionar.'
from public.professor_courses pc join public.professors p on p.id = pc.professor_id
where p.slug = 'duplicado-ficticia';
insert into public.professor_review_scores (review_id, clarity, attitude, grading_fairness, availability, organization, engagement)
select id, 4, 4, 4, 4, 4, 4 from public.reviews where user_id = '22222222-2222-4222-8222-222222222222' and term_id = '00000000-0000-4000-a300-000000000001';
insert into public.course_review_scores (review_id, difficulty, workload, content_clarity, usefulness, organization, satisfaction)
select id, 3, 3, 3, 3, 3, 3 from public.reviews where user_id = '22222222-2222-4222-8222-222222222222' and term_id = '00000000-0000-4000-a300-000000000001';

create temp table pre_merge as
select review_count from public.professor_stats where professor_id = '00000000-0000-4000-b000-000000000001';
grant select on pre_merge to authenticated;

select tests.login('44444444-4444-4444-8444-444444444444');
select public.admin_merge_professors(
  (select id from public.professors where slug = 'duplicado-ficticia'),
  '00000000-0000-4000-b000-000000000001',
  'Duplicate profile');
select tests.assert(
  (select review_count from public.professor_stats where professor_id = '00000000-0000-4000-b000-000000000001')
    = (select review_count + 1 from pre_merge),
  'merge moves reviews and recalculates stats');
select tests.assert(
  not exists (select 1 from public.professor_directory where slug = 'duplicado-ficticia'),
  'merged profile disappears from the directory');

-- 9. Audit log is append-only --------------------------------------------------
select tests.as_owner();
select tests.throws('delete from public.moderation_logs', 'append-only', 'moderation log cannot be deleted');
select tests.throws('update public.moderation_logs set action = ''x''', 'append-only', 'moderation log cannot be edited');

-- 10. Rate limiting ------------------------------------------------------------
select tests.login('22222222-2222-4222-8222-222222222222');
select public.submit_review(tests.payload('00000000-0000-4000-a300-000000000002'));
select public.submit_review(tests.payload('00000000-0000-4000-a300-000000000003'));
select public.submit_review(tests.payload('00000000-0000-4000-a300-000000000004'));
select tests.throws(
  'select public.submit_review(jsonb_set(tests.payload(''00000000-0000-4000-a300-000000000001''), ''{professor_course_id}'', to_jsonb((select id from public.professor_courses where course_id = ''00000000-0000-4000-c000-000000000002'' limit 1))))',
  'rate_limited', 'review submissions are rate limited');

-- 11. Account deletion ---------------------------------------------------------
select tests.login('11111111-1111-4111-8111-111111111111');
select public.delete_my_account();
select tests.as_owner();
select tests.assert(not exists (select 1 from auth.users where id = '11111111-1111-4111-8111-111111111111'), 'account deleted');
select tests.assert(not exists (select 1 from public.reviews where user_id = '11111111-1111-4111-8111-111111111111'), 'reviews deleted with account');
select tests.assert(
  (select review_count from public.professor_course_stats where professor_course_id = (select pc_id from fx))
    = (select count(*) from public.reviews where professor_course_id = (select pc_id from fx) and status = 'published'),
  'stats recalculated after account deletion');

-- 12. Search -------------------------------------------------------------------
select tests.as_anon();
select tests.assert((select title from public.search_suggest('calculo') limit 1) = 'Cálculo I', 'accent-insensitive course search');
select tests.assert((select title from public.search_suggest('demo ma101') limit 1) = 'Cálculo I', 'course code search');
select tests.assert((select title from public.search_suggest('demoma101') limit 1) = 'Cálculo I', 'compact course code search');
select tests.assert((select kind from public.search_suggest('mariana fictisia') limit 1) = 'professor', 'typo-tolerant professor search');
select tests.assert(
  (select count(*) from public.search_professors(p_course_id => '00000000-0000-4000-c000-000000000001')) = 3,
  'filter professors by course');
select tests.assert(
  (select bool_and(avg_overall >= 4) from public.search_professors(p_min_rating => 4)),
  'minimum rating filter');
select tests.assert(
  (select bool_and(avg_difficulty <= 3) from public.search_courses(p_max_difficulty => 3)),
  'maximum difficulty filter');

rollback;
