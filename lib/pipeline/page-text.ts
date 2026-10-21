// 배포 페이지의 제목·설명·본문 텍스트를 가져온다 (AI 분석 참고용).
// 화면 캡처는 하지 않는다 — 대표 이미지는 참가자가 썸네일로 직접 올린다.

const UA =
  "Mozilla/5.0 (compatible; SKKU-VibeGallery/1.0)";

// 배포 페이지의 제목·설명·본문 텍스트 (AI 참고용). SPA는 본문이 거의 없을 수 있다.
// guard: 요청 직전(리디렉션마다) 내부망 주소인지 검사하는 함수.
export async function fetchPageText(
  url: string,
  guard: (u: string) => Promise<unknown>
): Promise<string> {
  let current = url;
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    await guard(current);
    res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(10_000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    break;
  }
  if (!res || !res.ok) return "";
  if (!(res.headers.get("content-type") ?? "").includes("html")) return "";

  // 최대 1MB만 읽는다.
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < 1_000_000) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  reader.cancel().catch(() => {});
  const html = new TextDecoder().decode(Buffer.concat(chunks));

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  return [title && `제목: ${title.trim()}`, desc && `설명: ${desc.trim()}`, body && `본문: ${body}`]
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
}
