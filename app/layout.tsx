import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKKU 바이브코딩 해커톤",
  description: "성균관대학교 바이브코딩 해커톤 출품작 갤러리 · 동료평가 · 심사위원 평가 · AI 평가",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
