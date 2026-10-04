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
    // Uploads are capped at 300 MB (see MAX_UPLOAD_MB in src/lib/uploadLimits.ts),
    // which the app itself enforces with a friendly message. The two limits
    // below are set slightly ABOVE that on purpose: the request body is the
    // file PLUS the other form fields and multipart framing, so a file that
    // is legitimately under 300 MB must never be turned away by Next.js first
    // with its own unfriendly error.
    serverActions: {
      bodySizeLimit: '320mb',
    },
    // Easy to miss: the middleware (src/middleware.ts) runs on /dashboard/*,
    // which is where Server Actions post. For those requests Next.js buffers
    // the body in memory with its OWN cap — 10 MB by default — and when the
    // body is bigger it silently TRUNCATES it instead of rejecting it, which
    // would corrupt large uploads. This must be raised along with the above.
    proxyClientMaxBodySize: '320mb',
  },
};

module.exports = withPWA(nextConfig);
