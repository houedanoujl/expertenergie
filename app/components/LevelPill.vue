<script setup>
import { LEVELS } from '~/data/sections'
defineProps({ level: { type: String, required: true }, big: { type: Boolean, default: false } })
</script>

<template>
  <span class="level" :class="{ big }" :style="{ color: LEVELS[level]?.ink, background: LEVELS[level]?.bg }">
    <AppIcon v-if="level === 'expert'" name="star" :size="big ? 20 : 15" />
    {{ LEVELS[level]?.name }}
  </span>
</template>

<style scoped>
.level {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 999px; border: 2px solid currentColor;
  font-family: var(--font-display); font-weight: 700; font-size: .9rem; line-height: 1.2; white-space: nowrap;
}
.level.big { padding: 6px 16px; font-size: 1.15rem; border-width: 3px; }
</style>
