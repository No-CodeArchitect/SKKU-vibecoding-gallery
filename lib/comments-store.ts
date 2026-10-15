// 댓글 저장소. Supabase 활성 시 comments 테이블, 아니면 인메모리(globalThis) 폴백.

import "server-only";
import { getSupabase } from "./supabase";

export interface Comment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  aiNickname: string;
  body: string;
  isAuthorReply: boolean;
  isHidden: boolean;
  createdAt: string;
}

const g = globalThis as unknown as { __vgComments?: Comment[] };
const mem: Comment[] = g.__vgComments ?? (g.__vgComments = []);

type Row = {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  ai_nickname: string;
  body: string;
  is_author_reply: boolean;
  is_hidden: boolean;
  created_at: string;
};

function fromRow(r: Row): Comment {
  return {
    id: r.id,
    projectId: r.project_id,
    authorId: r.author_id,
    authorName: r.author_name,
    aiNickname: r.ai_nickname,
    body: r.body,
    isAuthorReply: r.is_author_reply,
    isHidden: r.is_hidden,
    createdAt: r.created_at,
  };
}

export async function listComments(projectId: string): Promise<Comment[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });
    return (data ?? []).map(fromRow);
  }
  return mem
    .filter((c) => c.projectId === projectId && !c.isHidden)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export async function listAllComments(
  projectIds?: Set<string>
): Promise<Comment[]> {
  const sb = getSupabase();
  let all: Comment[];
  if (sb) {
    const { data } = await sb
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false });
    all = (data ?? []).map(fromRow);
  } else {
    all = [...mem].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return projectIds ? all.filter((c) => projectIds.has(c.projectId)) : all;
}

export async function addComment(
  input: Omit<Comment, "id" | "createdAt" | "isHidden">
): Promise<Comment> {
  const comment: Comment = {
    ...input,
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    isHidden: false,
    createdAt: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb) {
    await sb.from("comments").insert({
      id: comment.id,
      project_id: comment.projectId,
      author_id: comment.authorId,
      author_name: comment.authorName,
      ai_nickname: comment.aiNickname,
      body: comment.body,
      is_author_reply: comment.isAuthorReply,
      is_hidden: false,
      created_at: comment.createdAt,
    });
    return comment;
  }
  mem.push(comment);
  return comment;
}

export async function setCommentHidden(
  id: string,
  hidden: boolean
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from("comments").update({ is_hidden: hidden }).eq("id", id);
    return;
  }
  const c = mem.find((x) => x.id === id);
  if (c) c.isHidden = hidden;
}

// 이 사람이 이 작품에 이미 쓴 별칭 (같은 작품 안에서는 같은 별칭을 유지하기 위해).
export async function findNickname(
  projectId: string,
  authorId: string
): Promise<string | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("comments")
      .select("ai_nickname")
      .eq("project_id", projectId)
      .eq("author_id", authorId)
      .order("created_at", { ascending: true })
      .limit(1);
    return (data?.[0] as { ai_nickname?: string } | undefined)?.ai_nickname ?? null;
  }
  return mem.find((c) => c.projectId === projectId && c.authorId === authorId)?.aiNickname ?? null;
}
