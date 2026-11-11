// Classement d'un quiz (ou de tous : quiz=all) : points décroissants, puis bonnes réponses, temps, ancienneté.
export default defineEventHandler(async (event) => {
  const { quiz, limit = 20 } = getQuery(event)
  if (!isQuizId(quiz)) throw createError({ statusCode: 400, statusMessage: 'Quiz introuvable.' })
  const n = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  return await useQuizStore().leaderboard(quiz, n)
})
