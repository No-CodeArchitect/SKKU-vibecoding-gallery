// 구글 계정으로 시작하기 버튼 (참가자 로그인). next: 로그인 후 돌아올 사이트 내 경로.
export default function GoogleButton({ next, label = "Google 계정으로 시작하기" }: { next: string; label?: string }) {
  return (
    <a
      href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#1f1f1f] transition hover:bg-white/90"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.5 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
        <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4-13.4-9.6l-8 6.2C6.6 42.6 14.6 48 24 48z" />
      </svg>
      {label}
    </a>
  );
}
