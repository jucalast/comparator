/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Webpack configuration for production builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'net', 'tls', etc. on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Turbopack configuration (moved from experimental.turbo to turbopack)
  turbopack: {
    // Use proper resolveAlias format with empty strings instead of false
    resolveAlias: {
      'fs': '',
      'net': '',
      'tls': '',
    }
  },
};

module.exports = nextConfig;
