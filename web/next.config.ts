import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['onnxruntime-node', '@xenova/transformers'],
};

export default nextConfig;
