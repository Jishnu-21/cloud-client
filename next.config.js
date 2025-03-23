/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob: data:;"
          }
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1gb'
    },
  },
};

module.exports = nextConfig;
