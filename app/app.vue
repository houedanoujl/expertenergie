<script setup>
const { load } = useQuiz()
const { kiosk } = useKiosk()
useHead({ htmlAttrs: { class: kiosk ? 'kiosk' : undefined } })
onMounted(() => {
  load()
  // borne : pas de menu contextuel à l'appui long
  if (kiosk) window.addEventListener('contextmenu', e => e.preventDefault())
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <RewardToast />
  <ClientOnly v-if="kiosk">
    <KioskIdle />
    <KioskAdmin />
  </ClientOnly>
</template>
