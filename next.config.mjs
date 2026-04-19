/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "@prisma/adapter-pg"],
  },
};

export default nextConfig;
