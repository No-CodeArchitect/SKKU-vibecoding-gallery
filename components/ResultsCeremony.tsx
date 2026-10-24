"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ScoreBreakdown } from "@/lib/types";
import { AI_SCORE_MAX, SCORE_MAX, type Weights } from "@/lib/scoring";
import { publishResultsAction } from "@/lib/admin-actions";

export interface CeremonyEntry {
  id: string;
  rank: number;
  title: string;
  tagline: string;
  authorName: string;
  imageUrl: string | null;
  total: number;
  raterCount: number;
  breakdown: ScoreBreakdown;
}

type Stage =
  | { kind: "intro" }
  | { kind: "suspense"; idx: number }
  | { kind: "reveal"; idx: number }
  | { kind: "final" };

// 순위별 연출: 아래로 갈수록 길고 화려하게
const STYLE: Record<number, {
  medal: string;
  text: string;
  ring: string;
  glow: string;
  colors: string[];
  suspenseMs: number;
}> = {
  1: {
    medal: "🥇",
    text: "text-trophy",
    ring: "ring-trophy",
    glow: "shadow-[0_0_120px_20px_rgba(226,181,68,0.45)]",
    colors: ["#e2b544", "#f5d27a", "#8dc63f", "#fff3c4", "#ffffff", "#ff7a7a", "#6ee7d8"],
    suspenseMs: 5600,
  },
  2: {
    medal: "🥈",
    text: "text-slate-200",
    ring: "ring-slate-300",
    glow: "shadow-[0_0_80px_10px_rgba(203,213,225,0.3)]",
    colors: ["#cbd5e1", "#e2e8f0", "#94a3b8", "#ffffff"],
    suspenseMs: 3600,
  },
  3: {
    medal: "🥉",
    text: "text-orange-300",
    ring: "ring-orange-400",
    glow: "shadow-[0_0_70px_8px_rgba(251,146,60,0.28)]",
    colors: ["#cd7f32", "#e8a165", "#ffd7a8", "#ffffff"],
    suspenseMs: 2800,
  },
};

export default function ResultsCeremony({
  cohortId,
  cohortName,
  slug,
  rankRevealed,
  scoringOpen,
  entries,
  unrankedCount,
  minRaters,
  weights,
}: {
  weights: Weights;
  cohortId: string;
  cohortName: string;
  slug: string;
  rankRevealed: boolean;
  scoringOpen: boolean;
  entries: CeremonyEntry[];
  unrankedCount: number;
  minRaters: number;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [muted, setMuted] = useState(false);
  const [published, setPublished] = useState(rankRevealed);
  const [publishing, startPublish] = useTransition();

  // 3위 → 2위 → 1위 순으로 발표
  const order = useMemo(() => entries.slice(0, 3).reverse(), [entries]);

  const confetti = useRef<Confetti | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sound = useRef<CeremonySound | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    confetti.current = new Confetti(canvasRef.current);
    return () => confetti.current?.destroy();
  }, []);

  useEffect(() => {
    sound.current?.setMuted(muted);
  }, [muted]);

  const next = useCallback(() => {
    setStage((s) => {
      if (s.kind === "intro") {
        sound.current ??= new CeremonySound();
        sound.current.setMuted(muted);
        return order.length > 0 ? { kind: "suspense", idx: 0 } : { kind: "final" };
      }
      if (s.kind === "reveal") {
        return s.idx + 1 < order.length ? { kind: "suspense", idx: s.idx + 1 } : { kind: "final" };
      }
      return s;
    });
  }, [order.length, muted]);

  // 두구두구 → 자동으로 공개
  useEffect(() => {
    if (stage.kind !== "suspense") return;
    const entry = order[stage.idx];
    const ms = STYLE[entry.rank]?.suspenseMs ?? 3000;
    sound.current?.drumroll(ms / 1000);
    const t = setTimeout(() => setStage({ kind: "reveal", idx: stage.idx }), ms);
    return () => clearTimeout(t);
  }, [stage, order]);

  // 공개 순간: 효과음 + 폭죽
  useEffect(() => {
    const c = confetti.current;
    if (stage.kind === "reveal") {
      const rank = order[stage.idx].rank;
      const colors = STYLE[rank]?.colors ?? STYLE[3].colors;
      sound.current?.reveal(rank);
      if (rank === 1) {
        c?.burst(0.5, 0.45, 260, colors, 22);
        const t1 = setTimeout(() => {
          c?.burst(0.12, 0.85, 140, colors, 26, -60);
          c?.burst(0.88, 0.85, 140, colors, 26, -120);
        }, 350);
        const t2 = setTimeout(() => c?.rain(7000, colors), 700);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
      c?.burst(0.5, 0.5, rank === 2 ? 170 : 110, colors, rank === 2 ? 18 : 15);
    }
    if (stage.kind === "final" && order.length > 0) {
      c?.rain(3500, STYLE[1].colors);
    }
  }, [stage, order]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea")) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0e12] text-white">
      {/* 무대 조명 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(141,198,63,0.14),transparent_60%)]" />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-40 h-full w-full" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold">{cohortName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
              aria-label={muted ? "소리 켜기" : "소리 끄기"}
            >
              {muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              ⛶ 전체화면
            </button>
            <Link href="/admin" className="text-xs text-white/40 hover:text-white">
              관리자 →
            </Link>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          {stage.kind === "intro" && (
            <Intro
              count={entries.length}
              unrankedCount={unrankedCount}
              minRaters={minRaters}
              scoringOpen={scoringOpen}
              weights={weights}
              onStart={next}
            />
          )}
          {stage.kind === "suspense" && (
            <Suspense key={`s${stage.idx}`} rank={order[stage.idx].rank} ms={STYLE[order[stage.idx].rank].suspenseMs} />
          )}
          {stage.kind === "reveal" && (
            <Reveal
              key={`r${stage.idx}`}
              entry={order[stage.idx]}
              weights={weights}
              isLast={stage.idx + 1 >= order.length}
              onNext={next}
            />
          )}
          {stage.kind === "final" && (
            <Final
              entries={entries}
              slug={slug}
              published={published}
              publishing={publishing}
              onPublish={() =>
                startPublish(async () => {
                  await publishResultsAction(cohortId);
                  setPublished(true);
                })
              }
              onRestart={() => setStage({ kind: "intro" })}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Intro({
  count,
  unrankedCount,
  minRaters,
  scoringOpen,
  weights: WEIGHTS,
  onStart,
}: {
  count: number;
  unrankedCount: number;
  minRaters: number;
  scoringOpen: boolean;
  weights: Weights;
  onStart: () => void;
}) {
  return (
    <div className="ceremony-rise flex flex-col items-center text-center">
      <div className="text-6xl sm:text-7xl">🏆</div>
      <p className="mt-6 text-sm font-bold tracking-[0.3em] text-brand">SKKU VIBE CODING HACKATHON</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">최종 결과 발표</h1>
      <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
        <WeightChip label="동료평가" value={WEIGHTS.peer} />
        <WeightChip label="심사위원" value={WEIGHTS.judge} />
        <WeightChip label="AI 평가" value={WEIGHTS.ai} />
      </div>
      <p className="mt-6 text-sm text-white/50">
        순위 대상 {count}개 작품
        {unrankedCount > 0 && ` · 동료평가 ${minRaters}명 미만 ${unrankedCount}개 제외`}
      </p>
      {scoringOpen && (
        <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300">
          동료평가가 아직 열려 있습니다. 관리자 화면의 「결과 발표」 버튼으로 들어오면 자동 마감됩니다.
        </p>
      )}
      {count === 0 ? (
        <p className="mt-10 text-white/60">아직 순위에 든 작품이 없습니다.</p>
      ) : (
        <button
          onClick={onStart}
          className="mt-10 rounded-full bg-brand px-10 py-4 text-lg font-black text-night shadow-[0_0_40px_rgba(141,198,63,0.45)] transition hover:scale-105 hover:bg-brand-soft"
        >
          발표 시작 ▶
        </button>
      )}
      <p className="mt-4 text-xs text-white/30">스페이스바·→ 키로도 진행할 수 있어요</p>
    </div>
  );
}

function WeightChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white/5 px-4 py-1.5 ring-1 ring-white/15">
      {label} <b className="text-brand">{value}</b>
    </span>
  );
}

function Suspense({ rank, ms }: { rank: number; ms: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (rank !== 1) return;
    // 1위는 마지막 3초 카운트다운
    const timers = [3, 2, 1].map((n, i) => setTimeout(() => setCount(n), ms - 3000 + i * 1000));
    return () => timers.forEach(clearTimeout);
  }, [rank, ms]);

  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="ceremony-beam pointer-events-none absolute left-1/2 top-1/2 h-[140vh] w-[140vh] -translate-x-1/2 -translate-y-1/2 opacity-60" />
      <p className="relative text-lg font-bold text-white/60">
        {rank === 1 ? "대망의" : "이번에 발표할 순위는"}
      </p>
      <div
        className={`ceremony-heartbeat relative mt-4 text-8xl font-black transition duration-500 sm:text-9xl ${STYLE[rank].text} ${
          count !== null ? "opacity-20 blur-sm" : ""
        }`}
        style={{ animationDuration: rank === 1 ? "0.6s" : "0.9s" }}
      >
        {rank}위
      </div>
      <p
        className={`ceremony-shake relative mt-8 text-2xl font-black tracking-widest text-white/80 transition duration-500 ${
          count !== null ? "opacity-0" : ""
        }`}
      >
        두구두구두구…
      </p>
      <div className="relative mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
        <div
          className="ceremony-progress h-full rounded-full bg-brand"
          style={{ animationDuration: `${ms}ms` }}
        />
      </div>
      {count !== null && (
        <div
          key={count}
          className="ceremony-count pointer-events-none absolute inset-0 flex items-center justify-center text-[12rem] font-black text-white/90"
        >
          {count}
        </div>
      )}
    </div>
  );
}

function Reveal({
  entry,
  weights: WEIGHTS,
  isLast,
  onNext,
}: {
  entry: CeremonyEntry;
  weights: Weights;
  isLast: boolean;
  onNext: () => void;
}) {
  const s = STYLE[entry.rank];
  const score = useCountUp(entry.total, entry.rank === 1 ? 2600 : 1800, 700);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 900);
    return () => clearTimeout(t);
  }, []);
  const b = entry.breakdown;

  return (
    <div className="relative flex w-full flex-col items-center text-center">
      <div className="ceremony-flash pointer-events-none fixed inset-0 z-30 bg-white" />
      {entry.rank === 1 && (
        <div className="ceremony-rays pointer-events-none absolute left-1/2 top-1/3 h-[160vh] w-[160vh] -translate-x-1/2 -translate-y-1/2" />
      )}

      <div className="ceremony-drop relative text-8xl sm:text-9xl">{s.medal}</div>
      <p className={`relative mt-2 text-2xl font-black tracking-widest ${s.text}`}>
        제 {entry.rank}위
      </p>

      <div
        className={`ceremony-pop relative mt-6 w-full max-w-2xl overflow-hidden rounded-3xl bg-coal ring-2 ${s.ring} ${s.glow}`}
      >
        {entry.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.imageUrl} alt="" className="aspect-[16/7] w-full object-cover object-top" />
        )}
        <div className="p-6 sm:p-8">
          <h2 className="text-3xl font-black leading-tight sm:text-5xl">{entry.title}</h2>
          {entry.tagline && <p className="mt-2 text-white/60">{entry.tagline}</p>}
          <p className="mt-3 text-lg font-bold text-white/80">{entry.authorName}</p>

          <div className={`mt-6 text-6xl font-black tabular-nums sm:text-7xl ${s.text}`}>
            {score.toFixed(1)}
            <span className="ml-1 text-2xl text-white/40">/ 100</span>
          </div>

          <div className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 text-left text-sm">
            <Bar
              label="동료평가"
              points={b.peerPoints}
              max={WEIGHTS.peer}
              detail={b.peerAvg !== null ? `평균 ${b.peerAvg.toFixed(2)}/${SCORE_MAX} · ${entry.raterCount}명` : "평가 없음"}
              filled={filled}
              delay={0}
            />
            <Bar
              label="심사위원"
              points={b.judgePoints}
              max={WEIGHTS.judge}
              detail={b.judgeAvg !== null ? `평균 ${b.judgeAvg.toFixed(2)}/${SCORE_MAX} · ${b.judgeCount}명` : "평가 없음"}
              filled={filled}
              delay={250}
            />
            <Bar
              label="AI 평가"
              points={b.aiPoints}
              max={WEIGHTS.ai}
              detail={`평균 ${b.aiAvg.toFixed(1)}/${AI_SCORE_MAX}`}
              filled={filled}
              delay={500}
            />
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="ceremony-rise relative mt-8 rounded-full bg-white/10 px-8 py-3 text-sm font-bold ring-1 ring-white/20 transition hover:bg-white/20"
        style={{ animationDelay: "2.4s" }}
      >
        {isLast ? "전체 결과 보기 →" : "다음 순위 발표 →"}
      </button>
    </div>
  );
}

function Bar({
  label,
  points,
  max,
  detail,
  filled,
  delay,
}: {
  label: string;
  points: number;
  max: number;
  detail: string;
  filled: boolean;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-white/80">
          {label} <span className="text-xs font-normal text-white/40">{detail}</span>
        </span>
        <span className="font-bold tabular-nums text-white">
          {points.toFixed(1)}
          <span className="text-white/40"> / {max}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-soft transition-[width] duration-1000 ease-out"
          style={{ width: filled ? `${(points / max) * 100}%` : "0%", transitionDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function Final({
  entries,
  slug,
  published,
  publishing,
  onPublish,
  onRestart,
}: {
  entries: CeremonyEntry[];
  slug: string;
  published: boolean;
  publishing: boolean;
  onPublish: () => void;
  onRestart: () => void;
}) {
  const podium = [entries[1], entries[0], entries[2]]; // 2위 · 1위 · 3위 배치
  const heights: Record<number, string> = { 1: "h-40", 2: "h-28", 3: "h-20" };
  const rest = entries.slice(3);

  return (
    <div className="w-full">
      <h1 className="ceremony-rise text-center text-4xl font-black tracking-tight sm:text-5xl">최종 순위</h1>

      {entries.length > 0 && (
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 items-end gap-3">
          {podium.map((p, i) =>
            p ? (
              <div key={p.id} className="flex flex-col items-center text-center">
                <div className="ceremony-rise" style={{ animationDelay: `${600 + i * 200}ms` }}>
                  <div className="text-4xl sm:text-5xl">{STYLE[p.rank].medal}</div>
                  <div className="mt-2 line-clamp-2 text-sm font-black sm:text-lg">{p.title}</div>
                  <div className="text-xs text-white/50">{p.authorName}</div>
                  <div className={`mt-1 text-xl font-black tabular-nums ${STYLE[p.rank].text}`}>
                    {p.total.toFixed(1)}
                  </div>
                </div>
                <div
                  className={`ceremony-grow mt-3 w-full rounded-t-xl ${heights[p.rank]} ${
                    p.rank === 1 ? "bg-trophy/80" : p.rank === 2 ? "bg-slate-300/50" : "bg-orange-400/40"
                  } flex items-start justify-center pt-2 text-2xl font-black text-night`}
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {p.rank}
                </div>
              </div>
            ) : (
              <div key={`empty${i}`} />
            )
          )}
        </div>
      )}

      {rest.length > 0 && (
        <ul className="mx-auto mt-8 max-w-3xl divide-y divide-white/10 rounded-2xl bg-white/5">
          {rest.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-8 text-center text-lg font-black text-white/50">{p.rank}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.title}</div>
                <div className="text-xs text-white/50">
                  {p.authorName} · 동료 {p.breakdown.peerPoints.toFixed(1)} · 심사 {p.breakdown.judgePoints.toFixed(1)} · AI{" "}
                  {p.breakdown.aiPoints.toFixed(1)}
                </div>
              </div>
              <div className="text-lg font-black tabular-nums text-brand">{p.total.toFixed(1)}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {published ? (
          <Link
            href={`/g/${slug}`}
            className="rounded-full bg-emerald-500/20 px-6 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/40"
          >
            ✓ 갤러리에 순위 공개됨 · 갤러리 보기
          </Link>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="rounded-full bg-brand px-6 py-3 text-sm font-black text-night transition hover:bg-brand-soft disabled:opacity-60"
          >
            {publishing ? "공개 중…" : "🏆 갤러리에 순위 공개"}
          </button>
        )}
        <button
          onClick={onRestart}
          className="rounded-full bg-white/10 px-6 py-3 text-sm font-bold ring-1 ring-white/20 hover:bg-white/20"
        >
          처음부터 다시
        </button>
      </div>
    </div>
  );
}

function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);
  return v;
}

// ---- 폭죽 (캔버스, 라이브러리 없음) ----
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
  wobble: number;
}

class Confetti {
  private ctx: CanvasRenderingContext2D | null;
  private parts: Particle[] = [];
  private raf = 0;
  private rainUntil = 0;
  private rainColors: string[] = [];
  private scale: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
    this.scale = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.25 : 1;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private resize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private spawn(x: number, y: number, vx: number, vy: number, colors: string[]) {
    this.parts.push({
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  // (fx, fy): 화면 비율 위치, angleDeg: 발사 방향 (기본 위쪽 전방위)
  burst(fx: number, fy: number, count: number, colors: string[], power: number, angleDeg?: number) {
    const x = window.innerWidth * fx;
    const y = window.innerHeight * fy;
    const n = Math.round(count * this.scale);
    for (let i = 0; i < n; i++) {
      const a =
        angleDeg === undefined
          ? Math.random() * Math.PI * 2
          : ((angleDeg + (Math.random() - 0.5) * 50) * Math.PI) / 180;
      const sp = power * (0.35 + Math.random() * 0.75);
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 4, colors);
    }
    this.loop();
  }

  rain(durationMs: number, colors: string[]) {
    this.rainUntil = performance.now() + durationMs;
    this.rainColors = colors;
    this.loop();
  }

  private loop() {
    if (this.raf) return;
    const step = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (performance.now() < this.rainUntil) {
        const n = Math.max(1, Math.round(4 * this.scale));
        for (let i = 0; i < n; i++) {
          this.spawn(Math.random() * W, -20, (Math.random() - 0.5) * 2, 2 + Math.random() * 3, this.rainColors);
        }
      }
      ctx.clearRect(0, 0, W, H);
      for (const p of this.parts) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.wobble += 0.12;
        p.x += p.vx + Math.sin(p.wobble) * 0.8;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > H * 0.75) p.life -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, (-p.h / 2) * Math.abs(Math.cos(p.wobble)), p.w, p.h * Math.abs(Math.cos(p.wobble)));
        ctx.restore();
      }
      this.parts = this.parts.filter((p) => p.life > 0 && p.y < H + 40);
      if (this.parts.length > 0 || performance.now() < this.rainUntil) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.raf = 0;
        ctx.clearRect(0, 0, W, H);
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }
}

// ---- 효과음 (Web Audio로 합성, 파일 없음) ----
class CeremonySound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  constructor() {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
  }

  private hit(at: number, vol: number, decay: number, freq: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, at + decay);
    src.connect(f).connect(g).connect(this.master!);
    src.start(at, Math.random() * 0.5, decay + 0.05);
  }

  // 스네어 롤: 점점 크게
  drumroll(seconds: number) {
    if (!this.ctx) return;
    void this.ctx.resume();
    const t0 = this.ctx.currentTime + 0.02;
    for (let t = 0; t < seconds; t += 0.045) {
      const p = t / seconds;
      this.hit(t0 + t, 0.08 + p * 0.45, 0.06, 1800);
    }
  }

  private tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sawtooth") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.02);
    g.gain.setValueAtTime(vol, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(f).connect(g).connect(this.master!);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  // 심벌 + 팡파르 (1위일수록 길고 웅장하게)
  reveal(rank: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    this.hit(t, 0.9, 0.25, 180); // 킥
    this.hit(t, 0.5, rank === 1 ? 2.2 : 1.4, 7000); // 심벌
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
    const notes = rank === 1 ? [C5, E5, G5, C6] : rank === 2 ? [E5, G5, C6] : [G5, C6];
    notes.forEach((n, i) => this.tone(n, t + i * 0.13, 0.22, 0.12));
    const end = t + notes.length * 0.13;
    const chordDur = rank === 1 ? 2.4 : 1.2;
    [C5, E5, G5].forEach((n) => this.tone(n, end, chordDur, 0.08));
    if (rank === 1) this.tone(C6, end, chordDur, 0.06, "triangle");
  }
}
