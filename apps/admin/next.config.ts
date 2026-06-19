import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fixr/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
