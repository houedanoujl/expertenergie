<script setup>
// Page publique d'un résultat (lien partagé) : rendue côté serveur pour l'aperçu Open Graph.
// Elle montre le score et les réponses justes ou fausses, jamais les réponses elles-mêmes.
import { SECTIONS, LEVELS } from '~/data/sections'
import { formatTime, ordinal, atQuiz } from '~/composables/useQuiz'

const route = useRoute()
const slug = String(route.params.slug)
const { data: r, error } = await useFetch(`/api/results/${slug}`, { key: `result-${slug}` })
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Résultat introuvable.', fatal: true })

const config = useRuntimeConfig()
const reqUrl = useRequestURL()
const site = (config.public.siteUrl || reqUrl.origin).replace(/\/$/, '')
const level = computed(() => LEVELS[r.value.level]?.name || '')
const title = computed(() => `${r.value.name} : ${r.value.score}/${r.value.total} ${atQuiz(r.value.label)} — Quiz expert énergie`)
const description = computed(() => `${level.value} sur « ${r.value.title} ». 55 questions corrigées sur les centrales à cycle combiné gaz : relevez le défi !`)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${site}/resultat/${slug}`,
  ogImage: `${site}/og.png`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="page">
    <header class="bar">
      <NuxtLink to="/" class="home"><img src="/brand/ciprel.png" alt="CIPREL" width="90" height="40"><span>Quiz expert énergie</span></NuxtLink>
    </header>
    <section class="panel card" aria-labelledby="r-title">
      <CiprelTechnician variant="homme" :pose="r.level === 'a-reprendre' ? 'think' : 'cheer'" :size="150" class="tech" />
      <div class="body">
        <p class="where">
          <span class="swatch" :style="{ background: SECTIONS[r.quiz]?.color }" aria-hidden="true" />
          {{ r.label }} · {{ SECTIONS[r.quiz]?.name }}
        </p>
        <h1 id="r-title">{{ r.name }} a obtenu</h1>
        <p class="score"><span class="big">{{ r.score }}</span><span class="of">/{{ r.total }}</span></p>
        <LevelPill :level="r.level" big />
        <p class="quiz">« {{ r.title }} »</p>
        <QuestionDots :items="r.pattern.map(ok => ({ state: ok ? 'right' : 'wrong' }))" label="Résultat" />
        <div class="chips">
          <span class="chip"><AppIcon name="clock" :size="18" />{{ formatTime(r.duration) }}</span>
          <span v-if="r.rank" class="chip"><AppIcon name="trophy" :size="18" />{{ ordinal(r.rank) }} sur {{ r.players }}</span>
          <span v-else class="chip">Révision, hors classement</span>
        </div>
        <div class="buttons">
          <NuxtLink class="btn" :to="`/quiz/${r.quiz}?defi=${r.slug}`"><AppIcon name="target" :size="20" />Relever le défi</NuxtLink>
          <NuxtLink class="btn ghost" to="/">Découvrir les 5 quiz</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 880px; margin: 0 auto; padding: 16px 16px 48px; display: grid; gap: 18px; }
.home { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; }
.home img { height: 40px; width: auto; background: #fff; border-radius: 8px; padding: 2px 4px; }
.card { padding: 24px 20px; display: grid; gap: 18px; }
.tech { justify-self: center; }
.body { display: grid; gap: 12px; justify-items: start; }
.where { display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--ink-2); }
.swatch { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid var(--ink); }
h1 { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; }
.score { font-family: var(--font-display); font-weight: 800; line-height: .9; font-variant-numeric: tabular-nums; }
.score .big { font-size: clamp(4rem, 14vw, 6rem); }
.score .of { font-size: clamp(2rem, 6vw, 2.8rem); color: var(--ink-2); }
.quiz { font-weight: 700; }
.chips, .buttons { display: flex; flex-wrap: wrap; gap: 10px; }
@media (min-width: 768px) {
  .card { grid-template-columns: auto 1fr; align-items: center; padding: 32px; gap: 32px; }
}
</style>
