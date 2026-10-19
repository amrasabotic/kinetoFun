import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eyipksddjxhbjfjofktj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Hand-tracking runtime and model. Both live under versioned paths
        // (tasks-vision-<version>/, *-v1.task), so a TV can keep them for good
        // and only downloads ~40 MB again when a version actually changes.
        source: "/mediapipe/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
