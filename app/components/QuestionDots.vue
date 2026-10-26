<script setup>
// Jauge des questions : une pastille par question, qui se remplit au fil des réponses.
// Vert juste, rouge faux, marine « enregistrée » à l'examen (correction à la fin).
const props = defineProps({
  items: { type: Array, required: true }, // [{ state: 'todo' | 'current' | 'right' | 'wrong' | 'recorded' }]
  label: { type: String, default: 'Progression' },
})
const summary = computed(() => {
  const n = s => props.items.filter(i => i.state === s).length
  const parts = [`${n('right')} juste${n('right') > 1 ? 's' : ''}`, `${n('wrong')} fausse${n('wrong') > 1 ? 's' : ''}`]
  if (n('recorded')) parts.push(`${n('recorded')} enregistrée${n('recorded') > 1 ? 's' : ''}`)
  return `${props.label} : ${parts.join(', ')}, sur ${props.items.length}`
})
</script>

<template>
  <div class="dots" role="img" :aria-label="summary">
    <span v-for="(it, i) in items" :key="i" class="dot" :class="it.state" />
  </div>
</template>

<style scoped>
.dots { display: flex; flex-wrap: wrap; gap: 5px; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: var(--surface); border: 2px solid #9fb0bf; }
.dot.current { border: 3px solid var(--orange); background: #fff3d1; }
.dot.right { background: var(--ok); border-color: var(--ok); }
.dot.wrong { background: var(--bad); border-color: var(--bad); }
.dot.recorded { background: var(--navy); border-color: var(--navy); }
</style>
