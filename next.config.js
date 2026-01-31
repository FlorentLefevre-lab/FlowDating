/** @type {import('next').NextConfig} */
const os = require('os');
const path = require('path');

// Détection automatique de l'environnement
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';

// Configuration CPU/RAM dynamique selon l'environnement
const AVAILABLE_CPUS = os.cpus().length;
const AVAILABLE_RAM_GB = Math.round(os.totalmem() / (1024 * 1024 * 1024));

// Configuration adaptative selon l'environnement
const getOptimalConfig = () => {
  if (IS_DEV) {
    // Développement : Machine puissante (30 CPUs / 128GB RAM)
    return {
      cpus: Math.min(AVAILABLE_CPUS - 2, 20), // Max 20 CPUs en dev
      parallelism: Math.min(AVAILABLE_CPUS - 2, 16),
      memoryLimit: 8192, // 8GB par instance Node.js
      chunkSizeMax: 200000, // 200KB max chunks
      polling: 500, // Fast polling
      optimizations: 'aggressive'
    };
  } else {
    // Production : Ressources limitées (8 vCPUs / 16GB RAM)
    return {
      cpus: Math.max(Math.min(AVAILABLE_CPUS, 8) - 2, 4), // Max 6 CPUs en prod
      parallelism: Math.max(Math.min(AVAILABLE_CPUS, 8) - 2, 4),
      memoryLimit: 2048, // 2GB par instance Node.js
      chunkSizeMax: 150000, // 150KB max chunks
      polling: 1000, // Slower polling
      optimizations: 'conservative'
    };
  }
};

const CONFIG = getOptimalConfig();

console.log(`🚀 Next.js Config - ${IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`💻 Detected: ${AVAILABLE_CPUS} CPUs, ${AVAILABLE_RAM_GB}GB RAM`);
console.log(`⚡ Using: ${CONFIG.cpus} CPUs, ${CONFIG.memoryLimit}MB memory limit`);

const nextConfig = {
  // Configuration de base
  output: 'standalone',
  reactStrictMode: true,

  // Ignorer ESLint pendant le build (erreurs préexistantes)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignorer les erreurs TypeScript pendant le build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuration des images adaptative
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.xx.fbcdn.net',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: IS_DEV 
      ? [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
      : [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: IS_DEV 
      ? ['image/webp', 'image/avif']
      : ['image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: IS_DEV,
    contentDispositionType: IS_PROD ? 'attachment' : 'inline',
    contentSecurityPolicy: IS_PROD 
      ? "default-src 'self'; script-src 'none'; sandbox;" 
      : undefined,
  },

  // Configuration webpack ultra-optimisée et adaptative
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack, nextRuntime }) => {
    // Configuration de surveillance des fichiers
    if (dev && !isServer) {
      config.watchOptions = {
        poll: CONFIG.polling,
        aggregateTimeout: IS_DEV ? 100 : 300,
        ignored: /node_modules/,
      }
    }

    // Résolution des modules
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        buffer: require.resolve('buffer/'),
      },
      cache: !dev,
      cacheWithContext: false,
    }

    // Polyfill Buffer pour nsfwjs
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    )

    // Configuration cache adaptative avec chemins absolus
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: dev 
        ? path.resolve(process.cwd(), '.next/cache/webpack')
        : path.resolve(process.cwd(), 'node_modules/.cache/webpack'),
      compression: 'gzip',
      maxAge: dev 
        ? 1000 * 60 * 60 * 24 * 7
        : 1000 * 60 * 60 * 24 * 30,
    }

    // Optimisations spécifiques à l'environnement
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: IS_DEV ? 10000 : 20000,
          maxSize: CONFIG.chunkSizeMax,
          minRemainingSize: 0,
          minChunks: 1,
          maxAsyncRequests: IS_DEV ? 10 : 6,
          maxInitialRequests: IS_DEV ? 8 : 4,
          enforceSizeThreshold: 50000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              enforce: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            ...(IS_DEV && {
              libs: {
                test: /[\\/]node_modules[\\/]/,
                name: 'libs',
                priority: 10,
                chunks: 'all',
                minChunks: 2,
              },
            }),
          },
        },
        usedExports: true,
        sideEffects: false,
        runtimeChunk: IS_PROD ? 'single' : false,
      }
    }

    // Parallélisme adaptatif
    config.parallelism = CONFIG.parallelism;
    
    // Variables d'environnement pour debug
    config.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(dev),
        __CPUS__: JSON.stringify(CONFIG.cpus),
        __ENV_TYPE__: JSON.stringify(IS_DEV ? 'development' : 'production'),
      })
    )

    return config
  },

  // Modules à transpiler (adaptatif)
  transpilePackages: [
    'framer-motion',
    '@heroicons/react',
    'next-auth',
    '@auth/core',
    '@auth/prisma-adapter',
    ...(IS_DEV ? ['stream-chat-react', 'stream-chat', '@next/swc'] : []),
  ],

  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    NEXT_PUBLIC_STREAM_API_KEY: process.env.NEXT_PUBLIC_STREAM_API_KEY,
    NEXT_PUBLIC_STREAM_APP_ID: process.env.NEXT_PUBLIC_STREAM_APP_ID,
    NEXT_TELEMETRY_DISABLED: '1',
    ...(IS_DEV && {
      DEBUG_CPUS: CONFIG.cpus.toString(),
      DEBUG_MEMORY: CONFIG.memoryLimit.toString(),
      DEBUG_ENV: 'development',
    }),
  },

  serverExternalPackages: ['prisma', '@prisma/client'],

  // Headers adaptatifs selon l'environnement
  async headers() {
    const baseHeaders = [
      {
        key: 'X-Frame-Options',
        value: IS_PROD ? 'DENY' : 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: IS_PROD ? 'strict-origin-when-cross-origin' : 'origin-when-cross-origin'
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
    ];

    if (IS_PROD) {
      baseHeaders.push(
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://widget.cloudinary.com https://upload-widget.cloudinary.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://lh3.googleusercontent.com https://*.fbcdn.net https://*.stream-io-cdn.com https://*.getstream.io https://getstream.imgix.net",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https: wss:",
            "frame-src 'self' https://widget.cloudinary.com https://upload-widget.cloudinary.com",
            "worker-src 'self' blob:",
          ].join('; ')
        }
      );
    }

    baseHeaders.push({
      key: 'Cache-Control',
      value: IS_PROD 
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate'
    });

    if (IS_DEV) {
      baseHeaders.push(
        {
          key: 'X-Environment',
          value: 'development'
        },
        {
          key: 'X-CPUs-Available',
          value: CONFIG.cpus.toString()
        },
        {
          key: 'X-Memory-Limit',
          value: `${CONFIG.memoryLimit}MB`
        }
      );
    }

    return [
      {
        source: '/:path*',
        headers: baseHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: IS_PROD 
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          // ✅ AJOUT: Headers pour load balancing
          {
            key: 'X-Instance-ID',
            value: process.env.INSTANCE_ID || 'unknown'
          },
        ],
      },
    ]
  },

  experimental: {
    cpus: CONFIG.cpus,
    esmExternals: true,
    optimizePackageImports: IS_DEV 
      ? ['lodash', 'date-fns', 'ramda', '@radix-ui/react-icons']
      : ['lodash', 'date-fns'],
    scrollRestoration: true,
    workerThreads: IS_DEV,
    // ✅ AJOUT: Support pour load balancing
    serverComponentsHmrCache: IS_DEV,
  },

  // Configuration spécifique à la production
  ...(IS_PROD && {
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
    productionBrowserSourceMaps: false,
    onDemandEntries: {
      maxInactiveAge: 5 * 1000,
      pagesBufferLength: 2,
    },
  }),

  // Configuration spécifique au développement
  ...(IS_DEV && {
    devIndicators: {
      position: 'bottom-left',
    },
    productionBrowserSourceMaps: false,
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
  }),

  logging: {
    fetches: {
      fullUrl: IS_DEV,
    },
  },

  compiler: {
    removeConsole: IS_PROD ? {
      exclude: ['error', 'warn']
    } : false,
    
    ...(IS_DEV && {
      styledComponents: true,
      emotion: true,
    }),
    
    reactRemoveProperties: IS_PROD,
  },

  // ✅ AJOUT: Rewrites pour health check et load balancing
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      // Support pour les health checks avec différents chemins
      {
        source: '/healthz',
        destination: '/api/health',
      },
      {
        source: '/status',
        destination: '/api/health',
      },
    ]
  },
}

module.exports = nextConfig