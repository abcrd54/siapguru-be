create extension if not exists "pgcrypto";

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role = 'owner'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles alter column role set default 'owner';
alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles add constraint admin_profiles_role_check check (role = 'owner');
create unique index if not exists admin_profiles_single_owner_idx on public.admin_profiles ((role));

create table if not exists public.provider_settings (
  id uuid primary key default gen_random_uuid(),
  openrouter_api_key text,
  openrouter_model text not null,
  cloudinary_cloud_name text not null,
  cloudinary_api_key text,
  cloudinary_api_secret text,
  updated_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  teacher_phone text,
  teacher_address text,
  school_name text not null,
  license_key text not null unique,
  license_type text not null default 'lifetime',
  license_role text not null default 'guru',
  plan text not null default 'default',
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  max_devices integer not null default 1,
  allow_offline_days integer not null default 3650,
  expired_at timestamptz null,
  minimum_app_version text not null default '1.0.0',
  force_update boolean not null default false,
  features jsonb not null default '{"reports": true, "grades": true, "modules": true, "questions": true, "ai_question_generation": true, "cloud_sync": true}'::jsonb,
  notes text,
  created_by text not null default 'owner_dashboard',
  firebase_sync_status text not null default 'pending',
  firebase_synced_at timestamptz null,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.licenses add column if not exists teacher_phone text;
alter table public.licenses add column if not exists teacher_address text;
alter table public.licenses add column if not exists license_type text not null default 'lifetime';
alter table public.licenses add column if not exists license_role text not null default 'guru';
alter table public.licenses add column if not exists plan text not null default 'default';
alter table public.licenses add column if not exists minimum_app_version text not null default '1.0.0';
alter table public.licenses add column if not exists force_update boolean not null default false;
alter table public.licenses add column if not exists features jsonb not null default '{"reports": true, "grades": true, "modules": true, "questions": true, "ai_question_generation": true, "cloud_sync": true}'::jsonb;
alter table public.licenses add column if not exists created_by text not null default 'owner_dashboard';
alter table public.licenses add column if not exists firebase_sync_status text not null default 'pending';
alter table public.licenses add column if not exists firebase_synced_at timestamptz null;
alter table public.licenses add column if not exists last_sync_error text;
alter table public.licenses alter column license_type set default 'lifetime';
alter table public.licenses alter column license_role set default 'guru';
alter table public.licenses alter column plan set default 'default';
alter table public.licenses alter column status set default 'active';
alter table public.licenses alter column allow_offline_days set default 3650;
alter table public.licenses alter column minimum_app_version set default '1.0.0';
alter table public.licenses alter column force_update set default false;
alter table public.licenses alter column features set default '{"reports": true, "grades": true, "modules": true, "questions": true, "ai_question_generation": true, "cloud_sync": true}'::jsonb;
alter table public.licenses alter column created_by set default 'owner_dashboard';
update public.licenses set license_type = 'lifetime' where license_type is null;
update public.licenses set license_role = 'guru' where license_role is null;
update public.licenses set plan = 'default' where plan is null;
update public.licenses set minimum_app_version = '1.0.0' where minimum_app_version is null;
update public.licenses set force_update = false where force_update is null;
update public.licenses set features = '{"reports": true, "grades": true, "modules": true, "questions": true, "ai_question_generation": true, "cloud_sync": true}'::jsonb where features is null;
update public.licenses set created_by = 'owner_dashboard' where created_by is null;

create table if not exists public.license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  device_id text not null,
  device_name text not null,
  app_version text,
  activated_at timestamptz not null default now(),
  last_check_at timestamptz not null default now(),
  unique (license_id, device_id)
);

create table if not exists public.firebase_sync_logs (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  provider text not null default 'firebase',
  status text not null,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  synced_at timestamptz not null default now()
);

create table if not exists public.question_generations (
  id uuid primary key default gen_random_uuid(),
  license_key text not null,
  module_id integer,
  module_title text,
  class_id integer,
  class_name text,
  subject_id integer,
  subject_name text,
  question_type text not null,
  question_count integer not null,
  choice_count integer,
  result_json jsonb not null,
  provider text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_generations add column if not exists license_key text not null;
alter table public.question_generations add column if not exists module_id integer;
alter table public.question_generations add column if not exists module_title text;
alter table public.question_generations add column if not exists class_id integer;
alter table public.question_generations add column if not exists class_name text;
alter table public.question_generations add column if not exists subject_id integer;
alter table public.question_generations add column if not exists subject_name text;
alter table public.question_generations add column if not exists question_type text not null default 'pilihan_ganda';
alter table public.question_generations add column if not exists question_count integer not null default 1;
alter table public.question_generations add column if not exists choice_count integer;
alter table public.question_generations add column if not exists result_json jsonb not null default '{}'::jsonb;
alter table public.question_generations add column if not exists provider text;
alter table public.question_generations add column if not exists model_name text;
alter table public.question_generations add column if not exists created_at timestamptz not null default now();
alter table public.question_generations add column if not exists updated_at timestamptz not null default now();

alter table public.admin_profiles enable row level security;
alter table public.provider_settings enable row level security;
alter table public.licenses enable row level security;
alter table public.license_devices enable row level security;
alter table public.firebase_sync_logs enable row level security;
alter table public.question_generations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_profiles'
      and policyname = 'admin can read own profile'
  ) then
    create policy "admin can read own profile"
    on public.admin_profiles for select
    to authenticated
    using (auth.uid() = id and role = 'owner' and is_active = true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'question_generations'
      and policyname = 'admin can manage question generations'
  ) then
    create policy "admin can manage question generations"
    on public.question_generations for all
    to authenticated
    using (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    )
    with check (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'provider_settings'
      and policyname = 'admin can manage provider settings'
  ) then
    create policy "admin can manage provider settings"
    on public.provider_settings for all
    to authenticated
    using (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    )
    with check (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'licenses'
      and policyname = 'admin can manage licenses'
  ) then
    create policy "admin can manage licenses"
    on public.licenses for all
    to authenticated
    using (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    )
    with check (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'license_devices'
      and policyname = 'admin can manage license devices'
  ) then
    create policy "admin can manage license devices"
    on public.license_devices for all
    to authenticated
    using (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    )
    with check (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'firebase_sync_logs'
      and policyname = 'admin can read sync logs'
  ) then
    create policy "admin can read sync logs"
    on public.firebase_sync_logs for select
    to authenticated
    using (
      exists (
        select 1 from public.admin_profiles
        where admin_profiles.id = auth.uid()
          and admin_profiles.role = 'owner'
          and admin_profiles.is_active = true
      )
    );
  end if;
end
$$;
