import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 커버 이미지가 폼과 함께 올라온다 (클라이언트에서 리사이즈해서 보통 300KB 이하)
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
