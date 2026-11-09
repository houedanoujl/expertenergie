// Compteurs du stockage local, pour l'écran d'administration de la borne.
export default defineEventHandler((event) => {
  if (!isLocalStore() || !isAdmin(event)) throw createError({ statusCode: 404 })
  return useQuizStore().stats()
})
