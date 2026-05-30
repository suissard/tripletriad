<template>
  <AppModal
    :modelValue="state.authModalOpen"
    @update:modelValue="state.authModalOpen = $event"
    :title="isRegistering ? 'Créer un Compte' : 'Connexion'"
    max-width="md"
  >
    <div class="auth-modal-content">
      <!-- Ambient decorative glow behind the form -->
      <div class="glow-bg"></div>

      <!-- Mode Selector Tabs -->
      <div class="auth-tabs mb-6">
        <button 
          class="auth-tab-btn" 
          :class="{ active: !isRegistering }"
          @click="setRegistering(false)"
        >
          Connexion
        </button>
        <button 
          class="auth-tab-btn" 
          :class="{ active: isRegistering }"
          @click="setRegistering(true)"
        >
          Créer un compte
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="auth-form-body">
        
        <!-- Username (Register only) -->
        <div v-if="isRegistering" class="input-group">
          <label for="modal-username">Nom d'utilisateur</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input 
              id="modal-username"
              v-model="form.username" 
              type="text" 
              placeholder="Ex: Drake"
              required 
            />
          </div>
        </div>

        <!-- Email -->
        <div class="input-group">
          <label for="modal-email">Adresse Email</label>
          <div class="input-wrapper">
            <span class="input-icon">📧</span>
            <input 
              id="modal-email"
              v-model="form.email" 
              type="email" 
              placeholder="nom@exemple.com"
              required 
            />
          </div>
        </div>

        <!-- Password -->
        <div class="input-group">
          <label for="modal-password">Mot de Passe</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input 
              id="modal-password"
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••"
              required 
            />
            <button 
              type="button" 
              class="password-toggle"
              @click="showPassword = !showPassword"
              title="Afficher/Masquer le mot de passe"
            >
              {{ showPassword ? '👁️' : '🙈' }}
            </button>
          </div>
        </div>

        <!-- Confirm Password (Register only) -->
        <div v-if="isRegistering" class="input-group">
          <label for="modal-confirm-password">Confirmer le Mot de Passe</label>
          <div class="input-wrapper">
            <span class="input-icon">🛡️</span>
            <input 
              id="modal-confirm-password"
              v-model="form.confirmPassword" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••"
              required 
            />
          </div>
        </div>

        <!-- Error Messages -->
        <Transition name="fade">
          <div v-if="errorMsg" class="error-banner">
            <span class="err-icon">⚠️</span>
            <span class="err-text">{{ errorMsg }}</span>
          </div>
        </Transition>

        <!-- Submit Button -->
        <AppButton 
          type="submit"
          variant="primary" 
          class="w-full py-4 mt-4 shadow-lg shadow-primary/20 relative overflow-hidden" 
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <span class="spinner"></span>
            Traitement en cours...
          </span>
          <span v-else>
            {{ isRegistering ? 'Créer mon compte' : 'Se connecter' }}
          </span>
        </AppButton>
      </form>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { state } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import { useNotificationStore } from '../stores/notificationStore.js';
import AppButton from './ui/AppButton.vue';

const userStore = useUserStore();
const notificationStore = useNotificationStore();

const isRegistering = ref(false);
const isLoading = ref(false);
const showPassword = ref(false);
const errorMsg = ref('');

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// Clear errors when switching tabs
function setRegistering(value) {
  isRegistering.value = value;
  errorMsg.value = '';
}

// Reset form fields on modal toggle
watch(() => state.authModalOpen, (isOpen) => {
  if (isOpen) {
    form.username = '';
    form.email = '';
    form.password = '';
    form.confirmPassword = '';
    errorMsg.value = '';
    isLoading.value = false;
  }
});

async function handleSubmit() {
  isLoading.value = true;
  errorMsg.value = '';

  try {
    let result;
    if (isRegistering.value) {
      if (form.password !== form.confirmPassword) {
        errorMsg.value = "Les mots de passe ne correspondent pas.";
        isLoading.value = false;
        return;
      }
      result = await userStore.register({
        username: form.username,
        email: form.email,
        password: form.password
      });
    } else {
      result = await userStore.login(form.email, form.password);
    }

    if (result.error) {
      throw new Error(result.error.message || "Erreur d'authentification");
    }

    // Success! Close modal and notify
    state.authModalOpen = false;
    notificationStore.addNotification(
      'SYSTEM', 
      isRegistering.value ? 'Votre compte a été créé avec succès ! Bienvenue.' : 'Connexion réussie ! Ravi de vous revoir.', 
      'success'
    );
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.auth-modal-content {
  position: relative;
  width: 100%;
}

.glow-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb, 180, 130, 255), 0.15) 0%, transparent 70%);
  filter: blur(30px);
  pointer-events: none;
  z-index: 0;
}

.auth-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
  position: relative;
  z-index: 1;
}

.auth-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  font-family: var(--font-heading), sans-serif;
  text-transform: uppercase;
  font-size: 0.9rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.02);
}

.auth-tab-btn.active {
  background: var(--color-primary, #a855f7);
  color: var(--color-primary-text, #fff);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.auth-form-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  font-size: 1rem;
  opacity: 0.7;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  background: rgba(10, 10, 18, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 12px 12px 12px 40px;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary, #a855f7);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb, 168, 85, 247), 0.3);
  background: rgba(10, 10, 18, 0.8);
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.err-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.err-text {
  color: #f87171;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
