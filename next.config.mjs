/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel deployment region: set in vercel.json or dashboard to icn1 (Seoul)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.s3.ap-northeast-2.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Allow Flutter WebView to embed the site
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent 300ms tap delay on older Android WebViews
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
