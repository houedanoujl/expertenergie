<script setup>
const { load } = useQuiz()
onMounted(load)
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <RewardToast />
</template>
