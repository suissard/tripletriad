<template>
  <div class="player-layout relative w-full h-full">
    <!-- Le contenu de la page (le routeur) viendra ici -->
    <slot />

    <!-- Overlays spécifiques au joueur -->
    <TopNavbar />
    <RightDrawer />
  </div>
</template>

<script setup>
import TopNavbar from '../components/TopNavbar.vue';
import RightDrawer from '../components/RightDrawer.vue';
</script>

<style scoped>
.player-layout {
  z-index: 10;
}
</style>
