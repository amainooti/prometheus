/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
}

module.exports = nextConfig