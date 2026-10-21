import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  OAUTH_COOKIE,
  buildAuthUrl,
  encodeOAuthCookie,
  originOf,
  safeNext,
  ssoEnabled,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

// 참가자 구글 로그인 시작. ?next=/g/<slug>/join 처럼 돌아갈 경로를 받는다.
// 콜백은 관리자와 같은 /api/admin/google/callback 을 쓰고, 쿠키의 purpose로 구분한다.
export async function GET(req: Request) {
  const origin = originOf(req);
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (!ssoEnabled()) {
    return NextResponse.redirect(`${origin}/me?error=sso_off`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const c = await cookies();
  c.set(OAUTH_COOKIE, encodeOAuthCookie({ state, nonce, purpose: "member", next }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
    secure: origin.startsWith("https://"),
  });
  return NextResponse.redirect(buildAuthUrl(origin, state, nonce));
}
