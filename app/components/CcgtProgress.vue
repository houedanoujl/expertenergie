<script setup>
// Schéma plat du cycle combiné, au trait encre comme les schémas de brikelec.
// Chaque quiz réussi met sa partie de la centrale sous tension : débutant, la turbine à gaz ;
// intermédiaire, la chaudière et le cycle eau-vapeur ; expert, l'alternateur et le réseau.
// Elle prend la couleur du quiz et l'énergie y circule. Un clic ouvre le quiz (la liste HTML voisine porte l'accès clavier).
import { SECTIONS, ORDER } from '~/data/sections'

const props = defineProps({
  done: { type: Array, default: () => [] },  // ids des quiz terminés
  next: { type: String, default: null },     // quiz conseillé
  labels: { type: Boolean, default: true },
})
const emit = defineEmits(['open'])

const INK = '#1f2832'
const OFF = '#dfe7ed'
const on = id => props.done.includes(id)
const fill = id => (on(id) ? SECTIONS[id].color : OFF)
const count = computed(() => ORDER.filter(on).length)

// Étiquettes en pastille : centre x, y du haut
const LABELS = [
  { id: 'debutant', x: 170, y: 276 },
  { id: 'intermediaire', x: 470, y: 276 },
  { id: 'expert', x: 770, y: 276 },
]
const pill = l => {
  const text = SECTIONS[l.id].short
  const w = 58 + text.length * 10.2
  return { ...l, text, w, n: ORDER.indexOf(l.id) + 1 }
}
const pills = computed(() => LABELS.map(pill))
</script>

<template>
  <svg
    class="ccgt"
    viewBox="0 0 1000 320"
    role="img"
    :aria-label="`Schéma du cycle combiné : ${count} partie${count > 1 ? 's' : ''} sur 3 sous tension.`"
  >
    <!-- sol -->
    <line x1="0" y1="262" x2="1000" y2="262" stroke="#b9cddb" stroke-width="3" stroke-linecap="round" />

    <!-- 1. Turbine à gaz : air, compresseur, chambre de combustion, turbine -->
    <g class="sec" :class="{ on: on('debutant'), next: next === 'debutant' }" @click="emit('open', 'debutant')">
      <title>Quiz débutant : turbine à gaz</title>
      <path d="M8 200H48" class="pipe air" :class="{ flow: on('debutant') }" />
      <path d="M36 190l12 10-12 10" fill="none" :stroke="on('debutant') ? '#7fb3d9' : '#b9cddb'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M165 66V122" class="pipe gas" :class="{ flow: on('debutant') }" :stroke="on('debutant') ? SECTIONS.debutant.color : '#c3cfd8'" />
      <line x1="40" y1="200" x2="300" y2="200" :stroke="INK" stroke-width="6" stroke-linecap="round" />
      <path d="M52 158L140 178V222L52 242Z" :fill="fill('debutant')" :stroke="INK" stroke-width="3" stroke-linejoin="round" />
      <rect x="142" y="118" width="46" height="62" rx="12" :fill="fill('debutant')" :stroke="INK" stroke-width="3" />
      <path v-if="on('debutant')" class="flame" d="M165 166c-8 0-12-6-12-12 0-7 6-10 7-17 4 4 5 7 5 10 2-2 3-5 3-8 5 4 9 9 9 15 0 7-5 12-12 12z" fill="#f5c242" :stroke="INK" stroke-width="2" stroke-linejoin="round" />
      <path d="M188 178L292 152V248L188 222Z" :fill="fill('debutant')" :stroke="INK" stroke-width="3" stroke-linejoin="round" />
      <path d="M78 170v60 M100 175v50 M120 180v40 M210 176v48 M235 170v60 M262 163v74" stroke="#ffffff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- 2. Chaudière de récupération : gaine, faisceaux, cheminée -->
    <g class="sec" :class="{ on: on('intermediaire'), next: next === 'intermediaire' }" @click="emit('open', 'intermediaire')">
      <title>Quiz intermédiaire : chaudière de récupération</title>
      <path d="M292 152L340 112V250L292 248Z" :fill="fill('intermediaire')" :stroke="INK" stroke-width="3" stroke-linejoin="round" />
      <rect x="340" y="92" width="160" height="160" rx="10" :fill="fill('intermediaire')" :stroke="INK" stroke-width="3" />
      <path d="M372 108v128 M404 108v128 M436 108v128 M468 108v128" stroke="#ffffff" stroke-opacity=".7" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round" />
      <rect x="456" y="24" width="30" height="68" rx="4" :fill="fill('intermediaire')" :stroke="INK" stroke-width="3" />
      <g v-if="on('intermediaire')" class="smoke" fill="#ffffff" :stroke="INK" stroke-width="2">
        <circle cx="471" cy="14" r="7" />
        <circle cx="484" cy="6" r="5" />
      </g>
    </g>

    <!-- 4. Cycle eau-vapeur : vapeur vers la turbine, aérocondenseur, retour des condensats -->
    <g class="sec" :class="{ on: on('intermediaire'), next: next === 'intermediaire' }" @click="emit('open', 'intermediaire')">
      <title>Quiz intermédiaire : cycle eau-vapeur</title>
      <path d="M420 92V70H526V184H560" class="pipe steam" :class="{ flow: on('intermediaire') }" :stroke="on('intermediaire') ? '#3f80c4' : '#c3cfd8'" />
      <path d="M548 112H512V226H500" class="pipe water" :class="{ flow: on('intermediaire') }" :stroke="on('intermediaire') ? '#7fb3d9' : '#c3cfd8'" />
      <path d="M610 150V116" class="pipe steam" :class="{ flow: on('intermediaire') }" :stroke="on('intermediaire') ? '#3f80c4' : '#c3cfd8'" />
      <path d="M548 112L600 54L652 112Z" :fill="fill('intermediaire')" :stroke="INK" stroke-width="3" stroke-linejoin="round" />
      <circle cx="600" cy="84" r="13" fill="#ffffff" :stroke="INK" stroke-width="2.5" />
      <path class="fan" :class="{ spin: on('intermediaire') }" d="M600 74v20 M590 84h20" :stroke="INK" stroke-width="2.5" stroke-linecap="round" />
      <path d="M560 172L660 150V250L560 228Z" :fill="fill('intermediaire')" :stroke="INK" stroke-width="3" stroke-linejoin="round" />
      <path d="M585 170v60 M612 164v72 M638 158v84" stroke="#ffffff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- 3. Alternateur -->
    <g class="sec" :class="{ on: on('expert'), next: next === 'expert' }" @click="emit('open', 'expert')">
      <title>Quiz expert : alternateur</title>
      <line x1="660" y1="200" x2="684" y2="200" :stroke="INK" stroke-width="6" stroke-linecap="round" />
      <rect x="682" y="160" width="90" height="80" rx="16" :fill="fill('expert')" :stroke="INK" stroke-width="3" />
      <path d="M708 200c6-14 13-14 19 0s13 14 19 0" fill="none" :stroke="INK" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- 5. Mise sur le réseau : transformateur, pylône, ligne -->
    <g class="sec" :class="{ on: on('expert'), next: next === 'expert' }" @click="emit('open', 'expert')">
      <title>Quiz expert : mise sur le réseau</title>
      <path d="M772 200H800" class="pipe power" :class="{ flow: on('expert') }" :stroke="on('expert') ? '#f5c242' : '#c3cfd8'" />
      <circle cx="814" cy="200" r="16" :fill="fill('expert')" :stroke="INK" stroke-width="3" />
      <circle cx="836" cy="200" r="16" :fill="fill('expert')" fill-opacity=".85" :stroke="INK" stroke-width="3" />
      <path d="M852 200H868V84H890" class="pipe power" :class="{ flow: on('expert') }" :stroke="on('expert') ? '#f5c242' : '#c3cfd8'" />
      <path d="M890 262L906 70H926L942 262 M896 190h40 M900 140h32 M903 100h26 M896 190L932 140 M936 190L900 140 M900 140L929 100 M932 140L903 100 M878 84h76" fill="none" :stroke="on('expert') ? SECTIONS.expert.color : '#8fa3b3'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M954 84C970 96 984 98 1000 96" class="pipe power" :class="{ flow: on('expert') }" :stroke="on('expert') ? '#f5c242' : '#c3cfd8'" />
    </g>

    <!-- étiquettes en pastille -->
    <g v-if="labels" class="labels">
      <g v-for="l in pills" :key="l.id" class="pill sec" :class="{ on: on(l.id), next: next === l.id }" @click="emit('open', l.id)">
        <rect :x="l.x - l.w / 2" :y="l.y" :width="l.w" height="38" rx="19" fill="#ffffff" :stroke="next === l.id ? '#ed7f06' : INK" stroke-width="3" />
        <circle :cx="l.x - l.w / 2 + 19" :cy="l.y + 19" r="13" :fill="on(l.id) ? SECTIONS[l.id].color : '#ffffff'" :stroke="INK" stroke-width="2.5" />
        <path v-if="on(l.id)" :d="`M${l.x - l.w / 2 + 13} ${l.y + 19.5}l4 4 8-8.5`" fill="none" :stroke="INK" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <text v-else :x="l.x - l.w / 2 + 19" :y="l.y + 25" text-anchor="middle" class="n">{{ l.n }}</text>
        <text :x="l.x - l.w / 2 + 40" :y="l.y + 25.5" class="t">{{ l.text }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.ccgt { display: block; width: 100%; height: auto; overflow: visible; }
.sec { cursor: pointer; transition: transform .25s var(--ease-out), filter .25s; transform-box: fill-box; }
.sec:hover { filter: brightness(1.04) drop-shadow(0 4px 6px rgba(31, 40, 50, .18)); }
.pipe { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.pipe.air { stroke: #b9cddb; }
.sec.on .pipe.air { stroke: #7fb3d9; }
.pipe.flow { stroke-dasharray: 12 10; animation: flow 1.1s linear infinite; }
@keyframes flow { to { stroke-dashoffset: -44; } }
.flame { transform-origin: 165px 166px; animation: flicker 1.4s ease-in-out infinite; }
@keyframes flicker { 50% { transform: scale(.92, 1.06); } }
.smoke circle { animation: rise 3s ease-in-out infinite; }
.smoke circle + circle { animation-delay: .8s; }
@keyframes rise { 50% { transform: translateY(-4px); opacity: .7; } }
.fan.spin { transform-origin: 600px 84px; animation: spin 2.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pill .n { font-family: var(--font-display); font-weight: 800; font-size: 17px; fill: var(--ink); }
.pill .t { font-family: var(--font-display); font-weight: 700; font-size: 18px; fill: var(--ink); }
.pill.next rect { stroke-dasharray: 8 5; animation: flow 2.2s linear infinite; }
</style>
