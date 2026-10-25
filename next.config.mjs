// @ts-check

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};
export default config;
