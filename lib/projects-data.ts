// 작품(프로젝트) 저장소 — 참가자가 사이트에서 직접 "작품 등록" → DB(projects 테이블).
// 썸네일은 참가자가 직접 올린다(관리자가 교체 가능). 관리자가 "분석 실행"을 누르면
// AI 분석 결과가 채워지고, 그때 카드로 공개된다.
//
// - Supabase + projects 테이블이 있으면 그걸 쓴다.
// - 없거나 오류면 인메모리 + (예전) data/projects.json 또는 더미로 폴백 (로컬 데모용).

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Project, ProjectStatus } from "./types";
import { dummyProjects } from "./dummy-data";
import { getSupabase } from "./supabase";

// ---- 참가자 입력 ----
export interface Submission {
  title: string;
  tagline: string;
  liveUrl: string;
  repoUrl: string;
  problem: string;
  features: string;
  techStack: string;
  militaryUseCase: string;
  notes: string;
}

// ---- AI 분석 결과 ----
export interface AiResult {
  summary: string;
  features: string[];
  highlights: string;
  tagline: string;
  completeness: number;
  creativity: number;
  rationale: string;
  mock: boolean; // API 키 없이 규칙 기반으로 만든 결과
}

export type RecordStatus =
  | "pending" // 등록됨, 아직 분석 전
  | "processing" // 분석 중
  | "generated" // 분석 완료
  | "capture_failed" // 분석 완료, 스크린샷만 실패
  | "failed"; // 분석 실패 (error 참고)

export interface ProjectRecord {
  id: string;
  cohortId: string;
  authorId: string;
  authorName: string;
  submission: Submission;
  status: RecordStatus;
  needsAnalysis: boolean; // 새 등록/수정 후 아직 분석 안 됨
  ai: AiResult | null; // null이면 갤러리에 아직 안 보임
  thumbUrl: string | null; // 참가자가 올린 썸네일(대표 이미지) 공개 URL
  thumbPath: string | null; // 스토리지 경로 (교체·삭제용)
  error: string | null;
  submittedAt: string;
  updatedAt: string;
  analyzedAt: string | null;
  publishedAt: string | null;
}

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000; // 공개 후 24시간 NEW

export function recordIdFor(authorId: string): string {
  return `pj_${authorId}`; // 1 참가자 : 1 작품
}

// ---- 공개 카드로 변환 ----
function toProject(r: ProjectRecord): Project {
  const ai = r.ai!;
  const status: ProjectStatus = r.thumbUrl ? "generated" : "capture_failed"; // capture_failed = 썸네일 없음
  const publishedAt = r.publishedAt ?? r.updatedAt;
  return {
    id: r.id,
    cohortId: r.cohortId,
    title: r.submission.title,
    tagline: r.submission.tagline || ai.tagline,
    authorId: r.authorId,
    authorName: r.authorName,
    liveUrl: r.submission.liveUrl,
    repoUrl: r.submission.repoUrl || undefined,
    signatureImageUrl: r.thumbUrl,
    aiSummary: ai.summary,
    features: ai.features,
    status,
    publishedAt,
    aiReview: {
      scoreCompleteness: ai.completeness,
      scoreCreativity: ai.creativity,
      rationale: ai.rationale,
    },
    details: {
      problem: r.submission.problem,
      militaryUseCase: r.submission.militaryUseCase,
      techStack: r.submission.techStack,
      notes: r.submission.notes,
      highlights: ai.highlights,
    },
    isNew: Date.now() - new Date(publishedAt).getTime() < NEW_WINDOW_MS,
    hasScored: false,
    isMine: false,
    rank: null,
    totalScore: null,
    raterCount: 0,
  };
}

// ---- Supabase 행 매핑 ----
type Row = {
  id: string;
  cohort_id: string;
  author_id: string;
  author_name: string;
  submission: Submission;
  status: RecordStatus;
  needs_analysis: boolean;
  ai: AiResult | null;
  thumb_url: string | null;
  thumb_path: string | null;
  error: string | null;
  submitted_at: string;
  updated_at: string;
  analyzed_at: string | null;
  published_at: string | null;
};

const fromRow = (r: Row): ProjectRecord => ({
  id: r.id,
  cohortId: r.cohort_id,
  authorId: r.author_id,
  authorName: r.author_name,
  submission: r.submission,
  status: r.status,
  needsAnalysis: r.needs_analysis,
  ai: r.ai,
  thumbUrl: r.thumb_url,
  thumbPath: r.thumb_path,
  error: r.error,
  submittedAt: r.submitted_at,
  updatedAt: r.updated_at,
  analyzedAt: r.analyzed_at,
  publishedAt: r.published_at,
});

const toRow = (r: ProjectRecord): Row => ({
  id: r.id,
  cohort_id: r.cohortId,
  author_id: r.authorId,
  author_name: r.authorName,
  submission: r.submission,
  status: r.status,
  needs_analysis: r.needsAnalysis,
  ai: r.ai,
  thumb_url: r.thumbUrl,
  thumb_path: r.thumbPath,
  error: r.error,
  submitted_at: r.submittedAt,
  updated_at: r.updatedAt,
  analyzed_at: r.analyzedAt,
  published_at: r.publishedAt,
});

// ---- 폴백 (테이블 없음) ----
const g = globalThis as unknown as { __vgProjects?: ProjectRecord[] };
const mem: ProjectRecord[] = g.__vgProjects ?? (g.__vgProjects = []);

// 예전 방식(sync가 만든 data/projects.json) 또는 더미 — 테이블이 없을 때만 보인다.
function legacyProjects(): Project[] {
  const file = path.resolve(process.cwd(), "data/projects.json");
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(data) && data.length > 0) {
        return (data as Project[]).map((p) => ({ ...p, cohortId: p.cohortId ?? "c1" }));
      }
    }
  } catch {
    /* 손상 → 더미 */
  }
  return dummyProjects;
}

// 전체 레코드 (null = 테이블 사용 불가 → 폴백)
async function dbRecords(cohortId?: string): Promise<ProjectRecord[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let q = sb.from("projects").select("*");
    if (cohortId) q = q.eq("cohort_id", cohortId);
    const { data, error } = await q;
    if (error || !data) return null;
    return (data as Row[]).map(fromRow);
  } catch {
    return null;
  }
}

// ---- 조회: 공개 카드 ----

// cohortId 생략 시 전체, 지정 시 해당 섹션만. 분석이 끝난(공개된) 작품만.
export async function getProjects(cohortId?: string): Promise<Project[]> {
  const rows = await dbRecords(cohortId);
  if (rows) return rows.filter((r) => r.ai).map(toProject);
  const legacy = legacyProjects().filter((p) => !cohortId || p.cohortId === cohortId);
  const fromMem = mem
    .filter((r) => r.ai && (!cohortId || r.cohortId === cohortId))
    .map(toProject);
  const memAuthors = new Set(fromMem.map((p) => p.authorId));
  return [...legacy.filter((p) => !memAuthors.has(p.authorId)), ...fromMem];
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const r = await getRecord(id);
  if (r) return r.ai ? toProject(r) : undefined;
  return (await getProjects()).find((p) => p.id === id); // 폴백(예전 데이터/더미)
}

// ---- 조회: 등록 레코드 (관리자·본인) ----

export async function getRecord(id: string): Promise<ProjectRecord | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error) return data ? fromRow(data as Row) : null;
    } catch {
      /* 폴백 */
    }
  }
  return mem.find((r) => r.id === id) ?? null;
}

export async function getRecordByAuthor(authorId: string): Promise<ProjectRecord | null> {
  return getRecord(recordIdFor(authorId));
}

// 섹션의 모든 등록 (분석 전 포함), 최근 등록순.
export async function listRecords(cohortId: string): Promise<ProjectRecord[]> {
  const rows =
    (await dbRecords(cohortId)) ?? mem.filter((r) => r.cohortId === cohortId);
  return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---- 쓰기 ----

// 배포본(Vercel)에서는 저장 실패를 숨기지 않는다 — 인메모리는 요청마다 사라지므로.
const isDeployed = !!process.env.VERCEL;

async function put(rec: ProjectRecord): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    let message = "";
    try {
      const { error } = await sb.from("projects").upsert(toRow(rec));
      if (!error) return;
      message = error.message;
    } catch (err) {
      message = (err as Error).message;
    }
    const tableMissing = /does not exist|schema cache/i.test(message);
    if (isDeployed || !tableMissing) {
      throw new Error(
        tableMissing
          ? "projects 테이블이 없습니다 (SUPABASE_MIGRATION_PROJECTS.md 의 SQL 실행 필요)"
          : message
      );
    }
  }
  const i = mem.findIndex((r) => r.id === rec.id);
  if (i >= 0) mem[i] = rec;
  else mem.push(rec);
}

// 참가자 등록/수정. 기존 분석 결과는 유지하고 "재분석 필요"로 표시한다.
export async function saveSubmission(input: {
  cohortId: string;
  authorId: string;
  authorName: string;
  submission: Submission;
  thumb?: { url: string; path: string }; // 새로 올린 썸네일 (없으면 기존 유지)
}): Promise<ProjectRecord> {
  const id = recordIdFor(input.authorId);
  const prev = await getRecord(id);
  const now = new Date().toISOString();
  const rec: ProjectRecord = prev
    ? {
        ...prev,
        authorName: input.authorName,
        submission: input.submission,
        ...(input.thumb ? { thumbUrl: input.thumb.url, thumbPath: input.thumb.path } : {}),
        needsAnalysis: true,
        status: prev.ai ? prev.status : "pending",
        error: null,
        updatedAt: now,
      }
    : {
        id,
        cohortId: input.cohortId,
        authorId: input.authorId,
        authorName: input.authorName,
        submission: input.submission,
        status: "pending",
        needsAnalysis: true,
        ai: null,
        thumbUrl: input.thumb?.url ?? null,
        thumbPath: input.thumb?.path ?? null,
        error: null,
        submittedAt: now,
        updatedAt: now,
        analyzedAt: null,
        publishedAt: null,
      };
  await put(rec);
  return rec;
}

export async function updateRecord(
  id: string,
  patch: Partial<Omit<ProjectRecord, "id" | "cohortId" | "authorId">>
): Promise<ProjectRecord | null> {
  const prev = await getRecord(id);
  if (!prev) return null;
  const next = { ...prev, ...patch };
  await put(next);
  return next;
}

export async function deleteRecord(id: string): Promise<ProjectRecord | null> {
  const prev = await getRecord(id);
  if (!prev) return null;
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("projects").delete().eq("id", id);
      if (!error) return prev;
    } catch {
      /* 폴백 */
    }
  }
  const i = mem.findIndex((r) => r.id === id);
  if (i >= 0) mem.splice(i, 1);
  return prev;
}
