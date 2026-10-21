"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1600; // 긴 변 최대 픽셀 (카드·상세 화면에 충분)
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

// 큰 이미지는 브라우저에서 줄여서 올린다 (업로드 빠르고 저장 공간 절약).
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close();
    return file; // 이미 충분히 작음
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.88));
  // webp 인코딩을 못 하는 브라우저는 png로 돌려주므로 jpeg로 다시 시도
  if (blob && blob.type === "image/webp") return blob;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!jpeg) throw new Error("이미지 변환에 실패했습니다.");
  return jpeg;
}

function extOf(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

function put(url: string, blob: Blob, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("cacheControl", "86400");
    fd.append("", blob); // Supabase 서명 업로드 규약: 필드명은 빈 문자열
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패 (${xhr.status})`));
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
    xhr.send(fd);
  });
}

export default function ThumbnailUploader({
  currentUrl,
  recordId,
  cohortId,
  disabled,
  compact,
  onUploaded,
}: {
  currentUrl: string | null;
  recordId?: string; // 관리자가 다른 작품 썸네일을 바꿀 때
  cohortId?: string; // 참가자: 본인 작품이 속한 섹션
  disabled?: boolean;
  compact?: boolean;
  onUploaded: (path: string, url: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function handle(file: File | undefined) {
    if (!file || disabled) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) return setError("jpg·png·webp 이미지만 올릴 수 있습니다.");
    if (file.size > MAX_INPUT_BYTES) return setError("이미지가 너무 큽니다 (20MB 이하).");
    try {
      setProgress(0);
      const blob = await shrink(file);
      const res = await fetch("/api/thumb/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ext: extOf(blob.type), size: blob.size, recordId, cohortId }),
      });
      const sign = await res.json();
      if (!res.ok) throw new Error(sign.error || `HTTP ${res.status}`);
      await put(sign.signedUrl, blob, setProgress);
      setPreview(URL.createObjectURL(blob));
      await onUploaded(sign.path, sign.publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
          compact ? "max-w-[160px]" : ""
        } ${over ? "border-gold bg-gold/10" : "border-white/15 bg-coal-soft"} ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gold/60"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="썸네일 미리보기" className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : (
          <div className="px-4 text-center">
            <div className={compact ? "text-lg" : "text-2xl"}>🖼️</div>
            {!compact && (
              <>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  썸네일 이미지를 끌어다 놓거나 클릭해서 선택
                </p>
                <p className="mt-1 text-xs text-white/40">가로형 16:10 권장 (예: 1280×800) · jpg·png·webp</p>
              </>
            )}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-night/70 text-sm font-bold text-gold">
            {progress}%
          </div>
        )}
        {preview && !busy && !disabled && !compact && (
          <span className="absolute bottom-2 right-2 rounded-full bg-night/80 px-2.5 py-1 text-xs font-semibold text-white/80">
            클릭해서 바꾸기
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
