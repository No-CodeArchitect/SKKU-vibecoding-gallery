import Link from "next/link";
import type { Project } from "@/lib/types";

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "new" | "scored" | "mine" | "rank";
}) {
  const styles: Record<typeof tone, string> = {
    new: "bg-gold text-night",
    scored: "bg-emerald-500/20 text-emerald-300",
    mine: "bg-white/10 text-white/70",
    rank: "bg-gold/20 text-gold",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

// AI 심사 점수 미니 표시 (별 1~5)
function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-xs font-bold text-white">{value.toFixed(1)}</span>
      <span className="text-[11px] text-gold">★</span>
    </div>
  );
}

function Thumbnail({ project }: { project: Project }) {
  const failed = project.status === "capture_failed" || !project.signatureImageUrl;
  if (failed) {
    const initial = project.title.trim().charAt(0);
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-white/[0.05]">
        <span className="text-4xl font-black text-white/25">{initial}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={project.signatureImageUrl ?? ""}
      alt={`${project.title} 미리보기`}
      className="aspect-[16/10] w-full object-cover object-top"
    />
  );
}

export default function ProjectCard({
  project,
  hideAiScores = false,
  minRaters,
}: {
  project: Project;
  // 채점 진행 중에는 AI 점수가 교육생 채점에 영향을 주지 않도록 숨긴다
  hideAiScores?: boolean;
  // 순위 공개 후, 최소 인원 미달로 순위에서 빠진 작품 표시용
  minRaters?: number;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-coal ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-gold/40">
      <Link href={`/project/${project.id}`} className="flex flex-1 flex-col">
        <div className="relative">
          <Thumbnail project={project} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {project.rank !== null && <Badge tone="rank">#{project.rank}</Badge>}
            {project.isNew && <Badge tone="new">NEW</Badge>}
          </div>
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
            {project.isMine && <Badge tone="mine">내 작품</Badge>}
            {project.hasScored && <Badge tone="scored">채점완료</Badge>}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-base font-bold leading-snug text-white group-hover:text-gold">
              {project.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/50">
              {project.tagline}
            </p>
          </div>

          <p className="line-clamp-3 text-sm leading-relaxed text-white/60">
            {project.aiSummary}
          </p>

          {project.rank !== null && project.avgScore !== null ? (
            <div className="mt-auto flex items-center justify-between rounded-lg bg-gold/15 px-3 py-2">
              <span className="text-sm font-bold text-gold">
                교육생 평점 {project.avgScore.toFixed(2)}
              </span>
              <span className="text-xs text-white/50">
                {project.raterCount}명 채점
              </span>
            </div>
          ) : minRaters !== undefined ? (
            <div className="mt-auto flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-sm font-semibold text-white/50">채점 부족 · 순위 제외</span>
              <span className="text-xs text-white/40">
                {project.raterCount}명 / 최소 {minRaters}명
              </span>
            </div>
          ) : hideAiScores ? null : (
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
              <ScorePill
                label="완성도"
                value={project.aiReview.scoreCompleteness}
              />
              <ScorePill label="창의성" value={project.aiReview.scoreCreativity} />
              <span className="ml-auto text-xs text-white/40">AI 심사</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-white/70">
          {project.authorName}
        </span>
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gold hover:text-gold-soft"
        >
          사이트 열기 ↗
        </a>
      </div>
    </article>
  );
}
