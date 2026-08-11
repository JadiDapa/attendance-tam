import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default Next.js 1MB — terlalu kecil untuk foto absensi resolusi tinggi
      // dan lampiran PDF. Harus >= MAX_SIZE di `lib/storage.ts` (5MB) plus
      // ruang untuk field lain di FormData.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000", // Your API port
        pathname: "/api/images/**", // Path to your images served via the API
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
