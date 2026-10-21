// 섹션 가입(회원) 저장소 — 구글 로그인한 사람이 섹션에 가입 신청 → 관리자가 수락.
// membership.id 가 그 섹션에서의 "참가자 ID"다 (채점·댓글·작품의 작성자 ID로 쓰인다).
// Supabase memberships 테이블. 배포본에서는 저장 실패를 숨기지 않는다.

import "server-only";
import { getSupabase } from "./supabase";

export type MembershipStatus = "pending" | "approved" | "rejected";

export interface Membership {
  id: string;
  cohortId: string;
  googleSub: string;
  email: string;
  googleName: string;
  realName: string; // 관리자만 봄
  nickname: string; // 사이트에 표시되는 이름
  status: MembershipStatus;
  createdAt: string;
  decidedAt: string | null;
}

type Row = {
  id: string;
  cohort_id: string;
  google_sub: string;
  email: string;
  google_name: string;
  real_name: string;
  nickname: string;
  status: MembershipStatus;
  created_at: string;
  decided_at: string | null;
};

const fromRow = (r: Row): Membership => ({
  id: r.id,
  cohortId: r.cohort_id,
  googleSub: r.google_sub,
  email: r.email,
  googleName: r.google_name,
  realName: r.real_name,
  nickname: r.nickname,
  status: r.status,
  createdAt: r.created_at,
  decidedAt: r.decided_at,
});

const toRow = (m: Membership): Row => ({
  id: m.id,
  cohort_id: m.cohortId,
  google_sub: m.googleSub,
  email: m.email,
  google_name: m.googleName,
  real_name: m.realName,
  nickname: m.nickname,
  status: m.status,
  created_at: m.createdAt,
  decided_at: m.decidedAt,
});

const g = globalThis as unknown as { __vgMemberships?: Membership[] };
const mem: Membership[] = g.__vgMemberships ?? (g.__vgMemberships = []);
const isDeployed = !!process.env.VERCEL;
const TABLE_HINT = "memberships 테이블이 없습니다 (SUPABASE_MIGRATION_MEMBERS.md 의 SQL 실행 필요)";

// 조회: 테이블이 없으면(로컬) null → 인메모리 사용
async function query(filter: Partial<Pick<Row, "id" | "cohort_id" | "google_sub">>): Promise<Membership[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    let q = sb.from("memberships").select("*");
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as string);
    const { data, error } = await q.order("created_at", { ascending: true });
    if (error || !data) {
      if (error && (isDeployed || !/does not exist|schema cache/i.test(error.message))) {
        throw new Error(error.message);
      }
      return null;
    }
    return (data as Row[]).map(fromRow);
  } catch (err) {
    if (isDeployed) throw err;
    return null;
  }
}

function memFilter(filter: Partial<Pick<Membership, "id" | "cohortId" | "googleSub">>): Membership[] {
  return mem
    .filter((m) => Object.entries(filter).every(([k, v]) => m[k as keyof Membership] === v))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function put(m: Membership): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("memberships").upsert(toRow(m));
    if (!error) return;
    const missing = /does not exist|schema cache/i.test(error.message);
    if (isDeployed || !missing) throw new Error(missing ? TABLE_HINT : error.message);
  }
  const i = mem.findIndex((x) => x.id === m.id);
  if (i >= 0) mem[i] = m;
  else mem.push(m);
}

export async function getMembershipById(id: string): Promise<Membership | null> {
  return ((await query({ id })) ?? memFilter({ id }))[0] ?? null;
}

// 이 구글 계정의 이 섹션 가입 정보
export async function getMembership(cohortId: string, googleSub: string): Promise<Membership | null> {
  return (
    ((await query({ cohort_id: cohortId, google_sub: googleSub })) ??
      memFilter({ cohortId, googleSub }))[0] ?? null
  );
}

// 이 구글 계정의 모든 섹션 가입 (내 계정 화면)
export async function listMembershipsOf(googleSub: string): Promise<Membership[]> {
  return (await query({ google_sub: googleSub })) ?? memFilter({ googleSub });
}

// 섹션의 모든 가입 (관리자)
export async function listMemberships(cohortId: string): Promise<Membership[]> {
  return (await query({ cohort_id: cohortId })) ?? memFilter({ cohortId });
}

function normNick(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

// 가입 신청 (이미 있으면 정보 갱신 후 다시 대기). 닉네임은 섹션 안에서 중복 불가.
export async function requestMembership(input: {
  cohortId: string;
  googleSub: string;
  email: string;
  googleName: string;
  realName: string;
  nickname: string;
}): Promise<{ ok: true; membership: Membership } | { ok: false; error: string }> {
  const all = await listMemberships(input.cohortId);
  const prev = all.find((m) => m.googleSub === input.googleSub) ?? null;
  if (prev?.status === "approved") return { ok: true, membership: prev };
  const taken = all.some(
    (m) => m.googleSub !== input.googleSub && m.status !== "rejected" && normNick(m.nickname) === normNick(input.nickname)
  );
  if (taken) return { ok: false, error: "이 섹션에서 이미 쓰는 닉네임입니다. 다른 닉네임을 정해 주세요." };

  const m: Membership = {
    id: prev?.id ?? `ms_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    cohortId: input.cohortId,
    googleSub: input.googleSub,
    email: input.email,
    googleName: input.googleName,
    realName: input.realName,
    nickname: input.nickname,
    status: "pending",
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    decidedAt: null,
  };
  await put(m);
  return { ok: true, membership: m };
}

export async function setMembershipStatus(id: string, status: MembershipStatus): Promise<void> {
  const m = await getMembershipById(id);
  if (!m) return;
  await put({ ...m, status, decidedAt: new Date().toISOString() });
}

export async function approveAllPending(cohortId: string): Promise<number> {
  const pending = (await listMemberships(cohortId)).filter((m) => m.status === "pending");
  for (const m of pending) await put({ ...m, status: "approved", decidedAt: new Date().toISOString() });
  return pending.length;
}

export async function deleteMembership(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("memberships").delete().eq("id", id);
    if (!error) return;
  }
  const i = mem.findIndex((x) => x.id === id);
  if (i >= 0) mem.splice(i, 1);
}
