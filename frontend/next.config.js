/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API backend proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
