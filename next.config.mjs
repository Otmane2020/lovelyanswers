/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "autopilotgeo.com" },
    ],
  },
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
