<template>
  <div class="page-layout">
    <div class="page-header">
      <button class="back-btn" @click="goBack">← Retour</button>
      <h2 class="page-title">{{ title }}</h2>
      <div class="header-actions">
        <slot name="header-actions"></slot>
      </div>
    </div>
    <div class="page-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  backRoute: {
    type: String,
    default: '/'
  }
});

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push(props.backRoute);
  }
};
</script>

<style scoped>
.page-layout {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 15, 30, 0.98);
  backdrop-filter: blur(10px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  color: white;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: linear-gradient(to right, #1a233a, #0d1222);
  border-bottom: 1px solid #334;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  height: 70px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  font-family: 'Arial', sans-serif;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.page-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  text-align: center;
  flex-grow: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.header-actions {
  display: flex;
  gap: 10px;
  min-width: 100px;
  justify-content: flex-end;
}

.page-content {
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
}
</style>
