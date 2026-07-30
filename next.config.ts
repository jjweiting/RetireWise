import type { NextConfig } from 'next'

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const repoBasePath = '/RetireWise'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isGitHubPages ? repoBasePath : undefined,
  assetPrefix: isGitHubPages ? repoBasePath : undefined,
  allowedDevOrigins: ['wadechen.tail3f027e.ts.net'],
}

export default nextConfig
