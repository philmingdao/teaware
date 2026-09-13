import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.metmuseum.org',
        pathname: '/CRDImages/**',
      },
      {
        protocol: 'https',
        hostname: 'openaccess-cdn.clevelandart.org',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
