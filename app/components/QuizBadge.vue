<script setup>
// Repère d'un quiz, à côté de chaque score : couleur du quiz, 1 à 3 barres et nom du niveau.
// La couleur n'est jamais seule : les barres et le nom disent la même chose.
import { SECTIONS } from '~/data/sections'
const props = defineProps({ quiz: { type: String, required: true }, big: { type: Boolean, default: false } })
const s = computed(() => SECTIONS[props.quiz])
</script>

<template>
  <span v-if="s" class="quiz-badge" :class="{ big }" :style="{ background: s.tint, color: s.ink, borderColor: s.color }">
    <svg :width="big ? 22 : 16" :height="big ? 22 : 16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect v-for="n in 3" :key="n" :x="1 + (n - 1) * 5" :y="13 - n * 4" width="4" :height="n * 4 + 2" rx="1.2" :fill="n <= s.bars ? s.color : '#ffffff'" :stroke="s.ink" stroke-width="1" />
    </svg>
    <span class="sr-only">Quiz </span>{{ s.name }}
  </span>
</template>

<style scoped>
.quiz-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px 2px 7px;
  border-radius: 999px; border: 2px solid; white-space: nowrap;
  font-family: var(--font-display); font-weight: 700; font-size: .9rem; line-height: 1.3;
}
.quiz-badge.big { padding: 5px 16px 5px 11px; font-size: 1.15rem; border-width: 3px; gap: 8px; }
</style>
