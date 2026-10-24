// 교육·해커톤 문의 저장소. Supabase edu_requests 테이블.
// 신청은 다시 받을 수 없는 데이터라, 배포본에서는 저장 실패를 숨기지 않는다.
// (Supabase 미설정 또는 로컬에서 테이블이 없을 때만 인메모리)

import "server-only";
import { getSupabase } from "./supabase";

export type EduRequestStatus = "new" | "contacted" | "done";

export interface EduRequest {
  id: string;
  unit: string; // 소속(부대·기관·회사)
  contactName: string; // 담당자 계급(직급)·성명
  phone: string;
  email: string;
  headcount: string;
  period: string; // 희망 시기
  message: string;
  status: EduRequestStatus;
  createdAt: string;
}

type Row = {
  id: string;
  unit: string;
  contact_name: string;
  phone: string;
  email: string;
  headcount: string;
  period: string;
  message: string;
  status: EduRequestStatus;
  created_at: string;
};

const fromRow = (r: Row): EduRequest => ({
  id: r.id,
  unit: r.unit,
  contactName: r.contact_name,
  phone: r.phone,
  email: r.email,
  headcount: r.headcount,
  period: r.period,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
});

const g = globalThis as unknown as { __vgEduRequests?: EduRequest[] };
const mem: EduRequest[] = g.__vgEduRequests ?? (g.__vgEduRequests = []);
const isDeployed = !!process.env.VERCEL;
const TABLE_HINT = "edu_requests 테이블이 없습니다 (SUPABASE_MIGRATION_PROJECTS.md 의 SQL 실행 필요)";

function canFallBack(message: string): boolean {
  return !isDeployed && /does not exist|schema cache/i.test(message);
}

export async function addEduRequest(
  input: Omit<EduRequest, "id" | "status" | "createdAt">
): Promise<EduRequest> {
  const req: EduRequest = {
    ...input,
    id: `er_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("edu_requests").insert({
      id: req.id,
      unit: req.unit,
      contact_name: req.contactName,
      phone: req.phone,
      email: req.email,
      headcount: req.headcount,
      period: req.period,
      message: req.message,
      status: req.status,
      created_at: req.createdAt,
    });
    if (!error) return req;
    if (!canFallBack(error.message)) {
      throw new Error(/does not exist|schema cache/i.test(error.message) ? TABLE_HINT : error.message);
    }
  }
  mem.push(req);
  return req;
}

export async function listEduRequests(): Promise<EduRequest[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("edu_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return (data as Row[]).map(fromRow);
    } catch {
      /* 폴백 */
    }
  }
  return [...mem].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setEduRequestStatus(id: string, status: EduRequestStatus): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("edu_requests").update({ status }).eq("id", id);
    if (!error) return;
  }
  const r = mem.find((x) => x.id === id);
  if (r) r.status = status;
}

export async function deleteEduRequest(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("edu_requests").delete().eq("id", id);
    if (!error) return;
  }
  const i = mem.findIndex((x) => x.id === id);
  if (i >= 0) mem.splice(i, 1);
}
