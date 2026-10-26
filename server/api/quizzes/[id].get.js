// Un quiz et ses questions, sans le corrigé (colonnes non accordées côté base).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!isQuizId(id)) throw createError({ statusCode: 404, statusMessage: 'Quiz introuvable.' })
  const [{ rows: quizzes }, { rows: questions }] = await Promise.all([
    sbSelect('quiz_quizzes', { select: 'id,label,title,subtitle,mode,position', id: `eq.${id}` }),
    sbSelect('quiz_questions', { select: 'id,position,level,prompt,choices,calc', quiz_id: `eq.${id}`, order: 'position.asc' }),
  ])
  if (!quizzes.length) throw createError({ statusCode: 404, statusMessage: 'Quiz introuvable.' })
  return { ...quizzes[0], questions }
})
