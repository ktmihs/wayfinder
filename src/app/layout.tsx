import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/url";

export const metadata: Metadata = {
  // og:image 같은 절대 URL 의 기준. 없으면 배포 환경에서 localhost 로 생성되어 미리보기가 깨진다
  metadataBase: new URL(getSiteUrl()),
  title: { default: "오시는 길", template: "%s · 오시는 길" },
  description: "주소 하나로 만드는 모바일 길안내 페이지",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafafa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
