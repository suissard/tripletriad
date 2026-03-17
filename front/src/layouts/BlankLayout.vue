<template>
  <div class="blank-layout w-full h-full bg-transparent">
    <slot />
  </div>
</template>

<script setup>
</script>

<style scoped>
.blank-layout {
  position: relative;
  z-index: 10;
}
</style>
