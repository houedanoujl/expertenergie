<script setup>
// Texte du document avec ses notations : « C_corrigé » s'affiche en indice.
// Rendu structuré (pas de v-html) : le texte vient de la base.
const props = defineProps({ text: { type: String, required: true } })
const parts = computed(() => {
  const out = []
  const re = /([A-Za-zη])_([\p{L}]+)/gu
  let last = 0
  for (const m of props.text.matchAll(re)) {
    out.push({ t: props.text.slice(last, m.index) + m[1] })
    out.push({ sub: m[2] })
    last = m.index + m[0].length
  }
  out.push({ t: props.text.slice(last) })
  return out
})
</script>

<template>
  <template v-for="(p, i) in parts" :key="i"><sub v-if="p.sub">{{ p.sub }}</sub><template v-else>{{ p.t }}</template></template>
</template>
