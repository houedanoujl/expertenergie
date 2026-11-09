// Résultat public d'une tentative (page de partage, défi).
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!/^[0-9a-f]{10}$/.test(slug || '')) throw createError({ statusCode: 404, statusMessage: 'Résultat introuvable.' })
  const r = await useQuizStore().result(slug)
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Résultat introuvable.' })
  return r
})
