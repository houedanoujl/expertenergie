<script setup>
// Logos simplifiés des réseaux (monochromes, 24×24), dessinés pour l'interface.
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  ink: { type: String, default: '#fff' }, // couleur du motif intérieur
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <template v-if="name === 'linkedin'">
      <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="currentColor" />
      <rect x="5.4" y="9.6" width="3" height="9" :fill="ink" />
      <circle cx="6.9" cy="6.6" r="1.75" :fill="ink" />
      <path d="M10.6 9.6h2.85v1.25c.45-.8 1.5-1.45 2.85-1.45 2.55 0 3.3 1.6 3.3 4v5.2h-3v-4.6c0-1.15-.3-2-1.4-2-1.15 0-1.6.85-1.6 2v4.6h-3z" :fill="ink" />
    </template>
    <template v-else-if="name === 'whatsapp'">
      <path d="M12 2.2a9.6 9.6 0 0 0-8.3 14.5L2.3 21.8l5.2-1.4A9.6 9.6 0 1 0 12 2.2z" fill="currentColor" />
      <path d="M9 7.4c-.3-.6-.5-.6-.8-.6h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.2 1.3 3.4c.2.2 2.3 3.6 5.6 4.9 2.8 1.1 3.3.9 4 .8.6-.1 2-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4l-2.1-1c-.3-.1-.5-.2-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6z" :fill="ink" />
    </template>
    <template v-else-if="name === 'facebook'">
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <path d="M13.3 22.4v-7.3h2.5l.4-2.9h-2.9v-1.8c0-.8.2-1.4 1.4-1.4h1.6V6.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2h-2.5v2.9h2.5v7.1z" :fill="ink" />
    </template>
    <template v-else-if="name === 'x'">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="currentColor" />
      <path d="M6.3 6.3h3.3l2.8 3.9 3.4-3.9h1.4l-4.2 4.8 4.8 6.6h-3.3l-3-4.2-3.7 4.2H6.4l4.5-5.1z M8.3 7.3l6.8 9.4h1.1L9.5 7.3z" :fill="ink" />
    </template>
  </svg>
</template>
