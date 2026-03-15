import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Proxy /api/* to the FastAPI backend so the frontend never hard-codes
   * the backend URL. In Docker Compose the backend service is named "backend"
   * and available at http://backend:8000.
   *
   * Architecture ref: docs/roadmap.md Phase 7 – "Frontend → Backend → AI Services"
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NEXT_PUBLIC_BACKEND_URL
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`
            : "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
