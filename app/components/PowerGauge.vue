<script setup>
// Charge de la centrale : meilleures bonnes réponses cumulées sur les 55 questions.
const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, default: 55 },
})
const pct = computed(() => (props.max ? Math.round((props.value / props.max) * 100) : 0))
</script>

<template>
  <div class="gauge">
    <div class="head">
      <span class="label"><AppIcon name="bolt" :size="18" /> Charge de la centrale</span>
      <span class="value">{{ pct }} %</span>
    </div>
    <div class="bar" role="meter" aria-label="Charge de la centrale" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="`${pct} %, ${value} bonnes réponses sur ${max}`">
      <span class="fill" :style="{ width: `${pct}%` }" />
      <span v-for="t in 4" :key="t" class="tick" :style="{ left: `${t * 20}%` }" />
    </div>
    <p class="hint">{{ value }} bonne{{ value > 1 ? 's' : '' }} réponse{{ value > 1 ? 's' : '' }} sur {{ max }}, en gardant votre meilleur score à chaque quiz.</p>
  </div>
</template>

<style scoped>
.gauge { display: grid; gap: 8px; }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.label { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; }
.value { font-family: var(--font-display); font-weight: 800; font-size: 1.6rem; font-variant-numeric: tabular-nums; line-height: 1; }
.bar { position: relative; height: 22px; border-radius: 999px; background: var(--surface); border: 3px solid var(--ink); overflow: hidden; }
.fill { position: absolute; inset: 0 auto 0 0; background: var(--energy); border-right: 3px solid var(--ink); transition: width .8s var(--ease-out); }
.fill[style*="width: 0%"] { border-right: 0; }
.tick { position: absolute; top: 3px; bottom: 3px; width: 2px; background: rgba(31, 40, 50, .25); }
.hint { font-size: .9rem; color: var(--ink-2); }
</style>
