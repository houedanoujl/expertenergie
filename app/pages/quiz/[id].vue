<script setup>
// Un quiz : présentation et pseudo, questions une par une, puis résultat.
// Entraînement : correction et explication après chaque réponse.
// Examen : réponses définitives, correction complète à la fin.
// Révision (?revision=1) : seulement les questions ratées, hors classement.
// Défi (?defi=<slug>) : le score d'un collègue à battre.
import { SECTIONS, ORDER } from '~/data/sections'
import { formatTime, ordinal } from '~/composables/useQuiz'

const route = useRoute()
const id = String(route.params.id)
if (!SECTIONS[id]) throw createError({ statusCode: 404, statusMessage: 'Quiz introuvable.', fatal: true })
const section = SECTIONS[id]

const { data: quiz, error: loadError, refresh: reload } = await useFetch(`/api/quizzes/${id}`, { key: `quiz-${id}` })
const { data: list } = useQuizList()
const calcTotal = computed(() => (list.value || []).reduce((n, q) => n + (q.calc || 0), 0))

const game = useQuiz()
const { state } = game
const { play } = useSound()

useHead({ title: () => (quiz.value ? `${quiz.value.label} : ${quiz.value.title} — Quiz expert énergie` : 'Quiz expert énergie') })

const isExam = computed(() => quiz.value?.mode === 'examen')
const wantsReview = computed(() => route.query.revision === '1')
const defiSlug = typeof route.query.defi === 'string' && /^[0-9a-f]{10}$/.test(route.query.defi) ? route.query.defi : null
const { data: defi } = useFetch(`/api/results/${defiSlug}`, { immediate: !!defiSlug, server: false, lazy: true })

const mounted = ref(false)
const phase = ref('intro') // intro | play | result
const cur = computed(() => (mounted.value ? game.current(id) : null))
const result = ref(null)
const selected = ref(null)
const busy = ref(false)
const err = ref('')
const nameInput = ref('')
const nameError = ref('')
let shownAt = 0

const byId = computed(() => Object.fromEntries((quiz.value?.questions || []).map(q => [q.id, q])))
const question = computed(() => (cur.value ? byId.value[cur.value.questions[cur.value.index]] : null))
const answered = computed(() => (question.value ? cur.value.answers[question.value.id] : null))
const isLast = computed(() => cur.value && cur.value.index === cur.value.questions.length - 1)
const reviewCount = computed(() => (mounted.value ? state.value.missed[id]?.length || 0 : 0))

const dots = computed(() => (cur.value?.questions || []).map((q, i) => {
  const a = cur.value.answers[q]
  if (a) return { state: a.recorded ? 'recorded' : a.correct ? 'right' : 'wrong' }
  return { state: i === cur.value.index ? 'current' : 'todo' }
}))

// Chrono : temps de réflexion cumulé, la question affichée comprise
const now = ref(0)
let timer = null
const elapsed = computed(() => {
  if (!cur.value) return 0
  const live = phase.value === 'play' && !answered.value ? Math.max(0, now.value - shownAt) : 0
  return (cur.value.elapsed + live) / 1000
})

onMounted(() => {
  mounted.value = true
  nameInput.value = state.value.name
  timer = setInterval(() => { now.value = performance.now() }, 500)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})

function show () {
  selected.value = null
  shownAt = performance.now()
  now.value = shownAt
  nextTick(() => document.getElementById('question-top')?.focus())
}

async function begin (review = false) {
  err.value = ''
  nameError.value = ''
  const name = nameInput.value.replace(/\s+/g, ' ').trim()
  if (name.length < 2) {
    nameError.value = 'Indiquez un pseudo de 2 caractères au moins.'
    nextTick(() => document.getElementById('pseudo')?.focus())
    return
  }
  state.value.name = name
  busy.value = true
  try {
    await game.start(id, { review })
    phase.value = 'play'
    show()
  } catch (e) {
    err.value = e?.data?.statusMessage || e?.statusMessage || 'Impossible de démarrer le quiz pour le moment.'
  } finally {
    busy.value = false
  }
}

function resume () {
  phase.value = 'play'
  show()
}

function restart () {
  game.abandon()
  begin(wantsReview.value && reviewCount.value > 0)
}

async function submit () {
  if (!selected.value || answered.value || busy.value) return
  busy.value = true
  err.value = ''
  const time = Math.min(Math.round(performance.now() - shownAt), 600000)
  try {
    const r = await game.answer(question.value.id, selected.value, time)
    if (r.recorded) {
      play('snap')
      busy.value = false
      await advance()
      return
    }
    play(r.correct ? 'lock' : 'wrong')
    nextTick(() => {
      const el = document.getElementById('feedback-title')
      el?.focus({ preventScroll: true })
      el?.closest('.feedback')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  } catch (e) {
    err.value = e?.data?.statusMessage || 'Réponse non enregistrée : vérifiez la connexion et réessayez.'
  } finally {
    busy.value = false
  }
}

async function advance () {
  if (!isLast.value) {
    game.next()
    show()
  } else {
    await end()
  }
}

async function end () {
  busy.value = true
  err.value = ''
  try {
    const r = await game.finish(quiz.value.questions, calcTotal.value)
    result.value = r
    phase.value = 'result'
    play(r.level === 'expert' ? 'fanfare' : 'complete')
    nextTick(() => {
      window.scrollTo({ top: 0 })
      document.getElementById('result-title')?.focus()
    })
  } catch (e) {
    err.value = e?.data?.statusMessage || 'Résultat indisponible pour le moment : réessayez.'
  } finally {
    busy.value = false
  }
}

const LETTERS = ['A', 'B', 'C', 'D']
function onKey (e) {
  if (phase.value !== 'play' || busy.value || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type !== 'radio')) return
  const k = e.key.toUpperCase()
  if (!answered.value) {
    const i = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k)
    if (i >= 0) { selected.value = LETTERS[i]; play('pick'); return }
    if (e.key === 'Enter' && selected.value && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); submit() }
  } else if (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') {
    e.preventDefault()
    advance()
  }
}

const REACT_OK = ['Exactement.', 'Bien vu !', 'C’est ça.', 'Juste !', 'Parfait.']
const REACT_KO = ['Pas tout à fait.', 'Presque.', 'Ce n’est pas celle-là.']
const reaction = computed(() => {
  const n = cur.value?.index || 0
  return answered.value?.correct ? REACT_OK[n % REACT_OK.length] : REACT_KO[n % REACT_KO.length]
})
const choiceText = (q, letter) => q?.choices[LETTERS.indexOf(letter)]

// Résultat
const nextQuiz = computed(() => ORDER.find(x => x !== id && !state.value.done.includes(x)) || null)
const LEVEL_MSG = {
  expert: 'Maîtrise confirmée sur ce thème.',
  acquis: 'Quelques points à consolider avec la correction ci-dessous.',
  'a-reprendre': 'Relisez la correction, puis révisez vos erreurs.',
}
const shareData = computed(() => {
  const r = result.value
  if (!r || !quiz.value) return null
  return {
    slug: r.slug, name: r.name, quiz: id, label: quiz.value.label, title: quiz.value.title,
    score: r.score, total: r.total, level: r.level, duration: r.duration, rank: r.rank, players: r.players,
    pattern: r.corrections.map(c => c.correct),
  }
})
const wrongCount = computed(() => result.value?.corrections.filter(c => !c.correct).length || 0)
const onShared = () => game.award('partage')
</script>

<template>
  <div class="page">
    <header class="bar" :class="{ playing: phase === 'play' }">
      <NuxtLink class="btn ghost icon" to="/" aria-label="Retour à l’accueil"><AppIcon name="home" /></NuxtLink>
      <p class="where">
        <span class="swatch" :style="{ background: section.color }" aria-hidden="true" />
        <span><strong>{{ quiz?.label }}</strong><span class="sec-name"> · {{ section.name }}</span></span>
      </p>
      <template v-if="phase === 'play' && cur">
        <span class="chip"><span><span class="sr-only">Question </span>{{ cur.index + 1 }}<span class="muted">/{{ cur.questions.length }}</span></span></span>
        <span class="chip"><AppIcon name="clock" :size="18" /><span class="sr-only">Temps </span>{{ formatTime(elapsed) }}</span>
      </template>
      <SoundToggle class="sound" />
    </header>

    <p v-if="loadError" class="state panel">
      Ce quiz est momentanément indisponible.
      <button class="btn ghost" type="button" @click="reload()">Réessayer</button>
    </p>

    <!-- Présentation -->
    <section v-else-if="phase === 'intro'" class="intro" aria-labelledby="intro-title">
      <div class="panel intro-main">
        <h1 id="intro-title">{{ quiz?.title }}</h1>
        <p class="topics">{{ quiz?.subtitle }}</p>

        <p v-if="defi" class="defi" role="status">
          <AppIcon name="target" :size="22" />
          <span><strong>Défi de {{ defi.name }}</strong> : {{ defi.score }}/{{ defi.total }} en {{ formatTime(defi.duration) }}. À vous de faire mieux !</span>
        </p>

        <ul class="rules">
          <template v-if="wantsReview && reviewCount && !cur">
            <li><AppIcon name="rotate" /> {{ reviewCount }} question{{ reviewCount > 1 ? 's' : '' }} ratée{{ reviewCount > 1 ? 's' : '' }} à retravailler</li>
            <li><AppIcon name="bulb" /> Correction et explication après chaque réponse{{ isExam ? ' (même pour l’examen)' : '' }}</li>
            <li><AppIcon name="info" /> Hors classement : votre meilleur score ne change pas</li>
          </template>
          <template v-else-if="isExam">
            <li><AppIcon name="flag" /> {{ quiz?.questions.length }} questions sur quatre niveaux : fondamental, intermédiaire, avancé, expert</li>
            <li><AppIcon name="check" /> Chaque réponse est définitive : la correction complète arrive à la fin</li>
            <li><AppIcon name="star" /> Barème : 0 à 7 à reprendre, 8 à 11 acquis, 12 à 15 niveau expert</li>
          </template>
          <template v-else>
            <li><AppIcon name="grid" /> {{ quiz?.questions.length }} questions à quatre choix</li>
            <li><AppIcon name="bulb" /> Correction et explication juste après chaque réponse</li>
            <li><AppIcon name="trophy" /> Votre score entre au classement du quiz</li>
          </template>
        </ul>

        <form class="start" @submit.prevent="cur ? resume() : begin(wantsReview && reviewCount > 0)">
          <div v-if="!cur" class="field">
            <label for="pseudo">Votre pseudo, affiché au classement</label>
            <input
              id="pseudo" v-model="nameInput" type="text" maxlength="20" autocomplete="nickname" spellcheck="false"
              :aria-invalid="!!nameError" :aria-describedby="nameError ? 'pseudo-error' : 'pseudo-help'"
            >
            <p v-if="nameError" id="pseudo-error" class="field-error" role="alert">{{ nameError }}</p>
            <p v-else id="pseudo-help" class="help">De 2 à 20 caractères. Aucun compte, aucune donnée personnelle.</p>
          </div>
          <div class="buttons">
            <button class="btn" type="submit" :disabled="busy || !quiz">
              <template v-if="cur">Reprendre à la question {{ cur.index + 1 }}</template>
              <template v-else-if="wantsReview && reviewCount">Réviser mes erreurs</template>
              <template v-else>Commencer</template>
              <AppIcon name="next" :size="18" />
            </button>
            <button v-if="cur" class="btn ghost" type="button" :disabled="busy" @click="restart">
              <AppIcon name="refresh" :size="18" />Recommencer
            </button>
          </div>
          <p v-if="err" class="field-error" role="alert">{{ err }}</p>
        </form>
      </div>
      <GuideBubble
        class="intro-guide"
        variant="homme"
        pose="point"
        :size="130"
        :text="isExam ? 'Prenez votre temps : à l’examen, on ne voit la correction qu’à la fin.' : 'Lisez bien les quatre réponses : l’explication suit chaque question.'"
      />
    </section>

    <!-- Questions -->
    <section v-else-if="phase === 'play' && question" class="play" aria-label="Questions">
      <QuestionDots :items="dots" class="dots" />
      <h1 id="question-top" class="sr-only" tabindex="-1">Question {{ cur.index + 1 }} sur {{ cur.questions.length }}</h1>
      <QuestionCard
        :key="question.id"
        v-model="selected"
        :question="question"
        :number="cur.index + 1"
        :total="cur.questions.length"
        :result="answered"
        :disabled="busy"
        @submit="submit"
        @update:model-value="play('pick')"
      >
        <div v-if="!answered" class="validate">
          <button class="btn" type="submit" :disabled="!selected || busy">
            {{ isExam ? (isLast ? 'Valider et terminer' : 'Valider ma réponse') : 'Valider' }}
          </button>
          <p class="help">Touches A à D pour choisir, Entrée pour valider.</p>
        </div>
      </QuestionCard>

      <section v-if="answered && !answered.recorded" class="feedback panel" :class="answered.correct ? 'ok' : 'ko'" aria-labelledby="feedback-title">
        <div class="fb-head">
          <CiprelTechnician :variant="cur.index % 2 ? 'homme' : 'femme'" :pose="answered.correct ? 'cheer' : 'think'" :size="92" />
          <div>
            <h2 id="feedback-title" tabindex="-1">
              <AppIcon :name="answered.correct ? 'check' : 'cross'" :size="22" />
              {{ reaction }}
            </h2>
            <p v-if="!answered.correct" class="good">
              Bonne réponse : <strong>{{ answered.answer }}. <RichText :text="choiceText(question, answered.answer)" /></strong>
            </p>
          </div>
        </div>
        <Explanation :text="answered.explanation" />
        <div class="fb-next">
          <button class="btn" type="button" :disabled="busy" @click="advance">
            {{ isLast ? 'Voir mon résultat' : 'Question suivante' }}<AppIcon name="next" :size="18" />
          </button>
        </div>
      </section>
      <p v-if="err" class="field-error" role="alert">
        {{ err }}
        <button v-if="isLast && answered" class="btn ghost" type="button" @click="end">Réessayer</button>
      </p>
    </section>

    <!-- Résultat -->
    <section v-else-if="phase === 'result' && result" class="result" aria-labelledby="result-title">
      <div class="panel res-main">
        <CiprelTechnician class="res-tech" variant="femme" :pose="result.level === 'a-reprendre' ? 'think' : 'cheer'" :size="150" />
        <div class="res-body">
          <h1 id="result-title" tabindex="-1">{{ result.review ? 'Révision terminée' : `${quiz.label} terminé` }}</h1>
          <p class="score"><span class="big">{{ result.score }}</span><span class="of">/{{ result.total }}</span></p>
          <LevelPill :level="result.level" big />
          <p class="msg">{{ LEVEL_MSG[result.level] }}</p>
          <QuestionDots :items="result.corrections.map(c => ({ state: c.correct ? 'right' : 'wrong' }))" label="Résultat" />
          <div class="chips">
            <span class="chip"><AppIcon name="clock" :size="18" />{{ formatTime(result.duration) }}</span>
            <span v-if="result.rank" class="chip"><AppIcon name="trophy" :size="18" />{{ ordinal(result.rank) }} sur {{ result.players }}</span>
            <span v-else class="chip muted-chip">Hors classement</span>
            <span v-if="defi && !result.review" class="chip" :class="result.score > defi.score || (result.score === defi.score && result.duration < defi.duration) ? 'win' : ''">
              <AppIcon name="target" :size="18" />
              {{ result.score > defi.score || (result.score === defi.score && result.duration < defi.duration) ? `Défi de ${defi.name} relevé !` : `Défi de ${defi.name} : ${defi.score}/${defi.total}` }}
            </span>
          </div>
          <div class="buttons">
            <NuxtLink v-if="nextQuiz" class="btn" :to="`/quiz/${nextQuiz}`">
              {{ nextQuiz === 'examen' ? 'Passer l’examen' : `Quiz suivant : ${SECTIONS[nextQuiz].name.toLowerCase()}` }}<AppIcon name="next" :size="18" />
            </NuxtLink>
            <a v-if="wrongCount" class="btn ghost" :href="`/quiz/${id}?revision=1`"><AppIcon name="rotate" :size="18" />Réviser {{ wrongCount }} erreur{{ wrongCount > 1 ? 's' : '' }}</a>
            <NuxtLink class="btn ghost" to="/"><AppIcon name="home" :size="18" />Accueil</NuxtLink>
          </div>
        </div>
      </div>

      <section class="panel corrections" aria-labelledby="corr-title">
        <h2 id="corr-title">Correction détaillée</h2>
        <ol>
          <li v-for="c in result.corrections" :key="c.question">
            <details :open="isExam && !c.correct">
              <summary>
                <span class="mark" :class="c.correct ? 'ok' : 'ko'"><AppIcon :name="c.correct ? 'check' : 'cross'" :size="16" /><span class="sr-only">{{ c.correct ? 'Juste' : 'Fausse' }}</span></span>
                <span class="q">Q{{ byId[c.question]?.position }}. <RichText :text="byId[c.question]?.prompt || ''" /></span>
              </summary>
              <div class="corr-body">
                <p v-if="!c.correct">Votre réponse : <strong>{{ c.choice }}. <RichText :text="choiceText(byId[c.question], c.choice) || ''" /></strong></p>
                <p>Bonne réponse : <strong>{{ c.answer }}. <RichText :text="choiceText(byId[c.question], c.answer) || ''" /></strong></p>
                <Explanation :text="c.explanation" />
              </div>
            </details>
          </li>
        </ol>
      </section>

      <ShareResult v-if="!result.review && shareData" :result="shareData" :done="state.done" @shared="onShared" />

      <section v-if="!result.review" class="panel board" aria-labelledby="board-title">
        <h2 id="board-title">Classement · {{ quiz.label }}</h2>
        <LeaderboardPanel :quiz="id" :highlight="result.slug" :me="result.rank ? { rank: result.rank, name: result.name, score: result.score, total: result.total, time: result.duration } : null" />
        <p class="permalink"><AppIcon name="link" :size="16" /> <NuxtLink :to="`/resultat/${result.slug}`">Lien permanent de ce résultat</NuxtLink></p>
      </section>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 880px; margin: 0 auto; padding: 12px 16px 48px; display: grid; gap: 16px; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; position: sticky; top: 0; z-index: 5; padding: 8px 0; background: var(--bg); }
.where { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: 1.05rem; }
.where span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.where .sec-name { display: none; }
.bar.playing .where { visibility: hidden; }
.bar.playing .sound { margin-left: auto; }
.swatch { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid var(--ink); }
.state { padding: 18px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

.intro { display: grid; gap: 18px; }
.intro-main { padding: 22px 20px; display: grid; gap: 16px; }
.intro-main h1 { font-size: clamp(1.6rem, 4.2vw, 2.4rem); font-weight: 800; }
.topics { color: var(--ink-2); }
.defi { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 16px; background: #fff3cc; border: 2px solid #e3c99b; }
.defi svg { flex: none; margin-top: 2px; color: var(--orange-ink); }
.rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.rules li { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; }
.rules li svg { flex: none; margin-top: 2px; color: var(--navy); }
.start { display: grid; gap: 14px; padding-top: 4px; }
.field { display: grid; gap: 6px; }
.field label { font-weight: 800; }
.field input {
  min-height: 52px; padding: 8px 16px; border-radius: 999px; border: 3px solid var(--ink); background: var(--surface);
  font: inherit; font-weight: 700; font-size: 1.1rem; max-width: 360px; width: 100%;
}
.field input:focus-visible { outline: 3px solid var(--navy); outline-offset: 3px; border-radius: 999px; }
.field input[aria-invalid="true"] { border-color: var(--bad); }
.help { font-size: .9rem; color: var(--ink-2); }
.field-error { color: var(--bad); font-weight: 700; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.buttons { display: flex; flex-wrap: wrap; gap: 10px; }

.play { display: grid; gap: 16px; }
.validate { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.validate .btn { min-width: 160px; }
.feedback { padding: 18px 20px; display: grid; gap: 14px; border: 3px solid var(--ink); scroll-margin: 80px 0 16px; }
.feedback.ok { background: #f2faf4; }
.feedback.ko { background: #fdf4f2; }
.fb-head { display: flex; gap: 14px; align-items: center; }
.fb-head :deep(.tech) { flex: none; }
.fb-head h2 { display: flex; align-items: center; gap: 8px; font-size: 1.4rem; }
.feedback.ok h2 { color: var(--ok); }
.feedback.ko h2 { color: var(--bad); }
.fb-head h2:focus { outline: none; }
.good { margin-top: 4px; }
.fb-next { display: flex; justify-content: flex-end; }

.result { display: grid; gap: 18px; }
.res-main { padding: 22px 20px; display: grid; gap: 16px; justify-items: start; }
.res-tech { justify-self: center; }
.res-body { display: grid; gap: 12px; justify-items: start; }
.res-body h1 { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; }
.res-body h1:focus { outline: none; }
.score { font-family: var(--font-display); font-weight: 800; line-height: .9; font-variant-numeric: tabular-nums; }
.score .big { font-size: clamp(4rem, 14vw, 6rem); }
.score .of { font-size: clamp(2rem, 6vw, 2.8rem); color: var(--ink-2); }
.msg { font-weight: 600; max-width: 52ch; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip.win { background: #e1f3e5; border-color: var(--ok); color: var(--ok); }
.muted-chip { color: var(--ink-2); }
.corrections { padding: 18px 20px; display: grid; gap: 10px; }
.corrections h2 { font-size: 1.3rem; }
.corrections ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.corrections summary { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; padding: 8px 10px; border-radius: 12px; font-weight: 600; min-height: 44px; }
.corrections summary:hover { background: #f4f7fa; }
.mark { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: #fff; margin-top: 1px; }
.mark.ok { background: var(--ok); }
.mark.ko { background: var(--bad); }
.corr-body { padding: 4px 10px 14px 46px; display: grid; gap: 8px; }
.board { padding: 18px 20px; display: grid; gap: 12px; }
.board h2 { font-size: 1.3rem; }
.permalink { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--navy); }

@media (min-width: 480px) {
  .bar.playing .where { visibility: visible; }
}
@media (min-width: 560px) {
  .where .sec-name { display: inline; }
}
@media (min-width: 768px) {
  .page { padding: 16px 24px 56px; }
  .intro-main { padding: 28px 30px; }
  .feedback { padding: 22px 26px; }
  .res-main { grid-template-columns: auto 1fr; align-items: center; padding: 28px 30px; gap: 28px; }
}
@media (min-width: 1024px) {
  .page:has(.intro) { max-width: 1080px; }
  .intro { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; }
  .intro-guide { position: sticky; top: 90px; }
}
</style>
