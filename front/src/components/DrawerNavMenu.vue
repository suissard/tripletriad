<template>
  <div class="drawer-nav-menu">
    <AdminSidebar v-if="isAdmin" />
    <MainMenu v-else />
  </div>
</template>

<script setup>
import MainMenu from '../views/MainMenu.vue';
import AdminSidebar from '../admin/components/AdminSidebar.vue';

defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.drawer-nav-menu {
  width: 100%;
  height: 100%;
}
</style>
