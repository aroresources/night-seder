import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // A shidduch resume is a PDF or a photo off a phone, and the default
    // ceiling for a server action is 1MB — small enough that an ordinary
    // upload would fail. The action checks the size again itself.
    serverActions: { bodySizeLimit: '12mb' },
  },
};

export default nextConfig;
