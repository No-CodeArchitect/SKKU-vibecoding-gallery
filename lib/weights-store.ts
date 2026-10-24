// 종합 점수 배점 (사이트 전체 공통). 관리자가 /admin 에서 바꾸면 비공개 버킷에 저장된다.
// 저장된 값이 없거나 깨져 있으면 기본값(70/20/10).

import "server-only";
import { readPrivateJson, writePrivateJson } from "./private-store";
import { DEFAULT_WEIGHTS, validateWeights, type Weights } from "./scoring";

const PATH = "score-weights.json";

export async function getWeights(): Promise<Weights> {
  const w = await readPrivateJson<Weights | null>(PATH, null);
  if (!w) return DEFAULT_WEIGHTS;
  const parsed = { peer: Number(w.peer), judge: Number(w.judge), ai: Number(w.ai) };
  return validateWeights(parsed) ? DEFAULT_WEIGHTS : parsed;
}

export async function setWeights(w: Weights): Promise<void> {
  const err = validateWeights(w);
  if (err) throw new Error(err);
  await writePrivateJson(PATH, w);
}
