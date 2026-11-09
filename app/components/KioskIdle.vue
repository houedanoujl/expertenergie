<script setup>
// Borne : sans toucher l'écran pendant idleSeconds, on demande « Toujours là ? »,
// puis, faute de réponse, on efface la progression pour le visiteur suivant.
// Rien à effacer (accueil, aucune partie) : on remet seulement l'accueil en haut.
const WARN_SECONDS = 15

const { idleSeconds, resetPlayer } = useKiosk()
const { state } = useQuiz()
const route = useRoute()

const el = ref(null)
const left = ref(WARN_SECONDS)
let last = Date.now()
let warnAt = 0
let timer = null

const s = () => state.value
const dirty = () => route.path !== '/'
  || !!document.querySelector('dialog[open]:not(.idle)')
  || !!(s().name || s().current || s().done.length || Object.keys(s().best).length || Object.keys(s().badges).length)

// Un toucher pendant l'avertissement le ferme au clic (ou au tick suivant) :
// le fermer dès le pointerdown ferait arriver le clic sur la page en dessous.
function activity () {
  last = Date.now()
}

function stopWarning () {
  warnAt = 0
  last = Date.now()
  if (el.value?.open) el.value.close()
}

function tick () {
  const now = Date.now()
  if (warnAt && last > warnAt) return stopWarning()
  if (warnAt) {
    left.value = Math.max(0, WARN_SECONDS - Math.floor((now - warnAt) / 1000))
    if (!left.value) { clearInterval(timer); resetPlayer() }
    return
  }
  if (now - last < idleSeconds * 1000) return
  if (dirty()) {
    warnAt = now
    left.value = WARN_SECONDS
    el.value?.showModal()
  } else {
    window.scrollTo({ top: 0 })
    last = now
  }
}

const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart']
onMounted(() => {
  for (const e of EVENTS) window.addEventListener(e, activity, { capture: true, passive: true })
  timer = setInterval(tick, 1000)
})
onBeforeUnmount(() => {
  for (const e of EVENTS) window.removeEventListener(e, activity, { capture: true })
  clearInterval(timer)
})
</script>

<template>
  <dialog ref="el" class="idle" aria-labelledby="idle-title" @cancel.prevent="stopWarning" @click="stopWarning">
    <div class="box">
      <CiprelTechnician variant="femme" pose="wave" :size="120" />
      <h2 id="idle-title">Toujours là ?</h2>
      <p class="count" aria-live="polite"><span>{{ left }}</span> s</p>
      <p>Touchez l’écran pour continuer. Sinon, la borne repart à zéro pour le visiteur suivant.</p>
      <button class="btn" type="button">Je continue</button>
    </div>
  </dialog>
</template>

<style scoped>
.idle {
  width: min(520px, calc(100vw - 32px)); padding: 0; border: 0; border-radius: 26px;
  background: var(--surface); color: var(--ink); box-shadow: 0 24px 60px rgba(31, 40, 50, .35);
}
.idle::backdrop { background: rgba(23, 32, 42, .6); }
.box { padding: 28px 28px 30px; display: grid; gap: 12px; justify-items: center; text-align: center; }
.box h2 { font-size: 2rem; font-weight: 800; }
.count { font-family: var(--font-display); font-weight: 800; font-size: 1.4rem; color: var(--ink-2); }
.count span { font-size: 3.4rem; color: var(--orange-ink); font-variant-numeric: tabular-nums; }
.box .btn { min-width: 220px; min-height: 60px; font-size: 1.2rem; margin-top: 6px; }
</style>
