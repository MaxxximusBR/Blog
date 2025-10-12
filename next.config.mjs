/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // <- libera o JS do Admin e do fallback
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.vercel-storage.com",
              "connect-src 'self' https://*.vercel-storage.com https://*.blob.vercel-storage.com",
              "frame-src https://www.youtube.com https://youtube.com https://*.youtube-nocookie.com",
              "font-src 'self' data:"
            ].join("; ")
          }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
