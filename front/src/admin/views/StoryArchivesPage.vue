<template>
  <div class="min-h-full pb-10">
    <div class="mb-10">
      <h1 class="text-4xl font-extrabold text-white tracking-tight mb-2">🗺️ Archives & Diagrammes</h1>
      <p class="text-gray-400 text-sm">Visualiser les embranchements narratifs de chaque histoire.</p>
    </div>

    <div v-if="stories.length === 0" class="glass-panel p-8 rounded-[32px] text-center">
      <p class="text-gray-400">Aucune histoire trouvée.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="story in sortedStories"
        :key="story.folder"
        class="glass-panel rounded-[32px] overflow-hidden group relative"
      >
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 transition-colors group-hover:from-blue-500/10 group-hover:to-purple-500/10"></div>

        <div class="relative p-8">
          <div class="flex items-start justify-between mb-4">
            <span class="text-5xl font-black text-white/5">{{ story.num }}</span>
            <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              {{ story.situations }} situations
            </span>
          </div>

          <h3 class="text-xl font-bold text-white tracking-tight mb-2">{{ story.title }}</h3>
          <p class="text-gray-400 text-sm mb-1">{{ story.description }}</p>
          <p v-if="story.factionFocus" class="text-gray-500 text-xs mb-6">{{ story.factionFocus }}</p>
          <div v-else class="mb-6"></div>

          <div v-if="story.factions && story.factions.length" class="flex flex-wrap gap-2 mb-6">
            <span v-for="f in story.factions" :key="f" class="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] font-medium">{{ f }}</span>
          </div>

          <div class="flex flex-col gap-3">
            <router-link
              :to="`/admin/story-diagram/${story.folder}`"
              class="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] bg-blue-500/20 text-blue-400 font-bold text-sm hover:bg-blue-500/30 transition-colors cursor-pointer"
            >
              🗺️ Voir le Diagramme
            </router-link>
            <router-link
              :to="`/story/${story.folder}`"
              class="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] bg-white/5 text-gray-400 font-bold text-sm hover:bg-white/10 transition-colors cursor-pointer"
            >
              📖 Jouer l'histoire
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const modules = import.meta.glob('../../../shared/data/stories/*/manifest.json', { eager: true })

const stories = ref([])

Object.entries(modules).forEach(([path, mod]) => {
  const manifest = mod.default
  if (!manifest) return
  // Extract folder name: e.g., "../../../shared/data/stories/07-la-reponse-des-ferrailleurs/manifest.json"
  const parts = path.split('/')
  const folder = parts[parts.length - 2]
  const num = manifest.title?.match(/^\d+/)?.[0] || '??'

  stories.value.push({
    folder,
    num,
    title: manifest.title || folder,
    description: manifest.description || '',
    factionFocus: manifest.faction_focus || '',
    factions: manifest.factions_involved || [],
    situations: manifest.situations?.length || 0
  })
})

const sortedStories = computed(() => [...stories.value].sort((a, b) => {
  const na = parseInt(a.num) || 999
  const nb = parseInt(b.num) || 999
  if (na !== nb) return na - nb
  return a.folder.localeCompare(b.folder)
}))
</script>

<style scoped>
</style>