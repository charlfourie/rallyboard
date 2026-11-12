import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output keeps the Docker image small; Vercel ignores it.
  output: "standalone",
  serverExternalPackages: ["postgres"],
  experimental: {
    // Room for a 1 MB logo upload plus the rest of the settings form.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
