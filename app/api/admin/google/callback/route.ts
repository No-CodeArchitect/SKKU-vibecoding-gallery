import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  OAUTH_COOKIE,
  decodeOAuthCookie,
  exchangeAndVerify,
  originOf,
  safeNext,
  ssoEnabled,
} from "@/lib/google-oauth";
import { isAllowedAdmin } from "@/lib/admin-allowlist";
import { createAdminSession } from "@/lib/admin-session";
import { createMemberSession } from "@/lib/member-session";

export const dynamic = "force-dynamic";

// 구글에서 돌아온 뒤: state 확인 → 코드 교환·검증 → 용도별 처리.
// - admin : 허용 이메일인지 확인 → 관리자 세션
// - member: 참가자 세션 (섹션 가입·승인은 사이트에서 따로 처리)
// 구글 콘솔에 등록된 리디렉션 URI가 이 주소 하나라서 관리자·참가자가 함께 쓴다.
export async function GET(req: Request) {
  const origin = originOf(req);
  const c = await cookies();
  const pending = decodeOAuthCookie(c.get(OAUTH_COOKIE)?.value);
  c.delete(OAUTH_COOKIE); // 일회용

  const isMember = pending?.purpose === "member";
  const fail = (code: string, extra = "") =>
    NextResponse.redirect(
      isMember
        ? `${origin}/me?error=${code}`
        : `${origin}/admin/login?error=${code}${extra}`
    );

  if (!ssoEnabled()) return fail("sso_off");

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return fail("google"); // 사용자가 취소 등

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !pending || state !== pending.state) return fail("state");

  let result;
  try {
    result = await exchangeAndVerify(origin, code, pending.nonce);
  } catch {
    return fail("google");
  }
  if (!result.ok) return fail("google");

  if (isMember) {
    await createMemberSession({ sub: result.sub, email: result.email, name: result.name });
    return NextResponse.redirect(`${origin}${safeNext(pending.next)}`);
  }

  if (!(await isAllowedAdmin(result.email))) {
    return fail("denied", `&email=${encodeURIComponent(result.email)}`);
  }
  await createAdminSession(result.email);
  return NextResponse.redirect(`${origin}/admin`);
}
