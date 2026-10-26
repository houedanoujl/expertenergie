<script setup>
// Classement d'un quiz (parties classées : les révisions n'y entrent pas).
import { formatTime } from '~/composables/useQuiz'

const props = defineProps({
  quiz: { type: String, required: true },
  highlight: { type: String, default: null }, // slug de ma tentative
  me: { type: Object, default: null },        // { rank, name, score, total, time } si hors du top affiché
})
const { data, pending, error, refresh } = useFetch('/api/leaderboard', {
  query: computed(() => ({ quiz: props.quiz, limit: 20 })),
  key: computed(() => `board-${props.quiz}`),
  server: false,
  lazy: true,
})
defineExpose({ refresh })
const meOutside = computed(() => props.me && data.value?.entries && !data.value.entries.some(e => e.slug === props.highlight))
const medal = r => (r === 1 ? 'or' : r === 2 ? 'argent' : r === 3 ? 'bronze' : null)
</script>

<template>
  <div class="board">
    <p v-if="pending" class="state">Chargement du classement…</p>
    <p v-else-if="error" class="state">Classement indisponible pour le moment. <button class="btn ghost" type="button" @click="refresh()">Réessayer</button></p>
    <p v-else-if="!data?.entries?.length" class="state">Aucune partie enregistrée : soyez le premier ou la première !</p>
    <template v-else>
      <ol class="list">
        <li v-for="e in data.entries" :key="e.slug" :class="{ me: e.slug === highlight }">
          <span class="rank" :class="medal(e.rank)"><span class="sr-only">Rang </span>{{ e.rank }}</span>
          <span class="name">{{ e.name }}<span v-if="e.slug === highlight" class="you"> (vous)</span></span>
          <span class="score">{{ e.score }}/{{ e.total }}</span>
          <span class="meta"><LevelPill :level="e.level" /> {{ formatTime(e.time) }}</span>
        </li>
        <li v-if="meOutside" class="me gap">
          <span class="rank"><span class="sr-only">Rang </span>{{ me.rank }}</span>
          <span class="name">{{ me.name }}<span class="you"> (vous)</span></span>
          <span class="score">{{ me.score }}/{{ me.total }}</span>
          <span class="meta">{{ formatTime(me.time) }}</span>
        </li>
      </ol>
      <p class="count">{{ data.total }} participation{{ data.total > 1 ? 's' : '' }} classée{{ data.total > 1 ? 's' : '' }}</p>
    </template>
  </div>
</template>

<style scoped>
.state { color: var(--ink-2); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: min(56dvh, 480px); overflow: auto; }
.list li {
  display: grid; grid-template-columns: 40px 1fr auto; grid-template-areas: "rank name score" "rank meta meta";
  align-items: center; column-gap: 12px; row-gap: 2px; padding: 8px 12px; border-radius: 12px; background: #f4f7fa;
}
.list li.me { background: #fff3d1; box-shadow: inset 0 0 0 2px var(--orange); }
.list li.gap { margin-top: 10px; }
.rank { grid-area: rank; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-display); font-weight: 800; background: #e2e8ee; border: 2px solid var(--ink); font-variant-numeric: tabular-nums; }
.rank.or { background: #f2c94c; }
.rank.argent { background: #cfd6dd; }
.rank.bronze { background: #e0ae84; }
.name { grid-area: name; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.you { font-weight: 600; color: var(--ink-2); }
.score { grid-area: score; font-family: var(--font-display); font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.meta { grid-area: meta; display: flex; align-items: center; gap: 8px; color: var(--ink-2); font-size: .85rem; font-variant-numeric: tabular-nums; }
.meta :deep(.level) { font-size: .75rem; padding: 1px 8px; border-width: 1.5px; }
.count { margin-top: 10px; font-size: .9rem; color: var(--ink-2); }
</style>
