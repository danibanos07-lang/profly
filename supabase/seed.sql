-- Kurso development seed
--
-- Real institutional data: Tecnológico de Monterrey, its campuses and schools.
-- EVERYTHING ELSE IS FICTIONAL: professors, courses (codes start with DEMO-),
-- demo accounts and reviews are invented for development and are flagged with
-- is_fictional = true so the UI labels them as demo data.
--
-- Do not load this file into production. Use the admin CSV importer for
-- verified catalog data instead.

begin;

-- ---------------------------------------------------------------------------
-- University, campuses, schools, terms (real structure, no people)
-- ---------------------------------------------------------------------------
insert into public.universities (id, slug, name, short_name, country_code, default_locale, email_domains, website_url)
values ('00000000-0000-4000-a000-000000000001', 'tec', 'Tecnológico de Monterrey', 'Tec', 'MX', 'es', '{tec.mx}', 'https://tec.mx')
on conflict (id) do nothing;

insert into public.campuses (id, university_id, slug, name, city, state, is_active, is_default) values
  ('00000000-0000-4000-a100-000000000001', '00000000-0000-4000-a000-000000000001', 'santa-fe', 'Santa Fe', 'Ciudad de México', 'CDMX', true, true),
  ('00000000-0000-4000-a100-000000000002', '00000000-0000-4000-a000-000000000001', 'monterrey', 'Monterrey', 'Monterrey', 'Nuevo León', false, false),
  ('00000000-0000-4000-a100-000000000003', '00000000-0000-4000-a000-000000000001', 'ciudad-de-mexico', 'Ciudad de México', 'Ciudad de México', 'CDMX', false, false),
  ('00000000-0000-4000-a100-000000000004', '00000000-0000-4000-a000-000000000001', 'estado-de-mexico', 'Estado de México', 'Atizapán de Zaragoza', 'Estado de México', false, false),
  ('00000000-0000-4000-a100-000000000005', '00000000-0000-4000-a000-000000000001', 'guadalajara', 'Guadalajara', 'Zapopan', 'Jalisco', false, false),
  ('00000000-0000-4000-a100-000000000006', '00000000-0000-4000-a000-000000000001', 'puebla', 'Puebla', 'Puebla', 'Puebla', false, false)
on conflict (id) do nothing;

insert into public.departments (id, university_id, slug, name, name_en) values
  ('00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a000-000000000001', 'ingenieria-y-ciencias', 'Escuela de Ingeniería y Ciencias', 'School of Engineering and Sciences'),
  ('00000000-0000-4000-a200-000000000002', '00000000-0000-4000-a000-000000000001', 'negocios', 'Escuela de Negocios', 'Business School'),
  ('00000000-0000-4000-a200-000000000003', '00000000-0000-4000-a000-000000000001', 'humanidades-y-educacion', 'Escuela de Humanidades y Educación', 'School of Humanities and Education'),
  ('00000000-0000-4000-a200-000000000004', '00000000-0000-4000-a000-000000000001', 'arquitectura-arte-y-diseno', 'Escuela de Arquitectura, Arte y Diseño', 'School of Architecture, Art and Design'),
  ('00000000-0000-4000-a200-000000000005', '00000000-0000-4000-a000-000000000001', 'ciencias-sociales-y-gobierno', 'Escuela de Ciencias Sociales y Gobierno', 'School of Social Sciences and Government')
on conflict (id) do nothing;

insert into public.academic_terms (id, university_id, year, season, label, starts_on, ends_on) values
  ('00000000-0000-4000-a300-000000000001', '00000000-0000-4000-a000-000000000001', 2025, 'spring', 'Febrero–Junio 2025', '2025-02-03', '2025-06-13'),
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-a000-000000000001', 2025, 'fall', 'Agosto–Diciembre 2025', '2025-08-11', '2025-12-05'),
  ('00000000-0000-4000-a300-000000000003', '00000000-0000-4000-a000-000000000001', 2026, 'spring', 'Febrero–Junio 2026', '2026-02-02', '2026-06-12'),
  ('00000000-0000-4000-a300-000000000004', '00000000-0000-4000-a000-000000000001', 2026, 'summer', 'Verano 2026', '2026-06-22', '2026-07-31'),
  ('00000000-0000-4000-a300-000000000005', '00000000-0000-4000-a000-000000000001', 2026, 'fall', 'Agosto–Diciembre 2026', '2026-08-10', '2026-12-04')
on conflict (id) do nothing;

insert into public.university_email_domains (university_id, domain)
values ('00000000-0000-4000-a000-000000000001', 'tec.mx')
on conflict (domain) do nothing;

-- ---------------------------------------------------------------------------
-- FICTIONAL courses (codes prefixed DEMO-, no official prerequisites claimed)
-- ---------------------------------------------------------------------------
insert into public.courses (id, university_id, department_id, code, slug, name, name_language, description, credits, recommended_knowledge, is_fictional) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-MA101', 'demo-ma101', 'Cálculo I', 'es', 'Curso ficticio de demostración: límites, derivadas y sus aplicaciones.', 8, 'Álgebra y trigonometría de preparatoria.', true),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-FI101', 'demo-fi101', 'Física I', 'es', 'Curso ficticio de demostración: cinemática, dinámica y energía.', 8, 'Derivadas básicas y vectores.', true),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-MA201', 'demo-ma201', 'Probabilidad y Estadística', 'es', 'Curso ficticio de demostración: probabilidad, distribuciones e inferencia.', 8, null, true),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-TC101', 'demo-tc101', 'Fundamentos de Programación', 'es', 'Curso ficticio de demostración: lógica de programación con Python.', 8, 'No se requiere experiencia previa.', true),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-TC201', 'demo-tc201', 'Estructuras de Datos', 'es', 'Curso ficticio de demostración: listas, árboles, grafos y análisis de complejidad.', 8, 'Programación orientada a objetos.', true),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', 'DEMO-MA202', 'demo-ma202', 'Álgebra Lineal', 'es', 'Curso ficticio de demostración: matrices, espacios vectoriales y transformaciones.', 8, null, true),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000002', 'DEMO-EC101', 'demo-ec101', 'Microeconomía', 'es', 'Curso ficticio de demostración: oferta, demanda y teoría del consumidor.', 8, null, true),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000002', 'DEMO-CF101', 'demo-cf101', 'Contabilidad Financiera', 'es', 'Curso ficticio de demostración: estados financieros y registro contable.', 8, null, true),
  ('00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000003', 'DEMO-HU101', 'demo-hu101', 'Ética, Persona y Sociedad', 'es', 'Curso ficticio de demostración: dilemas éticos contemporáneos.', 6, null, true),
  ('00000000-0000-4000-c000-000000000010', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000004', 'DEMO-DI101', 'demo-di101', 'Design Thinking', 'en', 'Fictional demo course: human-centred design methods and prototyping.', 6, null, true)
on conflict (id) do nothing;

-- Verified prerequisite example between two DEMO courses. The source URL
-- points to the fictional nature of the record on purpose.
insert into public.course_prerequisites (course_id, prerequisite_course_id, is_verified, source_url) values
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-c000-000000000004', true, null)
on conflict do nothing;
insert into public.course_prerequisites (course_id, description, is_verified) values
  ('00000000-0000-4000-c000-000000000002', 'Estudiantes reportan que conviene haber cursado Cálculo I antes (no verificado).', false)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- FICTIONAL professors (surnames are Spanish words for "fictional", "example"…)
-- ---------------------------------------------------------------------------
insert into public.professors (id, university_id, department_id, primary_campus_id, slug, first_name, last_name, honorific, is_fictional) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'mariana-ficticia', 'Mariana', 'Ficticia', 'Dra.', true),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'julian-ejemplo', 'Julián', 'Ejemplo', 'Mtro.', true),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'sofia-prueba', 'Sofía', 'Prueba', 'Dra.', true),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'diego-muestra', 'Diego', 'Muestra', 'Dr.', true),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'valeria-demo', 'Valeria', 'Demo', 'Ing.', true),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001', '00000000-0000-4000-a100-000000000001', 'andres-simulado', 'Andrés', 'Simulado', 'Dr.', true),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000002', '00000000-0000-4000-a100-000000000001', 'lucia-modelo', 'Lucía', 'Modelo', 'Mtra.', true),
  ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000002', '00000000-0000-4000-a100-000000000001', 'tomas-ensayo', 'Tomás', 'Ensayo', 'C.P.', true),
  ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000003', '00000000-0000-4000-a100-000000000001', 'renata-borrador', 'Renata', 'Borrador', 'Dra.', true),
  ('00000000-0000-4000-b000-000000000010', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000004', '00000000-0000-4000-a100-000000000001', 'emilio-plantilla', 'Emilio', 'Plantilla', 'Mtro.', true)
on conflict (id) do nothing;

-- Assignments (professor ↔ course), all at Santa Fe.
insert into public.professor_courses (professor_id, course_id, campus_id)
select ('00000000-0000-4000-b000-0000000000' || lpad(p::text, 2, '0'))::uuid,
       ('00000000-0000-4000-c000-0000000000' || lpad(c::text, 2, '0'))::uuid,
       '00000000-0000-4000-a100-000000000001'::uuid
from (values
  (1, 1), (1, 2), (1, 3),          -- Mariana Ficticia: Cálculo I, Física I, Estadística
  (2, 1), (2, 6),                  -- Julián Ejemplo: Cálculo I, Álgebra Lineal
  (3, 1), (3, 3),                  -- Sofía Prueba: Cálculo I, Estadística
  (4, 2), (4, 6),                  -- Diego Muestra: Física I, Álgebra Lineal
  (5, 4), (5, 5),                  -- Valeria Demo: Programación, Estructuras de Datos
  (6, 4), (6, 5), (6, 3),          -- Andrés Simulado: Programación, Estructuras, Estadística
  (7, 7), (7, 8),                  -- Lucía Modelo: Micro, Contabilidad
  (8, 8), (8, 7),                  -- Tomás Ensayo: Contabilidad, Micro
  (9, 9),                          -- Renata Borrador: Ética
  (10, 10), (10, 9)                -- Emilio Plantilla: Design Thinking, Ética
) as a(p, c)
on conflict (professor_id, course_id) do nothing;

-- ---------------------------------------------------------------------------
-- FICTIONAL demo accounts (cannot sign in: no password is set)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at)
select ('00000000-0000-4000-d000-0000000000' || lpad(i::text, 2, '0'))::uuid,
       'demo-student-' || i || '@example.com',
       now() - interval '200 days',
       jsonb_build_object('display_name', 'Demo ' || i),
       now() - interval '200 days'
from generate_series(1, 24) as g(i)
on conflict (id) do nothing;

-- Pretend a third of the demo accounts confirmed a university email (demo only).
update public.profiles set has_university_email = true, university_id = '00000000-0000-4000-a000-000000000001'
where id in (select ('00000000-0000-4000-d000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 24, 3) g(i));
update public.profiles set created_at = now() - interval '200 days'
where id::text like '00000000-0000-4000-d000-%';

-- ---------------------------------------------------------------------------
-- FICTIONAL reviews, generated deterministically
-- ---------------------------------------------------------------------------
do $$
declare
  v_quality numeric[] := array[4.6, 3.6, 4.3, 2.6, 4.7, 3.9, 4.1, 3.0, 4.4, 4.8]; -- per professor
  v_difficulty numeric[] := array[3.4, 4.5, 2.9, 3.8, 3.1, 4.2, 2.6, 3.3, 3.6, 2.4, 2.0]; -- per course (11th unused)
  v_bodies_good text[] := array[
    'Explica con mucha claridad y siempre conecta los temas con ejemplos reales. Las clases se pasan rápido y se nota que prepara cada sesión.',
    'Muy buena disposición para resolver dudas en asesorías. Los exámenes son exigentes pero justos y acordes con lo que se vio en clase.',
    'De los mejores profesores que he tenido. Da retroalimentación detallada en las tareas y respeta mucho a los estudiantes.',
    'Clases dinámicas con ejercicios en equipo. Hay que estudiar constantemente, pero aprendes muchísimo y vale la pena.'
  ];
  v_bodies_mid text[] := array[
    'Domina el tema, aunque a veces avanza demasiado rápido. Recomiendo leer antes de clase para no perderse.',
    'Las clases son algo monótonas, pero el material del curso está bien organizado y las rúbricas son claras.',
    'Es buena persona y responde correos, pero la calificación de proyectos se siente un poco subjetiva.'
  ];
  v_bodies_bad text[] := array[
    'Las explicaciones son confusas y los exámenes incluyen temas que no se cubrieron en clase. Hay que apoyarse mucho en videos externos.',
    'Poca organización: las fechas de entrega cambiaban seguido y la retroalimentación llegaba tarde.'
  ];
  v_advice text[] := array[
    'Haz todos los ejercicios de práctica, son muy parecidos a los del examen.',
    'Ve a asesorías desde la primera semana, no esperes al parcial.',
    'Forma un buen equipo desde el inicio; el proyecto final pesa bastante.',
    'Repasa álgebra antes de empezar el semestre.',
    null
  ];
  v_tag_pool text[] := array[
    'clear_explanations', 'real_world_examples', 'helpful_feedback', 'available_outside_class',
    'project_based', 'participation_matters', 'exam_heavy', 'lots_of_homework', 'group_work',
    'inspiring', 'tough_grader', 'fast_paced', 'disorganized', 'slides_heavy', 'flexible_deadlines'
  ];
  v_terms uuid[] := array[
    '00000000-0000-4000-a300-000000000001'::uuid, '00000000-0000-4000-a300-000000000002'::uuid,
    '00000000-0000-4000-a300-000000000003'::uuid, '00000000-0000-4000-a300-000000000004'::uuid
  ];
  v_pc record;
  v_user int;
  v_n int;
  v_q numeric;
  v_d numeric;
  v_id uuid;
  v_overall numeric;
  v_body text;
  v_tags text[];
  i int;
  k int := 0;
begin
  perform setseed(0.2026);
  for v_pc in
    select pc.id, pc.professor_id, pc.course_id,
           right(pc.professor_id::text, 2)::int as p_idx,
           right(pc.course_id::text, 2)::int as c_idx
    from public.professor_courses pc
    where pc.professor_id::text like '00000000-0000-4000-b000-%'
    order by pc.professor_id, pc.course_id
  loop
    v_n := 3 + floor(random() * 7)::int; -- 3..9 reviews per combination
    for i in 1..v_n loop
      k := k + 1;
      v_user := 1 + ((k * 7 + i) % 24);
      -- Course context shifts the professor's perceived quality a bit.
      v_q := v_quality[v_pc.p_idx] - (v_difficulty[v_pc.c_idx] - 3) * 0.25;
      v_d := v_difficulty[v_pc.c_idx];
      v_overall := least(5, greatest(1, v_q + (random() - 0.5) * 1.6));

      v_body := case
        when v_overall >= 3.8 then v_bodies_good[1 + floor(random() * array_length(v_bodies_good, 1))::int]
        when v_overall >= 2.8 then v_bodies_mid[1 + floor(random() * array_length(v_bodies_mid, 1))::int]
        else v_bodies_bad[1 + floor(random() * array_length(v_bodies_bad, 1))::int]
      end;
      v_tags := array(
        select t from unnest(v_tag_pool) t
        where random() < case
          when t in ('clear_explanations', 'helpful_feedback', 'inspiring', 'real_world_examples', 'available_outside_class') then (v_overall - 1) / 8
          when t in ('disorganized', 'tough_grader') then (5 - v_overall) / 8
          else 0.12 end
        limit 4
      );

      begin
        insert into public.reviews (
          user_id, professor_course_id, professor_id, course_id, university_id, campus_id, term_id,
          teaching_format, would_take_again, recommends_course, weekly_hours, exam_count, exam_difficulty,
          homework_frequency, teamwork_level, requires_programming, requires_math, prior_knowledge_needed,
          attendance_policy, tags, body, advice, created_at
        ) values (
          ('00000000-0000-4000-d000-0000000000' || lpad(v_user::text, 2, '0'))::uuid,
          v_pc.id, v_pc.professor_id, v_pc.course_id,
          '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a100-000000000001',
          v_terms[1 + (i % 4)],
          (array['in_person', 'in_person', 'in_person', 'hybrid', 'online'])[1 + floor(random() * 5)::int]::public.teaching_format,
          v_overall + (random() - 0.5) * 1.4 >= 3.5,
          v_overall + (3 - v_d) * 0.4 + (random() - 0.5) * 1.2 >= 3.3,
          least(20, greatest(1, round(v_d * 2.2 + (random() - 0.5) * 4)))::smallint,
          (2 + floor(random() * 3))::smallint,
          least(5, greatest(1, round(v_d + (random() - 0.5))))::smallint,
          (array['occasional', 'weekly', 'weekly', 'several_per_week'])[1 + floor(random() * 4)::int]::public.homework_frequency,
          (array['none', 'some', 'some', 'frequent'])[1 + floor(random() * 4)::int]::public.teamwork_level,
          v_pc.c_idx in (4, 5),
          v_pc.c_idx in (1, 2, 3, 6),
          v_pc.c_idx in (2, 5, 6),
          (array['mandatory', 'counts_toward_grade', 'optional'])[1 + floor(random() * 3)::int]::public.attendance_policy,
          v_tags,
          v_body,
          v_advice[1 + floor(random() * array_length(v_advice, 1))::int],
          now() - make_interval(days => floor(random() * 120)::int, hours => floor(random() * 24)::int)
        ) returning id into v_id;

        insert into public.professor_review_scores (review_id, clarity, attitude, grading_fairness, availability, organization, engagement)
        values (
          v_id,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(v_overall + 0.2 + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(v_overall - 0.1 + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.4)))::smallint,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.4)))::smallint
        );
        insert into public.course_review_scores (review_id, difficulty, workload, content_clarity, usefulness, organization, satisfaction)
        values (
          v_id,
          least(5, greatest(1, round(v_d + (random() - 0.5) * 1.4)))::smallint,
          least(5, greatest(1, round(v_d - 0.2 + (random() - 0.5) * 1.4)))::smallint,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(3.8 + (random() - 0.5) * 1.6)))::smallint,
          least(5, greatest(1, round(v_overall + (random() - 0.5) * 1.2)))::smallint,
          least(5, greatest(1, round(v_overall - (v_d - 3) * 0.2 + (random() - 0.5) * 1.2)))::smallint
        );
      exception when unique_violation then
        null; -- same demo user/combination/term drawn twice; skip
      end;
    end loop;
  end loop;
end;
$$;

-- A handful of helpful votes so "most helpful" sorting has data.
insert into public.review_votes (review_id, user_id, value)
select r.id, ('00000000-0000-4000-d000-0000000000' || lpad(u::text, 2, '0'))::uuid, case when random() < 0.85 then 1 else -1 end
from (select id, user_id from public.reviews order by created_at desc limit 40) r,
     generate_series(1, 6) u
where ('00000000-0000-4000-d000-0000000000' || lpad(u::text, 2, '0'))::uuid <> r.user_id
  and random() < 0.4
on conflict do nothing;

-- Demo degree program with an unofficial curriculum, so the academic profile
-- form has something to pick. Unofficial curricula never produce
-- recommendations, so "My next semester" shows its empty state.
insert into public.degree_programs (id, university_id, department_id, slug, code, name, name_en, is_fictional) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a200-000000000001',
   'demo-ingenieria', 'DEMO-ING', 'Ingeniería (programa demo)', 'Engineering (demo program)', true)
on conflict (id) do nothing;
insert into public.program_campuses (program_id, campus_id)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a100-000000000001')
on conflict do nothing;
insert into public.curricula (id, program_id, version_label, total_semesters, is_official) values
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-e000-000000000001', 'Demo 2026', 8, false)
on conflict (id) do nothing;
insert into public.curriculum_courses (curriculum_id, course_id, semester) values
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000001', 1),
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000004', 1),
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000002', 2),
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000006', 2),
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000005', 3),
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-c000-000000000003', 3)
on conflict do nothing;

-- Demo self-reported grades (0-100) for the demo reviews, loosely tied to the
-- reported difficulty, so grade averages have something to show.
insert into public.reported_grades (review_id, grade)
select r.id,
       greatest(60, least(100, 100 - cs.difficulty * 4 - (abs(hashtext(r.id::text)) % 16)))
from public.reviews r
join public.course_review_scores cs on cs.review_id = r.id
where r.user_id::text like '00000000-0000-4000-d000-%'
  and abs(hashtext(r.id::text || 'g')) % 10 < 8
on conflict (review_id) do nothing;

-- Starter moderation vocabulary. Admins should extend this list.
insert into public.blocked_terms (term, severity) values
  ('te voy a matar', 'block'),
  ('i will kill you', 'block'),
  ('idiota', 'flag'),
  ('estupido', 'flag'),
  ('pendejo', 'flag'),
  ('stupid', 'flag'),
  ('idiot', 'flag')
on conflict (term) do nothing;

commit;
