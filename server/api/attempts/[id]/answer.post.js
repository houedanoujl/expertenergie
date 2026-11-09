// Enregistre une réponse : { token, question, choice, time } (time en ms)
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!isUuid(id) || !isUuid(body?.token)) throw createError({ statusCode: 400, statusMessage: 'Tentative introuvable.' })
  if (!isQuestionId(body?.question)) throw createError({ statusCode: 400, statusMessage: 'Question invalide.' })
  const choice = String(body?.choice || '').toUpperCase()
  if (!['A', 'B', 'C', 'D'].includes(choice)) throw createError({ statusCode: 400, statusMessage: 'Réponse invalide.' })
  const time = Number.isFinite(body?.time) ? Math.min(Math.max(Math.round(body.time), 0), 3600000) : 0
  return await useQuizStore().answer({ attempt: id, token: body.token, question: body.question, choice, time })
})
