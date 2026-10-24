import type { Comment } from "@/lib/comments-store";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-white/40">
        아직 댓글이 없습니다. 첫 코멘트를 남겨보세요!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(
              c.aiNickname
            )}`}
          >
            {c.aiNickname.trim().charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">
                {c.aiNickname}
              </span>
              {c.isAuthorReply && (
                <span className="inline-flex items-center rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                  제작자
                </span>
              )}
              <span className="text-xs text-white/40">
                {relativeTime(c.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70">
              {c.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
