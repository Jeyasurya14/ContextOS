// frontend/next.config.mjs

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Production optimizations
  optimizeFonts: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console.log in production
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false, // Security
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Bundle splitting
  experimental: {
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge'], // Tree-shake heavy libraries
  },

  // Compression
  compress: true,

  // Production profiling
  ...(process.env.NODE_ENV === 'production' && {
    // Enable production profiling
    webpack: (config, { defaultLoaders }) => {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-bundle',
              chunks: 'all',
              priority: 20,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
      return config
    },
  }),

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://contextos-api-jxdr.onrender.com'
    return [
      {
        // Proxy /api/v1/* → Render backend (server-to-server, no CORS)
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        // Also proxy /health for status checks
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ]
  },
};

export default nextConfig;
