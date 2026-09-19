import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
