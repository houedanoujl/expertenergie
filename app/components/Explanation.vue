<script setup>
// Explication d'une réponse : les phrases de calcul (avec « = ») sont posées à part,
// comme au tableau, pour qu'on suive le raisonnement.
const props = defineProps({ text: { type: String, required: true } })
const blocks = computed(() => props.text
  .split(/(?<=[.!?])\s+(?=[A-ZÀÉÈÊÎÔΗ])/u)
  .map(s => ({ s, calc: / = |≈/.test(s) && /\d/.test(s) })))
</script>

<template>
  <div class="expl">
    <template v-for="(b, i) in blocks" :key="i">
      <p v-if="b.calc" class="calc"><RichText :text="b.s" /></p>
      <p v-else><RichText :text="b.s" /></p>
    </template>
  </div>
</template>

<style scoped>
.expl { display: grid; gap: 8px; }
.expl p { line-height: 1.55; }
.calc {
  font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; line-height: 1.45;
  font-variant-numeric: tabular-nums;
  padding: 10px 14px; border-radius: 14px; background: var(--cream); border: 2px dashed #e3c99b;
}
:deep(sub) { font-size: .72em; }
</style>
