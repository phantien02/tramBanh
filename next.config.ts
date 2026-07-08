import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Cho phép mở dev server qua tunnel (cloudflared) để test trên điện thoại — chỉ áp dụng khi chạy dev.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
