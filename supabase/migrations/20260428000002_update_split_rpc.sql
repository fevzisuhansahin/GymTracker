-- =========================================================
-- update_split_with_days
-- Atomik split update: header (name, description) + days diff (rename,
-- add, remove, reorder) tek transaction'da.
--
-- p_days: jsonb array of {
--   id: uuid | null,                  -- null = yeni gün
--   name: text,
--   target_muscle_groups: text[]
-- }
-- order_index implicit: array sırası 1-based.
--
-- toDelete = mevcut split_days.id - incoming d.id    → DELETE
--   (workouts.split_day_id ON DELETE SET NULL ile geçmiş antrenmanlar
--    `split_day_id=null` olur; UI tarafı dry-run ile kullanıcıyı uyarmalı.)
-- toUpdate = id'si verilen incoming                  → UPDATE
-- toInsert = id'si null verilen incoming             → INSERT
--
-- Reorder unique constraint çakışmasını önlemek için tüm mevcut
-- order_index değerleri önce +10000 shift ediliyor (geçici çakışmasız
-- alan), sonra final değerler atanıyor.
-- =========================================================
create or replace function public.update_split_with_days(
  p_split_id uuid,
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

  -- Header update
  update public.splits
  set name = p_name, description = p_description
  where id = p_split_id;

  -- Incoming day ids (mevcut günlerden korunacaklar)
  select coalesce(array_agg((d->>'id')::uuid), '{}')
    into v_incoming_ids
  from jsonb_array_elements(p_days) as d
  where d->>'id' is not null and d->>'id' <> '';

  -- toDelete: mevcut ama incoming'de olmayan
  delete from public.split_days
  where split_id = p_split_id
    and id <> all(v_incoming_ids);

  -- Shift remaining order_index'leri uniqueness çakışması yaşamadan
  -- yeniden atayabilmek için geçici aralığa al.
  update public.split_days
  set order_index = order_index + 10000
  where split_id = p_split_id;

  -- Iterate incoming order ile upsert
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

grant execute on function public.update_split_with_days(uuid, text, text, jsonb) to authenticated;
