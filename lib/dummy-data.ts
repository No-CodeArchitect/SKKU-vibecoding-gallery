import type { Project } from "./types";

// 1단계 더미 데이터 (Supabase 미설정 시 데모용 · 부대·업무 현장 예시).
// 이후 단계에서 Supabase 조회로 교체된다 (sync 스크립트가 채운 projects 테이블).

export const COHORT_NAME = "바이브코딩 해커톤 1차";

// 채점/순위 상태는 lib/settings-store.ts 에서 관리한다 (관리자 토글).

type Demo = {
  id: string;
  title: string;
  tagline: string;
  authorName: string;
  aiSummary: string;
  features: string[];
  publishedAt: string;
  completeness: number;
  creativity: number;
  rationale: string;
  isNew: boolean;
};

const DEMOS: Demo[] = [
  {
    id: "p1",
    title: "당직 근무표 자동 편성기",
    tagline: "엑셀 지옥 탈출, 클릭 한 번으로 공평한 근무표",
    authorName: "김도현",
    aiSummary:
      "근무자의 가용일·연속근무 제약을 입력하면 규칙에 따라 한 달 당직 근무표를 자동으로 만든다. 수기 편성의 반복 작업과 형평성 시비를 줄이는 데 초점을 맞췄다.",
    features: ["근무 조건 입력", "자동 편성", "형평성 통계", "엑셀 내보내기"],
    publishedAt: "2026-09-13T14:00:00+09:00",
    completeness: 4,
    creativity: 4,
    rationale:
      "현장의 반복 업무를 정확히 짚었고 결과물이 바로 쓸모 있다. 예외 규칙(휴가·교육) 처리를 다듬으면 완성도가 오른다.",
    isNew: true,
  },
  {
    id: "p2",
    title: "물자 재고 스캔 도우미",
    tagline: "바코드 찍으면 끝나는 재물조사",
    authorName: "이서준",
    aiSummary:
      "휴대폰 카메라로 바코드를 스캔해 재고를 실시간으로 대조한다. 장부와 실물의 차이를 바로 표시해 재물조사 시간을 크게 줄인다.",
    features: ["바코드 스캔", "실시간 대조", "차이 리포트", "CSV 내보내기"],
    publishedAt: "2026-09-13T13:30:00+09:00",
    completeness: 5,
    creativity: 3,
    rationale:
      "완성도가 높고 흐름이 매끄럽다. 아이디어 자체는 익숙한 편이라 차별화 포인트를 더 살리면 좋겠다.",
    isNew: true,
  },
  {
    id: "p3",
    title: "정책 문서 요약 브리핑봇",
    tagline: "수십 쪽 지침을 한 장 보고서로",
    authorName: "박민재",
    aiSummary:
      "지침·규정 문서를 올리면 AI가 핵심 변경 사항과 조치 사항을 한 장 브리핑 형식으로 정리한다. 담당자별 확인 항목도 함께 뽑아 준다.",
    features: ["문서 업로드", "핵심 요약", "조치 사항 추출", "보고서 양식 출력"],
    publishedAt: "2026-09-13T11:00:00+09:00",
    completeness: 3,
    creativity: 5,
    rationale:
      "보고 문화에 맞춘 출력 형식이 참신하다. 원문 근거 표시를 더하면 신뢰도와 실사용 가치가 커진다.",
    isNew: false,
  },
  {
    id: "p4",
    title: "사업 일정·예산 대시보드",
    tagline: "흩어진 사업 현황을 한 화면에",
    authorName: "정우진",
    aiSummary:
      "여러 사업의 단계별 일정과 예산 집행률을 한 화면에 모아 보여준다. 지연 위험이 있는 사업을 색으로 표시해 우선 점검할 곳을 알려 준다.",
    features: ["사업별 일정", "예산 집행률", "지연 경고", "공유 링크"],
    publishedAt: "2026-09-13T10:15:00+09:00",
    completeness: 4,
    creativity: 3,
    rationale:
      "정보가 깔끔하게 정리되어 있다. 원천 데이터 입력을 자동화하면 지속적으로 쓰일 수 있다.",
    isNew: false,
  },
  {
    id: "p5",
    title: "회의록 요약 AI",
    tagline: "회의는 길게, 정리는 짧게",
    authorName: "최유나",
    aiSummary:
      "회의 메모나 녹음 텍스트를 넣으면 결정 사항·할 일·담당자를 자동으로 정리한다. 매번 반복되는 회의록 작성 부담을 줄여 준다.",
    features: ["자동 요약", "할 일 추출", "담당자 지정", "팀 공유"],
    publishedAt: "2026-09-13T09:40:00+09:00",
    completeness: 3,
    creativity: 4,
    rationale:
      "업무 현장의 실제 고충을 잘 겨냥했다. 요약 결과를 수정·확정하는 흐름이 더해지면 완성도가 오른다.",
    isNew: false,
  },
  {
    id: "p6",
    title: "교육훈련 출결 관리",
    tagline: "QR 한 번이면 끝나는 출결 확인",
    authorName: "한지호",
    aiSummary:
      "교육·훈련 참석자가 QR 코드를 찍으면 출결이 자동으로 기록되고, 과정별 이수 현황을 바로 확인할 수 있다. 수기 명부 집계를 없애는 데 초점을 맞췄다.",
    features: ["QR 출결", "과정별 이수 현황", "미참석자 알림", "명부 내보내기"],
    publishedAt: "2026-09-13T15:10:00+09:00",
    completeness: 4,
    creativity: 3,
    rationale:
      "필요가 분명하고 구성이 깔끔하다. 위치·시간 검증을 더하면 대리 출석을 막을 수 있다.",
    isNew: true,
  },
];

export const dummyProjects: Project[] = DEMOS.map((d, i) => ({
  id: d.id,
  cohortId: "c1",
  title: d.title,
  tagline: d.tagline,
  authorId: `s${i + 1}`,
  authorName: d.authorName,
  liveUrl: "https://example.com",
  signatureImageUrl: null,
  aiSummary: d.aiSummary,
  features: d.features,
  status: "generated",
  publishedAt: d.publishedAt,
  aiReview: {
    scoreCompleteness: d.completeness,
    scoreCreativity: d.creativity,
    rationale: d.rationale,
  },
  isNew: d.isNew,
  hasScored: false,
  isMine: false,
  rank: null,
  totalScore: null,
  raterCount: 0,
}));
