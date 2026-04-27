create table splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_template boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index splits_user_id_idx on splits (user_id);
create index splits_template_idx on splits (is_template) where is_template = true;

create unique index splits_one_active_per_user
  on splits (user_id)
  where is_active = true and user_id is not null;

create table split_days (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  name text not null,
  order_index int not null,
  target_muscle_groups text[] not null default '{}',
  unique (split_id, order_index)
);

create index split_days_split_id_idx on split_days (split_id);
