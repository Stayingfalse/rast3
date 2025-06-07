/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const withBundleAnalyzer = (await import("@next/bundle-analyzer")).default({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import("next").NextConfig} */
const config = withBundleAnalyzer({
  reactStrictMode: true,
  output: "standalone",
  
  // Remove X-Powered-By header
  poweredByHeader: false,

  // Security headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const securityHeaders = [
      // Remove X-Powered-By header
      {
        key: 'X-Powered-By',
        value: '',
      },
      // Anti-clickjacking protection
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
    ];

    // Only add HSTS in production to avoid breaking localhost development
    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://discord.com https://discordapp.com https://api.github.com https://github.com https://www.reddit.com https://oauth.reddit.com https://api.instagram.com https://graph.facebook.com https://www.facebook.com https://id.twitch.tv https://api.twitch.tv https://open.tiktok.com",
              "frame-src 'self' https://accounts.google.com https://www.facebook.com https://discord.com https://github.com https://www.reddit.com https://id.twitch.tv",
              "form-action 'self' https://accounts.google.com https://discord.com https://github.com https://www.reddit.com https://www.facebook.com https://id.twitch.tv https://open.tiktok.com",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
          // Additional security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
      // More permissive CSP for OAuth callback pages
      {
        source: '/oauth2/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://discord.com https://discordapp.com https://api.github.com https://github.com https://www.reddit.com https://oauth.reddit.com https://api.instagram.com https://graph.facebook.com https://www.facebook.com https://id.twitch.tv https://api.twitch.tv https://open.tiktok.com",
              "frame-src 'self' https://accounts.google.com https://www.facebook.com https://discord.com https://github.com https://www.reddit.com https://id.twitch.tv",
              "frame-ancestors 'self' https://accounts.google.com https://www.facebook.com https://discord.com https://github.com https://www.reddit.com https://id.twitch.tv https://open.tiktok.com",
              "form-action 'self' https://accounts.google.com https://discord.com https://github.com https://www.reddit.com https://www.facebook.com https://id.twitch.tv https://open.tiktok.com",
              "base-uri 'self'",
              "object-src 'none'"
            ].join('; '),
          },
        ],
      },
      // Even more permissive CSP for NextAuth API routes
      {
        source: '/api/auth/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://discord.com https://discordapp.com https://api.github.com https://github.com https://www.reddit.com https://oauth.reddit.com https://api.instagram.com https://graph.facebook.com https://www.facebook.com https://id.twitch.tv https://api.twitch.tv https://open.tiktok.com",
              "frame-ancestors 'self' https://accounts.google.com https://www.facebook.com https://discord.com https://github.com https://www.reddit.com https://id.twitch.tv https://open.tiktok.com",
              "form-action 'self' https://accounts.google.com https://discord.com https://github.com https://www.reddit.com https://www.facebook.com https://id.twitch.tv https://open.tiktok.com"
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Optimize images for faster loading
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Webpack optimizations for production builds only
  // Turbopack handles development mode automatically
  ...(process.env.NODE_ENV === "production" && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.optimization.splitChunks = {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
            },
          },
        };
      }
      return config;
    },
  }),
});

export default config;
