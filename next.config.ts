/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      // Include any other domains you need for images
    ],
  },
   pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Any other Next.js config options you might already have
};

module.exports = nextConfig;
