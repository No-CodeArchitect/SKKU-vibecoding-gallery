# Supabase 마이그레이션 — 순위 최소 채점 인원

섹션별 "순위에 들기 위한 최소 채점 인원"을 저장할 칸을 추가합니다.
실행 전에도 사이트는 동작하며(기본값 3명), 관리자 화면에서 값을 **바꿔 저장**할 때만 이 칸이 필요합니다.

## 실행 방법
Supabase 대시보드 → **SQL Editor** → New query → 아래를 붙여넣고 **Run**.

```sql
alter table cohorts add column if not exists min_raters integer not null default 3;
```

"Success. No rows returned" 가 뜨면 성공입니다.
