create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  unit_preference text not null default 'kg' check (unit_preference in ('kg','lb')),
  language text not null default 'tr' check (language in ('tr','en')),
  is_public boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on profiles (username);
create index profiles_is_public_idx on profiles (is_public) where is_public = true;
