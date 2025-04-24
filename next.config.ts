import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  env: {
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL,
    API_SERVER_URL: process.env.API_SERVER_URL,
    CRYPTO_KEY: process.env.CRYPTO_KEY,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
    WHICH_NODE_ENV: process.env.WHICH_NODE_ENV,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    YAPSDOTCHAT_API_KEY: process.env.YAPSDOTCHAT_API_KEY,
    TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    GIPHY_API_KEY: process.env.GIPHY_API_KEY,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  },
  devIndicators: false
};

export default nextConfig;
