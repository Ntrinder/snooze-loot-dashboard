/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'wow.zamimg.com' }] },
};
export default nextConfig;
