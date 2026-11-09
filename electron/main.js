// Application de la borne : lance le serveur du quiz (build Nitro, stockage local) sur
// 127.0.0.1, puis l'affiche en plein écran verrouillé. Aucun accès réseau : toute requête
// hors du serveur local est bloquée et notée dans le journal.
//
// Fichiers (dossier %APPDATA%\quiz-expert-energie-borne) :
//   borne.json         réglages (code admin, délai d'inactivité, zoom…), créé au premier lancement
//   data\journal.ndjson tentatives et réponses
//   logs\borne.log     journal technique
import { app, BrowserWindow, Menu, dialog, ipcMain, powerSaveBlocker, session, utilityProcess } from 'electron'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'

const HERE = import.meta.dirname
const WINDOWED = process.argv.includes('--windowed')

// ─── Dossiers, réglages, journal technique ───────────────────────────────────

// QUIZ_USER_DATA : autre dossier (tests, plusieurs installations)
app.setPath('userData', process.env.QUIZ_USER_DATA || path.join(app.getPath('appData'), 'quiz-expert-energie-borne'))
const USER = app.getPath('userData')
const DATA_DIR = path.join(USER, 'data')
const LOG_DIR = path.join(USER, 'logs')
fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(LOG_DIR, { recursive: true })

const LOG_FILE = path.join(LOG_DIR, 'borne.log')
try { if (fs.statSync(LOG_FILE).size > 5e6) fs.renameSync(LOG_FILE, path.join(LOG_DIR, 'borne.1.log')) } catch { /* pas encore de journal */ }
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' })
function log (...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}`
  console.log(line)
  logStream.write(line + '\n')
}

const DEFAULTS = {
  adminPin: '2468',     // code de l'écran d'administration (5 touchers sur le logo de l'accueil)
  idleSeconds: 90,      // inactivité avant « Toujours là ? » puis remise à zéro
  zoom: 1,              // agrandissement de l'interface (1.25 sur un grand écran, par exemple)
  kiosk: true,          // plein écran verrouillé ; false pour une fenêtre normale (tests)
  openAtLogin: true,    // lancement automatique à l'ouverture de session Windows
  disableGpu: false,    // true si l'affichage scintille ou reste noir (pilote graphique)
  port: 41731,          // port local du serveur (un autre est pris s'il est occupé)
}
const CONFIG_FILE = path.join(USER, 'borne.json')
function readConfig () {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }
  } catch (e) {
    if (e.code === 'ENOENT') fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2) + '\n')
    else log('réglages illisibles, valeurs par défaut :', e.message)
    return { ...DEFAULTS }
  }
}
const cfg = readConfig()
if (WINDOWED) cfg.kiosk = false

process.on('uncaughtException', e => log('erreur :', e?.stack || e))
process.on('unhandledRejection', e => log('erreur :', e?.stack || e))

// ─── Démarrage unique, options Chromium ──────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  if (cfg.disableGpu) app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-pinch')                         // pas de zoom à deux doigts
  app.commandLine.appendSwitch('overscroll-history-navigation', '0')    // pas de « page précédente » au glisser
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.whenReady().then(boot)
}

// ─── Serveur du quiz (processus séparé, relancé s'il s'arrête) ───────────────

const SERVER_ENTRY = process.env.QUIZ_SERVER_ENTRY || (app.isPackaged
  ? path.join(process.resourcesPath, 'server', 'server', 'index.mjs')
  : path.join(HERE, '..', '.output', 'server', 'index.mjs'))
const ADMIN_TOKEN = randomBytes(24).toString('hex')

let port = 0
let origin = ''
let server = null
let quitting = false
let restarts = []

function freePort (wanted) {
  const tryPort = p => new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.once('error', reject)
    s.listen(p, '127.0.0.1', () => { const { port: got } = s.address(); s.close(() => resolve(got)) })
  })
  return tryPort(wanted).catch(() => tryPort(0))
}

function startServer () {
  log('serveur :', SERVER_ENTRY, `127.0.0.1:${port}`)
  server = utilityProcess.fork(SERVER_ENTRY, [], {
    serviceName: 'Quiz expert énergie (serveur)',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1',
      PORT: String(port), NITRO_PORT: String(port),
      NUXT_STORAGE: 'local',
      NUXT_DATA_DIR: DATA_DIR,
      NUXT_ADMIN_TOKEN: ADMIN_TOKEN,
      NUXT_PUBLIC_KIOSK: 'true',
      NUXT_PUBLIC_IDLE_SECONDS: String(cfg.idleSeconds),
      NUXT_PUBLIC_SITE_URL: origin,
    },
  })
  server.stdout?.on('data', d => log('[serveur]', String(d).trimEnd()))
  server.stderr?.on('data', d => log('[serveur:err]', String(d).trimEnd()))
  server.once('exit', code => {
    server = null
    if (quitting) return
    log(`serveur arrêté (code ${code}), redémarrage`)
    const now = Date.now()
    restarts = [...restarts.filter(t => now - t < 60e3), now]
    const delay = restarts.length > 5 ? 30e3 : 1e3
    if (restarts.length > 5) showSplash('Le quiz redémarre, merci de patienter…')
    setTimeout(bringUp, delay)
  })
}

// Lance le serveur et affiche le quiz dès qu'il répond. S'il s'arrête entre-temps,
// l'écouteur « exit » ci-dessus relance bringUp.
async function bringUp () {
  startServer()
  const me = server
  while (!quitting && server === me) {
    if (await waitReady()) return showApp()
    showSplash('Le quiz met du temps à démarrer, merci de patienter…')
  }
}

async function waitReady (timeout = 60e3) {
  const end = Date.now() + timeout
  while (Date.now() < end && !quitting) {
    try {
      const r = await fetch(`${origin}/api/quizzes`)
      if (r.ok) return true
    } catch { /* pas encore prêt */ }
    await new Promise(r => setTimeout(r, 300))
  }
  return false
}

async function admin (route) {
  const r = await fetch(origin + route, { headers: { 'x-admin-token': ADMIN_TOKEN } })
  if (!r.ok) throw new Error(`${route} : HTTP ${r.status}`)
  return r
}

// ─── Fenêtre ─────────────────────────────────────────────────────────────────

let win = null

const isApp = url => { try { return new URL(url).origin === origin } catch { return false } }

function showSplash (msg) {
  if (!win) return
  win.loadFile(path.join(HERE, 'splash.html'), msg ? { query: { msg } } : undefined).catch(() => {})
}
function showApp () {
  win?.loadURL(origin + '/').catch(e => log('chargement :', e.message))
}

function createWindow () {
  win = new BrowserWindow({
    title: 'Quiz expert énergie',
    show: false,
    backgroundColor: '#e6f3f9',
    width: 1366,
    height: 800,
    kiosk: cfg.kiosk,
    fullscreen: cfg.kiosk,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(HERE, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: !app.isPackaged,
      autoplayPolicy: 'no-user-gesture-required',
      zoomFactor: Number(cfg.zoom) || 1,
    },
  })
  const wc = win.webContents
  win.once('ready-to-show', () => win.show())
  // en borne, la fenêtre ne se ferme pas (Alt+F4) : sortie par l'écran d'administration ou Ctrl+Maj+Q
  win.on('close', e => { if (cfg.kiosk && !quitting) e.preventDefault() })
  win.on('closed', () => { win = null })
  win.on('session-end', () => { quitting = true }) // arrêt de Windows : ne pas bloquer la fermeture

  wc.on('did-finish-load', () => wc.setVisualZoomLevelLimits(1, 1).catch(() => {}))
  wc.setWindowOpenHandler(({ url }) => { log('fenêtre refusée :', url); return { action: 'deny' } })
  const stay = (e, url) => { if (!isApp(url) && !url.startsWith('file:')) { e.preventDefault(); log('navigation refusée :', url) } }
  wc.on('will-navigate', stay)
  wc.on('will-redirect', stay)
  wc.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'q') { e.preventDefault(); quit() }
  })
  // page plantée ou figée : on la recharge
  wc.on('render-process-gone', (_e, d) => { log('page arrêtée :', d.reason); setTimeout(showApp, 1000) })
  wc.on('unresponsive', () => { log('page figée, rechargement'); wc.forcefullyCrashRenderer() })
  wc.on('did-fail-load', (_e, code, desc, url) => {
    if (code === -3 || !isApp(url)) return // -3 : chargement interrompu par un autre
    log('échec de chargement :', code, desc, url)
    setTimeout(() => waitReady(10e3).then(showApp), 2000)
  })
}

function setupSession () {
  const ses = session.defaultSession
  // hors ligne : seul le serveur local répond, le reste est bloqué et noté
  const seen = new Set()
  ses.webRequest.onBeforeRequest((details, cb) => {
    let ok = false
    try {
      const u = new URL(details.url)
      ok = ['file:', 'data:', 'blob:', 'devtools:', 'chrome:', 'chrome-extension:'].includes(u.protocol)
        || (['http:', 'ws:'].includes(u.protocol) && u.host === `127.0.0.1:${port}`)
    } catch { /* adresse illisible : bloquée */ }
    if (!ok && !seen.has(details.url)) { seen.add(details.url); log('réseau bloqué :', details.url) }
    cb({ cancel: !ok })
  })
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'fullscreen'))
  ses.on('will-download', e => e.preventDefault())
}

// ─── Administration (appelée par la page via le preload) ─────────────────────

let unlockedUntil = 0
let fails = 0
let pausedUntil = 0
const digest = s => createHash('sha256').update(String(s)).digest()
const fromApp = e => isApp(e.senderFrame?.url || '')
function guard (e) {
  if (!fromApp(e) || Date.now() > unlockedUntil) throw new Error('Administration verrouillée.')
}
const stamp = () => {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function setupIpc () {
  ipcMain.handle('kiosk:unlock', (e, pin) => {
    const now = Date.now()
    if (!fromApp(e) || now < pausedUntil) return false
    const ok = timingSafeEqual(digest(pin), digest(cfg.adminPin))
    if (ok) {
      fails = 0
      unlockedUntil = now + 10 * 60e3
      log('administration ouverte')
    } else if (++fails >= 5) {
      fails = 0
      pausedUntil = now + 60e3
      log('administration : 5 codes faux, pause d’une minute')
    }
    return ok
  })
  ipcMain.handle('kiosk:lock', () => { unlockedUntil = 0 })
  ipcMain.handle('kiosk:stats', async e => {
    guard(e)
    return { ...(await (await admin('/api/admin/stats')).json()), version: app.getVersion() }
  })
  ipcMain.handle('kiosk:export', async e => {
    guard(e)
    // QUIZ_EXPORT_DIR : dossier fixe, sans fenêtre de choix (tests automatisés)
    const r = process.env.QUIZ_EXPORT_DIR
      ? { filePaths: [process.env.QUIZ_EXPORT_DIR] }
      : await dialog.showOpenDialog(win, {
        title: 'Dossier où enregistrer les résultats (clé USB, par exemple)',
        buttonLabel: 'Enregistrer ici',
        properties: ['openDirectory', 'createDirectory'],
      })
    if (r.canceled || !r.filePaths[0]) return { canceled: true }
    const dir = r.filePaths[0]
    const s = stamp()
    try {
      const files = []
      for (const [kind, name] of [['attempts', `quiz-tentatives-${s}.csv`], ['answers', `quiz-reponses-${s}.csv`]]) {
        // arrayBuffer et non text() : text() retirerait le BOM UTF-8 dont Excel a besoin
        const body = Buffer.from(await (await admin(`/api/admin/export?kind=${kind}`)).arrayBuffer())
        fs.writeFileSync(path.join(dir, name), body)
        files.push(name)
      }
      const journal = path.join(DATA_DIR, 'journal.ndjson')
      if (fs.existsSync(journal)) {
        fs.copyFileSync(journal, path.join(dir, `quiz-journal-${s}.ndjson`))
        files.push(`quiz-journal-${s}.ndjson`)
      }
      log('export :', dir, files.join(', '))
      return { ok: true, dir, files }
    } catch (err) {
      log('export impossible :', err.message)
      return { ok: false, error: err.message }
    }
  })
  ipcMain.handle('kiosk:reload', e => { guard(e); showApp() })
  ipcMain.handle('kiosk:quit', e => { guard(e); setImmediate(quit) })
}

function quit () {
  log('arrêt demandé')
  quitting = true
  app.quit()
}

// ─── Lancement ───────────────────────────────────────────────────────────────

async function boot () {
  log(`démarrage v${app.getVersion()} (Electron ${process.versions.electron}, ${cfg.kiosk ? 'borne' : 'fenêtre'})`)
  Menu.setApplicationMenu(null)
  port = await freePort(Number(cfg.port) || 0)
  origin = `http://127.0.0.1:${port}`
  setupSession()
  setupIpc()
  createWindow()
  showSplash()
  powerSaveBlocker.start('prevent-display-sleep')
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!cfg.openAtLogin })

  if (!fs.existsSync(SERVER_ENTRY)) {
    log('serveur introuvable :', SERVER_ENTRY)
    showSplash('Installation incomplète : serveur du quiz introuvable.')
    return
  }
  await bringUp()
}

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  quitting = true
  server?.kill()
})
