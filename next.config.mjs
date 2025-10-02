/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
}

export default nextConfig