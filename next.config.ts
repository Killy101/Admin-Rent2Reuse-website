/** @type {import('next').NextConfig} */
const nextConfig = {
 devIndicators: false,
  reactStrictMode: true,
   images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**", 
      },
    ],
  },
   pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
 
};

module.exports = nextConfig;
