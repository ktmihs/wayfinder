// 커버 화면 색상 테마. 관리자가 고르고, 손님 커버의 배경/버튼 색과 공유 미리보기에 쓰인다.
// overlay: 사진 아래쪽에 배경색으로 이어지는 그라데이션을 씌울지. 무채색 테마는 사진을 그대로 둔다.
export const THEMES = {
  white: { label: "화이트", from: "#ffffff", to: "#ffffff", text: "#171717", swatch: "#ffffff", overlay: false },
  cream: { label: "크림", from: "#faf6ef", to: "#f3ecdf", text: "#2b2520", swatch: "#f3ecdf", overlay: false },
  rose: { label: "로즈", from: "#fb7185", to: "#f43f5e", text: "#ffffff", swatch: "#f43f5e", overlay: true },
  amber: { label: "앰버", from: "#fbbf24", to: "#f59e0b", text: "#1c1917", swatch: "#f59e0b", overlay: true },
  emerald: { label: "에메랄드", from: "#34d399", to: "#059669", text: "#ffffff", swatch: "#10b981", overlay: true },
  sky: { label: "스카이", from: "#38bdf8", to: "#0284c7", text: "#ffffff", swatch: "#0ea5e9", overlay: true },
  violet: { label: "바이올렛", from: "#a78bfa", to: "#7c3aed", text: "#ffffff", swatch: "#8b5cf6", overlay: true },
  night: { label: "나이트", from: "#334155", to: "#0f172a", text: "#ffffff", swatch: "#1e293b", overlay: true },
} as const;

export type ThemeId = keyof typeof THEMES;

export function isThemeId(v: string): v is ThemeId {
  return v in THEMES;
}

export function getTheme(id: string) {
  return isThemeId(id) ? THEMES[id] : THEMES.rose;
}

/** 밝은 테마는 스와치/버튼에 테두리가 있어야 보인다 */
export function isLightTheme(id: string) {
  return getTheme(id).text !== "#ffffff";
}
