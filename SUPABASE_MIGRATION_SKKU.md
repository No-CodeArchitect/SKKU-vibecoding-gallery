# Supabase 마이그레이션 — 성균관대 해커톤 평가 (10점 루브릭 · 심사위원 채점)

성균관대 버전은 **동료평가 70 + 심사위원 20 + AI 평가 10 = 100점**으로 순위를 매깁니다.
아래 SQL을 실행하기 전에는 (Supabase 사용 시) 동료평가 6~10점 저장과 심사위원 채점이 실패합니다.

## 실행 방법
Supabase 대시보드 → **SQL Editor** → New query → 아래 전체 붙여넣고 **Run**.

```sql
-- 1) 동료평가: 별 5개 → 10점 루브릭 (1~10)
alter table scores drop constraint if exists scores_completeness_check;
alter table scores drop constraint if exists scores_creativity_check;
alter table scores add constraint scores_completeness_check check (completeness between 1 and 10);
alter table scores add constraint scores_creativity_check check (creativity between 1 and 10);

-- 2) 심사위원 채점 (심사위원 1명 : 작품별 1건)
create table if not exists judge_scores (
  project_id text not null,
  judge_email text not null,           -- 관리자가 등록한 심사위원 구글 이메일
  completeness int not null check (completeness between 1 and 10),
  creativity int not null check (creativity between 1 and 10),
  comment text not null default '',    -- 관리자만 봄
  updated_at timestamptz not null default now(),
  primary key (project_id, judge_email)
);

alter table judge_scores enable row level security;
```

"Success. No rows returned" 가 뜨면 성공입니다.

## 운영 흐름
1. **심사위원 등록** — `/admin` → 「심사위원」에 이름과 구글 이메일을 등록합니다. (명단은 비공개 버킷 `site-private/judges.json`에 저장)
2. **심사위원 안내** — 심사위원에게 `https://<사이트주소>/judge` 링크를 보냅니다. 등록된 구글 계정으로 로그인하면 모든 섹션 작품을 1~10점(완성도·창의성)으로 채점할 수 있습니다. 결과 발표 전까지 수정 가능.
3. **동료평가** — 교육생은 기존처럼 작품 상세 화면에서 1~10점으로 채점합니다.
4. **결과 발표** — `/admin` 섹션 카드의 「점수 합산 · 결과 발표」 → 동료평가가 마감되고 발표 화면(`/g/<slug>/present`, 관리자 전용)으로 이동합니다. 3위 → 2위 → 1위 순서로 효과와 함께 공개되고, 마지막에 「갤러리에 순위 공개」를 누르면 교육생 갤러리에도 순위가 표시됩니다(이때 심사위원 채점도 마감).

## 점수 계산
| 항목 | 원점수 | 환산 |
|---|---|---|
| 동료평가 | 교육생 평균 (완성도+창의성)/2, 1~10 | ÷10 × 70 |
| 심사위원 | 심사위원 평균 (완성도+창의성)/2, 1~10 | ÷10 × 20 |
| AI 평가 | AI 분석 점수 (완성도+창의성)/2, 1~5 | ÷5 × 10 |

- 평가가 없는 항목은 0점.
- 동료평가 인원이 섹션의 「최소 채점 인원」 미만인 작품은 순위에서 제외.
- 동점이면 동료평가 → 심사위원 → AI 창의성 순으로 비교.
