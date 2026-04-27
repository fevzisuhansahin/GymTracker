-- =========================================================
-- Atomik çoklu-statement işlemler için RPC fonksiyonları.
-- Hepsi SECURITY INVOKER: RLS politikaları çağıran kullanıcı
-- adına devreye girer (defense in depth: app-layer ownership
-- check + DB-layer RLS).
-- =========================================================

-- ---------------------------------------------------------
-- create_split_with_days
-- splits + split_days bulk insert tek transaction.
-- p_days: jsonb array of { name: text, order_index: int, target_muscle_groups: text[] }
-- Returns: yeni split id.
-- ---------------------------------------------------------
create or replace function public.create_split_with_days(
  p_name text,
  p_description text,
  p_days jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_split_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.splits (user_id, name, description, is_template, is_active)
  values (v_user_id, p_name, p_description, false, false)
  returning id into v_split_id;

  insert into public.split_days (split_id, name, order_index, target_muscle_groups)
  select
    v_split_id,
    (d->>'name')::text,
    (d->>'order_index')::int,
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(d->'target_muscle_groups') as value),
      '{}'::text[]
    )
  from jsonb_array_elements(p_days) as d;

  return v_split_id;
end;
$$;

-- ---------------------------------------------------------
-- copy_template_split
-- Sistem şablonunu (user_id is null, is_template=true) deep-copy
-- olarak kullanıcıya kopyalar. Yeni kopya is_template=false,
-- is_active=false olarak gelir; kullanıcı düzenleyip aktif yapabilir.
-- Returns: yeni split id.
-- ---------------------------------------------------------
create or replace function public.copy_template_split(
  p_template_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_template_name text;
  v_template_desc text;
  v_new_split_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select name, description
    into v_template_name, v_template_desc
  from public.splits
  where id = p_template_id
    and is_template = true
    and user_id is null;

  if v_template_name is null then
    raise exception 'template_not_found';
  end if;

  insert into public.splits (user_id, name, description, is_template, is_active)
  values (v_user_id, v_template_name, v_template_desc, false, false)
  returning id into v_new_split_id;

  insert into public.split_days (split_id, name, order_index, target_muscle_groups)
  select v_new_split_id, name, order_index, target_muscle_groups
  from public.split_days
  where split_id = p_template_id;

  return v_new_split_id;
end;
$$;

-- ---------------------------------------------------------
-- finish_workout
-- Atomik bitirme: 0-set workout_exercises sil + workouts.finished_at,
-- notes, duration_seconds set et.
-- Ownership check: workout sahibi auth.uid() değilse exception.
-- Returns: güncellenmiş workout id.
-- ---------------------------------------------------------
create or replace function public.finish_workout(
  p_workout_id uuid,
  p_notes text,
  p_duration_seconds int
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select user_id into v_owner
  from public.workouts
  where id = p_workout_id;

  if v_owner is null then
    raise exception 'workout_not_found';
  end if;
  if v_owner <> v_user_id then
    raise exception 'forbidden';
  end if;

  delete from public.workout_exercises we
  where we.workout_id = p_workout_id
    and not exists (
      select 1 from public.sets s where s.workout_exercise_id = we.id
    );

  update public.workouts
  set finished_at = now(),
      notes = p_notes,
      duration_seconds = p_duration_seconds
  where id = p_workout_id;

  return p_workout_id;
end;
$$;

-- 20260427000012_grants.sql tüm fonksiyonlara execute hakkı veriyor;
-- bu yeni fonksiyonlar da otomatik olarak authenticated/anon/service_role
-- rollerine erişebilir. Yine de explicit grant bırakıyoruz (anon hariç,
-- bu fonksiyonlar her zaman auth gerektirir).
grant execute on function public.create_split_with_days(text, text, jsonb) to authenticated;
grant execute on function public.copy_template_split(uuid) to authenticated;
grant execute on function public.finish_workout(uuid, text, int) to authenticated;
