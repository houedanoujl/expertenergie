// Génère supabase/migrations/0002_quiz_seed.sql depuis supabase/seed/quizzes.json.
// Usage : node scripts/build-seed.mjs (après node scripts/extract-docx.mjs)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { quizzes } = JSON.parse(readFileSync(resolve(root, 'supabase/seed/quizzes.json'), 'utf8'))
const out = resolve(root, 'supabase/migrations/0002_quiz_seed.sql')

const s = v => (v === null || v === undefined ? 'null' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v))

const lines = [
  '-- Contenu du « Quiz expert énergie » : 5 quiz, 55 questions corrigées.',
  '-- Généré par scripts/build-seed.mjs : ne pas modifier à la main.',
  '-- Idempotent : peut être rejoué pour mettre à jour les textes.',
  '',
  'begin;',
  '',
  'insert into public.quiz_quizzes (id, label, title, subtitle, mode, position) values',
  quizzes.map(q => `  (${[q.id, q.label, q.title, q.subtitle, q.mode, q.position].map(s).join(', ')})`).join(',\n'),
  'on conflict (id) do update set label = excluded.label, title = excluded.title,',
  '  subtitle = excluded.subtitle, mode = excluded.mode, position = excluded.position;',
  '',
  'insert into public.quiz_questions (id, quiz_id, position, level, prompt, choices, answer, explanation, calc) values',
  quizzes.flatMap(z => z.questions.map(q =>
    `  (${[q.id, z.id, q.position, q.level, q.prompt].map(s).join(', ')}, ${s(JSON.stringify(q.choices))}::jsonb, ${[q.answer, q.explanation, q.calc].map(s).join(', ')})`,
  )).join(',\n'),
  'on conflict (id) do update set quiz_id = excluded.quiz_id, position = excluded.position, level = excluded.level,',
  '  prompt = excluded.prompt, choices = excluded.choices, answer = excluded.answer,',
  '  explanation = excluded.explanation, calc = excluded.calc;',
  '',
  'commit;',
  '',
]
writeFileSync(out, lines.join('\n'))
console.log(`${quizzes.reduce((n, q) => n + q.questions.length, 0)} questions → ${out}`)
