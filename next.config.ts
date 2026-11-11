import type { NextConfig } from "next";

// N01/N05: fără funcții experimentale; output standalone pentru imaginea Docker (sec. 2–3).
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
  // N02: fiecare anexă ≤ 10 MB; QA08: mai multe anexe într-o salvare, până la 50 MB în total (+ marjă pentru câmpuri).
  experimental: { serverActions: { bodySizeLimit: "52mb" } },
};

export default nextConfig;
