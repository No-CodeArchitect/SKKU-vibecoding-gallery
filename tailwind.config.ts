import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 공개 사이트: 성균관대 로고(은행잎) 참고 — 딥 그린 베이스 + 은행잎 연두 강조
        night: {
          DEFAULT: "#0d1d16", // 페이지 베이스 (아주 어두운 그린)
          soft: "#12261d", // 섹션 밴드
        },
        coal: {
          DEFAULT: "#183128", // 카드/서피스 (베이스와 명확히 분리)
          soft: "#203d32", // 살짝 밝은 서피스
        },
        brand: {
          DEFAULT: "#8dc63f", // 강조 (은행잎 연두)
          soft: "#a6d867", // 하이라이트
          deep: "#4f9a3a", // 진한 그린 (그라데이션 시작)
        },
        // 결과 발표 1위·금메달 전용 (브랜드 색과 별개로 금색 유지)
        trophy: {
          DEFAULT: "#e2b544",
          soft: "#f5d27a",
        },
        ink: {
          DEFAULT: "#0a1610",
          soft: "#2a4a3d",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,16,0.04), 0 8px 24px -12px rgba(16,24,16,0.12)",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
