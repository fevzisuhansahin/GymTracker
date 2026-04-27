-- Tüm tablolarda RLS aktifleştirilir. Default deny: policy yoksa hiçbir satır görünmez/yazılamaz.

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table splits enable row level security;
alter table split_days enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table sets enable row level security;
alter table cardio_sessions enable row level security;
alter table personal_records enable row level security;

-- =========================================================
-- profiles
-- =========================================================
create policy "profiles_select_public_or_self"
  on profiles for select
  using (is_public = true or auth.uid() = id);

create policy "profiles_insert_self"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_self"
  on profiles for delete
  using (auth.uid() = id);

-- =========================================================
-- exercises
-- =========================================================
create policy "exercises_select_system_or_own"
  on exercises for select
  using (is_custom = false or created_by = auth.uid());

create policy "exercises_insert_own_custom"
  on exercises for insert
  with check (auth.uid() = created_by and is_custom = true);

create policy "exercises_update_own_custom"
  on exercises for update
  using (created_by = auth.uid() and is_custom = true)
  with check (created_by = auth.uid() and is_custom = true);

create policy "exercises_delete_own_custom"
  on exercises for delete
  using (created_by = auth.uid() and is_custom = true);

-- =========================================================
-- splits
-- =========================================================
create policy "splits_select_template_or_own"
  on splits for select
  using (user_id is null or user_id = auth.uid());

create policy "splits_insert_own"
  on splits for insert
  with check (auth.uid() = user_id);

create policy "splits_update_own"
  on splits for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "splits_delete_own"
  on splits for delete
  using (user_id = auth.uid());

-- =========================================================
-- split_days (parent split üzerinden enforce)
-- =========================================================
create policy "split_days_select_via_parent"
  on split_days for select
  using (
    exists (
      select 1 from splits s
      where s.id = split_days.split_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy "split_days_insert_via_parent"
  on split_days for insert
  with check (
    exists (
      select 1 from splits s
      where s.id = split_days.split_id
        and s.user_id = auth.uid()
    )
  );

create policy "split_days_update_via_parent"
  on split_days for update
  using (
    exists (
      select 1 from splits s
      where s.id = split_days.split_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from splits s
      where s.id = split_days.split_id
        and s.user_id = auth.uid()
    )
  );

create policy "split_days_delete_via_parent"
  on split_days for delete
  using (
    exists (
      select 1 from splits s
      where s.id = split_days.split_id
        and s.user_id = auth.uid()
    )
  );

-- =========================================================
-- workouts (public profil ise herkes okuyabilir)
-- =========================================================
create policy "workouts_select_self_or_public_owner"
  on workouts for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = workouts.user_id
        and p.is_public = true
    )
  );

create policy "workouts_insert_self"
  on workouts for insert
  with check (auth.uid() = user_id);

create policy "workouts_update_self"
  on workouts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "workouts_delete_self"
  on workouts for delete
  using (user_id = auth.uid());

-- =========================================================
-- workout_exercises (parent workout enforcement)
-- =========================================================
create policy "workout_exercises_select_via_parent"
  on workout_exercises for select
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and (
          w.user_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = w.user_id and p.is_public = true
          )
        )
    )
  );

create policy "workout_exercises_insert_via_parent"
  on workout_exercises for insert
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "workout_exercises_update_via_parent"
  on workout_exercises for update
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "workout_exercises_delete_via_parent"
  on workout_exercises for delete
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

-- =========================================================
-- sets (workout_exercises üzerinden 2 hop ile parent workout'a ulaş)
-- =========================================================
create policy "sets_select_via_parent"
  on sets for select
  using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and (
          w.user_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = w.user_id and p.is_public = true
          )
        )
    )
  );

create policy "sets_insert_via_parent"
  on sets for insert
  with check (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  );

create policy "sets_update_via_parent"
  on sets for update
  using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  );

create policy "sets_delete_via_parent"
  on sets for delete
  using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  );

-- =========================================================
-- cardio_sessions (parent workout enforcement)
-- =========================================================
create policy "cardio_sessions_select_via_parent"
  on cardio_sessions for select
  using (
    exists (
      select 1 from workouts w
      where w.id = cardio_sessions.workout_id
        and (
          w.user_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = w.user_id and p.is_public = true
          )
        )
    )
  );

create policy "cardio_sessions_insert_via_parent"
  on cardio_sessions for insert
  with check (
    exists (
      select 1 from workouts w
      where w.id = cardio_sessions.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "cardio_sessions_update_via_parent"
  on cardio_sessions for update
  using (
    exists (
      select 1 from workouts w
      where w.id = cardio_sessions.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = cardio_sessions.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "cardio_sessions_delete_via_parent"
  on cardio_sessions for delete
  using (
    exists (
      select 1 from workouts w
      where w.id = cardio_sessions.workout_id
        and w.user_id = auth.uid()
    )
  );

-- =========================================================
-- personal_records (sadece select policy: insert trigger üzerinden olur)
-- =========================================================
create policy "personal_records_select_self_or_public_owner"
  on personal_records for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = personal_records.user_id
        and p.is_public = true
    )
  );

-- Kullanıcı kendi PR'ını silebilir (yanlış girdiği bir set sonrası temizlemek için).
create policy "personal_records_delete_self"
  on personal_records for delete
  using (user_id = auth.uid());
