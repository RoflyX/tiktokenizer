// @ts-check

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  // Inline the GA ID (empty when unset) so builds without one drop the analytics code.
  env: { NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID ?? "" },

  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};
export default config;
