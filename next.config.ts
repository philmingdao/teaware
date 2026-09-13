import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/teaware' : '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath,
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
