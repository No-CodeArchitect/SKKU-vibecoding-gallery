import type { Project } from "./types";

// 1단계 더미 데이터 (Supabase 미설정 시 데모용).
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
    title: "강의실 빈자리 알리미",
    tagline: "공강 시간, 앉을 곳부터 찾지 말자",
    authorName: "김도현",
    aiSummary:
      "강의 시간표 데이터를 바탕으로 지금 비어 있는 강의실을 건물·층별로 보여준다. 공강 시간에 공부할 자리를 찾느라 캠퍼스를 헤매는 시간을 줄이는 데 초점을 맞췄다.",
    features: ["실시간 빈 강의실", "건물·층 필터", "즐겨찾기", "모바일 최적화"],
    publishedAt: "2026-09-13T14:00:00+09:00",
    completeness: 4,
    creativity: 4,
    rationale:
      "학생 누구나 겪는 불편을 정확히 짚었고 바로 쓸 수 있다. 시간표 예외(휴강·보강) 처리를 더하면 완성도가 오른다.",
    isNew: true,
  },
  {
    id: "p2",
    title: "학식 메뉴 한눈에",
    tagline: "오늘 뭐 먹지? 캠퍼스 식당을 한 화면에",
    authorName: "이서준",
    aiSummary:
      "캠퍼스 식당별 오늘 메뉴와 가격, 운영 시간을 한 화면에 모아 보여준다. 메뉴 평점과 혼잡 시간대를 함께 표시해 식사 장소 선택을 돕는다.",
    features: ["식당별 메뉴", "가격·운영시간", "메뉴 평점", "혼잡도 표시"],
    publishedAt: "2026-09-13T13:30:00+09:00",
    completeness: 5,
    creativity: 3,
    rationale:
      "완성도가 높고 흐름이 매끄럽다. 아이디어 자체는 익숙한 편이라 차별화 포인트를 더 살리면 좋겠다.",
    isNew: true,
  },
  {
    id: "p3",
    title: "전공 퀴즈 배틀",
    tagline: "시험 공부를 친구와의 대결로",
    authorName: "박민재",
    aiSummary:
      "강의 자료를 넣으면 AI가 퀴즈를 만들고, 친구와 실시간으로 대결할 수 있다. 오답 노트가 자동으로 쌓여 시험 직전 복습에 쓸 수 있다.",
    features: ["AI 퀴즈 생성", "실시간 대결", "오답 노트", "랭킹"],
    publishedAt: "2026-09-13T11:00:00+09:00",
    completeness: 3,
    creativity: 5,
    rationale:
      "공부를 게임으로 바꾼 발상이 참신하다. 문제 품질 검수 기능이 보완되면 실사용 가치가 커진다.",
    isNew: false,
  },
  {
    id: "p4",
    title: "동아리 모집 캘린더",
    tagline: "놓친 모집 공고는 이제 그만",
    authorName: "정우진",
    aiSummary:
      "흩어진 동아리·학회 모집 공고를 모아 마감일 순 캘린더로 보여준다. 관심 분야를 고르면 마감 전에 알림을 받을 수 있다.",
    features: ["모집 공고 모음", "마감일 캘린더", "관심 분야 알림", "공유 링크"],
    publishedAt: "2026-09-13T10:15:00+09:00",
    completeness: 4,
    creativity: 3,
    rationale:
      "정보가 깔끔하게 정리되어 있다. 공고 등록을 동아리가 직접 할 수 있게 하면 지속성이 생긴다.",
    isNew: false,
  },
  {
    id: "p5",
    title: "팀플 회의록 요약 AI",
    tagline: "회의는 길게, 정리는 짧게",
    authorName: "최유나",
    aiSummary:
      "팀 회의 메모나 녹음 텍스트를 넣으면 결정 사항·할 일·담당자를 자동으로 정리한다. 팀플마다 반복되는 회의록 작성 부담을 줄여 준다.",
    features: ["자동 요약", "할 일 추출", "담당자 지정", "팀 공유"],
    publishedAt: "2026-09-13T09:40:00+09:00",
    completeness: 3,
    creativity: 4,
    rationale:
      "팀플의 실제 고충을 잘 겨냥했다. 요약 결과를 수정·확정하는 흐름이 더해지면 완성도가 오른다.",
    isNew: false,
  },
  {
    id: "p6",
    title: "중고 전공책 장터",
    tagline: "학기 끝난 전공책, 다음 학번에게",
    authorName: "한지호",
    aiSummary:
      "과목명으로 전공책을 검색하고 같은 학교 학생끼리 사고팔 수 있는 장터. 판매자와 구매자가 캠퍼스 안 거래 장소를 바로 정할 수 있다.",
    features: ["과목별 검색", "판매 등록", "거래 장소 선택", "찜하기"],
    publishedAt: "2026-09-13T15:10:00+09:00",
    completeness: 4,
    creativity: 3,
    rationale:
      "필요가 분명하고 구성이 깔끔하다. 거래 신뢰도(후기·인증)를 보강하면 실사용으로 이어질 수 있다.",
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
