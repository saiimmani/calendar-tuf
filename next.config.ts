import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  basePath: isProduction ? "/calendar-tuf" : "",
  assetPrefix: isProduction ? "/calendar-tuf/" : "",
};

export default nextConfig;
