// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Quiz expert énergie — CIPREL',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '55 questions corrigées sur les centrales à cycle combiné gaz : 4 quiz d’entraînement et un examen, de la turbine à gaz au réseau.' },
        { name: 'theme-color', content: '#ed7f06' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;600;700;800&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    // Supabase (côté serveur uniquement) : NUXT_SUPABASE_URL, NUXT_SUPABASE_KEY (clé publishable)
    supabaseUrl: '',
    supabaseKey: '',
    public: {
      // adresse publique du quiz (liens de partage, Open Graph) : NUXT_PUBLIC_SITE_URL
      siteUrl: '',
    },
  },
})
