// "이 섹션의 참가자로 로그인돼 있는가"를 판단한다.
// 구글 로그인(회원 세션) + 그 섹션 가입이 관리자 수락(approved) 상태여야 참가자로 인정.
// 수락 여부는 매 요청 DB에서 확인하므로, 관리자가 취소하면 즉시 반영된다.

import "server-only";
import { getMember } from "./member-session";
import { getMembership, type Membership } from "./memberships-store";

export interface Student {
  id: string; // membership id — 채점·댓글·작품의 작성자 ID
  cohortId: string;
  name: string; // 닉네임 (사이트 표시용)
  realName: string; // 관리자 확인용
}

export function studentOf(m: Membership): Student {
  return { id: m.id, cohortId: m.cohortId, name: m.nickname, realName: m.realName };
}

// 이 섹션에서 수락된 참가자면 반환, 아니면 null.
export async function getStudent(cohortId: string): Promise<Student | null> {
  const member = await getMember();
  if (!member) return null;
  const m = await getMembership(cohortId, member.sub);
  return m?.status === "approved" ? studentOf(m) : null;
}
