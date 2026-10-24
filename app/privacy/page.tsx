import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata: Metadata = { title: "개인정보 처리방침" };

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. 수집하는 개인정보",
    body: (
      <ul className="list-disc pl-5">
        <li>
          참가자 로그인·가입: 구글 계정 정보(이메일, 이름, 계정 식별자), 가입 시 입력한 실명·닉네임
        </li>
        <li>작품 등록: 작품 설명, 배포 주소, 썸네일 이미지 등 참가자가 입력·업로드한 내용</li>
        <li>채점·댓글: 동료평가 점수, 댓글 내용 (작성자 계정과 연결)</li>
        <li>심사위원: 구글 계정 이메일, 운영진이 등록한 이름, 심사 점수·코멘트</li>
        <li>교육·해커톤 문의: 소속(부대·기관·회사), 담당자 계급(직급)·성명, 연락처, 이메일(선택), 문의 내용</li>
        <li>관리자: 구글 계정 이메일</li>
      </ul>
    ),
  },
  {
    title: "2. 이용 목적",
    body: (
      <ul className="list-disc pl-5">
        <li>참가자 본인 확인, 섹션 참가 승인, 채점·댓글·작품 등록 기능 제공</li>
        <li>해커톤 출품작 갤러리 운영, AI 요약·심사 생성, 평가 합산 및 결과 발표</li>
        <li>교육·해커톤 문의 확인 및 일정 협의 연락</li>
      </ul>
    ),
  },
  {
    title: "3. 공개 범위",
    body: (
      <p>
        갤러리에는 참가자가 정한 <b>닉네임</b>과 등록한 작품 정보만 공개됩니다. 실명·이메일·채점
        내역·문의 정보는 관리자만 볼 수 있습니다. 댓글은 AI가 붙인 별칭으로 표시됩니다.
      </p>
    ),
  },
  {
    title: "4. 처리를 맡기는 서비스",
    body: (
      <ul className="list-disc pl-5">
        <li>Google — 로그인(계정 인증)</li>
        <li>Supabase — 데이터·이미지 저장</li>
        <li>Vercel — 웹사이트 호스팅</li>
        <li>Anthropic(Claude) — 등록된 작품 설명·썸네일을 분석해 요약·심사 생성</li>
      </ul>
    ),
  },
  {
    title: "5. 보유 기간과 파기",
    body: (
      <p>
        해커톤 출품작 갤러리는 행사 운영 기간 동안 보관합니다. 문의 정보는 상담 종료 후 1년
        이내에 파기합니다. 본인이 요청하면 가입 정보·작품·댓글을 지체 없이 삭제합니다.
      </p>
    ),
  },
  {
    title: "6. 이용자의 권리와 문의",
    body: (
      <p>
        자신의 정보 열람·수정·삭제를 원하면 해커톤 운영진(사이트 관리자)에게 요청해 주세요. 구글
        로그인 연결은 구글 계정 설정의 「서드 파티 앱 및 서비스」에서 언제든 해제할 수 있습니다.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight">개인정보 처리방침</h1>
        <p className="mt-3 text-sm text-white/50">
          성균관대학교 바이브코딩 해커톤 갤러리(이하 「사이트」)가 이용자의 개인정보를 어떻게 다루는지
          안내합니다.
        </p>
        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-white/70">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-base font-bold text-white">{s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
        <p className="mt-12 text-xs text-white/40">시행일: 2026년 10월 21일</p>
      </main>
      <SiteFooter />
    </div>
  );
}
