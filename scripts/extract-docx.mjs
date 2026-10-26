// Extrait les 55 questions du Word client vers supabase/seed/quizzes.json.
// Usage : node scripts/extract-docx.mjs [chemin.docx]
// La bonne réponse est l'option marquée ✔ ; elle est contrôlée contre la
// « Grille de réponses » de fin de document : le moindre écart fait échouer le script.
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docx = process.argv[2] || resolve(root, 'reference/quiz-expert-energie.docx')
const out = resolve(root, 'supabase/seed/quizzes.json')

const xml = execFileSync('unzip', ['-p', docx, 'word/document.xml'], { encoding: 'utf8', maxBuffer: 32 << 20 })
const decode = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, '’')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&')
const paras = xml.split('</w:p>')
  .map(p => decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join('')))
  .map(t => t.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

// Questions de calcul (récompense « Calculateur »)
const CALC = new Set(['q1-05', 'q3-01', 'q3-05', 'q3-10', 'q4-08', 'examen-01', 'examen-08', 'examen-11', 'examen-14'])
const META = {
  'Quiz 1': { id: 'q1', mode: 'entrainement' },
  'Quiz 2': { id: 'q2', mode: 'entrainement' },
  'Quiz 3': { id: 'q3', mode: 'entrainement' },
  'Quiz 4': { id: 'q4', mode: 'entrainement' },
  // Le document titre l'examen « 15 questions, difficulté croissante » : on garde un titre lisible seul.
  Examen: { id: 'examen', mode: 'examen', title: 'Quatre niveaux de difficulté croissante' },
}

const start = paras.findIndex(p => p.startsWith('Comment utiliser ce document'))
const gridAt = paras.findIndex(p => p === 'Grille de réponses')
if (start < 0 || gridAt < 0) throw new Error('Structure du document inattendue.')

const quizzes = []
let quiz = null
let q = null
for (let i = start + 1; i < gridAt; i++) {
  const p = paras[i]
  const head = p.match(/^(Quiz [1-4]|Examen) : (.+)$/)
  if (head) {
    const meta = META[head[1]]
    quiz = { id: meta.id, label: head[1], title: meta.title || head[2], subtitle: paras[++i], mode: meta.mode, position: quizzes.length + 1, questions: [] }
    quizzes.push(quiz)
    continue
  }
  const qm = p.match(/^Question (\d+)\. (?:\[Niveau (\d) – [^\]]+\] )?(.+)$/)
  if (qm) {
    const n = +qm[1]
    q = { id: `${quiz.id}-${String(n).padStart(2, '0')}`, position: n, level: qm[2] ? +qm[2] : null, prompt: qm[3], choices: [], answer: null, explanation: '' }
    q.calc = CALC.has(q.id)
    quiz.questions.push(q)
    continue
  }
  const cm = p.match(/^([A-D])\. (.+)$/)
  if (cm && q && q.choices.length < 4) {
    let text = cm[2]
    if (text.includes('✔')) { q.answer = cm[1]; text = text.replace('✔', '') }
    q.choices.push(text.trim())
    continue
  }
  const rm = p.match(/^Réponse ([A-D])\. (.+)$/)
  if (rm && q) {
    if (rm[1] !== q.answer) throw new Error(`${q.id} : ✔ sur ${q.answer}, explication sur ${rm[1]}`)
    q.explanation = rm[2]
    continue
  }
}

// Contrôle croisé avec la grille de réponses
const grid = {}
for (let i = gridAt + 1; i < paras.length; i++) {
  const meta = META[paras[i]]
  if (meta && /^\d+-[A-D]/.test(paras[i + 1] || '')) {
    grid[meta.id] = Object.fromEntries([...paras[i + 1].matchAll(/(\d+)-([A-D])/g)].map(m => [+m[1], m[2]]))
  }
}
let count = 0
for (const z of quizzes) {
  for (const x of z.questions) {
    if (x.choices.length !== 4 || !x.answer || !x.explanation) throw new Error(`${x.id} incomplète`)
    if (grid[z.id]?.[x.position] !== x.answer) throw new Error(`${x.id} : ${x.answer} ≠ grille ${grid[z.id]?.[x.position]}`)
    count++
  }
}
if (quizzes.length !== 5 || count !== 55) throw new Error(`${quizzes.length} quiz, ${count} questions (attendu 5 et 55)`)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ source: 'Quiz expert énergie (Word client)', quizzes }, null, 2) + '\n')
console.log(`${quizzes.length} quiz, ${count} questions, conformes à la grille → ${out}`)
