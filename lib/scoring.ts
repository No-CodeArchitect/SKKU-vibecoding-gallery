// 해커톤식 종합 점수 규칙 (서버·클라이언트 공용).
// 동료평가 70 + 심사위원 20 + AI 10 = 100점 만점.

export const SCORE_MAX = 10; // 동료·심사위원 루브릭: 항목별 1~10점
export const AI_SCORE_MAX = 5; // AI 분석 점수: 항목별 1~5점

export const WEIGHTS = { peer: 70, judge: 20, ai: 10 } as const;

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
