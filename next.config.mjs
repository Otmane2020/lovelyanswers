/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "autopilotgeo.com" },
    ],
  },
  distDir: "dist",
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
