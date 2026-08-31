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
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/clickathon-admin'),
    }),
    tailwind(),
    react(),
  ],
})
