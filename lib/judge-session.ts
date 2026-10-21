// "심사위원으로 로그인돼 있는가": 구글 로그인(회원 세션)의 이메일이 심사위원 명단에 있어야 한다.
// 명단은 매 요청 확인하므로, 관리자가 심사위원을 삭제하면 즉시 권한이 사라진다.

import "server-only";
import { getMember } from "./member-session";
import { findJudge } from "./judges-store";

export interface Judge {
  email: string; // 심사위원 ID (judge_scores.judge_email)
  name: string;
}

export async function getJudge(): Promise<Judge | null> {
  const member = await getMember();
  if (!member?.email) return null;
  const j = await findJudge(member.email);
  return j ? { email: j.email, name: j.name } : null;
}
