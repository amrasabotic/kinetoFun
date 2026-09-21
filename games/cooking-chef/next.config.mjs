/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
  // COEP/COOP are intentionally omitted: they would block the MediaPipe WASM
  // files served from cdn.jsdelivr.net (CDN doesn't send Cross-Origin-Resource-Policy
  // headers that COEP require-corp requires). The game uses no SharedArrayBuffer.
  basePath: '/games/cooking-chef/out',
  assetPrefix: '/games/cooking-chef/out',
};

export default nextConfig;
