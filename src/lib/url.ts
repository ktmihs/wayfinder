import { headers } from "next/headers";

/** 요청 헤더 기준으로 배포 URL의 origin을 구한다 (localhost, 배포 도메인 모두 대응). */
export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * 빌드/메타데이터용 사이트 주소. 요청 헤더가 없는 곳(metadataBase)에서 쓴다.
 * 우선순위: NEXT_PUBLIC_SITE_URL > Railway 가 주입하는 RAILWAY_PUBLIC_DOMAIN > localhost
 */
export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
