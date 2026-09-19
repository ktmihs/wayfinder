// 카카오맵 JS SDK 로더.
// 여러 컴포넌트가 동시에 호출해도 스크립트는 한 번만 삽입되고,
// 같은 Promise를 공유한다.
let loader: Promise<typeof kakao> | null = null;

export function loadKakao(): Promise<typeof kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadKakao는 브라우저에서만 호출할 수 있어요."));
  }
  if (loader) return loader;

  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) {
    loader = Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았어요. .env 파일을 확인하세요."),
    );
    return loader;
  }

  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => kakao.maps.load(() => resolve(kakao));
    script.onerror = () =>
      reject(new Error("카카오맵 SDK 로드 실패. 앱 키와 등록된 도메인을 확인하세요."));
    document.head.appendChild(script);
  });
  return loader;
}

/** 주소/장소 검색 결과를 화면에 쓰기 좋은 형태로 정리한 것 */
export type SearchResult = {
  placeName: string | null;
  address: string;
  roadAddress: string | null;
  lat: number;
  lng: number;
};

/**
 * 주소 검색 + 키워드 검색을 동시에 돌려서 합친다.
 * "테헤란로 123" 같은 주소도, "스타벅스 역삼점" 같은 장소명도 한 입력창에서 처리하기 위함.
 */
export async function searchAddress(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const k = await loadKakao();
  const geocoder = new k.maps.services.Geocoder();
  const places = new k.maps.services.Places();

  const byAddress = new Promise<SearchResult[]>((resolve) => {
    geocoder.addressSearch(q, (result, status) => {
      if (status !== k.maps.services.Status.OK) return resolve([]);
      resolve(
        result.map((r) => ({
          placeName: r.road_address?.building_name || null,
          address: r.address_name,
          roadAddress: r.road_address?.address_name ?? null,
          lat: Number(r.y),
          lng: Number(r.x),
        })),
      );
    });
  });

  const byKeyword = new Promise<SearchResult[]>((resolve) => {
    places.keywordSearch(q, (result, status) => {
      if (status !== k.maps.services.Status.OK) return resolve([]);
      resolve(
        result.map((r) => ({
          placeName: r.place_name,
          address: r.address_name,
          roadAddress: r.road_address_name || null,
          lat: Number(r.y),
          lng: Number(r.x),
        })),
      );
    });
  });

  const [a, b] = await Promise.all([byAddress, byKeyword]);
  // 같은 좌표는 하나만 남긴다 (주소 검색 결과를 우선).
  const seen = new Set<string>();
  return [...a, ...b].filter((r) => {
    const key = `${r.lat.toFixed(6)},${r.lng.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 좌표 → "서울 강남구 역삼동" 같은 짧은 지역명. 실패하면 null. */
export async function coordToRegionName(lat: number, lng: number): Promise<string | null> {
  const k = await loadKakao();
  const geocoder = new k.maps.services.Geocoder();
  return new Promise((resolve) => {
    geocoder.coord2RegionCode(lng, lat, (result, status) => {
      if (status !== k.maps.services.Status.OK || !result.length) return resolve(null);
      // H(행정동) 보다 B(법정동)가 익숙한 이름이라 우선
      const r = result.find((x) => x.region_type === "B") ?? result[0];
      resolve(`${r.region_1depth_name} ${r.region_2depth_name} ${r.region_3depth_name}`.trim());
    });
  });
}
