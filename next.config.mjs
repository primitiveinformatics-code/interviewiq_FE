/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // basePath tells Next.js this app is served under a subpath on the domain.
  // Production (Vercel):  set NEXT_PUBLIC_BASE_PATH=/interviewbot in Vercel env vars
  //                       → app is served at primitiveinformatics.in/interviewbot
  // Local development:    leave NEXT_PUBLIC_BASE_PATH unset (or set to "")
  //                       → app runs at http://localhost:3000/ as normal
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
};

export default nextConfig;
