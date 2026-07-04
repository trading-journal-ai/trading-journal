import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // Ship the bundled demo SQLite DB into the serverless functions so the hosted
  // demo reads it locally (DEMO_DB_PATH) instead of a remote Turso DB. Built
  // from samples/demo fixtures during the demo deploy's build step.
  outputFileTracingIncludes: {
    "/**": ["./data/tradingjournaldemo.db"],
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "demo.trading-journal.ai" }],
        destination: "/journal",
        permanent: false,
      },
      {
        source: "/settings",
        has: [{ type: "host", value: "demo.trading-journal.ai" }],
        destination: "/journal",
        permanent: false,
      },
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/demo",
        destination: "/journal",
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
