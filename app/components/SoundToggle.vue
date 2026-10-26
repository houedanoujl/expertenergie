<script setup>
const { muted, toggle } = useSound()
</script>

<template>
  <button
    class="btn ghost icon"
    type="button"
    :aria-pressed="!muted"
    :aria-label="muted ? 'Activer le son' : 'Couper le son'"
    :title="muted ? 'Activer le son' : 'Couper le son'"
    @click="toggle"
  >
    <AppIcon :name="muted ? 'mute' : 'sound'" :size="20" />
  </button>
</template>
