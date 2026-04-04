/** @type {import('next').NextConfig} */
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://zero-api-m0an.onrender.com")
  .trim()
  .replace(/^['"]|['"]$/g, "")
  .replace(/\/$/, "");

const nextConfig = {
  distDir: ".next",
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    typedRoutes: true
  },
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic"
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`
      }
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/zero-control",
        permanent: false
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
