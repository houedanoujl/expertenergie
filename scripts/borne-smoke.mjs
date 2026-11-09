// Test de fumée de l'application de la borne packagée (CI Windows, ou en local) :
//   node scripts/borne-smoke.mjs <exécutable> <dossier de sortie>
// Lance l'exécutable dans une fenêtre, attend le serveur, joue un quiz par l'API,
// vérifie le rendu de la page par le protocole DevTools (captures d'écran), puis
// contrôle le journal technique : aucune page plantée, aucune requête externe.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [exe, outDir = 'borne-smoke'] = process.argv.slice(2)
if (!exe) throw new Error('usage : node scripts/borne-smoke.mjs <exécutable> [sortie]')
fs.mkdirSync(outDir, { recursive: true })
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'borne-'))
fs.writeFileSync(path.join(userData, 'borne.json'), JSON.stringify({ openAtLogin: false }))
const BASE = 'http://127.0.0.1:41731'
const DEBUG = 9229
const sleep = ms => new Promise(r => setTimeout(r, ms))

const child = spawn(exe, ['--windowed', `--remote-debugging-port=${DEBUG}`], {
  env: { ...process.env, QUIZ_USER_DATA: userData },
  stdio: 'ignore',
})
const logFile = path.join(userData, 'logs', 'borne.log')
const readLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '')

async function until (what, fn, ms = 90e3) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v } catch { /* pas encore */ }
    await sleep(500)
  }
  throw new Error(`délai dépassé : ${what}`)
}
const json = async (route, body) => {
  const r = await fetch(BASE + route, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
  if (!r.ok) throw new Error(`${route} : HTTP ${r.status}`)
  return r.json()
}

// Protocole DevTools : évaluer du JavaScript dans la page et la photographier
async function devtools () {
  const target = await until('page de l’application', async () => {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()
    return list.find(t => t.type === 'page' && t.url.startsWith(BASE))
  })
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const waiting = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); waiting.get(m.id)?.(m); waiting.delete(m.id) }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    waiting.set(++id, m => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
  const shot = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'))
  }
  return { ws, evaluate, shot }
}

let failed = null
try {
  const quizzes = await until('serveur', () => json('/api/quizzes'))
  if (quizzes.length !== 5) throw new Error(`${quizzes.length} quiz au lieu de 5`)

  const a = await json('/api/attempts', { quiz: 'q1', name: 'Test CI' })
  for (const q of a.questions) await json(`/api/attempts/${a.attempt}/answer`, { token: a.token, question: q, choice: 'A', time: 1000 })
  const f = await json(`/api/attempts/${a.attempt}/finish`, { token: a.token })
  console.log(`partie enregistrée : ${f.score}/${f.total}, rang ${f.rank}/${f.players}`)

  const page = await devtools()
  await until('accueil affiché', () => page.evaluate(`document.querySelectorAll('.steps .step').length === 5`), 60e3)
  const check = await page.evaluate(`document.fonts.ready.then(() => ({
    kiosk: document.documentElement.classList.contains('kiosk'),
    fonts: document.fonts.check('800 20px "Baloo 2"') && document.fonts.check('600 16px Nunito'),
    bridge: typeof window.kiosk === 'object',
    size: innerWidth + 'x' + innerHeight,
  }))`)
  console.log('page :', JSON.stringify(check))
  if (!check.kiosk || !check.fonts || !check.bridge) throw new Error('page incomplète : ' + JSON.stringify(check))
  await sleep(1000)
  await page.shot('1-accueil')
  await page.evaluate(`location.assign('/quiz/q1')`)
  await until('clavier à l’écran', () => page.evaluate(`!!document.querySelector('.kbd .key')`), 30e3)
  await sleep(1000)
  await page.shot('2-quiz')
  page.ws.close()

  if (!fs.existsSync(path.join(userData, 'data', 'journal.ndjson'))) throw new Error('journal des tentatives absent')
  await sleep(2000)
  const log = readLog()
  const bad = ['page arrêtée', 'échec de chargement', 'erreur :', 'réseau bloqué'].filter(s => log.includes(s))
  if (bad.length) throw new Error(`journal technique : ${bad.join(', ')}`)
} catch (e) {
  failed = e
} finally {
  console.log('--- borne.log ---\n' + readLog())
  fs.copyFileSync(logFile, path.join(outDir, 'borne.log'))
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill()
  } catch { /* déjà arrêté */ }
}
if (failed) { console.error('ÉCHEC :', failed.message); process.exit(1) }
console.log('test de fumée réussi')
