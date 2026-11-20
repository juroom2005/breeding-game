import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 없이 정적 파일(out 폴더)로 내보낸다. 인디게임 사이트에 올리기 위함
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
