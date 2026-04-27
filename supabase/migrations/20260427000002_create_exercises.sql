create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text check (equipment in (
    'barbell','dumbbell','cable','smith_machine','machine','bodyweight','other'
  )),
  is_custom boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (name, created_by)
);

create index exercises_primary_muscle_idx on exercises (primary_muscle);
create index exercises_is_custom_idx on exercises (is_custom) where is_custom = false;
create index exercises_created_by_idx on exercises (created_by) where created_by is not null;
