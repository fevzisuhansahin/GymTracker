create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  order_index int not null,
  notes text,
  unique (workout_id, order_index)
);

create index workout_exercises_workout_id_idx on workout_exercises (workout_id);
create index workout_exercises_exercise_id_idx on workout_exercises (exercise_id);
