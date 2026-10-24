-- 성균관대 바이브코딩 해커톤 — 새 Supabase 프로젝트용 전체 스키마 (한 번에 실행)
-- Supabase 대시보드 → SQL Editor → New query → 이 파일 전체 붙여넣고 Run.
-- 기존 SUPABASE_SETUP.md / SUPABASE_MIGRATION_*.md 의 최종 상태를 합친 것입니다.
-- (옛 students 테이블·settings 테이블·데모 섹션은 더 이상 쓰지 않아 뺐습니다)
-- 스토리지 버킷(media, site-private, 썸네일)은 앱이 처음 쓸 때 자동으로 만듭니다.

-- 섹션(회차)
create table if not exists cohorts (
  id text primary key,
  slug text unique not null,
  name text not null,
  scoring_open boolean not null default true,
  rank_revealed boolean not null default false,
  min_raters integer not null default 3,   -- 순위에 들기 위한 최소 동료평가 인원
  created_at timestamptz not null default now()
);

-- 섹션 가입 (구글 계정 1개 : 섹션별 가입 1건)
create table if not exists memberships (
  id text primary key,              -- 이 섹션에서의 참가자 ID (채점·댓글·작품 작성자 ID)
  cohort_id text not null,
  google_sub text not null,         -- 구글 계정 고유 ID
  email text not null,
  google_name text not null default '',
  real_name text not null,          -- 관리자만 봄
  nickname text not null,           -- 사이트에 표시
  status text not null default 'pending',   -- pending / approved / rejected
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (cohort_id, google_sub)
);
create index if not exists memberships_sub_idx on memberships (google_sub);

-- 참가자 작품 (1인 1작품). 등록 내용 + 썸네일 + AI 분석 결과
create table if not exists projects (
  id text primary key,
  cohort_id text not null,
  author_id text not null unique,
  author_name text not null,
  submission jsonb not null,
  status text not null default 'pending',
  needs_analysis boolean not null default true,
  ai jsonb,
  thumb_url text,
  thumb_path text,
  error text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analyzed_at timestamptz,
  published_at timestamptz
);
create index if not exists projects_cohort_idx on projects (cohort_id);

-- 동료평가 (10점 루브릭)
create table if not exists scores (
  project_id text not null,
  student_id text not null,
  completeness int not null constraint scores_completeness_check check (completeness between 1 and 10),
  creativity int not null constraint scores_creativity_check check (creativity between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (project_id, student_id)
);

-- 심사위원 평가 (심사위원 1명 : 작품별 1건)
create table if not exists judge_scores (
  project_id text not null,
  judge_email text not null,           -- 관리자가 등록한 심사위원 구글 이메일
  completeness int not null check (completeness between 1 and 10),
  creativity int not null check (creativity between 1 and 10),
  comment text not null default '',    -- 관리자만 봄
  updated_at timestamptz not null default now(),
  primary key (project_id, judge_email)
);

-- 평가 기록 (누적). 동료·심사위원 채점이 제출·수정될 때마다 한 줄씩 추가 — 지우거나 덮어쓰지 않음
create table if not exists score_history (
  id bigint generated always as identity primary key,
  project_id text not null,
  cohort_id text not null,
  rater_type text not null check (rater_type in ('peer', 'judge')),
  rater_id text not null,              -- 동료: 섹션 가입 ID, 심사위원: 이메일
  rater_name text not null,            -- 기록 시점 이름 (동료: 닉네임 (실명))
  completeness int not null,
  creativity int not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists score_history_project_idx on score_history (project_id, created_at);
create index if not exists score_history_cohort_idx on score_history (cohort_id, created_at);

-- 댓글
create table if not exists comments (
  id text primary key,
  project_id text not null,
  author_id text,
  author_name text,
  ai_nickname text,
  body text not null,
  is_author_reply boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_project_idx on comments (project_id, created_at);

-- 교육·해커톤 문의
create table if not exists edu_requests (
  id text primary key,
  unit text not null,                  -- 소속(학과·기관)
  contact_name text not null,
  phone text not null,
  email text not null default '',
  headcount text not null default '',
  period text not null default '',
  message text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- 서버(service_role 키)만 접근. 공개 키로는 읽기·쓰기 불가.
alter table cohorts enable row level security;
alter table memberships enable row level security;
alter table projects enable row level security;
alter table scores enable row level security;
alter table judge_scores enable row level security;
alter table score_history enable row level security;
alter table comments enable row level security;
alter table edu_requests enable row level security;
