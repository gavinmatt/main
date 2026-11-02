import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'   // ⬅️ add this

export default defineConfig({
  site: 'https://www.gavmatt.com',
  output: 'server',                                // ⬅️ critical
  adapter: vercel(),                               // ⬅️ critical
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
