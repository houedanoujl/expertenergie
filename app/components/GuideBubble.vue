<script setup lang="ts">
// Personnage guide + bulle de dialogue.
// `side` = côté où se tient le personnage ; la bulle se place de l'autre côté,
// sa pointe tournée vers lui. Sous 380 px de large (conteneur), la bulle passe sous le personnage.

type Variant = 'femme' | 'homme'
type Pose = 'idle' | 'walk' | 'wave' | 'cheer' | 'point' | 'think'

const props = withDefaults(defineProps<{
  text: string
  variant?: Variant
  pose?: Pose
  side?: 'left' | 'right'
  /** Hauteur du personnage en px */
  size?: number
}>(), {
  variant: 'femme',
  pose: 'wave',
  side: 'left',
  size: 120,
})

// Nunito est chargée pour tout le site (nuxt.config.ts).

// Pointe alignée sur la bouche du personnage (~29 % de sa hauteur).
const bubbleOffset = computed(() => `${Math.max(0, Math.round(props.size * 0.29 - 30))}px`)
</script>

<template>
  <div class="guide-wrap">
  <div class="guide" :class="`side-${side}`">
    <CiprelTechnician
      class="guide-char"
      :variant="variant"
      :pose="pose"
      :size="size"
      :flip="side === 'right'"
    />
    <div class="bubble" aria-live="polite" :style="{ '--offset': bubbleOffset }">
      <span class="tail" aria-hidden="true" />
      <p class="bubble-text">{{ text }}</p>
    </div>
  </div>
  </div>
</template>

<style scoped>
.guide-wrap {
  container-type: inline-size;
  width: 100%;
}
.guide > * { box-sizing: border-box; }

.guide {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}
.side-right { flex-direction: row-reverse; justify-content: flex-start; }

.bubble {
  position: relative;
  flex: 0 1 280px;
  max-width: 280px;
  min-width: 0;
  margin-top: var(--offset);
  padding: 12px 16px;
  background: #fff;
  border: 3px solid #1f2832;
  border-radius: 18px;
  color: #1f2832;
}
.bubble-text {
  margin: 0;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  overflow-wrap: break-word;
}

/* Pointe : carré pivoté, deux bordures visibles */
.tail {
  position: absolute;
  top: 22px;
  width: 16px;
  height: 16px;
  background: #fff;
  border: 0 solid #1f2832;
}
.side-left .tail {
  left: -10.5px;
  border-left-width: 3px;
  border-bottom-width: 3px;
  transform: rotate(45deg);
}
.side-right .tail {
  right: -10.5px;
  border-top-width: 3px;
  border-right-width: 3px;
  transform: rotate(45deg);
}

/* Conteneur étroit : bulle sous le personnage, pointe vers le haut */
@container (max-width: 379px) {
  .guide, .side-right {
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .bubble {
    flex: none;
    width: 100%;
    margin-top: 0;
  }
  .side-left .tail,
  .side-right .tail {
    top: -10.5px;
    left: calc(50% - 8px);
    right: auto;
    border-width: 3px 0 0 3px;
    transform: rotate(45deg);
  }
}
</style>
