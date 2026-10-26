<script setup>
// Pictogrammes au trait (24×24), dessinés pour l'interface.
defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 20 } })
const PATHS = {
  back: 'M15 5l-7 7 7 7',
  clock: 'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  cross: 'M6 6l12 12 M18 6L6 18',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 21h8 M9 17h6v4H9z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z',
  share: 'M12 15V3 M7 8l5-5 5 5 M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L3 9 M3 4v5h5 M4 13a8 8 0 0 0 14.6 4.5L21 15 M21 20v-5h-5',
  info: 'M12 11v6 M12 7.5v.5 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  medal: 'M8 3l2.5 6 M16 3l-2.5 6 M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 13l1 2 2 .3-1.5 1.4.4 2.1L12 17.8l-1.9 1 .4-2.1L9 15.3l2-.3 1-2z',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z M4 19a2 2 0 0 1 2-2h13',
  sound: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16 9.5l5 5 M21 9.5l-5 5',
  next: 'M9 5l7 7-7 7',
  home: 'M4 11l8-7 8 7 M6 9.5V20h12V9.5 M10 20v-5h4v5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  target: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z M12 12h.01',
  rotate: 'M4 12a8 8 0 1 0 2.4-5.7L4 8.5 M4 4v4.5h4.5',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="PATHS[name]" />
  </svg>
</template>
