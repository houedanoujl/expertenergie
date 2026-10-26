<script setup>
// Une question et ses 4 réponses : boutons radio natifs (flèches au clavier),
// habillés en pilules avec la pastille A à D. Après correction, la bonne réponse
// passe au vert et la réponse choisie, si elle est fausse, au rouge.
import { EXAM_LEVELS } from '~/data/sections'

const props = defineProps({
  question: { type: Object, required: true }, // { id, position, level, prompt, choices }
  number: { type: Number, required: true },
  total: { type: Number, required: true },
  modelValue: { type: String, default: null },
  result: { type: Object, default: null },    // { choice, answer? } une fois répondu
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const LETTERS = ['A', 'B', 'C', 'D']

function state (letter) {
  const r = props.result
  if (!r) return props.modelValue === letter ? 'selected' : ''
  if (r.answer) {
    if (letter === r.answer) return 'right'
    if (letter === r.choice) return 'wrong'
    return 'muted'
  }
  return letter === r.choice ? 'selected' : 'muted'
}
const locked = computed(() => !!props.result || props.disabled)
const legendId = computed(() => `q-${props.question.id}`)
</script>

<template>
  <form class="question panel" @submit.prevent="emit('submit')">
    <fieldset :aria-describedby="`${legendId}-meta`">
      <legend :id="legendId" class="prompt">
        <span :id="`${legendId}-meta`" class="meta">
          Question {{ number }} sur {{ total }}<template v-if="question.level"> · Niveau {{ question.level }}, {{ EXAM_LEVELS[question.level].toLowerCase() }}</template>
        </span>
        <RichText :text="question.prompt" />
      </legend>
      <div class="choices">
        <label v-for="(c, i) in question.choices" :key="LETTERS[i]" class="choice" :class="state(LETTERS[i])">
          <input
            type="radio"
            :name="question.id"
            :value="LETTERS[i]"
            :checked="(result?.choice || modelValue) === LETTERS[i]"
            :disabled="locked"
            @change="emit('update:modelValue', LETTERS[i])"
          >
          <span class="letter" aria-hidden="true">
            <AppIcon v-if="state(LETTERS[i]) === 'right'" name="check" :size="20" />
            <AppIcon v-else-if="state(LETTERS[i]) === 'wrong'" name="cross" :size="18" />
            <template v-else>{{ LETTERS[i] }}</template>
          </span>
          <span class="text">
            <span class="sr-only">{{ LETTERS[i] }}. </span><RichText :text="c" />
            <span v-if="state(LETTERS[i]) === 'right'" class="sr-only"> (bonne réponse)</span>
            <span v-else-if="state(LETTERS[i]) === 'wrong'" class="sr-only"> (votre réponse, fausse)</span>
          </span>
        </label>
      </div>
    </fieldset>
    <slot />
  </form>
</template>

<style scoped>
.question { padding: 20px; display: grid; gap: 18px; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: 18px; }
.prompt { padding: 0; font-family: var(--font-display); font-weight: 700; font-size: clamp(1.2rem, 2.6vw, 1.5rem); line-height: 1.25; text-wrap: pretty; }
.meta { display: block; margin-bottom: 6px; font-family: var(--font-body); font-size: .95rem; font-weight: 700; color: var(--ink-2); }
.choices { display: grid; gap: 10px; }
.choice {
  position: relative; display: flex; align-items: center; gap: 14px;
  min-height: 60px; padding: 10px 16px 10px 10px;
  border-radius: 22px; border: 2px solid var(--line); background: var(--surface);
  cursor: pointer; font-weight: 600; line-height: 1.35;
  transition: border-color .15s, background .15s, transform .15s var(--ease-out);
}
.choice input { position: absolute; opacity: 0; pointer-events: none; }
.choice:hover:not(.right, .wrong, .muted) { border-color: var(--ink); transform: translateY(-1px); }
.choice:has(input:focus-visible) { outline: 3px solid var(--navy); outline-offset: 3px; }
.letter {
  flex: none; width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--font-display); font-weight: 800; font-size: 1.15rem;
  background: var(--surface); border: 3px solid var(--ink);
}
.text { min-width: 0; }
.choice.selected { border: 3px solid var(--ink); background: #fff3d1; padding: 9px 15px 9px 9px; }
.choice.selected .letter { background: var(--orange); }
.choice.right { border: 3px solid var(--ok); background: #e1f3e5; padding: 9px 15px 9px 9px; }
.choice.right .letter { background: var(--ok); border-color: var(--ok); color: #fff; }
.choice.wrong { border: 3px solid var(--bad); background: #fbe3e0; padding: 9px 15px 9px 9px; }
.choice.wrong .letter { background: var(--bad); border-color: var(--bad); color: #fff; }
.choice.muted { color: var(--ink-2); background: #f6f9fb; cursor: default; }
.choice.muted .letter { border-color: #9fb0bf; color: var(--ink-2); }
input:disabled + .letter { cursor: default; }
.choice:has(input:disabled) { cursor: default; }
@media (min-width: 640px) { .question { padding: 26px 28px; } }
</style>
