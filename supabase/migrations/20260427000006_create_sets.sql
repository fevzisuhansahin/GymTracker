create table sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number int not null check (set_number > 0),
  weight numeric(6,2) not null check (weight > 0 and weight < 1000),
  reps int not null check (reps > 0 and reps < 1000),
  rpe numeric(2,1) check (rpe is null or (rpe >= 1.0 and rpe <= 10.0)),
  is_warmup boolean not null default false,
  notes text,
  unique (workout_exercise_id, set_number)
);

create index sets_workout_exercise_idx on sets (workout_exercise_id);
