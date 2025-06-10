/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour les images Cloudinary
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Configuration webpack pour éviter les erreurs d'import
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Résoudre les problèmes d'import des modules ES6
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Éviter les erreurs avec Framer Motion et autres modules ES6
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },

  // Transpiler les modules nécessaires
  transpilePackages: [
    'framer-motion',
    '@heroicons/react'
  ],

  // Configuration des variables d'environnement
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  },

  // Configuration pour le développement uniquement
  ...(process.env.NODE_ENV === 'development' && {
    // Options de développement spécifiques à Next.js 15
    devIndicators: {
      position: 'bottom-right',
    },
  }),

  // Optimisations pour la production
  ...(process.env.NODE_ENV === 'production' && {
    // Optimisations de production
    compress: true,
    poweredByHeader: false,
  }),
};

module.exports = nextConfig;