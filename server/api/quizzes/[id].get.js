// Un quiz et ses questions, sans le corrigé.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!isQuizId(id)) throw createError({ statusCode: 404, statusMessage: 'Quiz introuvable.' })
  const quiz = await useQuizStore().getQuiz(id)
  if (!quiz) throw createError({ statusCode: 404, statusMessage: 'Quiz introuvable.' })
  return quiz
})
