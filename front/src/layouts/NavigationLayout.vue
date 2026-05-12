<template>
  <div class="navigation-layout flex flex-col w-[100vw] h-screen overflow-hidden">
    <!-- Top Bar (Fixed) -->
    <header class="navigation-header fixed top-0 left-0 w-[100vw] h-16 z-[100]">
      <div class="header-bg-panel w-[100vw] h-full">
        <div class="edgeGlow"></div>
        <div class="mirrorShade"></div>
      </div>
      
      <div class="header-content flex items-center justify-between w-[100vw] px-8 h-16 relative z-20">
        <!-- Left Section -->
        <div class="flex items-center gap-4">
          <AppButton 
            variant="secondary" 
            class="glass-panel w-10 h-10 flex items-center justify-center !p-0"
            @click="handleBack"
          >
            <span class="text-xl">←</span>
          </AppButton>
          <AppButton 
            variant="secondary" 
            class="glass-panel w-10 h-10 flex items-center justify-center !p-0"
            @click="router.push('/')"
          >
            <span class="text-xl">🏠</span>
          </AppButton>
        </div>

        <!-- Middle Section -->
        <div class="flex justify-center">
          <div class="game-title text-3xl font-black italic tracking-[0.4em] uppercase text-[#00d2ff]">
            Terra Nullius
          </div>
        </div>

        <!-- Right Section -->
        <div class="flex items-center justify-end">
          <AppButton 
            variant="secondary" 
            class="glass-panel h-10 px-4 flex items-center gap-3"
            @click="router.push(`/profile/${userStore.user?.documentId || userStore.user?.id}`)"
          >
            <span class="text-sm font-bold uppercase hidden md:inline">{{ userStore.user?.username }}</span>
            <img :src="userStore.user?.avatar" class="w-8 h-8 rounded-full border border-[#00d2ff]/50" alt="Avatar" />
          </AppButton>
        </div>
      </div>
    </header>

    <!-- Main Content (with top padding for fixed header) -->
    <main class="flex-1 w-full pt-16 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
      <slot />
    </main>

    <!-- Footer Chat -->
    <ChatWidget />
    
    <!-- Overlays -->
    <RightDrawer />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import AppButton from '../components/ui/AppButton.vue';
import ChatWidget from '../components/ChatWidget.vue';
import RightDrawer from '../components/RightDrawer.vue';

const router = useRouter();
const userStore = useUserStore();

const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
.navigation-layout {
  background: #05050a;
  position: relative;
  width: 100vw;
  height: 100vh;
}

.navigation-header {
  background: transparent;
}

.header-bg-panel {
  position: absolute;
  inset: 0;
  width: 100vw;
  background: linear-gradient(to right, rgba(15, 15, 26, 0.98), rgba(20, 20, 35, 1), rgba(15, 15, 26, 0.98));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 2px solid rgba(0, 210, 255, 0.3);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.8);
}

.edgeGlow {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 210, 255, 0.5), transparent);
  box-shadow: 0 0 10px #00d2ff;
}

.mirrorShade {
  position: absolute;
  inset: 0;
  width: 100vw;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
  pointer-events: none;
}

.game-title {
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
  font-family: var(--font-heading);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
