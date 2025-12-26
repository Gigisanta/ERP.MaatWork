/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Import configuration modules
const buildConfig = require('./config/build');
const imagesConfig = require('./config/images');
const environmentConfig = require('./config/environment');
const developmentConfig = require('./config/development');
const headersConfig = require('./config/headers');
const webpackConfig = require('./config/webpack');

const nextConfig = {
  transpilePackages: ['@maatwork/ui', '@maatwork/types'],
  ...buildConfig,
  ...imagesConfig,
  ...environmentConfig,
  ...developmentConfig,
  ...headersConfig,
  ...webpackConfig,
};

module.exports = withBundleAnalyzer(nextConfig);
