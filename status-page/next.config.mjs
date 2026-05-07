/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build output: standalone is the friendliest for Vercel + Fly +
  // any container runtime. Vercel auto-detects either way.
  output: "standalone",
};
export default nextConfig;
