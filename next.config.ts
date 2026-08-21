import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.pravatar.cc https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
  "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.openstreetmap.org https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "i.pravatar.cc" }] },
  async rewrites() {
    return [
      // Canonical, mobile-ready API namespace. Existing route handlers remain the single
      // implementation while web clients are migrated from legacy /api/* URLs.
      { source: "/api/v1/:path*", destination: "/api/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
