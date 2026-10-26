<script setup>
// Médaille d'une récompense : pastille colorée + pictogramme.
const props = defineProps({
  id: { type: String, required: true },
  earned: { type: Boolean, default: true },
  size: { type: [Number, String], default: 48 },
})
const GLYPHS = {
  premier: 'M24 10l3 9 9 3-9 3-3 9-3-9-9-3 9-3z',
  'sans-faute': 'M15 24.5l6 6 12-13',
  serie: 'M12 30l7-7 6 5 11-12 M30 16h6v6',
  calculateur: 'M15 12h18v24H15z M19 16h10v5H19z M19 26h.01 M24 26h.01 M29 26h.01 M19 31h.01 M24 31h.01 M29 31h.01',
  expert: 'M24 11l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L24 29.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z',
  centrale: 'M13 35V22l6 4v-4l6 4V14h6v21z M10 35h28',
  partage: 'M24 28V12 M18 18l6-6 6 6 M15 26v8h18v-8',
}
const HUES = {
  premier: '#e1a801', 'sans-faute': '#3f9b5a', serie: '#3f9b5a', calculateur: '#3f80c4',
  expert: '#c08a00', centrale: '#26456f', partage: '#6b7b8b',
}
const color = computed(() => (props.earned ? HUES[props.id] : '#b5bec7'))
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="22" :fill="earned ? color : '#eef1f4'" :stroke="color" stroke-width="2" />
    <path :d="GLYPHS[id]" fill="none" :stroke="earned ? '#fff' : '#9aa5b1'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
