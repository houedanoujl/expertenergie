// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: [
    // polices embarquées (aucun appel à Google Fonts : la borne tourne hors ligne)
    '@fontsource/baloo-2/600.css', '@fontsource/baloo-2/700.css', '@fontsource/baloo-2/800.css',
    '@fontsource/nunito/500.css', '@fontsource/nunito/600.css', '@fontsource/nunito/700.css', '@fontsource/nunito/800.css',
    '~/assets/css/main.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Quiz expert énergie — CIPREL',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Trois quiz chronométrés sur l’énergie et les centrales à cycle combiné gaz : débutant, intermédiaire, expert. 2 minutes pour 10 questions.' },
        { name: 'theme-color', content: '#ed7f06' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
      ],
    },
  },
  runtimeConfig: {
    // stockage : 'supabase' (web) ou 'local' (borne hors ligne) : NUXT_STORAGE
    storage: 'supabase',
    // Supabase (côté serveur uniquement) : NUXT_SUPABASE_URL, NUXT_SUPABASE_KEY (clé publishable)
    supabaseUrl: '',
    supabaseKey: '',
    // stockage local : dossier du journal des tentatives (NUXT_DATA_DIR)
    // et jeton des routes /api/admin (NUXT_ADMIN_TOKEN, fourni par l'application Electron)
    dataDir: '',
    adminToken: '',
    public: {
      // adresse publique du quiz (liens de partage, Open Graph) : NUXT_PUBLIC_SITE_URL
      siteUrl: '',
      // mode borne tactile : pas de partage, clavier à l'écran, remise à zéro après inactivité
      // NUXT_PUBLIC_KIOSK=true, NUXT_PUBLIC_IDLE_SECONDS (90 par défaut)
      kiosk: false,
      idleSeconds: 90,
    },
  },
})
