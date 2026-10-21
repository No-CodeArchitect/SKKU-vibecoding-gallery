// 갤러리 도메인 타입 (PRD 5절 데이터 모델의 프론트 표현)

export type ProjectStatus =
  | "pending"
  | "generating"
  | "generated"
  | "capture_failed";

export interface AiReview {
  scoreCompleteness: number; // 완성도/작동성 (1~5)
  scoreCreativity: number; // 창의성/아이디어 (1~5)
  rationale: string; // AI 심사평 (AI 점수는 종합 점수의 10% 반영)
}

export interface Project {
  id: string;
  cohortId: string; // 소속 섹션(기수) — 섹션 간 분리
  title: string;
  tagline: string;
  authorId: string; // 제작자(참가자) id — 본인 작품 판정용
  authorName: string; // 제작자 실명 (카드 표기용)
  liveUrl: string;
  repoUrl?: string;
  signatureImageUrl: string | null; // null이면 플레이스홀더
  aiSummary: string;
  features: string[];
  status: ProjectStatus;
  publishedAt: string; // ISO. NEW 뱃지 기준
  aiReview: AiReview;
  // 참가자가 작품등록 때 쓴 설명 (상세 페이지 표시용, 더미에는 없음)
  details?: {
    problem: string;
    militaryUseCase: string;
    techStack: string;
    notes: string;
    highlights: string;
  };

  // --- 로그인 사용자 관점의 파생 상태 (1단계에서는 더미 값) ---
  isNew: boolean; // 내가 아직 안 본 새 카드
  hasScored: boolean; // 내가 채점 완료
  isMine: boolean; // 내 작품 (채점 비활성)

  // --- 순위 (공개 전에는 null) ---
  rank: number | null;
  totalScore: number | null; // 종합 점수 (100점 만점: 동료 70 + 심사위원 20 + AI 10)
  raterCount: number; // 동료평가 인원
  breakdown?: ScoreBreakdown;
}

// 종합 점수 산출 내역 (lib/ranking.ts)
export interface ScoreBreakdown {
  peerAvg: number | null; // 동료평가 평균 (1~10)
  judgeAvg: number | null; // 심사위원 평균 (1~10)
  judgeCount: number;
  aiAvg: number; // AI 평가 평균 (1~5)
  peerPoints: number; // 환산 점수 (0~70)
  judgePoints: number; // (0~20)
  aiPoints: number; // (0~10)
}
