-- =========================================================
-- handle_new_user: auth.users insert sonrası otomatik profile satırı oluşturur.
-- Geçici username: 'user_' + id'nin ilk 8 karakteri (UUID benzersiz, çakışma riski yok).
-- Onboarding'de kullanıcı kalıcı username'i seçer ve profiles.username UPDATE edilir.
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_local text := split_part(coalesce(new.email, ''), '@', 1);
  fallback_display text := case
    when length(email_local) > 0 then email_local
    else 'New User'
  end;
begin
  insert into public.profiles (id, username, display_name, onboarding_completed)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    fallback_display,
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- updated_at otomasyonu: profiles için
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- Epley formülü: estimated 1RM = w * (1 + r/30)
-- 1 tekrar için weight'i kendisi döner. Reps 0 veya null ise null döner.
-- =========================================================
create or replace function public.estimate_1rm(weight numeric, reps int)
returns numeric
language sql
immutable
as $$
  select case
    when weight is null or reps is null or reps <= 0 then null
    when reps = 1 then weight
    else round((weight * (1 + reps::numeric / 30.0))::numeric, 2)
  end;
$$;

-- =========================================================
-- PR detection: yeni set insert/update edildiğinde estimated 1RM hesaplanır.
-- Eğer (user, exercise, '1rm') için mevcut en yüksek değerden büyükse insert edilir.
-- Warmup set'ler atlanır.
-- Şimdilik sadece '1rm' record_type. Volume / reps_at_weight Phase 2.
-- Assisted hareket filter'ı da Phase 2 (CLAUDE.md §4.4 bilinen sınırlama).
-- =========================================================
create or replace function public.detect_pr_on_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_exercise_id uuid;
  v_workout_id uuid;
  v_workout_date date;
  v_estimate numeric;
  v_existing_max numeric;
begin
  if new.is_warmup then
    return new;
  end if;

  v_estimate := public.estimate_1rm(new.weight, new.reps);
  if v_estimate is null then
    return new;
  end if;

  select w.user_id, we.exercise_id, w.id, w.date
    into v_user_id, v_exercise_id, v_workout_id, v_workout_date
  from public.workout_exercises we
  join public.workouts w on w.id = we.workout_id
  where we.id = new.workout_exercise_id;

  if v_user_id is null then
    return new;
  end if;

  select max(value)
    into v_existing_max
  from public.personal_records
  where user_id = v_user_id
    and exercise_id = v_exercise_id
    and record_type = '1rm';

  if v_existing_max is null or v_estimate > v_existing_max then
    insert into public.personal_records (
      user_id, exercise_id, record_type, value, achieved_at, workout_id
    ) values (
      v_user_id, v_exercise_id, '1rm', v_estimate, v_workout_date, v_workout_id
    );
  end if;

  return new;
end;
$$;

create trigger sets_detect_pr_after_insert
  after insert on public.sets
  for each row execute function public.detect_pr_on_set();

create trigger sets_detect_pr_after_update
  after update of weight, reps, is_warmup on public.sets
  for each row execute function public.detect_pr_on_set();
