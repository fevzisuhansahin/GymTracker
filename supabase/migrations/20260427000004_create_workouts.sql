create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  split_day_id uuid references split_days(id) on delete set null,
  body_weight numeric(5,2) check (body_weight is null or (body_weight > 0 and body_weight < 500)),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index workouts_user_date_idx on workouts (user_id, date desc);
create index workouts_split_day_idx on workouts (split_day_id) where split_day_id is not null;
