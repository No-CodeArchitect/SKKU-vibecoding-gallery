// 참가자(회원) 구글 로그인 세션. 쿠키에는 구글 계정 ID·이메일·이름이 서명되어 들어간다.
// "어느 섹션의 참가자인지"는 쿠키가 아니라 매 요청 DB(memberships)에서 확인한다
// → 관리자가 승인을 취소하면 즉시 권한이 사라진다.

import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

export const MEMBER_COOKIE = "vg_member";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-.env";

export interface MemberIdentity {
  sub: string; // 구글 계정 고유 ID
  email: string;
  name: string; // 구글 프로필 이름 (참고용)
}

function mac(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(`member:${value}`).digest("base64url");
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  try {
    const a = Buffer.from(signed.slice(idx + 1));
    const b = Buffer.from(mac(value));
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null;
  } catch {
    return null;
  }
}

export async function createMemberSession(who: MemberIdentity): Promise<void> {
  const value = Buffer.from(JSON.stringify(who)).toString("base64url");
  (await cookies()).set(MEMBER_COOKIE, `${value}.${mac(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroyMemberSession(): Promise<void> {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function getMember(): Promise<MemberIdentity | null> {
  const value = verify((await cookies()).get(MEMBER_COOKIE)?.value);
  if (!value) return null;
  try {
    const p = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof p?.sub === "string" ? { sub: p.sub, email: String(p.email ?? ""), name: String(p.name ?? "") } : null;
  } catch {
    return null;
  }
}
