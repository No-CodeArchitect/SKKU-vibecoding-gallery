"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addUploadedAction,
  addYoutubeAction,
  deleteMediaAction,
} from "@/lib/media-actions";
import { extractYoutubeId } from "@/lib/youtube";

export interface ManagerItem {
  id: string;
  kind: "youtube" | "video" | "image";
  title: string;
  youtubeId?: string;
  url?: string;
}

const MAX_BYTES = 50 * 1024 * 1024;

// XHR로 올려서 진행률을 표시한다. (Supabase 서명 URL로 직접 PUT)
function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", file); // Supabase 서명 업로드 규약: 필드명은 빈 문자열
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`업로드 실패 (${xhr.status})`));
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
    xhr.send(fd);
  });
}

export default function MediaManager({
  slot,
  title,
  description,
  items,
  fallbackNote,
}: {
  slot: "about" | "sketch";
  title: string;
  description: string;
  items: ManagerItem[];
  fallbackNote?: string; // 목록이 비었을 때 보여줄 안내(예: 기본 영상 사용 중)
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [link, setLink] = useState("");

  const single = slot === "about";

  async function uploadFile(file: File): Promise<string | null> {
    if (file.size > MAX_BYTES) {
      return `${file.name}: 50MB를 넘습니다. 큰 영상은 유튜브에 올려 링크로 추가해 주세요.`;
    }
    const signRes = await fetch("/api/admin/media/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size }),
    });
    const sign = await signRes.json();
    if (!signRes.ok) return `${file.name}: ${sign.error ?? "업로드 준비 실패"}`;

    setProgress(0);
    await putWithProgress(sign.signedUrl, file, setProgress);

    const res = await addUploadedAction({
      slot,
      kind: sign.kind,
      path: sign.path,
      title: file.name.replace(/\.[^.]+$/, ""),
    });
    return res.ok ? null : `${file.name}: ${res.error}`;
  }

  async function addLinks(raw: string): Promise<string | null> {
    // 여러 줄/여러 링크를 한 번에. uri-list의 '#' 주석 줄은 제외.
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    let lastError: string | null = null;
    let added = 0;
    for (const l of lines) {
      if (!extractYoutubeId(l)) continue;
      const res = await addYoutubeAction(slot, l);
      if (res.ok) added++;
      else lastError = res.error;
    }
    if (added === 0 && !lastError) return "유튜브 링크를 인식하지 못했습니다.";
    return lastError;
  }

  async function run(work: () => Promise<string | null>, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const err = await work();
      setMessage(err ? { ok: false, text: err } : { ok: true, text: okText });
      if (!err) router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    if (busy) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const list = single ? files.slice(0, 1) : files;
      run(async () => {
        for (const f of list) {
          const err = await uploadFile(f);
          if (err) return err;
        }
        return null;
      }, `${list.length}개 파일을 추가했습니다.`);
      return;
    }
    const text =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (text) run(() => addLinks(text), "유튜브 영상을 추가했습니다.");
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const list = single ? files.slice(0, 1) : files;
    run(async () => {
      for (const f of list) {
        const err = await uploadFile(f);
        if (err) return err;
      }
      return null;
    }, `${list.length}개 파일을 추가했습니다.`);
  }

  function onRemove(id: string) {
    if (!confirm("이 미디어를 삭제할까요?")) return;
    run(async () => {
      const res = await deleteMediaAction(id);
      return res.ok ? null : res.error;
    }, "삭제했습니다.");
  }

  return (
    <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <p className="mb-4 mt-1 text-xs text-white/50">{description}</p>

      {/* 드롭존 */}
      <div
        data-testid={`dropzone-${slot}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          over
            ? "border-brand bg-brand/10"
            : "border-white/20 bg-white/[0.03] hover:border-white/40"
        }`}
      >
        <div className="text-2xl">⬇️</div>
        <p className="text-sm font-semibold text-white">
          {single
            ? "영상 파일 또는 유튜브 링크를 여기에 끌어다 놓으세요"
            : "영상·이미지 파일 또는 유튜브 링크를 여기에 끌어다 놓으세요"}
        </p>
        <p className="text-xs text-white/40">
          파일: mp4·webm·mov·jpg·png·webp·gif (50MB 이하) · 큰 영상은 유튜브 링크로
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mt-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        >
          파일 선택
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple={!single}
          accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,image/gif"
          onChange={onPickFiles}
          className="hidden"
        />
      </div>

      {/* 링크 직접 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = link;
          setLink("");
          run(() => addLinks(v), "유튜브 영상을 추가했습니다.");
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="유튜브 링크 붙여넣기 (https://youtu.be/...)"
          className="flex-1 rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          disabled={busy || !link.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-night transition hover:bg-brand-soft disabled:opacity-50"
        >
          추가
        </button>
      </form>

      {/* 진행/결과 */}
      {busy && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progress ?? 15}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/50">
            {progress !== null ? `업로드 중… ${progress}%` : "처리 중…"}
          </p>
        </div>
      )}
      {message && (
        <p
          data-testid="media-message"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/15 text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 현재 목록 */}
      <div className="mt-4">
        {items.length === 0 ? (
          <p className="text-xs text-white/40">
            {fallbackNote ?? "아직 추가된 미디어가 없습니다."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m) => (
              <li
                key={m.id}
                className="overflow-hidden rounded-lg bg-night ring-1 ring-white/10"
              >
                <div className="relative aspect-video bg-white/[0.05]">
                  {m.kind === "youtube" && m.youtubeId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://i.ytimg.com/vi/${m.youtubeId}/mqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {m.kind === "video" && m.url && (
                    <video
                      src={m.url}
                      muted
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {m.kind === "image" && m.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {m.kind === "youtube"
                      ? "YouTube"
                      : m.kind === "video"
                        ? "영상"
                        : "이미지"}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="flex-1 truncate text-xs text-white/70">
                    {m.title}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove(m.id)}
                    className="text-xs text-white/40 hover:text-red-400 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
