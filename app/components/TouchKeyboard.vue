<script setup>
// Clavier AZERTY à l'écran pour la borne (le clavier tactile de Windows ne s'ouvre pas
// de façon fiable en plein écran). Saisie en fin de texte, majuscule au premier caractère.
const props = defineProps({
  modelValue: { type: String, default: '' },
  maxlength: { type: Number, default: 20 },
})
const emit = defineEmits(['update:modelValue'])

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['shift', 'w', 'x', 'c', 'v', 'b', 'n', 'é', 'è', 'back'],
]
const shift = ref(false)
const upper = computed(() => shift.value || !props.modelValue.length || props.modelValue.endsWith(' '))
const full = computed(() => props.modelValue.length >= props.maxlength)
const { play } = useSound()

function put (ch) {
  if (full.value) return
  emit('update:modelValue', props.modelValue + (upper.value ? ch.toUpperCase() : ch))
  shift.value = false
  play('pick')
}
function back () {
  emit('update:modelValue', props.modelValue.slice(0, -1))
}
function press (k) {
  if (k === 'shift') shift.value = !shift.value
  else if (k === 'back') back()
  else put(k)
}
const label = k => (upper.value && k.length === 1 ? k.toUpperCase() : k)
</script>

<template>
  <div class="kbd" role="group" aria-label="Clavier">
    <div v-for="(row, i) in ROWS" :key="i" class="row">
      <button
        v-for="k in row" :key="k" type="button" class="key"
        :class="{ wide: k === 'shift' || k === 'back', on: k === 'shift' && shift }"
        :aria-label="k === 'shift' ? 'Majuscule' : k === 'back' ? 'Effacer' : undefined"
        :disabled="full && k !== 'back' && k !== 'shift'"
        @pointerdown.prevent @click="press(k)"
      >
        <AppIcon v-if="k === 'back'" name="backspace" :size="24" />
        <span v-else-if="k === 'shift'" aria-hidden="true">⇧</span>
        <template v-else>{{ label(k) }}</template>
      </button>
    </div>
    <div class="row">
      <button type="button" class="key" :disabled="full" @pointerdown.prevent @click="put('-')">-</button>
      <button type="button" class="key space" :disabled="full || !modelValue || modelValue.endsWith(' ')" aria-label="Espace" @pointerdown.prevent @click="put(' ')">espace</button>
      <button type="button" class="key" :disabled="full" @pointerdown.prevent @click="put('.')">.</button>
    </div>
  </div>
</template>

<style scoped>
.kbd { display: grid; gap: 8px; padding: 12px; border-radius: 20px; background: var(--tray); border: 2px solid var(--line); max-width: 760px; user-select: none; }
.row { display: flex; gap: 8px; justify-content: center; }
.key {
  flex: 1 1 0; min-width: 0; min-height: 58px; border-radius: 14px; border: 2px solid var(--ink);
  background: var(--surface); font-family: var(--font-display); font-weight: 700; font-size: 1.35rem;
  display: grid; place-items: center; cursor: pointer; touch-action: manipulation;
  box-shadow: 0 2px 0 var(--ink);
}
.key:active { transform: translateY(2px); box-shadow: none; background: #ffe3c2; }
.key.wide { flex-grow: 1.5; }
.key.on { background: var(--orange); }
.key.space { flex-grow: 6; font-size: 1.05rem; color: var(--ink-2); }
.key[disabled] { opacity: .4; cursor: default; }
</style>
