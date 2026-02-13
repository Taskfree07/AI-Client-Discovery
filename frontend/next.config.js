/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable standalone output for Docker
  output: 'standalone',

  // API backend proxy (for development only)
  async rewrites() {
    // In production (Docker), Nginx handles routing
    // In development, proxy API calls to backend
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/:path*',
        },
      ]
    }
    return []
  },
}

module.exports = nextConfig
