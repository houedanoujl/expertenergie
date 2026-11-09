// Termine la tentative : score, niveau, rang, lien de partage et correction complète.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!isUuid(id) || !isUuid(body?.token)) throw createError({ statusCode: 400, statusMessage: 'Tentative introuvable.' })
  return await useQuizStore().finish({ attempt: id, token: body.token })
})
