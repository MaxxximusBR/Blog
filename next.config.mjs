// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Ajuste o CSP conforme seu requisito; abaixo é liberal o suficiente para funcionar:
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" },
        ],
      },
    ];
  },
};
