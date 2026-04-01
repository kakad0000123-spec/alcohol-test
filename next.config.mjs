/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dcopfymitvlhncwkkhxi.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
}

export default nextConfig
