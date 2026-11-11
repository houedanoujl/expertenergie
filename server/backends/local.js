// Stockage local (borne hors ligne) : même contrat que les fonctions quiz_* de Supabase
// (supabase/migrations/0001_quiz.sql), sans base ni réseau.
//
// - Questions : supabase/seed/quizzes.json, embarqué au build.
// - Tentatives : journal append-only (une ligne JSON par événement : start, answer, finish)
//   dans NUXT_DATA_DIR/journal.ndjson, relu au démarrage. Chaque écriture est synchronisée
//   sur le disque : une coupure de courant fait perdre au plus l'événement en cours,
//   et une ligne tronquée est ignorée à la relecture.
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import seed from '../../supabase/seed/quizzes.json'

const QUIZZES = [...seed.quizzes].sort((a, b) => a.position - b.position)
const QUIZ_BY_ID = new Map(QUIZZES.map(q => [q.id, q]))
const QUESTION_BY_ID = new Map(QUIZZES.flatMap(q => q.questions.map(x => [x.id, { ...x, quiz_id: q.id }])))

const meta = q => ({ id: q.id, label: q.label, title: q.title, subtitle: q.subtitle, mode: q.mode, position: q.position, time_limit: q.time_limit ?? null })
const reject = message => { throw createError({ statusCode: 400, statusMessage: message }) }

// Barème du document : 0–7 à reprendre, 8–11 acquis, 12–15 expert (sur 15), au prorata.
export function quizLevel (score, total) {
  if (score * 15 >= 12 * total) return 'expert'
  if (score * 15 >= 8 * total) return 'acquis'
  return 'a-reprendre'
}

// Quiz chronométré : une partie classée dure au plus time_limit secondes (les révisions ne sont pas chronométrées).
// Une réponse est encore acceptée GRACE_MS après la fin, le temps que la requête arrive.
const GRACE_MS = 3000
const limitOf = a => (a.ranked ? QUIZ_BY_ID.get(a.quiz)?.time_limit ?? null : null)

// Points d'une partie chronométrée terminée : la justesse d'abord, le temps ensuite.
// 100 points par bonne réponse, plus 2 points par seconde restante, au prorata des bonnes réponses.
export function quizPoints (score, total, left) {
  return score * 100 + Math.round(2 * Math.max(0, left) * score / total)
}

// ─── Journal ─────────────────────────────────────────────────────────────────

let db = null

function apply (s, e) {
  if (e.t === 'start') {
    s.attempts.set(e.id, {
      id: e.id, token: e.token, quiz: e.quiz, name: e.name, questions: e.questions, ranked: e.ranked,
      total: e.questions.length, startedAt: e.at, answers: new Map(),
      finishedAt: null, score: null, duration: null, level: null, slug: null, points: null, failed: false,
    })
    return
  }
  const a = s.attempts.get(e.id)
  if (!a) return
  if (e.t === 'answer' && !a.answers.has(e.question)) {
    a.answers.set(e.question, { choice: e.choice, correct: e.correct, time: e.time, at: e.at })
  } else if (e.t === 'finish' && !a.finishedAt) {
    Object.assign(a, { finishedAt: e.at, score: e.score, duration: e.duration, level: e.level, slug: e.slug, points: e.points ?? null, failed: !!e.failed })
    s.bySlug.set(e.slug, a)
  }
}

function open () {
  if (db) return db
  const dir = path.resolve(useRuntimeConfig().dataDir || '.data/kiosk')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'journal.ndjson')
  const s = { file, attempts: new Map(), bySlug: new Map(), fd: null }

  let text = ''
  try { text = fs.readFileSync(file, 'utf8') } catch (e) { if (e.code !== 'ENOENT') throw e }
  let skipped = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try { apply(s, JSON.parse(line)) } catch { skipped++ }
  }
  s.fd = fs.openSync(file, 'a')
  // ligne tronquée par une coupure : on repart sur une ligne neuve
  if (text && !text.endsWith('\n')) fs.writeSync(s.fd, '\n')
  console.info(`[quiz] stockage local : ${file} (${s.attempts.size} tentative(s)${skipped ? `, ${skipped} ligne(s) illisible(s) ignorée(s)` : ''})`)
  db = s
  return s
}

// Écrit l'événement sur le disque, puis l'applique en mémoire.
function record (e) {
  const s = open()
  fs.writeSync(s.fd, JSON.stringify(e) + '\n')
  fs.fsyncSync(s.fd)
  apply(s, e)
}

function find (attempt, token) {
  const a = open().attempts.get(attempt)
  if (!a || a.token !== token) reject('Tentative introuvable.')
  return a
}

// Rang d'une tentative classée : points décroissants, puis bonnes réponses, durée, ancienneté.
const key = a => [-(a.points ?? 0), -a.score, a.duration, a.finishedAt]
function ahead (s, a) {
  const x = key(s)
  const y = key(a)
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i]
  return false
}

// Parties classées d'un quiz ('all' : tous les quiz). Les échecs (temps écoulé) et les
// parties d'un quiz retiré du questionnaire n'y entrent pas.
function ranked (quiz) {
  return [...open().attempts.values()].filter(a =>
    (quiz === 'all' ? QUIZ_BY_ID.has(a.quiz) : a.quiz === quiz) && a.ranked && a.finishedAt && !a.failed)
}

function standing (a) {
  if (!a.ranked || a.failed) return { rank: null, players: null }
  const others = ranked(a.quiz)
  return { rank: others.filter(s => s.id !== a.id && ahead(s, a)).length + 1, players: others.length }
}

// ─── Contrat de l'API (mêmes réponses que les fonctions quiz_*) ──────────────

export function listQuizzes () {
  return QUIZZES.map(q => ({ ...meta(q), count: q.questions.length, calc: q.questions.filter(x => x.calc).length }))
}

export function getQuiz (id) {
  const q = QUIZ_BY_ID.get(id)
  if (!q) return null
  return {
    ...meta(q),
    questions: [...q.questions].sort((a, b) => a.position - b.position)
      .map(({ id, position, level, prompt, choices, calc }) => ({ id, position, level, prompt, choices, calc })),
  }
}

export function start ({ quiz, name, questions }) {
  const v = String(name ?? '').replace(/\s+/g, ' ').trim()
  if (v.length < 2 || v.length > 20 || /[<>]/.test(v)) reject('Pseudo invalide (2 à 20 caractères).')
  const q = QUIZ_BY_ID.get(quiz)
  if (!q) reject('Quiz introuvable.')
  const wanted = questions ? new Set(questions) : null
  const ids = [...q.questions].sort((a, b) => a.position - b.position).map(x => x.id).filter(id => !wanted || wanted.has(id))
  if (!ids.length || (wanted && ids.length !== wanted.size)) reject('Questions invalides.')

  const e = { t: 'start', id: randomUUID(), token: randomUUID(), quiz, name: v, questions: ids, ranked: !wanted, at: new Date().toISOString() }
  record(e)
  return { attempt: e.id, token: e.token, mode: q.mode, questions: ids, ranked: e.ranked, limit: e.ranked ? q.time_limit ?? null : null }
}

export function answer ({ attempt, token, question, choice, time }) {
  const a = find(attempt, token)
  if (a.finishedAt) reject('Ce quiz est déjà terminé.')
  if (!a.questions.includes(question)) reject('Question hors de ce quiz.')
  const c = String(choice || '').toUpperCase()
  if (!['A', 'B', 'C', 'D'].includes(c)) reject('Réponse invalide.')
  const q = QUESTION_BY_ID.get(question)

  if (!a.answers.has(question)) {
    const limit = limitOf(a)
    if (limit && Date.now() - Date.parse(a.startedAt) > limit * 1000 + GRACE_MS) reject('Temps écoulé.')
    const ms = Math.min(Math.max(Math.round(Number(time) || 0), 0), 3600000)
    record({ t: 'answer', id: a.id, question, choice: c, correct: c === q.answer, time: ms, at: new Date().toISOString() })
  }
  const r = a.answers.get(question)
  if (QUIZ_BY_ID.get(a.quiz).mode === 'examen' && a.ranked) return { question, choice: r.choice, recorded: true }
  return { question, choice: r.choice, correct: r.correct, answer: q.answer, explanation: q.explanation }
}

export function finish ({ attempt, token }) {
  const a = find(attempt, token)
  if (!a.finishedAt) {
    const limit = limitOf(a)
    const left = a.total - a.answers.size
    // quiz chronométré non terminé : échec, hors classement
    const failed = !!limit && left > 0
    if (left > 0 && !failed) reject(`Il reste ${left} question(s) sans réponse.`)
    const s = open()
    let slug
    do slug = randomUUID().replace(/-/g, '').slice(0, 10)
    while (s.bySlug.has(slug))
    const answers = [...a.answers.values()]
    const score = answers.filter(x => x.correct).length
    const at = new Date()
    // chronométré : temps écoulé depuis le départ ; révision : temps de réflexion cumulé
    const ms = limit ? Math.min(at - Date.parse(a.startedAt), limit * 1000) : answers.reduce((n, x) => n + x.time, 0)
    const duration = failed ? limit : Math.max(1, Math.round(ms / 1000))
    record({
      t: 'finish', id: a.id, at: at.toISOString(),
      score, duration, level: quizLevel(score, a.total), slug, failed,
      points: limit ? (failed ? 0 : quizPoints(score, a.total, limit - duration)) : null,
    })
  }
  const corrections = a.questions.filter(id => a.answers.has(id)).map(id => {
    const q = QUESTION_BY_ID.get(id)
    const r = a.answers.get(id)
    return { question: id, position: q.position, choice: r.choice, correct: r.correct, answer: q.answer, explanation: q.explanation }
  })
  return {
    quiz: a.quiz, name: a.name, score: a.score, total: a.total, level: a.level,
    duration: a.duration, ranked: a.ranked, ...standing(a), slug: a.slug, corrections,
    points: a.points, failed: a.failed, answered: a.answers.size, limit: limitOf(a),
  }
}

export function result (slug) {
  const a = open().bySlug.get(slug)
  const q = a && QUIZ_BY_ID.get(a.quiz)
  if (!q) return null
  return {
    slug: a.slug, name: a.name, quiz: q.id, label: q.label, title: q.title, mode: q.mode,
    score: a.score, total: a.total, level: a.level, duration: a.duration, finished_at: a.finishedAt,
    ranked: a.ranked, ...standing(a), points: a.points, failed: a.failed,
    pattern: a.questions.filter(id => a.answers.has(id)).map(id => a.answers.get(id).correct),
  }
}

export function leaderboard (quiz, limit) {
  const all = ranked(quiz).sort((x, y) => (ahead(x, y) ? -1 : ahead(y, x) ? 1 : 0))
  return {
    total: all.length,
    entries: all.slice(0, limit).map((a, i) => ({
      rank: i + 1, quiz: a.quiz, name: a.name, points: a.points, score: a.score, total: a.total, time: a.duration, level: a.level, slug: a.slug, at: Date.parse(a.finishedAt),
    })),
  }
}

// ─── Export CSV (écran d'administration de la borne) ─────────────────────────

const pad = n => String(n).padStart(2, '0')
const stamp = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
// Séparateur « ; » et BOM UTF-8 pour Excel en français. Une cellule qui commence
// par = + - @ serait lue comme une formule : on la préfixe d'une apostrophe.
const cell = v => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csv = rows => '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n') + '\r\n'

export function exportCsv (kind) {
  const attempts = [...open().attempts.values()].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
  if (kind === 'answers') {
    const rows = [['tentative', 'quiz', 'pseudo', 'question', 'numero', 'reponse', 'bonne_reponse', 'juste', 'temps_ms', 'date']]
    for (const a of attempts) {
      for (const id of a.questions) {
        const r = a.answers.get(id)
        if (!r) continue
        const q = QUESTION_BY_ID.get(id)
        rows.push([a.id, a.quiz, a.name, id, q?.position ?? '', r.choice, q?.answer ?? '', r.correct ? 'oui' : 'non', r.time, stamp(r.at)])
      }
    }
    return csv(rows)
  }
  const rank = new Map()
  for (const q of QUIZZES) leaderboard(q.id, Infinity).entries.forEach(e => rank.set(e.slug, e.rank))
  const rows = [['tentative', 'quiz', 'pseudo', 'debut', 'fin', 'statut', 'points', 'bonnes_reponses', 'total', 'niveau', 'duree_s', 'classee', 'rang']]
  for (const a of attempts) {
    rows.push([
      a.id, a.quiz, a.name, stamp(a.startedAt), stamp(a.finishedAt),
      !a.finishedAt ? 'abandonnee' : a.failed ? 'echec (temps ecoule)' : 'terminee', a.points, a.score, a.total, a.level, a.duration,
      !a.ranked ? 'non (revision)' : a.failed ? 'non (echec)' : 'oui', rank.get(a.slug) ?? '',
    ])
  }
  return csv(rows)
}

export function stats () {
  const all = [...open().attempts.values()]
  const done = all.filter(a => a.finishedAt)
  return {
    file: open().file,
    attempts: all.length,
    finished: done.length,
    players: new Set(done.map(a => a.name.toLowerCase())).size,
    last: done.reduce((m, a) => (a.finishedAt > m ? a.finishedAt : m), '') || null,
  }
}
