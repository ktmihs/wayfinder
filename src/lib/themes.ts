// 커버 화면 색상 테마. 관리자가 고르고, 손님 커버의 배경/버튼 색에 쓰인다.
export const THEMES = {
  rose: { label: "로즈", from: "#fb7185", to: "#f43f5e", text: "#ffffff", swatch: "#f43f5e" },
  amber: { label: "앰버", from: "#fbbf24", to: "#f59e0b", text: "#1c1917", swatch: "#f59e0b" },
  emerald: { label: "에메랄드", from: "#34d399", to: "#059669", text: "#ffffff", swatch: "#10b981" },
  sky: { label: "스카이", from: "#38bdf8", to: "#0284c7", text: "#ffffff", swatch: "#0ea5e9" },
  violet: { label: "바이올렛", from: "#a78bfa", to: "#7c3aed", text: "#ffffff", swatch: "#8b5cf6" },
  night: { label: "나이트", from: "#334155", to: "#0f172a", text: "#ffffff", swatch: "#1e293b" },
} as const;

export type ThemeId = keyof typeof THEMES;

export function isThemeId(v: string): v is ThemeId {
  return v in THEMES;
}

export function getTheme(id: string) {
  return isThemeId(id) ? THEMES[id] : THEMES.rose;
}
