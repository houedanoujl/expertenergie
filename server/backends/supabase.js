// Stockage Supabase (version web) : lecture REST sur les colonnes publiques,
// écriture par les fonctions quiz_* qui valident côté base (voir supabase/migrations).
// Les entrées sont déjà validées par les routes.

export async function listQuizzes () {
  const [{ rows: quizzes }, { rows: questions }] = await Promise.all([
    sbSelect('quiz_quizzes', { select: 'id,label,title,subtitle,mode,position,time_limit', order: 'position.asc' }),
    sbSelect('quiz_questions', { select: 'quiz_id,calc' }),
  ])
  return quizzes.map(q => {
    const mine = questions.filter(x => x.quiz_id === q.id)
    return { ...q, count: mine.length, calc: mine.filter(x => x.calc).length }
  })
}

export async function getQuiz (id) {
  const [{ rows: quizzes }, { rows: questions }] = await Promise.all([
    sbSelect('quiz_quizzes', { select: 'id,label,title,subtitle,mode,position,time_limit', id: `eq.${id}` }),
    sbSelect('quiz_questions', { select: 'id,position,level,prompt,choices,calc', quiz_id: `eq.${id}`, order: 'position.asc' }),
  ])
  return quizzes.length ? { ...quizzes[0], questions } : null
}

export const start = ({ quiz, name, questions }) =>
  sbRpc('quiz_start', { p_quiz: quiz, p_name: name, p_questions: questions })

export const answer = ({ attempt, token, question, choice, time }) =>
  sbRpc('quiz_answer', { p_attempt: attempt, p_token: token, p_question: question, p_choice: choice, p_time_ms: time })

export const finish = ({ attempt, token }) =>
  sbRpc('quiz_finish', { p_attempt: attempt, p_token: token })

export const result = slug => sbRpc('quiz_result', { p_slug: slug })

export async function leaderboard (quiz, limit) {
  // les échecs (temps écoulé) ne sont pas lisibles : la politique RLS les écarte
  const { rows, total } = await sbSelect('quiz_attempts', {
    select: 'quiz_id,name,points,score,total,duration_s,level,share_slug,finished_at',
    ...(quiz === 'all' ? {} : { quiz_id: `eq.${quiz}` }),
    order: 'points.desc.nullslast,score.desc,duration_s.asc,finished_at.asc',
    limit,
  }, { count: true })
  return {
    total,
    entries: rows.map((r, i) => ({
      rank: i + 1, quiz: r.quiz_id, name: r.name, points: r.points, score: r.score, total: r.total, time: r.duration_s, level: r.level, slug: r.share_slug, at: Date.parse(r.finished_at),
    })),
  }
}
