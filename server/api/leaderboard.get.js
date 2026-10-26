// Classement d'un quiz : score décroissant, puis temps, puis ancienneté.
export default defineEventHandler(async (event) => {
  const { quiz, limit = 20 } = getQuery(event)
  if (!isQuizId(quiz)) throw createError({ statusCode: 400, statusMessage: 'Quiz introuvable.' })
  const n = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const { rows, total } = await sbSelect('quiz_attempts', {
    select: 'name,score,total,duration_s,level,share_slug,finished_at',
    quiz_id: `eq.${quiz}`,
    order: 'score.desc,duration_s.asc,finished_at.asc',
    limit: n,
  }, { count: true })
  return {
    total,
    entries: rows.map((r, i) => ({
      rank: i + 1, name: r.name, score: r.score, total: r.total, time: r.duration_s, level: r.level, slug: r.share_slug, at: Date.parse(r.finished_at),
    })),
  }
})
