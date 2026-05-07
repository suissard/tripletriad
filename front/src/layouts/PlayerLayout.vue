<template>
  <div class="player-layout flex flex-col w-full h-screen overflow-hidden">
    <!-- Navbar Desktop -->
    <TopNavbar class="hidden md:flex flex-shrink-0" />

    <!-- Content Area -->
    <div class="flex-1 w-full overflow-hidden flex flex-col md:pt-20">
      <main class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <BottomMobileNav class="md:hidden flex-shrink-0" />
    
    <!-- Overlays -->
    <RightDrawer />
  </div>
</template>

<script setup>
import TopNavbar from '../components/TopNavbar.vue';
import RightDrawer from '../components/RightDrawer.vue';
import BottomMobileNav from '../components/BottomMobileNav.vue';
</script>

<style scoped>
.player-layout {
  background: var(--bg-deep);
  position: relative;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* On mobile, we might need extra padding at the bottom for the safe area */
@media (max-width: 767px) {
  .player-layout {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

/* Ensure background of pages can extend under transparent navbar if needed */
main :deep(> *) {
  min-height: 100%;
}
</style>
