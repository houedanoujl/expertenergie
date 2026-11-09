// Export CSV des tentatives (?kind=attempts) ou des réponses (?kind=answers).
// Borne seulement : stockage local et jeton d'administration (NUXT_ADMIN_TOKEN, transmis
// par l'application Electron, jamais par la page).
export default defineEventHandler((event) => {
  if (!isLocalStore() || !isAdmin(event)) throw createError({ statusCode: 404 })
  const kind = getQuery(event).kind === 'answers' ? 'answers' : 'attempts'
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  return useQuizStore().exportCsv(kind)
})
