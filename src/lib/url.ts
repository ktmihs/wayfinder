import { headers } from "next/headers";

/** 요청 헤더 기준으로 배포 URL의 origin을 구한다 (localhost, 배포 도메인 모두 대응). */
export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
