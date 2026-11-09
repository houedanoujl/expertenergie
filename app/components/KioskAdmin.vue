<script setup>
// Administration de la borne, pour l'équipe : 5 touchers rapides sur le logo CIPREL
// de l'accueil, puis le code (vérifié par l'application, jamais par la page).
// Export CSV des résultats (clé USB), redémarrage de l'écran, sortie de l'application.
const TAPS = 5
const WINDOW_MS = 3000

const { bridge } = useKiosk()
const open = ref(false)
const pin = ref('')
const unlocked = ref(false)
const stats = ref(null)
const busy = ref(false)
const msg = ref('')
const pinError = ref('')
let taps = []

function onTap (e) {
  if (!e.target.closest?.('[data-admin-tap]')) return
  const now = Date.now()
  taps = [...taps.filter(t => now - t < WINDOW_MS), now]
  if (taps.length >= TAPS) {
    taps = []
    pin.value = ''
    pinError.value = ''
    msg.value = ''
    unlocked.value = false
    open.value = true
  }
}
// au clic et non au pointerdown : sinon le clic du 5e toucher arrive sur le fond
// de la fenêtre qui vient de s'ouvrir, et la referme aussitôt
onMounted(() => window.addEventListener('click', onTap, { capture: true }))
onBeforeUnmount(() => window.removeEventListener('click', onTap, { capture: true }))

function close () {
  open.value = false
  unlocked.value = false
  pin.value = ''
  bridge?.lock()
}

function digit (d) { if (pin.value.length < 8) pin.value += d }

async function submitPin () {
  if (!bridge || busy.value || !pin.value) return
  busy.value = true
  pinError.value = ''
  try {
    if (await bridge.unlock(pin.value)) {
      unlocked.value = true
      stats.value = await bridge.stats()
    } else {
      pinError.value = 'Code incorrect.'
      pin.value = ''
    }
  } finally {
    busy.value = false
  }
}

async function run (action) {
  busy.value = true
  msg.value = ''
  try {
    const r = await bridge[action]()
    if (action === 'exportCsv') {
      msg.value = r?.canceled ? 'Export annulé.' : r?.ok ? `Fichiers enregistrés dans ${r.dir} : ${r.files.join(', ')}.` : `Export impossible : ${r?.error || 'erreur inconnue'}.`
      stats.value = await bridge.stats()
    }
  } catch (e) {
    msg.value = `Action impossible : ${e?.message || e}`
  } finally {
    busy.value = false
  }
}

const date = iso => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
</script>

<template>
  <AppDialog :open="open" title="Administration de la borne" @close="close">
    <p v-if="!bridge" class="note">Disponible uniquement dans l’application de la borne.</p>

    <form v-else-if="!unlocked" class="pin" @submit.prevent="submitPin">
      <p class="dots" aria-live="polite">
        <span v-for="i in Math.max(4, pin.length)" :key="i" :class="{ on: i <= pin.length }" />
        <span class="sr-only">{{ pin.length }} chiffre(s) saisi(s)</span>
      </p>
      <div class="pad">
        <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" type="button" class="key" @click="digit(d)">{{ d }}</button>
        <button type="button" class="key" aria-label="Effacer" @click="pin = pin.slice(0, -1)"><AppIcon name="backspace" :size="24" /></button>
        <button type="button" class="key" @click="digit('0')">0</button>
        <button type="submit" class="key ok" aria-label="Valider" :disabled="busy || !pin"><AppIcon name="check" :size="24" /></button>
      </div>
      <p v-if="pinError" class="err" role="alert">{{ pinError }}</p>
    </form>

    <div v-else class="admin">
      <dl v-if="stats" class="stats">
        <div><dt>Parties terminées</dt><dd>{{ stats.finished }}</dd></div>
        <div><dt>Joueurs</dt><dd>{{ stats.players }}</dd></div>
        <div><dt>Parties commencées</dt><dd>{{ stats.attempts }}</dd></div>
        <div><dt>Dernière partie</dt><dd>{{ date(stats.last) }}</dd></div>
      </dl>
      <p v-if="stats" class="note">Journal : {{ stats.file }}<template v-if="stats.version"> · version {{ stats.version }}</template></p>
      <div class="actions">
        <button class="btn" type="button" :disabled="busy" @click="run('exportCsv')"><AppIcon name="download" :size="20" />Exporter les résultats (CSV)</button>
        <button class="btn ghost" type="button" :disabled="busy" @click="run('reload')"><AppIcon name="refresh" :size="20" />Redémarrer l’écran</button>
        <button class="btn ghost" type="button" :disabled="busy" @click="run('quit')"><AppIcon name="power" :size="20" />Quitter l’application</button>
      </div>
      <p v-if="msg" class="note" role="status">{{ msg }}</p>
    </div>
  </AppDialog>
</template>

<style scoped>
.note { color: var(--ink-2); font-weight: 600; overflow-wrap: anywhere; }
.pin { display: grid; gap: 16px; justify-items: center; }
.dots { display: flex; gap: 12px; min-height: 22px; }
.dots span:not(.sr-only) { width: 18px; height: 18px; border-radius: 50%; border: 3px solid var(--ink); }
.dots span.on { background: var(--ink); }
.pad { display: grid; grid-template-columns: repeat(3, 84px); gap: 10px; }
.key {
  min-height: 72px; border-radius: 18px; border: 2px solid var(--ink); background: var(--surface);
  font-family: var(--font-display); font-weight: 800; font-size: 1.6rem; display: grid; place-items: center; cursor: pointer;
  box-shadow: 0 2px 0 var(--ink);
}
.key:active { transform: translateY(2px); box-shadow: none; }
.key.ok { background: var(--orange); }
.key[disabled] { opacity: .4; }
.err { color: var(--bad); font-weight: 800; }
.admin { display: grid; gap: 16px; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0; }
.stats div { padding: 12px 14px; border-radius: 16px; background: var(--tray); border: 2px solid var(--line); }
.stats dt { color: var(--ink-2); font-weight: 700; font-size: .9rem; }
.stats dd { margin: 0; font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; }
.actions { display: grid; gap: 10px; }
.actions .btn { min-height: 56px; justify-content: flex-start; }
</style>
