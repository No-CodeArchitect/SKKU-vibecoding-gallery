// 심사위원 명단 (구글 이메일 허용 목록). 관리자가 /admin 에서 이메일·이름을 등록하면
// 그 구글 계정으로 /judge 에 로그인해 모든 섹션의 작품을 채점할 수 있다.
// 관리자 목록과 같은 비공개 버킷(site-private)에 저장한다.

import "server-only";
import { readPrivateJson, writePrivateJson } from "./private-store";
import { isValidEmail, normalizeEmail } from "./admin-allowlist";

export interface JudgeEntry {
  email: string;
  name: string;
  addedAt: string;
  addedBy: string;
}

const PATH = "judges.json";

export async function listJudges(): Promise<JudgeEntry[]> {
  const list = await readPrivateJson<JudgeEntry[]>(PATH, []);
  return Array.isArray(list) ? list : [];
}

export async function findJudge(email: string): Promise<JudgeEntry | null> {
  const e = normalizeEmail(email);
  if (!e) return null;
  return (await listJudges()).find((j) => j.email === e) ?? null;
}

export async function addJudge(
  rawEmail: string,
  rawName: string,
  addedBy: string
): Promise<{ ok: boolean; error: string | null }> {
  const email = normalizeEmail(rawEmail);
  const name = rawName.trim().slice(0, 30);
  if (!isValidEmail(email)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  if (!name) return { ok: false, error: "심사위원 이름을 입력해 주세요." };
  const list = await listJudges();
  const rest = list.filter((j) => j.email !== email); // 같은 이메일이면 이름만 갱신
  await writePrivateJson(PATH, [
    ...rest,
    { email, name, addedAt: new Date().toISOString(), addedBy },
  ]);
  return { ok: true, error: null };
}

export async function removeJudge(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  await writePrivateJson(
    PATH,
    (await listJudges()).filter((j) => j.email !== email)
  );
}
