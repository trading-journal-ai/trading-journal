import type { NextConfig } from "next";

const isAppMode = process.env.TRADING_JOURNAL_MODE === "app";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    if (!isAppMode) return [];

    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/demo",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
