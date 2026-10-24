// 해커톤식 종합 점수 규칙 (서버·클라이언트 공용).
// 기본 동료평가 70 + 심사위원 20 + AI 10 = 100점 만점. 배점은 관리자가 바꿀 수 있다 (lib/weights-store.ts).

export const SCORE_MAX = 10; // 동료·심사위원 루브릭: 항목별 1~10점
export const AI_SCORE_MAX = 5; // AI 분석 점수: 항목별 1~5점

export interface Weights {
  peer: number;
  judge: number;
  ai: number;
}

export const DEFAULT_WEIGHTS: Weights = { peer: 70, judge: 20, ai: 10 };

// 0~100 정수 세 개, 합계 100이어야 한다.
export function validateWeights(w: Weights): string | null {
  const vals = [w.peer, w.judge, w.ai];
  if (vals.some((v) => !Number.isInteger(v) || v < 0 || v > 100)) {
    return "배점은 0~100 사이 정수로 입력해 주세요.";
  }
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum !== 100) return `세 배점의 합이 100이어야 합니다. (현재 ${sum})`;
  return null;
}

// 루브릭 항목 (동료·심사위원 공통)
export const RUBRIC = [
  { key: "completeness", label: "완성도", hint: "잘 작동하고 완성됐나" },
  { key: "creativity", label: "창의성", hint: "아이디어가 참신한가" },
] as const;

export function parseRubricScore(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > SCORE_MAX) return null;
  return n;
}

// 평균(척도 기준) → 가중 환산 점수. 점수가 없으면 0점.
export function toPoints(avg: number | null, scaleMax: number, weight: number): number {
  if (avg === null) return 0;
  return (avg / scaleMax) * weight;
}
