import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.samsung.com",
        pathname: "/sec/smartphones/**",
      },
      {
        protocol: "https",
        hostname: "cdsassets.apple.com",
        pathname: "/live/7WUAS350/images/tech-specs/**",
      },
    ],
  },
};

export default nextConfig;
