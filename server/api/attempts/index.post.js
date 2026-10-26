// Démarre une tentative : { quiz, name, questions? } → { attempt, token, mode, questions, ranked }
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = cleanName(body?.name)
  if (name.length < 2) throw createError({ statusCode: 400, statusMessage: 'Pseudo trop court (2 caractères minimum).' })
  if (!isQuizId(body?.quiz)) throw createError({ statusCode: 400, statusMessage: 'Quiz introuvable.' })
  let questions = null
  if (body?.questions != null) {
    if (!Array.isArray(body.questions) || !body.questions.length || body.questions.length > 50 || !body.questions.every(isQuestionId)) {
      throw createError({ statusCode: 400, statusMessage: 'Questions invalides.' })
    }
    questions = [...new Set(body.questions)]
  }
  return await sbRpc('quiz_start', { p_quiz: body.quiz, p_name: name, p_questions: questions })
})
