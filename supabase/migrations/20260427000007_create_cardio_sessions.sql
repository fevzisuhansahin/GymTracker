create table cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  machine_type text not null check (machine_type in (
    'treadmill','bike','elliptical','rowing','stairmaster','outdoor_run','other'
  )),
  duration_seconds int not null check (duration_seconds > 0),
  distance_km numeric(5,2) check (distance_km is null or distance_km >= 0),
  avg_speed numeric(4,1) check (avg_speed is null or avg_speed >= 0),
  incline_percent numeric(4,1) check (incline_percent is null or (incline_percent >= -30 and incline_percent <= 30)),
  resistance_level int check (resistance_level is null or (resistance_level >= 0 and resistance_level <= 100)),
  calories int check (calories is null or calories >= 0),
  avg_heart_rate int check (avg_heart_rate is null or (avg_heart_rate > 0 and avg_heart_rate < 300)),
  notes text,
  order_index int not null,
  unique (workout_id, order_index)
);

create index cardio_sessions_workout_id_idx on cardio_sessions (workout_id);
