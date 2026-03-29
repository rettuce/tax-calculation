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
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'tedori',
      meta: [
        { name: 'description', content: 'ひとり法人の役員報酬と法人利益の最適な配分をシミュレーション' },
      ],
    },
  },
  nitro: {
    preset: 'github-pages',
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
