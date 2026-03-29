// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  telemetry: false,
  sourcemap: { client: false },
  modules: [
    'shadcn-nuxt',
  ],
  shadcn: {
    prefix: '',
    componentDir: './components/ui',
  },
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  app: {
    head: {
      title: '役員報酬最適化シミュレーター',
      meta: [
        { name: 'description', content: '一人法人の役員報酬と法人利益の配分を視覚的にシミュレーション' },
      ],
    },
  },
  nitro: {
    preset: 'cloudflare-pages',
  },
  vite: {
    server: {
      hmr: {
        host: '0.0.0.0',
        protocol: 'ws',
      },
      allowedHosts: true,
    },
  },
})
