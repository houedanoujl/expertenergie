<script setup>
// File de toasts de récompense : une médaille glisse depuis le haut au moment du gain.
import { BADGE_BY_ID } from '~/composables/useQuiz'

const toasts = useState('toasts', () => [])
const { play } = useSound()
function dismiss (key) { toasts.value = toasts.value.filter(t => t.key !== key) }
watch(() => toasts.value.length, (n, old) => {
  if (n > (old || 0)) play('badge')
  for (const t of toasts.value) {
    if (!t.timer) t.timer = setTimeout(() => dismiss(t.key), 3800)
  }
})
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.key" class="toast" role="status">
        <BadgeIcon :id="t.id" :size="44" />
        <div>
          <p class="t-label">Récompense débloquée</p>
          <p class="t-name">{{ BADGE_BY_ID[t.id]?.name }}</p>
        </div>
        <button class="close" type="button" aria-label="Fermer" @click="dismiss(t.key)"><AppIcon name="cross" :size="16" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1000; display: grid; gap: 8px; width: min(380px, calc(100vw - 24px)); pointer-events: none; }
.toast {
  pointer-events: auto; display: flex; align-items: center; gap: 12px;
  padding: 10px 12px 10px 10px; border-radius: 22px; background: var(--surface);
  border: 3px solid var(--ink); box-shadow: var(--shadow-lift);
}
.toast div { flex: 1; }
.t-label { font-size: .85rem; color: var(--ink-2); font-weight: 700; }
.t-name { font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; line-height: 1.1; }
.close { border: 0; background: transparent; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; color: var(--ink-2); }
.close:hover { background: #eef4f8; }
.toast-enter-active { transition: transform .5s var(--ease-out), opacity .3s; }
.toast-leave-active { transition: transform .3s ease-in, opacity .3s; }
.toast-enter-from { transform: translateY(-24px) scale(.96); opacity: 0; }
.toast-leave-to { transform: translateY(-12px); opacity: 0; }
</style>
