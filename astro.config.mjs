import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://www.gavmatt.com',
  integrations: [tailwind(), sitemap()],
  output: 'server',
  adapter: vercel(),
})
