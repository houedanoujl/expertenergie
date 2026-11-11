// État du participant : pseudo, tentative en cours, meilleurs scores, erreurs à réviser, récompenses.
// Persisté dans localStorage : un rechargement ne fait pas perdre la tentative en cours.
// Les réponses, elles, sont enregistrées dans Supabase au fil de l'eau (API /api/attempts).
import { ORDER } from '~/data/sections'

// v2 : trois quiz chronométrés (débutant, intermédiaire, expert)
export const STORAGE_KEY = 'quiz-expert-energie:v2'
const KEY = STORAGE_KEY

export const BADGES = [
  { id: 'premier', name: 'Premier quiz', desc: 'Un premier quiz terminé dans les temps.' },
  { id: 'sans-faute', name: 'Sans faute', desc: 'Toutes les réponses justes à un quiz.' },
  { id: 'serie', name: 'Série de 5', desc: 'Cinq bonnes réponses d’affilée.' },
  { id: 'calculateur', name: 'Calculateur', desc: 'Toutes les questions de calcul réussies.' },
  { id: 'expert', name: 'Expert confirmé', desc: '8/10 ou plus au quiz expert.' },
  { id: 'centrale', name: 'Centrale complète', desc: 'Les trois quiz réussis : la centrale est sur le réseau.' },
  { id: 'partage', name: 'Ambassadeur', desc: 'Un résultat partagé ou un collègue défié.' },
]
export const BADGE_BY_ID = Object.fromEntries(BADGES.map(b => [b.id, b]))

const fresh = () => ({
  name: '',
  best: {},       // quiz → { points, score, total, level, slug, at } (parties classées)
  missed: {},     // quiz → ids des questions ratées, à réviser
  calcOk: [],     // questions de calcul réussies au moins une fois
  done: [],       // quiz terminés dans les temps au moins une fois
  badges: {},     // id → date d'obtention
  current: null,  // { quiz, attempt, token, mode, ranked, questions, answers, index, elapsed, limit, startedAt }
})

export function useQuiz () {
  const state = useState('quiz', fresh)
  const loaded = useState('quiz-loaded', () => false)
  const toasts = useState('toasts', () => [])

  function load () {
    if (loaded.value || import.meta.server) return
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (saved) state.value = { ...fresh(), ...saved }
    } catch { /* stockage indisponible : progression non sauvegardée */ }
    loaded.value = true
    watch(state, v => {
      try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* idem */ }
    }, { deep: true })
  }

  function award (id, list = []) {
    if (state.value.badges[id]) return list
    state.value.badges[id] = Date.now()
    list.push(id)
    toasts.value.push({ key: `${id}-${Date.now()}`, id })
    return list
  }

  const current = id => (state.value.current?.quiz === id ? state.value.current : null)

  async function start (quiz, { review = false } = {}) {
    const questions = review ? state.value.missed[quiz] : undefined
    const r = await $fetch('/api/attempts', { method: 'POST', body: { quiz, name: state.value.name, questions } })
    state.value.name = state.value.name.trim()
    state.value.current = {
      quiz, attempt: r.attempt, token: r.token, mode: r.mode, ranked: r.ranked,
      questions: r.questions, answers: {}, index: 0, elapsed: 0,
      // quiz chronométré : durée en secondes et heure de départ (le compte à rebours survit à un rechargement)
      limit: r.limit || null, startedAt: Date.now(),
    }
    return state.value.current
  }

  // time : durée de réflexion sur la question, en ms
  async function answer (question, choice, time) {
    const c = state.value.current
    const r = await $fetch(`/api/attempts/${c.attempt}/answer`, {
      method: 'POST', body: { token: c.token, question, choice, time },
    })
    c.answers[question] = r
    c.elapsed += time
    return r
  }

  function next () {
    const c = state.value.current
    if (c && c.index < c.questions.length - 1) c.index += 1
  }

  // questions : les questions du quiz (avec le drapeau calc) ; calcTotal : nombre de questions de calcul du questionnaire
  async function finish (questions, calcTotal) {
    const s = state.value
    const c = s.current
    const r = await $fetch(`/api/attempts/${c.attempt}/finish`, { method: 'POST', body: { token: c.token } })
    const fresh = []

    // temps écoulé : échec, rien n'est retenu (ni score, ni erreurs à réviser, ni récompense)
    if (r.failed) {
      s.current = null
      return { ...r, badges: fresh, review: false }
    }

    const wrong = r.corrections.filter(x => !x.correct).map(x => x.question)
    if (c.ranked) s.missed[c.quiz] = wrong
    else s.missed[c.quiz] = (s.missed[c.quiz] || []).filter(id => wrong.includes(id))
    if (!s.missed[c.quiz].length) delete s.missed[c.quiz]

    if (c.ranked) {
      const prev = s.best[c.quiz]
      if (!prev || r.points > prev.points) s.best[c.quiz] = { points: r.points, score: r.score, total: r.total, level: r.level, slug: r.slug, at: Date.now() }
      if (!s.done.includes(c.quiz)) s.done.push(c.quiz)
    }

    const calc = new Set(questions.filter(q => q.calc).map(q => q.id))
    for (const x of r.corrections) if (x.correct && calc.has(x.question) && !s.calcOk.includes(x.question)) s.calcOk.push(x.question)

    let run = 0
    let longest = 0
    for (const x of r.corrections) { run = x.correct ? run + 1 : 0; longest = Math.max(longest, run) }

    award('premier', fresh)
    if (r.score === r.total && c.ranked) award('sans-faute', fresh)
    if (longest >= 5) award('serie', fresh)
    if (calcTotal && s.calcOk.length >= calcTotal) award('calculateur', fresh)
    if (c.quiz === 'expert' && c.ranked && r.score * 10 >= 8 * r.total) award('expert', fresh)
    if (ORDER.every(id => s.done.includes(id))) award('centrale', fresh)

    s.current = null
    return { ...r, badges: fresh, review: !c.ranked }
  }

  function abandon () { state.value.current = null }

  const doneCount = computed(() => state.value.done.length)
  // Charge de la centrale : meilleures bonnes réponses cumulées sur l'ensemble des questions
  const charge = computed(() => Object.values(state.value.best).reduce((n, b) => n + b.score, 0))

  return { state, load, award, current, start, answer, next, finish, abandon, doneCount, charge }
}

// Liste des quiz, partagée entre les pages
export function useQuizList () {
  return useFetch('/api/quizzes', { key: 'quizzes', default: () => [] })
}

export const formatTime = s => {
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
export const ordinal = n => (n === 1 ? '1ᵉʳ' : `${n}ᵉ`)
// « au quiz débutant »
export const atQuiz = label => `au ${label.toLowerCase()}`
export const points = n => `${n} point${n > 1 ? 's' : ''}`
