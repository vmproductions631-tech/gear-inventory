import type { NextConfig } from "next";

// Applied to every response. Deliberately excludes Content-Security-Policy:
// a strict CSP needs per-route testing against Next's inline scripts and the
// Supabase/QR-scanner origins, so it is a separate piece of work rather than
// something to switch on blind. Everything here is safe for this app today.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Never let a browser second-guess a declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing — this app is never embedded, so clickjacking has no vector.
  { key: "X-Frame-Options", value: "DENY" },
  // Do not leak internal paths (item ids, short codes) to third-party sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera stays allowed: the QR scanner needs it. Everything else is off.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
