<script setup>
// Accueil : le cycle combiné s'allume au fil des quiz, puis le parcours en cinq étapes.
import { SECTIONS, ORDER } from '~/data/sections'
import { BADGES } from '~/composables/useQuiz'

const { state, charge, doneCount } = useQuiz()
const config = useRuntimeConfig()
const site = (config.public.siteUrl || useRequestURL().origin).replace(/\/$/, '')
useSeoMeta({
  ogTitle: 'Quiz expert énergie — CIPREL',
  ogDescription: '55 questions corrigées sur les centrales à cycle combiné gaz : 4 quiz d’entraînement et un examen, de la turbine à gaz au réseau.',
  ogType: 'website',
  ogUrl: site,
  ogImage: `${site}/og.png`,
  twitterCard: 'summary_large_image',
})
const { data: quizzes, error, refresh } = useQuizList()
const byId = computed(() => Object.fromEntries((quizzes.value || []).map(q => [q.id, q])))
const total = computed(() => (quizzes.value || []).reduce((n, q) => n + q.count, 0) || 55)

// Rendu serveur sans la progression locale : on attend le montage pour l'afficher.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const done = computed(() => (mounted.value ? state.value.done : []))
const next = computed(() => ORDER.find(id => !done.value.includes(id)) || null)
const current = computed(() => (mounted.value ? state.value.current : null))

const guide = computed(() => {
  const name = mounted.value && state.value.name ? ` ${state.value.name}` : ''
  const c = current.value
  if (c && byId.value[c.quiz]) return `Vous avez un quiz en cours : ${byId.value[c.quiz].label}, question ${c.index + 1} sur ${c.questions.length}. On reprend ?`
  if (!done.value.length) return `Bonjour${name} ! Commencez par la turbine à gaz : 10 questions, corrigées et expliquées au fur et à mesure.`
  if (!next.value) return `La centrale est sur le réseau${name} ! Visez le niveau expert à l’examen, ou révisez vos erreurs.`
  if (next.value === 'examen') return 'Les quatre quiz sont faits : place à l’examen, 15 questions de difficulté croissante.'
  return `Bravo, ${done.value.length} section${done.value.length > 1 ? 's' : ''} sous tension. Prochaine étape : ${SECTIONS[next.value].name.toLowerCase()}.`
})

function cta (id) {
  const c = current.value
  if (c?.quiz === id) return `Reprendre (question ${c.index + 1}/${c.questions.length})`
  return done.value.includes(id) ? 'Refaire' : 'Commencer'
}
const missed = id => (mounted.value ? state.value.missed[id]?.length || 0 : 0)
const best = id => (mounted.value ? state.value.best[id] : null)

const boardOpen = ref(false)
const boardQuiz = ref('q1')
function onTabKey (e) {
  const i = ORDER.indexOf(boardQuiz.value)
  const j = e.key === 'ArrowRight' ? (i + 1) % ORDER.length : e.key === 'ArrowLeft' ? (i + ORDER.length - 1) % ORDER.length : -1
  if (j < 0) return
  e.preventDefault()
  boardQuiz.value = ORDER[j]
  nextTick(() => document.getElementById(`tab-${ORDER[j]}`)?.focus())
}
</script>

<template>
  <div class="page">
    <header class="top">
      <img src="/brand/ciprel.png" alt="CIPREL" class="logo" width="112" height="50">
      <div class="title">
        <h1>Quiz expert énergie</h1>
        <p>Centrales à cycle combiné gaz, performance et management de l’énergie : {{ total }} questions corrigées et expliquées.</p>
      </div>
      <div class="tools">
        <button class="btn ghost" type="button" @click="boardOpen = true"><AppIcon name="trophy" />Classement</button>
        <SoundToggle />
      </div>
    </header>

    <section class="hero">
      <div class="scene panel">
        <CcgtProgress :done="done" :next="next" @open="id => navigateTo(`/quiz/${id}`)" />
        <p class="caption">Chaque quiz terminé met une partie de la centrale sous tension, de la turbine à gaz jusqu’au réseau.</p>
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
      <h2 id="route-title">Le parcours</h2>
      <p v-if="error" class="state panel">
        Le questionnaire est momentanément indisponible.
        <button class="btn ghost" type="button" @click="refresh()">Réessayer</button>
      </p>
      <ol v-else class="steps">
        <li v-for="(id, i) in ORDER" :key="id" class="step" :class="{ done: done.includes(id), exam: id === 'examen', next: next === id }" :style="{ '--c': SECTIONS[id].color, '--t': SECTIONS[id].tint }">
          <span class="num" aria-hidden="true">
            <AppIcon v-if="done.includes(id)" name="check" :size="24" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <div class="body">
            <p class="sec">{{ byId[id]?.label || (id === 'examen' ? 'Examen' : `Quiz ${i + 1}`) }} · {{ SECTIONS[id].name }}<span v-if="done.includes(id)" class="sr-only"> (terminé)</span></p>
            <h3>{{ byId[id]?.title }}</h3>
            <p class="topics">{{ byId[id]?.subtitle }}</p>
            <div class="chips">
              <span class="chip">{{ byId[id]?.count || (id === 'examen' ? 15 : 10) }} questions</span>
              <span class="chip"><AppIcon :name="id === 'examen' ? 'flag' : 'bulb'" :size="18" />{{ id === 'examen' ? 'Correction à la fin' : 'Correction immédiate' }}</span>
              <span v-if="best(id)" class="chip">Meilleur score : {{ best(id).score }}/{{ best(id).total }}</span>
              <LevelPill v-if="best(id)" :level="best(id).level" />
            </div>
          </div>
          <div class="cta">
            <NuxtLink class="btn" :class="{ ghost: done.includes(id) && current?.quiz !== id }" :to="`/quiz/${id}`">
              {{ cta(id) }}<AppIcon name="next" :size="18" />
            </NuxtLink>
            <NuxtLink v-if="missed(id)" class="btn ghost" :to="`/quiz/${id}?revision=1`">
              <AppIcon name="rotate" :size="18" />Réviser {{ missed(id) }} erreur{{ missed(id) > 1 ? 's' : '' }}
            </NuxtLink>
          </div>
        </li>
      </ol>
    </section>

    <footer class="foot">
      <p>Chaque question propose quatre réponses, avec un corrigé et une explication. Barème de l’examen : 0 à 7 à reprendre, 8 à 11 acquis, 12 à 15 niveau expert.</p>
      <p v-if="doneCount" class="muted">Progression enregistrée sur cet appareil.</p>
    </footer>

    <AppDialog :open="boardOpen" title="Classement" wide @close="boardOpen = false">
      <div class="tabs" role="tablist" aria-label="Quiz">
        <button
          v-for="id in ORDER" :id="`tab-${id}`" :key="id" class="tab" type="button" role="tab"
          :aria-selected="boardQuiz === id" :aria-controls="`panel-${id}`" :tabindex="boardQuiz === id ? 0 : -1"
          @click="boardQuiz = id" @keydown="onTabKey"
        >
          {{ byId[id]?.label || id }}
        </button>
      </div>
      <div :id="`panel-${boardQuiz}`" role="tabpanel" :aria-labelledby="`tab-${boardQuiz}`">
        <LeaderboardPanel v-if="boardOpen" :quiz="boardQuiz" :highlight="best(boardQuiz)?.slug" />
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
.state { padding: 18px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; position: relative; }
.step {
  position: relative; display: grid; grid-template-columns: 52px 1fr; gap: 6px 16px;
  padding: 0 0 22px;
}
.step:not(:last-child)::before {
  content: ''; position: absolute; left: 24px; top: 52px; bottom: 0; width: 4px; border-radius: 2px; background: var(--line);
}
.step.done:not(:last-child)::before { background: var(--c); }
.num {
  position: relative; z-index: 1; width: 52px; height: 52px; border-radius: 50%;
  display: grid; place-items: center; background: var(--surface); border: 3px solid var(--ink);
  font-family: var(--font-display); font-weight: 800; font-size: 1.4rem;
}
.step.done .num { background: var(--c); }
.step.next .num { box-shadow: 0 0 0 5px #ffd9ae; }
.body { min-width: 0; padding: 14px 16px; border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow); display: grid; gap: 6px; }
.step.exam .body { background: var(--cream); box-shadow: inset 0 0 0 3px var(--ink), var(--shadow); }
.sec { font-weight: 800; color: var(--ink-2); font-size: .95rem; }
.body h3 { font-size: 1.3rem; font-weight: 700; }
.topics { color: var(--ink-2); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.chips .chip { font-size: .92rem; min-height: 34px; }
.cta { grid-column: 2; display: flex; flex-wrap: wrap; gap: 10px; padding-top: 4px; }
.foot { color: var(--ink-2); display: grid; gap: 4px; font-size: .95rem; border-top: 2px solid var(--line); padding-top: 16px; }
.foot .muted { font-weight: 700; }

.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab {
  min-height: 40px; padding: 4px 14px; border-radius: 999px; border: 2px solid var(--line); background: var(--surface);
  font-family: var(--font-display); font-weight: 700; cursor: pointer;
}
.tab[aria-selected="true"] { border: 3px solid var(--ink); background: var(--orange); }

@media (min-width: 768px) {
  .page { padding: 24px 28px 48px; }
  .top { grid-template-columns: auto 1fr auto; }
  .tools { grid-column: auto; }
  .logo { height: 54px; }
  .step { grid-template-columns: 52px 1fr auto; }
  .cta { grid-column: 3; flex-direction: column; align-items: stretch; justify-content: center; padding-top: 0; }
  .body { padding: 16px 20px; }
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
