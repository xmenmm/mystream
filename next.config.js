/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Premium 10 GB per file → kasih ruang sampai 12 GB (buffer)
    serverActions: { bodySizeLimit: '12gb' },
  },
};
module.exports = nextConfig;
