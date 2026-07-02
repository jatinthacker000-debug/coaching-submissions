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
