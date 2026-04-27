create table personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  record_type text not null check (record_type in ('1rm','volume','reps_at_weight')),
  value numeric not null,
  achieved_at date not null,
  workout_id uuid references workouts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index personal_records_user_idx on personal_records (user_id, exercise_id, record_type);
create index personal_records_achieved_at_idx on personal_records (user_id, achieved_at desc);
