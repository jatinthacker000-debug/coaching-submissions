-- Run this in Supabase: SQL Editor → New query → paste → Run

create table if not exists question_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  answer_key_text text default '',
  question_image_urls text[] not null default '{}',
  answer_key_image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  question_paper_id uuid not null references question_papers(id) on delete cascade,
  student_name text not null,
  image_urls text[] not null default '{}',
  ai_status text not null default 'pending',
  ai_score numeric,
  ai_verdict text,
  ai_feedback text,
  ai_details jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists submissions_question_paper_id_idx on submissions(question_paper_id);
create index if not exists submissions_submitted_at_idx on submissions(submitted_at desc);

-- Storage buckets (create in Supabase Dashboard → Storage if SQL below fails):
-- 1. Bucket name: uploads   (public bucket)

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  grade text not null,
  subject text not null,
  link text not null,
  created_at timestamptz not null default now()
);

-- NEW STUDENT MARKS MANAGEMENT TABLES
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_marks numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  marks_obtained numeric not null,
  created_at timestamptz not null default now(),
  unique(student_id, exam_id)
);

-- NEW AUTHENTICATION FIELDS FOR STUDENTS
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_id_alias TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT;

-- NEW HOMEWORK LINKS TABLE
CREATE TABLE IF NOT EXISTS homework_links (
  id uuid primary key default gen_random_uuid(),
  homework_date date not null,
  group_name text not null,
  link text not null,
  created_at timestamptz not null default now(),
  unique(homework_date, group_name)
);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_groups TEXT[] DEFAULT '{}';


-- NEW HOMEWORK TRACKING TABLE
CREATE TABLE IF NOT EXISTS homework_status (
  id uuid primary key default gen_random_uuid(),
  homework_date date not null,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'Done', -- 'Done', 'Incomplete', 'Partial'
  created_at timestamptz not null default now(),
  unique(homework_date, student_id)
);

-- MULTI-SUBJECT COLUMNS FOR NERD TUTORS & EXAMS
ALTER TABLE students ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';

-- STUDENT ACTIVE / SUSPENDED STATUS
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- CALENDAR IMPORTANT DATES & TESTS
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  group_name text not null,
  title text not null,
  color text not null default 'blue',
  created_at timestamptz not null default now(),
  unique(event_date, group_name, title)
);

-- STUDENT LOGIN ACTIVITY / HISTORY
CREATE TABLE IF NOT EXISTS student_logins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  student_id_alias text,
  group_name text default '',
  logged_in_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS student_logins_logged_in_at_idx ON student_logins(logged_in_at desc);
CREATE INDEX IF NOT EXISTS student_logins_student_id_idx ON student_logins(student_id);

-- STUDENT HELP DESK & QUERIES
CREATE TABLE IF NOT EXISTS student_queries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  student_id_alias text,
  group_name text default '',
  subject text default 'General',
  title text not null,
  message text not null,
  status text not null default 'pending', -- 'pending', 'resolved'
  coach_reply text default '',
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS student_queries_created_at_idx ON student_queries(created_at desc);
CREATE INDEX IF NOT EXISTS student_queries_student_id_idx ON student_queries(student_id);
CREATE INDEX IF NOT EXISTS student_queries_status_idx ON student_queries(status);


