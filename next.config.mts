import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'cloudinary-marketing.com'],
  },
};

export default nextConfig;
