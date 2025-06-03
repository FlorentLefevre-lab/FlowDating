// next.config.ts - CORRECTION
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ✅ Supprimez les options expérimentales problématiques
  webpack: (config) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    return config;
  },
}

module.exports = nextConfig;