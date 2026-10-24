# Supabase 설정 — 성균관대 해커톤 평가

## 새 프로젝트라면
`SUPABASE_SCHEMA_SKKU.sql` 전체를 SQL Editor에 붙여넣고 **Run** 하면 끝입니다. (아래 SQL 포함)

## 이미 `SUPABASE_SCHEMA_SKKU.sql` 을 실행했다면 — 평가 기록 테이블 추가
평가 기록(누적) 기능이 추가되었습니다. 아래만 추가로 실행하세요.
실행 전에도 채점은 정상 동작하지만, 그동안의 제출 기록은 남지 않습니다.

```sql
create table if not exists score_history (
  id bigint generated always as identity primary key,
  project_id text not null,
  cohort_id text not null,
  rater_type text not null check (rater_type in ('peer', 'judge')),
  rater_id text not null,
  rater_name text not null,
  completeness int not null,
  creativity int not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists score_history_project_idx on score_history (project_id, created_at);
create index if not exists score_history_cohort_idx on score_history (cohort_id, created_at);
alter table score_history enable row level security;
```

## KAIST 버전 DB를 그대로 이어 쓰는 경우 (참고)
KAIST 스키마(`SUPABASE_SETUP.md` 등)가 이미 있는 DB라면 위 SQL에 더해 아래를 실행합니다.

```sql
-- 동료평가: 별 5개 → 10점 루브릭 (1~10)
alter table scores drop constraint if exists scores_completeness_check;
alter table scores drop constraint if exists scores_creativity_check;
alter table scores add constraint scores_completeness_check check (completeness between 1 and 10);
alter table scores add constraint scores_creativity_check check (creativity between 1 and 10);

-- 심사위원 채점 (심사위원 1명 : 작품별 1건)
create table if not exists judge_scores (
  project_id text not null,
  judge_email text not null,
  completeness int not null check (completeness between 1 and 10),
  creativity int not null check (creativity between 1 and 10),
  comment text not null default '',
  updated_at timestamptz not null default now(),
  primary key (project_id, judge_email)
);
alter table judge_scores enable row level security;
```

"Success. No rows returned" 가 뜨면 성공입니다.

## 운영 흐름
1. **배점 설정** — `/admin` → 「종합 점수 배점」에서 동료평가·심사위원·AI 비율을 정합니다 (합계 100, 기본 70/20/10). 바꾸면 모든 순위가 즉시 다시 계산됩니다. (비공개 버킷 `site-private/score-weights.json`에 저장)
2. **심사위원 등록** — `/admin` → 「심사위원」에 이름과 구글 이메일을 등록합니다. (명단은 `site-private/judges.json`)
3. **심사위원 안내** — 심사위원에게 `https://<사이트주소>/judge` 링크를 보냅니다. 등록된 구글 계정으로 로그인하면 모든 섹션 작품을 1~10점(완성도·창의성)으로 채점할 수 있습니다. 결과 발표 전까지 수정 가능.
4. **동료평가** — 참가자는 작품 상세 화면에서 1~10점으로 채점합니다.
5. **평가 기록 확인** — `/admin` 순위 미리보기에서 작품명을 누르면 평가자별 현재 점수와 제출·수정 이력 전체(`/admin/scores/<작품 ID>`)를 볼 수 있습니다. 「평가 기록 CSV」「최종 점수 CSV」로 내려받을 수 있습니다.
6. **결과 발표** — `/admin` 섹션 카드의 「점수 합산 · 결과 발표」 → 동료평가가 마감되고 발표 화면(`/g/<slug>/present`, 관리자 전용)으로 이동합니다. 3위 → 2위 → 1위 순서로 효과와 함께 공개되고, 마지막에 「갤러리에 순위 공개」를 누르면 갤러리에도 순위가 표시됩니다(이때 심사위원 채점도 마감).

## 점수 계산 (배점 W는 관리자 설정, 기본 70/20/10)
| 항목 | 원점수 | 환산 |
|---|---|---|
| 동료평가 | 참가자 평균 (완성도+창의성)/2, 1~10 | ÷10 × W동료 |
| 심사위원 | 심사위원 평균 (완성도+창의성)/2, 1~10 | ÷10 × W심사 |
| AI 평가 | AI 분석 점수 (완성도+창의성)/2, 1~5 | ÷5 × W AI |

- 평가가 없는 항목은 0점.
- 동료평가 인원이 섹션의 「최소 채점 인원」 미만인 작품은 순위에서 제외.
- 동점이면 동료평가 → 심사위원 → AI 창의성 순으로 비교.
