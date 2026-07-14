/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
    serverComponentsExternalPackages: ["serialport", "@serialport/parser-readline", "better-sqlite3"],
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
        hostname: "skin-care-products.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "skinskaproducts.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "skin-care--products.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
};

// Start from next-pwa's default runtime caching, but never cache same-origin
// API responses. Admin/slot data is device-local and mutation-driven, so a
// cached GET /api/admin/slots would show stale slots on the kiosk even after a
// successful assignment (POST 200). Force those requests to always hit network.
const defaultRuntimeCaching = require("next-pwa/cache");
const runtimeCaching = defaultRuntimeCaching.map((entry) =>
  entry?.options?.cacheName === "apis"
    ? { ...entry, handler: "NetworkOnly", options: { cacheName: "apis" } }
    : entry
);

const withPWA = require("next-pwa")({
  dest: "public", // Destination directory for the PWA files
  disable: process.env.NODE_ENV === "development", // Disable PWA in development mode
  register: true, // Register the PWA service worker
  skipWaiting: true, // Skip waiting for service worker activation
  runtimeCaching,
});

module.exports = withPWA(nextConfig);
