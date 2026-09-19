// 커버 테마. white / black 은 고정색, auto 는 사진에서 추출한 대표색(accent)을 배경으로 쓴다.
export const THEME_IDS = ["white", "black", "auto"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABEL: Record<ThemeId, string> = { white: "화이트", black: "블랙", auto: "사진 색" };

export type ResolvedTheme = {
  id: ThemeId;
  /** 배경색 */
  bg: string;
  /** 본문 글자색 */
  text: string;
  /** 보조 글자색 */
  muted: string;
  /** 버튼 배경 / 글자 */
  buttonBg: string;
  buttonText: string;
};

export function isThemeId(v: string): v is ThemeId {
  return (THEME_IDS as readonly string[]).includes(v);
}

/** 예전 데이터(rose, night …)도 받아서 세 가지 중 하나로 */
export function normalizeThemeId(v: string | null | undefined): ThemeId {
  if (!v) return "white";
  if (isThemeId(v)) return v;
  return v === "night" ? "black" : "white";
}

/** #rrggbb 상대 휘도 (0~1) */
export function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function isValidHex(v: string | null | undefined): v is string {
  return !!v && /^#[0-9a-f]{6}$/i.test(v);
}

export function resolveTheme(theme: string | null | undefined, accent?: string | null): ResolvedTheme {
  const id = normalizeThemeId(theme);
  if (id === "black") {
    return { id, bg: "#111111", text: "#ffffff", muted: "rgba(255,255,255,0.65)", buttonBg: "#ffffff", buttonText: "#111111" };
  }
  if (id === "auto" && isValidHex(accent)) {
    const dark = luminance(accent) < 0.45;
    return {
      id,
      bg: accent,
      text: dark ? "#ffffff" : "#171717",
      muted: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)",
      buttonBg: dark ? "#ffffff" : "#171717",
      buttonText: dark ? accent : "#ffffff",
    };
  }
  return { id: id === "auto" ? "auto" : "white", bg: "#ffffff", text: "#171717", muted: "rgba(0,0,0,0.55)", buttonBg: "#171717", buttonText: "#ffffff" };
}
