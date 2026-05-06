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

create table if not exists public.mobile_modules (
  id uuid primary key default gen_random_uuid(),
  source_license_key text not null default '',
  source_module_local_id integer,
  slug text not null unique,
  title text not null,
  class_name text not null,
  subject_name text not null,
  description text,
  summary_points jsonb not null default '[]'::jsonb,
  pdf_url text,
  duration_minutes integer not null default 30,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_exams (
  id uuid primary key default gen_random_uuid(),
  source_license_key text not null default '',
  source_request_local_id integer,
  module_id uuid references public.mobile_modules (id) on delete cascade,
  title text not null,
  class_name text not null,
  subject_name text not null,
  duration_minutes integer not null default 20,
  question_count integer not null default 1,
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.mobile_exams (id) on delete cascade,
  order_no integer not null default 0,
  question_type text not null check (question_type in ('multiple_choice', 'essay')),
  prompt text not null,
  options_json jsonb not null default '[]'::jsonb,
  answer_key text,
  essay_key_points jsonb not null default '[]'::jsonb,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.mobile_exams (id) on delete cascade,
  student_name text not null,
  device_id text not null,
  attempt_token text not null unique,
  status text not null default 'active' check (status in ('active', 'submitted', 'expired', 'terminated')),
  violation_count integer not null default 0,
  answers_json jsonb not null default '{}'::jsonb,
  question_snapshot_json jsonb not null default '[]'::jsonb,
  result_json jsonb,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz null,
  last_heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_exam_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mobile_exam_attempts (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_homework_assignments (
  id uuid primary key default gen_random_uuid(),
  source_license_key text not null default '',
  source_homework_local_id integer,
  module_id uuid null references public.mobile_modules (id) on delete set null,
  title text not null,
  class_name text not null,
  subject_name text not null,
  homework_type text not null check (homework_type in ('reading', 'essay', 'quiz')),
  instructions text,
  content_json jsonb not null default '{}'::jsonb,
  due_at timestamptz null,
  max_score integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.mobile_homework_assignments (id) on delete cascade,
  student_name text not null,
  answer_json jsonb not null default '{}'::jsonb,
  score numeric null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  license_key text not null unique references public.licenses (license_key) on delete cascade,
  teacher_name text not null,
  school_name text not null,
  teacher_public_id text not null unique,
  teacher_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.mobile_teacher_profiles (id) on delete cascade,
  student_name text not null,
  class_name text not null,
  attendance_number integer not null,
  student_key text not null unique,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_profile_id, class_name, attendance_number)
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

alter table public.mobile_modules add column if not exists slug text;
alter table public.mobile_modules add column if not exists source_license_key text not null default '';
alter table public.mobile_modules add column if not exists source_module_local_id integer;
alter table public.mobile_modules add column if not exists title text;
alter table public.mobile_modules add column if not exists class_name text;
alter table public.mobile_modules add column if not exists subject_name text;
alter table public.mobile_modules add column if not exists description text;
alter table public.mobile_modules add column if not exists summary_points jsonb not null default '[]'::jsonb;
alter table public.mobile_modules add column if not exists pdf_url text;
alter table public.mobile_modules add column if not exists duration_minutes integer not null default 30;
alter table public.mobile_modules add column if not exists is_published boolean not null default true;
alter table public.mobile_modules add column if not exists created_at timestamptz not null default now();
alter table public.mobile_modules add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_exams add column if not exists module_id uuid references public.mobile_modules (id) on delete cascade;
alter table public.mobile_exams alter column module_id drop not null;
alter table public.mobile_exams add column if not exists source_license_key text not null default '';
alter table public.mobile_exams add column if not exists source_request_local_id integer;
alter table public.mobile_exams add column if not exists title text;
alter table public.mobile_exams add column if not exists class_name text;
alter table public.mobile_exams add column if not exists subject_name text;
alter table public.mobile_exams add column if not exists duration_minutes integer not null default 20;
alter table public.mobile_exams add column if not exists question_count integer not null default 1;
alter table public.mobile_exams add column if not exists shuffle_questions boolean not null default true;
alter table public.mobile_exams add column if not exists shuffle_options boolean not null default true;
alter table public.mobile_exams add column if not exists is_active boolean not null default true;
alter table public.mobile_exams add column if not exists starts_at timestamptz null;
alter table public.mobile_exams add column if not exists ends_at timestamptz null;
alter table public.mobile_exams add column if not exists created_at timestamptz not null default now();
alter table public.mobile_exams add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_exam_questions add column if not exists exam_id uuid references public.mobile_exams (id) on delete cascade;
alter table public.mobile_exam_questions add column if not exists order_no integer not null default 0;
alter table public.mobile_exam_questions add column if not exists question_type text not null default 'multiple_choice';
alter table public.mobile_exam_questions add column if not exists prompt text;
alter table public.mobile_exam_questions add column if not exists options_json jsonb not null default '[]'::jsonb;
alter table public.mobile_exam_questions add column if not exists answer_key text;
alter table public.mobile_exam_questions add column if not exists essay_key_points jsonb not null default '[]'::jsonb;
alter table public.mobile_exam_questions add column if not exists explanation text;
alter table public.mobile_exam_questions add column if not exists created_at timestamptz not null default now();
alter table public.mobile_exam_questions add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_exam_attempts add column if not exists exam_id uuid references public.mobile_exams (id) on delete cascade;
alter table public.mobile_exam_attempts add column if not exists teacher_profile_id uuid references public.mobile_teacher_profiles (id) on delete set null;
alter table public.mobile_exam_attempts add column if not exists student_id uuid references public.mobile_teacher_students (id) on delete set null;
alter table public.mobile_exam_attempts add column if not exists student_name text;
alter table public.mobile_exam_attempts add column if not exists class_name text;
alter table public.mobile_exam_attempts add column if not exists attendance_number integer;
alter table public.mobile_exam_attempts add column if not exists device_id text;
alter table public.mobile_exam_attempts add column if not exists attempt_token text;
alter table public.mobile_exam_attempts add column if not exists status text not null default 'active';
alter table public.mobile_exam_attempts add column if not exists violation_count integer not null default 0;
alter table public.mobile_exam_attempts add column if not exists answers_json jsonb not null default '{}'::jsonb;
alter table public.mobile_exam_attempts add column if not exists question_snapshot_json jsonb not null default '[]'::jsonb;
alter table public.mobile_exam_attempts add column if not exists result_json jsonb;
alter table public.mobile_exam_attempts add column if not exists started_at timestamptz not null default now();
alter table public.mobile_exam_attempts add column if not exists expires_at timestamptz;
alter table public.mobile_exam_attempts add column if not exists submitted_at timestamptz null;
alter table public.mobile_exam_attempts add column if not exists last_heartbeat_at timestamptz not null default now();
alter table public.mobile_exam_attempts add column if not exists created_at timestamptz not null default now();
alter table public.mobile_exam_attempts add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_exam_events add column if not exists attempt_id uuid references public.mobile_exam_attempts (id) on delete cascade;
alter table public.mobile_exam_events add column if not exists event_type text;
alter table public.mobile_exam_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.mobile_exam_events add column if not exists created_at timestamptz not null default now();

alter table public.mobile_homework_assignments add column if not exists source_license_key text not null default '';
alter table public.mobile_homework_assignments add column if not exists source_homework_local_id integer;
alter table public.mobile_homework_assignments add column if not exists module_id uuid references public.mobile_modules (id) on delete set null;
alter table public.mobile_homework_assignments add column if not exists title text;
alter table public.mobile_homework_assignments add column if not exists class_name text;
alter table public.mobile_homework_assignments add column if not exists subject_name text;
alter table public.mobile_homework_assignments add column if not exists homework_type text not null default 'essay';
alter table public.mobile_homework_assignments add column if not exists instructions text;
alter table public.mobile_homework_assignments add column if not exists content_json jsonb not null default '{}'::jsonb;
alter table public.mobile_homework_assignments add column if not exists due_at timestamptz null;
alter table public.mobile_homework_assignments add column if not exists max_score integer not null default 100;
alter table public.mobile_homework_assignments add column if not exists is_active boolean not null default true;
alter table public.mobile_homework_assignments add column if not exists created_at timestamptz not null default now();
alter table public.mobile_homework_assignments add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_homework_submissions add column if not exists homework_id uuid references public.mobile_homework_assignments (id) on delete cascade;
alter table public.mobile_homework_submissions add column if not exists teacher_profile_id uuid references public.mobile_teacher_profiles (id) on delete set null;
alter table public.mobile_homework_submissions add column if not exists student_id uuid references public.mobile_teacher_students (id) on delete set null;
alter table public.mobile_homework_submissions add column if not exists student_name text;
alter table public.mobile_homework_submissions add column if not exists class_name text;
alter table public.mobile_homework_submissions add column if not exists attendance_number integer;
alter table public.mobile_homework_submissions add column if not exists answer_json jsonb not null default '{}'::jsonb;
alter table public.mobile_homework_submissions add column if not exists score numeric null;
alter table public.mobile_homework_submissions add column if not exists status text not null default 'submitted';
alter table public.mobile_homework_submissions add column if not exists submitted_at timestamptz not null default now();
alter table public.mobile_homework_submissions add column if not exists reviewed_at timestamptz null;
alter table public.mobile_homework_submissions add column if not exists created_at timestamptz not null default now();
alter table public.mobile_homework_submissions add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_teacher_profiles add column if not exists license_key text references public.licenses (license_key) on delete cascade;
alter table public.mobile_teacher_profiles add column if not exists teacher_name text not null default '';
alter table public.mobile_teacher_profiles add column if not exists school_name text not null default '';
alter table public.mobile_teacher_profiles add column if not exists teacher_public_id text not null default '';
alter table public.mobile_teacher_profiles add column if not exists teacher_token text not null default '';
alter table public.mobile_teacher_profiles add column if not exists is_active boolean not null default true;
alter table public.mobile_teacher_profiles add column if not exists created_at timestamptz not null default now();
alter table public.mobile_teacher_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.mobile_teacher_students add column if not exists teacher_profile_id uuid references public.mobile_teacher_profiles (id) on delete cascade;
alter table public.mobile_teacher_students add column if not exists student_name text not null default '';
alter table public.mobile_teacher_students add column if not exists class_name text not null default '';
alter table public.mobile_teacher_students add column if not exists attendance_number integer not null default 1;
alter table public.mobile_teacher_students add column if not exists student_key text not null default '';
alter table public.mobile_teacher_students add column if not exists last_seen_at timestamptz not null default now();
alter table public.mobile_teacher_students add column if not exists created_at timestamptz not null default now();
alter table public.mobile_teacher_students add column if not exists updated_at timestamptz not null default now();

create unique index if not exists mobile_modules_slug_idx on public.mobile_modules (slug);
create unique index if not exists mobile_modules_source_idx on public.mobile_modules (source_license_key, source_module_local_id);
create unique index if not exists mobile_exams_source_idx on public.mobile_exams (source_license_key, source_request_local_id);
create unique index if not exists mobile_exam_attempts_attempt_token_idx on public.mobile_exam_attempts (attempt_token);
create unique index if not exists mobile_homework_source_idx on public.mobile_homework_assignments (source_license_key, source_homework_local_id);
create unique index if not exists mobile_teacher_profiles_license_key_idx on public.mobile_teacher_profiles (license_key);
create unique index if not exists mobile_teacher_profiles_public_id_idx on public.mobile_teacher_profiles (teacher_public_id);
create unique index if not exists mobile_teacher_profiles_token_idx on public.mobile_teacher_profiles (teacher_token);
create unique index if not exists mobile_teacher_students_identity_idx on public.mobile_teacher_students (teacher_profile_id, class_name, attendance_number);
create unique index if not exists mobile_teacher_students_student_key_idx on public.mobile_teacher_students (student_key);
create index if not exists mobile_exams_module_id_idx on public.mobile_exams (module_id);
create index if not exists mobile_exam_questions_exam_id_idx on public.mobile_exam_questions (exam_id);
create index if not exists mobile_exam_attempts_exam_id_idx on public.mobile_exam_attempts (exam_id);
create index if not exists mobile_exam_attempts_student_id_idx on public.mobile_exam_attempts (student_id);
create index if not exists mobile_exam_events_attempt_id_idx on public.mobile_exam_events (attempt_id);
create index if not exists mobile_homework_module_id_idx on public.mobile_homework_assignments (module_id);
create index if not exists mobile_homework_submissions_homework_id_idx on public.mobile_homework_submissions (homework_id);
create index if not exists mobile_homework_submissions_student_id_idx on public.mobile_homework_submissions (student_id);

alter table public.admin_profiles enable row level security;
alter table public.provider_settings enable row level security;
alter table public.licenses enable row level security;
alter table public.license_devices enable row level security;
alter table public.firebase_sync_logs enable row level security;
alter table public.question_generations enable row level security;
alter table public.mobile_modules enable row level security;
alter table public.mobile_exams enable row level security;
alter table public.mobile_exam_questions enable row level security;
alter table public.mobile_exam_attempts enable row level security;
alter table public.mobile_exam_events enable row level security;
alter table public.mobile_homework_assignments enable row level security;
alter table public.mobile_homework_submissions enable row level security;
alter table public.mobile_teacher_profiles enable row level security;
alter table public.mobile_teacher_students enable row level security;

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
      and tablename = 'mobile_homework_assignments'
      and policyname = 'admin can manage mobile homework assignments'
  ) then
    create policy "admin can manage mobile homework assignments"
    on public.mobile_homework_assignments for all
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
      and tablename = 'mobile_homework_submissions'
      and policyname = 'admin can manage mobile homework submissions'
  ) then
    create policy "admin can manage mobile homework submissions"
    on public.mobile_homework_submissions for all
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
      and tablename = 'mobile_modules'
      and policyname = 'admin can manage mobile modules'
  ) then
    create policy "admin can manage mobile modules"
    on public.mobile_modules for all
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
      and tablename = 'mobile_exams'
      and policyname = 'admin can manage mobile exams'
  ) then
    create policy "admin can manage mobile exams"
    on public.mobile_exams for all
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
      and tablename = 'mobile_exam_questions'
      and policyname = 'admin can manage mobile exam questions'
  ) then
    create policy "admin can manage mobile exam questions"
    on public.mobile_exam_questions for all
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
      and tablename = 'mobile_exam_attempts'
      and policyname = 'admin can manage mobile exam attempts'
  ) then
    create policy "admin can manage mobile exam attempts"
    on public.mobile_exam_attempts for all
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
      and tablename = 'mobile_exam_events'
      and policyname = 'admin can read mobile exam events'
  ) then
    create policy "admin can read mobile exam events"
    on public.mobile_exam_events for select
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
