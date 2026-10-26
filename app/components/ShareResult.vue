<script setup>
// Partage d'un résultat : carte PNG, réseaux (LinkedIn en premier), lien de défi.
// Le lien partagé pointe vers /resultat/<slug>, une page publique avec aperçu Open Graph.
import { atQuiz } from '~/composables/useQuiz'

const props = defineProps({
  result: { type: Object, required: true }, // { slug, name, quiz, label, title, score, total, level, duration, rank, players, pattern }
  done: { type: Array, default: () => [] },
})
const emit = defineEmits(['shared'])
const { render } = useShareCard()
const config = useRuntimeConfig()

const blob = ref(null)
const preview = ref('')
const message = ref('')
const canNative = ref(false)

const site = computed(() => (config.public.siteUrl || (import.meta.client ? window.location.origin : '')).replace(/\/$/, ''))
const resultUrl = computed(() => `${site.value}/resultat/${props.result.slug}`)
const defiUrl = computed(() => `${site.value}/quiz/${props.result.quiz}?defi=${props.result.slug}`)
const LEVEL_TEXT = { expert: 'niveau expert', acquis: 'acquis', 'a-reprendre': 'à reprendre' }
const text = computed(() => {
  const r = props.result
  return `J'ai obtenu ${r.score}/${r.total} ${atQuiz(r.label)} « ${r.title} » du Quiz expert énergie (${LEVEL_TEXT[r.level]}). ` +
    `Turbine à gaz, chaudière de récupération, chimie eau-vapeur, réseau : saurez-vous faire mieux ? ${resultUrl.value} ` +
    '#CIPREL #Énergie #CycleCombiné'
})
const fileName = computed(() => `quiz-expert-energie-${props.result.quiz}.png`)

async function build () {
  blob.value = await render(props.result, props.done)
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(blob.value)
}
onMounted(async () => {
  await build()
  const file = new File([blob.value], fileName.value, { type: 'image/png' })
  canNative.value = !!navigator.canShare?.({ files: [file] })
})
onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value) })

function download () {
  const a = document.createElement('a')
  a.href = preview.value
  a.download = fileName.value
  document.body.appendChild(a)
  a.click()
  a.remove()
}
async function copy (value) {
  try { await navigator.clipboard.writeText(value); return true } catch { return false }
}
async function nativeShare () {
  const file = new File([blob.value], fileName.value, { type: 'image/png' })
  try {
    await navigator.share({ files: [file], text: text.value, title: 'Quiz expert énergie' })
    message.value = 'Résultat partagé.'
    emit('shared')
  } catch (e) {
    if (e?.name !== 'AbortError') message.value = 'Partage impossible depuis cet appareil : téléchargez la carte.'
  }
}

const open = url => window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720')

async function share (network) {
  const t = encodeURIComponent(text.value)
  const u = encodeURIComponent(resultUrl.value)
  if (network === 'linkedin') {
    // Sur téléphone, le partage natif envoie l'image directement dans l'application LinkedIn.
    if (canNative.value) return nativeShare()
    // Sur ordinateur, LinkedIn ne reçoit pas d'image par lien : texte copié, carte téléchargée,
    // puis ouverture de l'éditeur de publication.
    const copied = await copy(text.value)
    download()
    open(`https://www.linkedin.com/feed/?shareActive=true&text=${t}`)
    message.value = `Carte téléchargée${copied ? ' et texte copié' : ''} : dans LinkedIn, ajoutez l'image à votre publication (icône photo).`
  } else if (network === 'whatsapp') {
    open(`https://wa.me/?text=${t}`)
  } else if (network === 'facebook') {
    open(`https://www.facebook.com/sharer/sharer.php?u=${u}`)
  } else if (network === 'x') {
    open(`https://x.com/intent/post?text=${t}`)
  }
  emit('shared')
}
async function onDefi () {
  message.value = (await copy(defiUrl.value))
    ? 'Lien de défi copié : envoyez-le à un collègue.'
    : `Copie impossible : ${defiUrl.value}`
  emit('shared')
}
async function onCopy () {
  message.value = (await copy(text.value)) ? 'Texte copié.' : 'Copie impossible : sélectionnez le texte ci-dessous.'
}
function onDownload () { download(); message.value = 'Carte téléchargée.'; emit('shared') }
</script>

<template>
  <section class="share" aria-labelledby="share-title">
    <h3 id="share-title">Partager mon résultat</h3>
    <div class="layout">
      <img v-if="preview" :src="preview" class="card" :alt="`Carte de résultat : ${result.score} sur ${result.total}`">
      <div v-else class="card ph" />
      <div class="actions">
        <button class="btn defi" type="button" @click="onDefi">
          <AppIcon name="target" :size="20" />Défier un collègue
        </button>
        <button class="btn linkedin" type="button" @click="share('linkedin')">
          <SocialIcon name="linkedin" :size="22" ink="#0a66c2" />Partager sur LinkedIn
        </button>
        <div class="others">
          <button class="btn ghost icon" type="button" aria-label="Partager sur WhatsApp" @click="share('whatsapp')"><SocialIcon name="whatsapp" :size="22" /></button>
          <button class="btn ghost icon" type="button" aria-label="Partager sur Facebook" @click="share('facebook')"><SocialIcon name="facebook" :size="22" /></button>
          <button class="btn ghost icon" type="button" aria-label="Partager sur X" @click="share('x')"><SocialIcon name="x" :size="22" /></button>
          <button v-if="canNative" class="btn ghost icon" type="button" aria-label="Autres applications" @click="nativeShare"><AppIcon name="share" :size="20" /></button>
          <button class="btn ghost icon" type="button" aria-label="Télécharger la carte" @click="onDownload"><AppIcon name="download" :size="20" /></button>
        </div>
        <details class="text">
          <summary>Texte proposé</summary>
          <p>{{ text }}</p>
          <button class="btn ghost" type="button" @click="onCopy">Copier le texte</button>
        </details>
        <p v-if="message" class="msg" role="status">{{ message }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.share { display: grid; gap: 14px; padding: 16px; border-radius: var(--radius); background: var(--tray); border: 2px solid var(--line); }
.share h3 { font-size: 1.2rem; }
.layout { display: grid; gap: 16px; }
.card { width: 100%; max-width: 300px; height: auto; border-radius: 14px; box-shadow: var(--shadow); justify-self: center; }
.card.ph { aspect-ratio: 1; background: #dfe8ee; }
.actions { display: grid; gap: 10px; align-content: start; }
.actions > .btn { justify-self: start; }
.btn.defi { background: var(--energy); }
.btn.defi:hover { background: #ebb52c; }
.btn.linkedin { background: #0a66c2; color: #fff; border-color: #073f78; }
.btn.linkedin:hover { background: #0854a0; }
.others { display: flex; gap: 8px; flex-wrap: wrap; }
.others .btn { color: var(--ink); }
.text summary { cursor: pointer; font-weight: 700; color: var(--ink-2); min-height: 32px; display: flex; align-items: center; }
.text p { margin: 8px 0; font-size: .95rem; background: var(--surface); border-radius: 12px; padding: 10px 12px; border: 1px solid var(--line); overflow-wrap: anywhere; }
.msg { font-weight: 700; color: var(--ok); }
@media (min-width: 720px) {
  .layout { grid-template-columns: 260px 1fr; align-items: start; }
  .card { max-width: 260px; }
}
</style>
