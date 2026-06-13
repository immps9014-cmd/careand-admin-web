/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: "/admin",
  assetPrefix: "/admin",
  // 검증 빌드용 distDir 분기 (미지정 시 .next — 라이브 동작 무변화)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Laravel API 프록시 (basePath 영향 없음)
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },
};

module.exports = nextConfig;
