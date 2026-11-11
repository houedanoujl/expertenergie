// Extrait les 3 quiz (débutant, intermédiaire, expert) du Word client vers supabase/seed/quizzes.json.
// Usage : node scripts/extract-docx.mjs [chemin.docx]
// La bonne réponse est l'option marquée ✓ ou ✔. Quand l'explication commence par
// « Réponse X. », la lettre est contrôlée contre la coche : le moindre écart fait échouer le script.
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docx = process.argv[2] || resolve(root, 'reference/quizzes-revus.docx')
const out = resolve(root, 'supabase/seed/quizzes.json')

const xml = execFileSync('unzip', ['-p', docx, 'word/document.xml'], { encoding: 'utf8', maxBuffer: 32 << 20 })
const decode = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, '’')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&')
const paras = xml.split('</w:p>')
  .map(p => decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join('')))
  .map(t => t.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

// Durée de chaque quiz, en secondes (demande du client : 2 minutes, compte à rebours)
const TIME_LIMIT = 120
// Questions de calcul (récompense « Calculateur »)
const CALC = new Set(['debutant-08', 'intermediaire-03', 'expert-01', 'expert-04', 'expert-07', 'expert-10'])
// Le document ne donne que le niveau : titres et sous-titres sont rédigés ici.
const META = {
  'QUIZ DEBUTANT': {
    id: 'debutant', label: 'Quiz débutant', title: 'Les bases de l’électricité et des centrales',
    subtitle: 'Unités, équipements, sources d’énergie et sécurité électrique.',
  },
  'QUIZ INTERMEDIAIRE': {
    id: 'intermediaire', label: 'Quiz intermédiaire', title: 'Exploiter une centrale à cycle combiné',
    subtitle: 'Turbine à gaz, chaudière de récupération, alternateur et ISO 50001.',
  },
  'QUIZ EXPERT': {
    id: 'expert', label: 'Quiz expert', title: 'Performance, calculs et protections',
    subtitle: 'Rendements, émissions, lois de similitude et protections de l’alternateur.',
  },
}
const typo = s => s.replace(/'/g, '’')

const quizzes = []
let quiz = null
let q = null
for (const p of paras) {
  if (META[p]) {
    quiz = { ...META[p], mode: 'examen', time_limit: TIME_LIMIT, position: quizzes.length + 1, questions: [] }
    quizzes.push(quiz)
    q = null
    continue
  }
  if (!quiz) continue
  // « QUESTION 1 Énoncé » ou « Question 7. [Niveau 2 – Intermédiaire] Énoncé » : l'ancien niveau est retiré
  const qm = p.match(/^question (\d+)\.?\s+(?:\[Niveau \d – [^\]]+\]\s+)?(.+)$/i)
  if (qm) {
    const n = +qm[1]
    q = { id: `${quiz.id}-${String(n).padStart(2, '0')}`, position: n, level: null, prompt: typo(qm[2]), choices: [], answer: null, explanation: '' }
    q.calc = CALC.has(q.id)
    quiz.questions.push(q)
    continue
  }
  const cm = p.match(/^(✓\s*)?([A-D])\.\s+(.+)$/)
  if (cm && q && q.choices.length < 4) {
    let text = cm[3]
    const marked = !!cm[1] || /[✓✔]/.test(text)
    if (marked) {
      if (q.answer) throw new Error(`${q.id} : deux réponses cochées`)
      q.answer = cm[2]
      text = text.replace(/[✓✔]/g, '')
    }
    q.choices.push(typo(text.trim()))
    continue
  }
  const rm = p.match(/^Réponse ([A-D])\. (.+)$/)
  if (rm && q) {
    if (rm[1] !== q.answer) throw new Error(`${q.id} : coche sur ${q.answer}, explication sur ${rm[1]}`)
    q.explanation = typo(rm[2])
    continue
  }
  const jm = p.match(/^Justification : (.+)$/)
  if (jm && q) q.explanation = typo(jm[1])
}

let count = 0
for (const z of quizzes) {
  if (z.questions.length !== 10) throw new Error(`${z.id} : ${z.questions.length} questions (attendu 10)`)
  z.questions.forEach((x, i) => {
    if (x.position !== i + 1) throw new Error(`${z.id} : numérotation rompue à la question ${i + 1}`)
    if (x.choices.length !== 4 || !x.answer || !x.explanation) throw new Error(`${x.id} incomplète`)
    count++
  })
}
if (quizzes.length !== 3) throw new Error(`${quizzes.length} quiz (attendu 3)`)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ source: 'Quiz revus : débutant, intermédiaire, expert (Word client)', quizzes }, null, 2) + '\n')
console.log(`${quizzes.length} quiz, ${count} questions → ${out}`)
