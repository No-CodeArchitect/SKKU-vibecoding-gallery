// 참가자가 입력한 URL 검증.
// - 등록 폼: http(s) + 공개 주소인지(localhost·사설 IP 차단) 형식 검사
// - 서버가 직접 그 주소를 가져올 때(페이지 텍스트 수집): DNS까지 확인해 내부망 접근(SSRF) 차단

import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOST = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home)$/i;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return (
      v === "::" ||
      v === "::1" ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("fe80")
    );
  }
  return true;
}

// 형식 검사 (동기). 통과하면 정규화된 URL 문자열, 아니면 null.
export function normalizePublicUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOST.test(host)) return null;
  if (net.isIP(host) && isPrivateIp(host)) return null;
  return u.toString();
}

// 서버가 실제로 요청하기 직전 검사 (DNS 해석 결과까지 공개 IP인지).
export async function assertPublicUrl(raw: string): Promise<URL> {
  const ok = normalizePublicUrl(raw);
  if (!ok) throw new Error("공개 주소가 아닙니다.");
  const u = new URL(ok);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!net.isIP(host)) {
    const addrs = await dns.lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
      throw new Error("내부망 주소로 연결됩니다.");
    }
  }
  return u;
}
