import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["169.254.247.25", "localhost", "127.0.0.1", "192.168.1.7"],
  turbopack: {
    // @coinbase/cdp-sdk (pulled in transitively via RainbowKit's default
    // Base Account wallet) lazily imports optional `@x402/*` peer deps inside
    // try/catch — only reached when signing an x402 payment, which this
    // EVM-only app never does. The packages aren't installed, so suppress the
    // resulting "Module not found" issues.
    ignoreIssue: [
      {
        path: /node_modules[\\/]@coinbase[\\/]cdp-sdk[\\/]/,
        title: "Module not found",
      },
    ],
  },
};

export default nextConfig;