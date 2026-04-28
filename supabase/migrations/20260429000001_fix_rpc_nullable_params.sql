-- Supabase type generator was emitting `string` (non-null) for p_description
-- and p_notes because the original function signatures lacked DEFAULT NULL.
-- Adding DEFAULT NULL makes the generator emit `string | null`, matching the
-- TypeScript callers in lib/db/rpc.ts.
--
-- Function bodies are unchanged; only the parameter declarations differ.

create or replace function public.create_split_with_days(
  p_name text,
  p_description text DEFAULT NULL,
  p_days jsonb DEFAULT '[]'::jsonb
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

create or replace function public.update_split_with_days(
  p_split_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_days jsonb DEFAULT '[]'::jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_incoming_ids uuid[];
  v_day jsonb;
  v_idx bigint;
  v_day_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select user_id into v_owner from public.splits where id = p_split_id;
  if v_owner is null then
    raise exception 'split_not_found';
  end if;
  if v_owner <> v_user_id then
    raise exception 'forbidden';
  end if;

  update public.splits
  set name = p_name, description = p_description
  where id = p_split_id;

  select coalesce(array_agg((d->>'id')::uuid), '{}')
    into v_incoming_ids
  from jsonb_array_elements(p_days) as d
  where d->>'id' is not null and d->>'id' <> '';

  delete from public.split_days
  where split_id = p_split_id
    and id <> all(v_incoming_ids);

  update public.split_days
  set order_index = order_index + 10000
  where split_id = p_split_id;

  for v_day, v_idx in
    select value, ordinality
    from jsonb_array_elements(p_days) with ordinality
  loop
    v_day_id := nullif(v_day->>'id', '')::uuid;
    if v_day_id is null then
      insert into public.split_days (split_id, name, order_index, target_muscle_groups)
      values (
        p_split_id,
        (v_day->>'name')::text,
        v_idx::int,
        coalesce(
          array(select jsonb_array_elements_text(v_day->'target_muscle_groups')),
          '{}'::text[]
        )
      );
    else
      update public.split_days
      set
        name = (v_day->>'name')::text,
        order_index = v_idx::int,
        target_muscle_groups = coalesce(
          array(select jsonb_array_elements_text(v_day->'target_muscle_groups')),
          '{}'::text[]
        )
      where id = v_day_id and split_id = p_split_id;
    end if;
  end loop;

  return p_split_id;
end;
$$;

create or replace function public.finish_workout(
  p_workout_id uuid,
  p_notes text DEFAULT NULL,
  p_duration_seconds int DEFAULT 0
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

grant execute on function public.create_split_with_days(text, text, jsonb) to authenticated;
grant execute on function public.update_split_with_days(uuid, text, text, jsonb) to authenticated;
grant execute on function public.finish_workout(uuid, text, int) to authenticated;
