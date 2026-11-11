import type { NextConfig } from "next";

// N01/N05: fără funcții experimentale; output standalone pentru imaginea Docker (sec. 2–3).
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
