<script setup>
// Fenêtre modale accessible (élément <dialog> natif : focus piégé, Échap).
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  closable: { type: Boolean, default: true },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
const el = ref(null)
function sync () {
  if (!el.value) return
  if (props.open && !el.value.open) el.value.showModal()
  if (!props.open && el.value.open) el.value.close()
}
watch(() => props.open, () => nextTick(sync))
onMounted(sync)
function onCancel (e) {
  if (!props.closable) e.preventDefault()
  else emit('close')
}
function onBackdrop (e) {
  if (props.closable && e.target === el.value) emit('close')
}
</script>

<template>
  <dialog ref="el" class="dialog" :class="{ wide }" :aria-label="title" @cancel="onCancel" @click="onBackdrop">
    <div class="dialog-body">
      <header class="dialog-head">
        <h2>{{ title }}</h2>
        <button v-if="closable" class="btn ghost icon" type="button" aria-label="Fermer" @click="emit('close')">
          <AppIcon name="cross" />
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  padding: 0; border: 0; border-radius: 22px;
  background: var(--surface); color: var(--ink);
  box-shadow: 0 24px 60px rgba(31, 40, 50, .3);
}
.dialog.wide { width: min(760px, calc(100vw - 24px)); }
.dialog::backdrop { background: rgba(23, 32, 42, .55); }
.dialog[open] { animation: pop .25s cubic-bezier(.2, .8, .2, 1); }
.dialog-body { padding: 20px 20px 22px; display: grid; gap: 16px; }
.dialog-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dialog-head h2 { font-size: 1.35rem; font-weight: 700; }
@media (min-width: 640px) { .dialog-body { padding: 26px 28px 28px; } }
@keyframes pop { from { transform: translateY(12px) scale(.98); opacity: 0; } }
</style>
