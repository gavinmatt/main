import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'

export default defineConfig({
  site: 'https://www.gavmatt.com',
  // Every page is built ahead of time and served from the CDN; live data comes
  // from the Vercel functions in api/. A page can opt out with `prerender = false`.
  output: 'static',
  adapter: vercel(),
  redirects: {
    // The post was published under its "copy" filename for a while; keep old links working.
    '/blog/product-manager-ai-thoughts-copy': '/blog/product-manager-ai-thoughts',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/clickathon-admin'),
    }),
    tailwind(),
    react(),
  ],
})
