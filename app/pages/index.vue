<script setup>
// Accueil : choix du quiz. Trois quiz indépendants (débutant, intermédiaire, expert),
// 2 minutes chacun ; chaque quiz réussi met une partie du cycle combiné sous tension.
import { SECTIONS, ORDER } from '~/data/sections'
import { formatTime } from '~/composables/useQuiz'

const { state, charge, doneCount } = useQuiz()
const { kiosk, badges: BADGES, resetPlayer, idleSeconds } = useKiosk()
const config = useRuntimeConfig()
const site = (config.public.siteUrl || useRequestURL().origin).replace(/\/$/, '')
useSeoMeta({
  ogTitle: 'Quiz expert énergie — CIPREL',
  ogDescription: 'Trois quiz chronométrés sur l’énergie et les centrales à cycle combiné gaz : débutant, intermédiaire, expert. 2 minutes pour 10 questions.',
  ogType: 'website',
  ogUrl: site,
  ogImage: `${site}/og.png`,
  twitterCard: 'summary_large_image',
})
const { data: quizzes, error, refresh } = useQuizList()
const byId = computed(() => Object.fromEntries((quizzes.value || []).map(q => [q.id, q])))
const total = computed(() => (quizzes.value || []).reduce((n, q) => n + q.count, 0) || 30)

// Rendu serveur sans la progression locale : on attend le montage pour l'afficher.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const done = computed(() => (mounted.value ? state.value.done : []))
const current = computed(() => (mounted.value ? state.value.current : null))

const guide = computed(() => {
  const name = mounted.value && state.value.name ? ` ${state.value.name}` : ''
  const c = current.value
  if (c && byId.value[c.quiz]) return `Vous avez un quiz en cours : ${byId.value[c.quiz].label.toLowerCase()}, question ${c.index + 1} sur ${c.questions.length}.${c.limit ? ' Le chrono tourne !' : ' On reprend ?'}`
  if (!done.value.length) return `Bonjour${name} ! Choisissez votre niveau : 10 questions, 2 minutes. Plus vous répondez juste et vite, plus vous marquez de points.`
  if (done.value.length === ORDER.length) return `La centrale est sur le réseau${name} ! Rejouez pour améliorer vos points, ou révisez vos erreurs.`
  return `Bravo${name}, ${done.value.length} quiz réussi${done.value.length > 1 ? 's' : ''}. Tentez un autre niveau, ou battez votre score.`
})

function cta (id) {
  const c = current.value
  if (c?.quiz === id) return `Reprendre (question ${c.index + 1}/${c.questions.length})`
  return done.value.includes(id) ? 'Rejouer' : 'Jouer'
}
const missed = id => (mounted.value ? state.value.missed[id]?.length || 0 : 0)
const best = id => (mounted.value ? state.value.best[id] : null)

const boardOpen = ref(false)
// borne : laisser la place au visiteur suivant
const newOpen = ref(false)
const hasPlayer = computed(() => mounted.value && !!(state.value.name || state.value.current || done.value.length || Object.keys(state.value.badges).length))
const boardQuiz = ref('all')
const TABS = ['all', ...ORDER]
const limit = id => byId.value[id]?.time_limit
function onTabKey (e) {
  const i = TABS.indexOf(boardQuiz.value)
  const j = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : -1
  if (j < 0) return
  e.preventDefault()
  boardQuiz.value = TABS[j]
  nextTick(() => document.getElementById(`tab-${TABS[j]}`)?.focus())
}
</script>

<template>
  <div class="page">
    <header class="top">
      <img src="/brand/ciprel.png" alt="CIPREL" class="logo" width="112" height="50" data-admin-tap draggable="false">
      <div class="title">
        <h1>Quiz expert énergie</h1>
        <p>Trois quiz au choix sur l’énergie et les centrales à cycle combiné gaz : 10 questions, 2 minutes, à vous de jouer.</p>
      </div>
      <div class="tools">
        <button class="btn ghost" type="button" @click="boardOpen = true"><AppIcon name="trophy" />Classement</button>
        <button v-if="kiosk && hasPlayer" class="btn ghost" type="button" @click="newOpen = true"><AppIcon name="player" />Nouveau joueur</button>
        <SoundToggle />
      </div>
    </header>

    <section class="hero">
      <div class="scene panel">
        <CcgtProgress :done="done" @open="id => navigateTo(`/quiz/${id}`)" />
        <p class="caption">Chaque quiz réussi met une partie de la centrale sous tension, de la turbine à gaz jusqu’au réseau.</p>
      </div>
      <aside class="side panel">
        <GuideBubble :text="guide" variant="femme" :pose="done.length ? 'cheer' : 'wave'" :size="118" />
        <PowerGauge :value="mounted ? charge : 0" :max="total" />
        <div class="badges">
          <h2>Récompenses <span class="muted">{{ mounted ? Object.keys(state.badges).length : 0 }}/{{ BADGES.length }}</span></h2>
          <ul>
            <li v-for="b in BADGES" :key="b.id" :class="{ earned: mounted && state.badges[b.id] }" :title="b.desc">
              <BadgeIcon :id="b.id" :earned="!!(mounted && state.badges[b.id])" :size="40" />
              <span><strong>{{ b.name }}</strong><span class="sr-only"> : {{ b.desc }}{{ mounted && state.badges[b.id] ? ' Obtenue.' : ' À obtenir.' }}</span></span>
            </li>
          </ul>
        </div>
      </aside>
    </section>

    <section class="route" aria-labelledby="route-title">
      <h2 id="route-title">Choisissez votre quiz</h2>
      <p class="lead">Les trois quiz sont indépendants : commencez par celui que vous voulez.</p>
      <p v-if="error" class="state panel">
        Le questionnaire est momentanément indisponible.
        <button class="btn ghost" type="button" @click="refresh()">Réessayer</button>
      </p>
      <ul v-else class="steps">
        <li v-for="id in ORDER" :key="id" class="step" :class="{ done: done.includes(id) }" :style="{ '--c': SECTIONS[id].color, '--t': SECTIONS[id].tint }">
          <div class="body">
            <p class="sec"><QuizBadge :quiz="id" big /><span v-if="done.includes(id)" class="won"><AppIcon name="check" :size="18" />Réussi</span></p>
            <h3>{{ byId[id]?.title }}</h3>
            <p class="topics">{{ byId[id]?.subtitle }}</p>
            <div class="chips">
              <span class="chip">{{ byId[id]?.count || 10 }} questions</span>
              <span v-if="limit(id)" class="chip"><AppIcon name="clock" :size="18" />{{ formatTime(limit(id)) }} au chrono</span>
              <span v-if="best(id)" class="chip record">Votre record : {{ best(id).points }} points ({{ best(id).score }}/{{ best(id).total }})</span>
            </div>
          </div>
          <div class="cta">
            <NuxtLink class="btn" :class="{ ghost: done.includes(id) && current?.quiz !== id }" :to="`/quiz/${id}`">
              {{ cta(id) }}<span class="sr-only"> au quiz {{ SECTIONS[id].name.toLowerCase() }}</span><AppIcon name="next" :size="18" />
            </NuxtLink>
            <NuxtLink v-if="missed(id)" class="btn ghost" :to="`/quiz/${id}?revision=1`">
              <AppIcon name="rotate" :size="18" />Réviser {{ missed(id) }} erreur{{ missed(id) > 1 ? 's' : '' }}
            </NuxtLink>
          </div>
        </li>
      </ul>
    </section>

    <footer class="foot">
      <p>Points : 100 par bonne réponse, plus 2 par seconde restante au prorata des bonnes réponses. Si les 2 minutes s’écoulent avant la dernière question, c’est un échec : la partie n’entre pas au classement. La correction détaillée s’affiche à la fin.</p>
      <p v-if="kiosk" class="muted">Après {{ idleSeconds < 120 ? `${idleSeconds} secondes` : `${Math.round(idleSeconds / 60)} minutes` }} sans activité, la borne efface la progression pour le visiteur suivant. Le classement reste.</p>
      <p v-else-if="doneCount" class="muted">Progression enregistrée sur cet appareil.</p>
    </footer>

    <AppDialog :open="boardOpen" title="Classement" wide @close="boardOpen = false">
      <div class="tabs" role="tablist" aria-label="Quiz">
        <button
          v-for="id in TABS" :id="`tab-${id}`" :key="id" class="tab" type="button" role="tab"
          :aria-selected="boardQuiz === id" :aria-controls="`panel-${id}`" :tabindex="boardQuiz === id ? 0 : -1"
          @click="boardQuiz = id" @keydown="onTabKey"
        >
          {{ id === 'all' ? 'Tous les quiz' : SECTIONS[id].name }}
        </button>
      </div>
      <div :id="`panel-${boardQuiz}`" role="tabpanel" :aria-labelledby="`tab-${boardQuiz}`">
        <p v-if="boardQuiz !== 'all'" class="board-head"><QuizBadge :quiz="boardQuiz" big /></p>
        <LeaderboardPanel v-if="boardOpen" :quiz="boardQuiz" :highlight="best(boardQuiz)?.slug" />
      </div>
    </AppDialog>

    <AppDialog v-if="kiosk" :open="newOpen" title="Nouveau joueur" @close="newOpen = false">
      <p>La progression{{ state.name ? ` de ${state.name}` : '' }} (centrale, récompenses, quiz en cours) sera effacée de la borne. Les scores restent au classement.</p>
      <div class="confirm">
        <button class="btn" type="button" @click="resetPlayer"><AppIcon name="player" />Laisser la place</button>
        <button class="btn ghost" type="button" @click="newOpen = false">Annuler</button>
      </div>
    </AppDialog>
  </div>
</template>

<style scoped>
.page { max-width: 1440px; margin: 0 auto; padding: 16px 16px 40px; display: grid; gap: 22px; }
.top { display: grid; grid-template-columns: auto 1fr; gap: 12px 16px; align-items: center; }
.logo { height: 44px; width: auto; background: #fff; border-radius: 10px; padding: 3px 6px; }
.title h1 { font-size: clamp(1.6rem, 4.2vw, 2.6rem); font-weight: 800; line-height: 1.05; }
.title p { color: var(--ink-2); margin-top: 4px; max-width: 62ch; }
.tools { grid-column: 1 / -1; display: flex; gap: 10px; }
.hero { display: grid; gap: 18px; }
.scene { padding: 18px 16px 14px; display: grid; gap: 10px; align-content: center; }
.caption { color: var(--ink-2); font-weight: 600; text-align: center; }
.side { padding: 18px; display: grid; gap: 18px; align-content: start; }
.badges h2 { font-size: 1.15rem; margin-bottom: 8px; }
.badges h2 .muted { color: var(--ink-2); font-weight: 600; }
.badges ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 14px; }
.badges li { display: flex; align-items: center; gap: 6px; font-size: .9rem; color: var(--ink-2); }
.badges li.earned { color: var(--ink); }
.badges li strong { font-weight: 700; }

.route h2 { font-size: 1.5rem; margin-bottom: 12px; }
.tabs { margin-bottom: 4px; }
.state { padding: 18px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lead { color: var(--ink-2); margin: -6px 0 14px; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.step {
  display: grid; gap: 12px 20px; padding: 16px 18px; border-radius: var(--radius);
  background: var(--surface); box-shadow: var(--shadow); border-left: 10px solid var(--c);
}
.body { min-width: 0; display: grid; gap: 6px; }
.sec { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.won { display: inline-flex; align-items: center; gap: 4px; font-weight: 800; color: var(--ok); }
.body h3 { font-size: 1.3rem; font-weight: 700; }
.topics { color: var(--ink-2); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.chips .chip { font-size: .92rem; min-height: 34px; }
.chip.record { background: var(--t); border-color: var(--c); font-weight: 700; }
.cta { display: flex; flex-wrap: wrap; gap: 10px; }
.board-head { margin: 12px 0 10px; }
.foot { color: var(--ink-2); display: grid; gap: 4px; font-size: .95rem; border-top: 2px solid var(--line); padding-top: 16px; }
.foot .muted { font-weight: 700; }

.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab {
  min-height: 40px; padding: 4px 14px; border-radius: 999px; border: 2px solid var(--line); background: var(--surface);
  font-family: var(--font-display); font-weight: 700; cursor: pointer;
}
.tab[aria-selected="true"] { border: 3px solid var(--ink); background: var(--orange); }
.confirm { display: flex; flex-wrap: wrap; gap: 10px; }
.tools { flex-wrap: wrap; }

@media (min-width: 768px) {
  .page { padding: 24px 28px 48px; }
  .top { grid-template-columns: auto 1fr auto; }
  .tools { grid-column: auto; }
  .logo { height: 54px; }
  .step { grid-template-columns: 1fr auto; padding: 20px 24px; }
  .cta { flex-direction: column; align-items: stretch; justify-content: center; min-width: 190px; }
}
@media (min-width: 768px) and (max-width: 1199px) {
  .side { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 28px; }
  .side > :first-child { grid-row: span 2; }
}
@media (min-width: 1024px) {
  .scene { padding: 26px 26px 18px; }
}
@media (min-width: 1200px) {
  .hero { grid-template-columns: minmax(0, 1.75fr) minmax(340px, 1fr); }
}
</style>
