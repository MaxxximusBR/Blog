
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const securityHeaders = [
  { key:'X-Frame-Options', value:'SAMEORIGIN' },
  { key:'X-Content-Type-Options', value:'nosniff' },
  { key:'Referrer-Policy', value:'strict-origin-when-cross-origin' },
  { key:'Permissions-Policy', value:'camera=(), microphone=(), geolocation=()' },
  { key:'Content-Security-Policy', value:
    "default-src 'self'; img-src 'self' https: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src https://www.youtube.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self';"
  },
  ...(isProd ? [{ key:'Strict-Transport-Security', value:'max-age=63072000; includeSubDomains; preload' }] : [])
];
const nextConfig = { async headers(){ return [{ source: '/(.*)', headers: securityHeaders }]; } };
export default nextConfig;
