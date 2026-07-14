import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリにも lockfile があるため、このプロジェクトを明示的にルート指定
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
