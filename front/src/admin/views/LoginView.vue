<template>
  <div class="min-h-screen flex items-center justify-center bg-[#050510] relative overflow-hidden font-sans">
    
    <!-- Ambient Background Glows -->
    <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 blur-[150px] rounded-full pointer-events-none"></div>

    <div class="glass-panel p-12 rounded-[48px] w-full max-w-md relative z-10 shadow-2xl border border-white/10">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-black text-white tracking-tighter uppercase italic">Terra <span class="text-primary italic">Nullius</span></h1>
        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2 pl-1">Administration Portal</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="setting-group">
          <label for="username">Identifiant</label>
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">👤</span>
            <input 
              v-model="username" 
              class="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-4 text-white font-medium focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
              id="username" 
              type="text" 
              placeholder="Admin Username" 
              required
            >
          </div>
        </div>

        <div class="setting-group">
          <label for="password">Mot de passe</label>
          <div class="relative group">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">🔒</span>
            <input 
              v-model="password" 
              class="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-4 text-white font-medium focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
              id="password" 
              type="password" 
              placeholder="••••••••••••" 
              required
            >
          </div>
          <transition name="fade">
            <p v-if="authStore.error" class="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-3 pl-1">
              ⚠️ {{ authStore.error }}
            </p>
          </transition>
        </div>

        <button 
          class="btn btn-primary w-full h-14 mt-4 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group" 
          type="submit"
          :disabled="loading"
        >
          <span v-if="loading" class="animate-spin">⏳</span>
          <span class="tracking-widest font-black uppercase italic">{{ loading ? 'AUTHENTICATING...' : 'SECURE SIGN IN' }}</span>
        </button>
      </form>
      
      <div class="mt-10 text-center">
        <p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Restricted Access • Terra Nullius OS v1.0</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const loading = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  loading.value = true;
  const success = await authStore.login(username.value, password.value);
  loading.value = false;
  if (success) {
    router.push('/');
  }
};
</script>

<style scoped>
.setting-group {
  @apply flex flex-col gap-2;
}

.setting-group label {
  @apply text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
