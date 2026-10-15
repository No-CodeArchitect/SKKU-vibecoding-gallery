"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkAdminPassword,
  createAdminSession,
  destroyAdminSession,
  getAdminEmail,
  isAdmin,
} from "./admin-session";
import { addAdminEmail, removeAdminEmail, normalizeEmail } from "./admin-allowlist";
import {
  createCohort,
  setCohortScoringOpen,
  setCohortRankRevealed,
  setCohortMinRaters,
} from "./cohorts-store";
import {
  approveAllPending,
  deleteMembership,
  setMembershipStatus,
  type MembershipStatus,
} from "./memberships-store";
import { setCommentHidden } from "./comments-store";

export interface AdminLoginState {
  error: string | null;
}

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    return { error: "관리자 비밀번호가 올바르지 않습니다." };
  }
  await createAdminSession("password"); // SSO 설정 전의 임시 로그인
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

// --- 섹션(기수) ---
export async function createCohortAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!name) return;
  await createCohort(name, slug || undefined);
  refresh();
}

export async function toggleScoringOpen(formData: FormData): Promise<void> {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  await setCohortScoringOpen(cohortId, String(formData.get("value")) === "true");
  refresh();
}

export async function toggleRankRevealed(formData: FormData): Promise<void> {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  await setCohortRankRevealed(cohortId, String(formData.get("value")) === "true");
  refresh();
}

// --- 섹션 가입(교육생) 수락 ---
export async function setMemberStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as MembershipStatus;
  if (!id || !["pending", "approved", "rejected"].includes(status)) return;
  await setMembershipStatus(id, status);
  refresh();
}

export async function approveAllAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  if (cohortId) await approveAllPending(cohortId);
  refresh();
}

// 거절된 신청 기록 삭제 (그 사람이 다시 신청할 수 있게 됨)
export async function deleteMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteMembership(id);
  refresh();
}

// --- 관리자 계정 (구글 이메일 허용 목록) ---
export async function addAdminAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  const by = (await getAdminEmail()) ?? "password";
  await addAdminEmail(email, by);
  refresh();
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // 본인 계정은 삭제 불가 (스스로 잠기는 사고 방지)
  const me = await getAdminEmail();
  if (!email || email === me) return;
  await removeAdminEmail(email);
  refresh();
}

// --- 댓글 모더레이션 ---
export async function moderateComment(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const hidden = String(formData.get("hidden")) === "true";
  await setCommentHidden(id, hidden);
  refresh();
}

// --- 순위 최소 채점 인원 ---
export async function setMinRatersAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  const n = Number(formData.get("minRaters"));
  if (!cohortId || !Number.isFinite(n)) return;
  await setCohortMinRaters(cohortId, n);
  refresh();
}
