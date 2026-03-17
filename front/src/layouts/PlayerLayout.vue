<template>
  <div class="player-layout relative w-full h-full pb-20 md:pb-0">
    <!-- Le contenu de la page (le routeur) viendra ici -->
    <slot />

    <!-- Overlays spécifiques au joueur -->
    <TopNavbar class="hidden md:flex" />
    <RightDrawer />

    <!-- Mobile Bottom Navigation -->
    <BottomMobileNav class="md:hidden" />
  </div>
</template>

<script setup>
import TopNavbar from '../components/TopNavbar.vue';
import RightDrawer from '../components/RightDrawer.vue';
import BottomMobileNav from '../components/BottomMobileNav.vue';
</script>

<style scoped>
.player-layout {
  z-index: 10;
  overflow-x: hidden;
  /* Add padding bottom equal to nav height + env safe area on mobile devices to prevent content from hiding under nav */
  @media (max-width: 768px) {
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 10px));
  }
}
</style>
