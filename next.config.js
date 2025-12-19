/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mpf-public-data.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "skin-care-recommendation.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "skinskaproducts.s3.eu-north-1.amazonaws.com",
      },
    ],
  },
};

const withPWA = require("next-pwa")({
  dest: "public", // Destination directory for the PWA files
  disable: process.env.NODE_ENV === "development", // Disable PWA in development mode
  register: true, // Register the PWA service worker
  skipWaiting: true, // Skip waiting for service worker activation
});

module.exports = withPWA(nextConfig);
