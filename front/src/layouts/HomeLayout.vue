<template>
  <div class="home-layout w-full h-screen overflow-hidden flex flex-col relative">
    <main class="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      <slot />
    </main>
    
    <!-- Footer Chat -->
    <ChatWidget />
    
    <!-- Overlays -->
    <RightDrawer />
  </div>
</template>

<script setup>
import ChatWidget from '../components/ChatWidget.vue';
import RightDrawer from '../components/RightDrawer.vue';
</script>

<style scoped>
.home-layout {
  background: var(--bg-deep);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}
</style>
