// 관리자가 선택할 수 있는 "경로 안내 방식".
// 모든 모드는 같은 경로 데이터를 다르게 렌더링한다.
export const MODES = [
  {
    id: "map",
    label: "일반 지도",
    description: "카카오맵 위에 도보 경로와 턴바이턴 안내를 표시해요.",
    emoji: "🗺️",
    ready: true,
  },
  {
    id: "tile2d",
    label: "2D 타일 맵",
    description: "픽셀 타일 지도 위를 캐릭터가 걸어가며 길을 알려줘요.",
    emoji: "🕹️",
    ready: true,
  },
  {
    id: "fps3d",
    label: "1인칭 3D",
    description: "로블록스 같은 로우폴리 거리를 1인칭으로 걸어가요.",
    emoji: "🎮",
    ready: false,
  },
  {
    id: "video",
    label: "영상 안내",
    description: "직접 찍은 영상에 구간별 안내를 얹어서 보여줘요.",
    emoji: "🎬",
    ready: false,
  },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

export function isModeId(value: string): value is ModeId {
  return MODES.some((m) => m.id === value);
}

export function getMode(id: string) {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
