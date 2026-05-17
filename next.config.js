/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
    serverComponentsExternalPackages: ["pdf-parse"]
  }
};
module.exports = nextConfig;
