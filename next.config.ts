// ===========================================
// 🔧 CORRECTION: next.config.ts pour Next.js 15.3.3
// FICHIER: next.config.ts (MISE À JOUR)
// ===========================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ CORRECTION: Déplacé de experimental vers serverExternalPackages
  serverExternalPackages: ['socket.io'],
  
  images: {
    domains: [
      'localhost',
      'your-domain.com',
      'lh3.googleusercontent.com', // Google OAuth
      'platform-lookaside.fbsbx.com', // Facebook OAuth
      'avatars.githubusercontent.com', // GitHub OAuth (si utilisé)
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  // Configuration pour le développement avec Socket.io
  async rewrites() {
    return process.env.NODE_ENV === 'development' ? [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
    ] : [];
  },
  // Headers CORS pour Socket.io
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;