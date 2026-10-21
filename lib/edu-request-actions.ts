"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "./admin-session";
import {
  addEduRequest,
  deleteEduRequest,
  setEduRequestStatus,
  type EduRequestStatus,
} from "./edu-requests-store";

export interface ApplyState {
  ok: boolean;
  error: string | null;
  values?: Record<string, string>;
}

const FIELDS = {
  unit: { max: 60, required: true },
  contactName: { max: 40, required: true },
  phone: { max: 30, required: true },
  email: { max: 100, required: false },
  headcount: { max: 30, required: false },
  period: { max: 60, required: false },
  message: { max: 1000, required: false },
} as const;

// 공개: 교육·해커톤 문의 접수
export async function submitEduRequest(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  // 봇 차단용 숨은 칸 — 사람은 비워 둔다. 채워져 있으면 성공처럼 보이고 저장하지 않는다.
  if (String(formData.get("website") ?? "").trim()) return { ok: true, error: null };

  const values: Record<string, string> = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    const v = String(formData.get(key) ?? "").trim();
    values[key] = v;
    if (rule.required && !v) {
      return { ok: false, error: "필수 항목(*)을 모두 입력해 주세요.", values };
    }
    if (v.length > rule.max) {
      return { ok: false, error: `입력이 너무 깁니다 (${rule.max}자 이내).`, values };
    }
  }
  if (!/^[0-9+\-()\s]{8,}$/.test(values.phone)) {
    return { ok: false, error: "연락처는 숫자와 - 로 입력해 주세요.", values };
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { ok: false, error: "이메일 형식이 올바르지 않습니다.", values };
  }
  if (formData.get("consent") !== "on") {
    return { ok: false, error: "개인정보 수집·이용에 동의해 주세요.", values };
  }

  try {
    await addEduRequest({
      unit: values.unit,
      contactName: values.contactName,
      phone: values.phone,
      email: values.email,
      headcount: values.headcount,
      period: values.period,
      message: values.message,
    });
  } catch (err) {
    console.error("[edu-request]", (err as Error).message);
    return {
      ok: false,
      error: "일시적인 오류로 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }
  revalidatePath("/admin");
  return { ok: true, error: null };
}

// 관리자: 처리 상태 변경 / 삭제
export async function setEduRequestStatusAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as EduRequestStatus;
  if (!id || !["new", "contacted", "done"].includes(status)) return;
  await setEduRequestStatus(id, status);
  revalidatePath("/admin");
}

export async function deleteEduRequestAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
  const id = String(formData.get("id") ?? "");
  if (id) await deleteEduRequest(id);
  revalidatePath("/admin");
}
