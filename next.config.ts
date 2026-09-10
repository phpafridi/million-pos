const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: false,
  cleanupOutdatedCaches: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // Every API call must always hit the live server — never served
      // from the service worker's cache. Without this rule, next-pwa's
      // default caching strategy can silently serve a stale response for
      // any /api/ route (measurement units, categories, taxes, anything)
      // regardless of what the route handler itself says about caching,
      // since the service worker intercepts the request before it ever
      // reaches the server.
      urlPattern: /^\/api\/.*/i,
      handler: "NetworkOnly",
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    serverActions: {
      // Default is 1MB, which rejects most real phone camera photos
      // outright — this is what was causing tailor order photo uploads
      // to fail. 10MB comfortably covers real-world photo sizes without
      // leaving the limit effectively unbounded.
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = withPWA(nextConfig);
