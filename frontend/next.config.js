/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for better compatibility with hosting platforms
  output: "standalone",

  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "https://voxai-umxl.onrender.com",
    NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID,
  },

  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    domains: ["images.unsplash.com", "via.placeholder.com"],
    unoptimized: true,
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },

  // Webpack configuration for better builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
