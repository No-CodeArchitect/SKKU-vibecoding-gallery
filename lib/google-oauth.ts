// 구글 OAuth 2.0 (Authorization Code) — 라이브러리 없이 직접 구현.
// 환경변수: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (둘 다 있어야 SSO 활성)
// 선택: APP_URL (리디렉션 주소의 기준 도메인을 고정하고 싶을 때)

import "server-only";
import { decodeJwtPayload, validateClaims, type ClaimsResult } from "./google-claims";

export const OAUTH_COOKIE = "vg_oauth"; // state·nonce·용도를 잠깐 보관하는 쿠키

// 관리자 로그인과 참가자 로그인이 같은 콜백 주소(/api/admin/google/callback)를 함께 쓴다.
// (구글 콘솔에 등록한 리디렉션 URI를 늘리지 않기 위해) 어느 쪽인지는 쿠키의 purpose로 구분한다.
export interface OAuthPending {
  state: string;
  nonce: string;
  purpose: "admin" | "member";
  next?: string; // member: 로그인 후 돌아갈 사이트 내 경로
}

export function encodeOAuthCookie(p: OAuthPending): string {
  return Buffer.from(JSON.stringify(p)).toString("base64url");
}

export function decodeOAuthCookie(raw: string | undefined): OAuthPending | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof p?.state !== "string" || typeof p?.nonce !== "string") return null;
    return { state: p.state, nonce: p.nonce, purpose: p.purpose === "member" ? "member" : "admin", next: p.next };
  } catch {
    return null;
  }
}

// 사이트 안 경로만 허용 (외부 주소로 튕겨 나가는 오픈 리디렉트 방지).
export function safeNext(next: string | null | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// 테스트에서 가짜 토큰 서버로 바꿀 수 있게 열어둔 값. 운영에서는 설정하지 않는다.
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";

export function ssoEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// 요청이 들어온 공개 주소 (프록시 뒤에서도 정확하도록 forwarded 헤더 우선).
export function originOf(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
  const proto =
    h.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/admin/google/callback`;
}

export function buildAuthUrl(origin: string, state: string, nonce: string): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID as string);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("nonce", nonce);
  u.searchParams.set("prompt", "select_account"); // 항상 계정 선택창을 보여 줌
  return u.toString();
}

// 인증 코드를 id_token으로 교환하고 클레임을 검증한다.
export async function exchangeAndVerify(
  origin: string,
  code: string,
  nonce: string
): Promise<ClaimsResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID as string;
  const res = await fetch(TOKEN_URL(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, reason: `토큰 교환 실패(${res.status})` };
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) return { ok: false, reason: "id_token 없음" };
  return validateClaims(decodeJwtPayload(data.id_token), { clientId, nonce });
}
