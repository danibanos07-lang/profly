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

-- Fixtures ----------------------------------------------------------------
-- Five students review the same professor-course; four of them report grades.
insert into auth.users (id, email, email_confirmed_at)
select ('77777777-0000-4000-8000-00000000000' || i)::uuid, 'g' || i || '@example.com', now()
from generate_series(1, 6) i;
insert into auth.users (id, email, email_confirmed_at) values
  ('88888888-8888-4888-8888-888888888888', 'student@alumnos.tec.mx', now()),
  ('99999999-9999-4999-8999-999999999999', 'pending@tec.mx', null);

-- A professor-course without seed reviews, so the counts below are exact.
insert into public.professor_courses (id, professor_id, course_id)
values ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-b000-000000000009', '00000000-0000-4000-c000-000000000010');

create function tests.payload2(p_grade numeric) returns jsonb language sql as $$
  select jsonb_build_object(
    'professor_course_id', '00000000-0000-4000-f000-000000000001',
    'campus_id', '00000000-0000-4000-a100-000000000001',
    'term_id', '00000000-0000-4000-a300-000000000003',
    'teaching_format', 'in_person',
    'would_take_again', true,
    'recommends_course', true,
    'weekly_hours', 5,
    'tags', '[]'::jsonb,
    'body', 'Clases dinámicas y bien organizadas, con proyectos que ayudan a entender el tema.',
    'final_grade', p_grade,
    'professor_scores', jsonb_build_object('clarity', 4, 'attitude', 4, 'grading_fairness', 4, 'availability', 4, 'organization', 4, 'engagement', 4),
    'course_scores', jsonb_build_object('difficulty', 3, 'workload', 3, 'content_clarity', 4, 'usefulness', 4, 'organization', 4, 'satisfaction', 4)
  );
$$;
grant execute on function tests.payload2(numeric) to authenticated;
create temp table ids (n int, review_id uuid);
create temp table baseline as
select coalesce((select grade_count from public.course_grade_summary where course_id = '00000000-0000-4000-c000-000000000010'), 0) as n;
grant select on baseline to anon, authenticated;
grant select, insert on ids to authenticated;

-- 1. University email ---------------------------------------------------------
select tests.assert(
  (select has_university_email from public.profiles where id = '88888888-8888-4888-8888-888888888888'),
  'confirmed subdomain address counts as university email');
select tests.assert(
  not (select has_university_email from public.profiles where id = '99999999-9999-4999-8999-999999999999'),
  'unconfirmed university address is not flagged');

-- 2. Grades --------------------------------------------------------------------
select tests.login('77777777-0000-4000-8000-000000000001');
select tests.throws($$select public.submit_review(tests.payload2(101))$$, 'invalid_grade', 'grade above the scale is rejected');
select tests.throws($$select public.submit_review(tests.payload2(85.5))$$, 'invalid_grade', 'grade off the scale step is rejected');
insert into ids select 1, public.submit_review(tests.payload2(80));
select tests.login('77777777-0000-4000-8000-000000000002');
insert into ids select 2, public.submit_review(tests.payload2(90));
select tests.login('77777777-0000-4000-8000-000000000003');
insert into ids select 3, public.submit_review(tests.payload2(85));
select tests.login('77777777-0000-4000-8000-000000000004');
insert into ids select 4, public.submit_review(tests.payload2(95));
select tests.login('77777777-0000-4000-8000-000000000005');
insert into ids select 5, public.submit_review(tests.payload2(null));

select tests.as_anon();
select tests.assert(
  (select grade_count = 4 and avg_grade is null from public.professor_course_grade_summary
   where professor_course_id = '00000000-0000-4000-f000-000000000001'),
  'four grades: count shown, average hidden');
select tests.assert(
  coalesce((select grade_count from public.course_grade_summary
            where course_id = '00000000-0000-4000-c000-000000000010'), 0) = (select n from baseline),
  'a professor group below five does not feed the course average');
select tests.throws($$select * from public.reported_grades$$, '42501', 'anonymous users cannot read grades');

select tests.login('77777777-0000-4000-8000-000000000005');
select tests.assert(
  (select count(*) from public.reported_grades) = 0,
  'a student sees no grades of other students');
select public.update_review((select review_id from ids where n = 5), tests.payload2(75));
select tests.assert((select count(*) from public.reported_grades) = 1, 'the author sees their own grade');

select tests.as_anon();
select tests.assert(
  (select grade_count = 5 and avg_grade = 85 from public.professor_course_grade_summary
   where professor_course_id = '00000000-0000-4000-f000-000000000001'),
  'five grades: average (80+90+85+95+75)/5 = 85 is shown');
select tests.assert(
  (select grade_count from public.course_grade_summary
   where course_id = '00000000-0000-4000-c000-000000000010') = (select n from baseline) + 5,
  'the group counts toward the course average once it reaches five');
select tests.assert(
  not exists (select 1 from information_schema.columns
              where table_name in ('review_feed', 'professor_course_grade_summary', 'course_grade_summary')
                and column_name in ('user_id', 'grade', 'final_grade', 'review_id')),
  'public views expose no grade rows, review ids or account ids');

-- Clearing a grade, and only for your own review.
select tests.login('77777777-0000-4000-8000-000000000006');
select tests.throws(
  format($$select public.set_review_grade(%L, 100)$$, (select review_id from ids where n = 1)),
  'review_not_found', 'cannot set a grade on someone else''s review');
select tests.login('77777777-0000-4000-8000-000000000001');
select public.update_review((select review_id from ids where n = 1), tests.payload2(null) || '{"final_grade": null}');
select tests.as_anon();
select tests.assert(
  (select grade_count = 4 and avg_grade is null from public.professor_course_grade_summary
   where professor_course_id = '00000000-0000-4000-f000-000000000001'),
  'clearing a grade drops the group below the minimum');

-- Deleting a review removes its grade.
select tests.login('77777777-0000-4000-8000-000000000002');
delete from public.reviews where id = (select review_id from ids where n = 2);
select tests.as_owner();
select tests.assert(
  not exists (select 1 from public.reported_grades where review_id = (select review_id from ids where n = 2)),
  'deleting a review deletes its grade');

-- Hidden reviews stop counting.
update public.reviews set status = 'hidden' where id = (select review_id from ids where n = 3);
select tests.assert(
  (select grade_count from public.professor_course_grade_summary
   where professor_course_id = '00000000-0000-4000-f000-000000000001') = 2,
  'grades of hidden reviews are not counted');

-- 3. Academic profile --------------------------------------------------------
select tests.login('77777777-0000-4000-8000-000000000006');
update public.profiles set university_id = '00000000-0000-4000-a000-000000000001',
  program_id = '00000000-0000-4000-e000-000000000001',
  curriculum_id = '00000000-0000-4000-e100-000000000001',
  current_semester = 1, start_year = 2026
where id = auth.uid();
select tests.assert((select current_semester from public.profiles where id = auth.uid()) = 1, 'student can set their academic profile');
select tests.throws(
  $$update public.profiles set curriculum_id = gen_random_uuid() where id = auth.uid()$$,
  'curriculum_not_in_program', 'curriculum must belong to the program');
select tests.throws(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', 'students still cannot change their role');

-- 4. Next semester -------------------------------------------------------------
select tests.assert(
  (select count(*) from public.my_next_semester()) = 0,
  'no suggestions from an unofficial curriculum');

select tests.as_owner();
update public.curricula set is_official = true, source_url = 'https://example.com/plan'
where id = '00000000-0000-4000-e100-000000000001';
select tests.login('77777777-0000-4000-8000-000000000006');
insert into public.student_course_records (user_id, course_id, status)
values (auth.uid(), '00000000-0000-4000-c000-000000000001', 'completed');
select tests.assert(
  (select array_agg(code order by code) from public.my_next_semester())
    = array['DEMO-FI101', 'DEMO-MA202', 'DEMO-TC101'],
  'next semester: semester-2 courses plus unpassed semester-1 course');
select tests.assert(
  (select is_catch_up from public.my_next_semester() where code = 'DEMO-TC101'),
  'unpassed earlier course is flagged as catch-up');

select tests.as_owner();
update public.profiles set current_semester = 2 where id = '77777777-0000-4000-8000-000000000006';
select tests.login('77777777-0000-4000-8000-000000000006');
select tests.assert(
  (select missing_prerequisites from public.my_next_semester() where code = 'DEMO-TC201') = array['DEMO-TC101'],
  'missing verified prerequisite is reported');

select tests.login('77777777-0000-4000-8000-000000000005');
select tests.assert(
  (select count(*) from public.student_course_records) = 0,
  'course records are private to their owner');

-- 5. Teaching assignments and merges --------------------------------------------
select tests.login('44444444-4444-4444-8444-444444444444');
select tests.as_owner();
insert into public.teaching_assignments (professor_id, course_id, term_id, source)
values ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a300-000000000005', 'official');
select tests.assert(
  exists (select 1 from public.professor_courses
          where professor_id = '00000000-0000-4000-b000-000000000008' and course_id = '00000000-0000-4000-c000-000000000009'),
  'a term assignment creates the professor-course link');
select tests.throws(
  $$insert into public.teaching_assignments (professor_id, course_id, term_id, source)
    values ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a300-000000000005', 'official')$$,
  '23505', 'duplicate term assignment is rejected');

rollback;
