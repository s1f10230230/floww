/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Skip type checking and linting during build (Vercel will handle this separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Development optimization
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Faster rebuilds in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },

  // Experimental features for faster builds
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // API route configuration
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

export default nextConfig