// Liste des quiz avec leur nombre de questions (dont questions de calcul).
export default defineEventHandler(async () => {
  const [{ rows: quizzes }, { rows: questions }] = await Promise.all([
    sbSelect('quiz_quizzes', { select: 'id,label,title,subtitle,mode,position', order: 'position.asc' }),
    sbSelect('quiz_questions', { select: 'quiz_id,calc' }),
  ])
  return quizzes.map(q => {
    const mine = questions.filter(x => x.quiz_id === q.id)
    return { ...q, count: mine.length, calc: mine.filter(x => x.calc).length }
  })
})
