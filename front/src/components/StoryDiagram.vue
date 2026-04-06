<template>
  <div class="story-diagram-container" ref="containerRef">
    <!-- Toolbar -->
    <div class="diagram-toolbar">
      <button class="toolbar-btn" @click="router.push('/admin/stories')" title="Retour">⬅</button>
      <span class="story-title">{{ title }}</span>
      <div class="toolbar-controls">
        <button class="toolbar-btn" @click="zoomIn" title="Zoom +">🔍+</button>
        <button class="toolbar-btn" @click="zoomOut" title="Zoom −">🔍−</button>
        <button class="toolbar-btn" @click="resetView" title="Recentrer">⟲</button>
        <button class="toolbar-btn" :class="{ active: fitToScreen }" @click="toggleFit" title="Ajuster à l'écran">📏</button>
      </div>
    </div>

    <!-- SVG Graph -->
    <div class="svg-wrapper" ref="svgWrapperRef">
      <svg ref="svgRef" :width="svgW" :height="svgH" @wheel.prevent="handleWheel" @mousedown.prevent="startPan" @mousemove="onPan" @mouseup="endPan" @mouseleave="endPan">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#555" /></marker>
        </defs>
        <g :transform="`translate(${panX},${panY}) scale(${zoom})`">
          <!-- Edges -->
          <g v-for="e in edges" :key="e.id">
            <path :d="e.path" :stroke="e.color" :stroke-width="e.strokeWidth" fill="none" stroke-linecap="round" :stroke-dasharray="e.dashed ? '6 4' : 'none'" />
            <!-- Arrow -->
            <circle :cx="e.endX" :cy="e.endY" r="3" :fill="e.color" />
            <!-- Edge label -->
            <text v-if="e.label" :x="e.labelX" :y="e.labelY" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#888" font-style="italic" :transform="`rotate(${e.labelAngle || 0}, ${e.labelX}, ${e.labelY})`">{{ e.label }}</text>
          </g>

          <!-- Nodes -->
          <g v-for="n in nodes" :key="n.id" class="node-group" @click="selectNode(n)">
            <rect :x="n.x - n.w/2" :y="n.y - n.h/2" :width="n.w" :height="n.h" :rx="10" :fill="n.color" :stroke="selectedNode?.id === n.id ? '#fff' : 'rgba(255,255,255,0.15)'" :stroke-width="selectedNode?.id === n.id ? 2 : 0.7" />
            <!-- Type badge -->
            <rect :x="n.x - n.w/2 + 4" :y="n.y - n.h/2 - 6" width="30" height="14" rx="4" :fill="n.badgeColor" />
            <text :x="n.x - n.w/2 + 19" :y="n.y - n.h/2 + 1" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#fff" font-weight="700">{{ n.badge }}</text>
            <!-- Title -->
            <text :x="n.x" :y="n.y - 3" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#fff" font-weight="600">{{ n.label }}</text>
            <!-- Sub -->
            <text v-if="n.sub" :x="n.x" :y="n.y + 11" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="rgba(255,255,255,0.5)">{{ n.sub }}</text>
          </g>
        </g>
      </svg>
    </div>

    <!-- Detail Panel -->
    <transition name="slide-fade">
      <div v-if="selectedNode" class="detail-panel">
      <div>
        <h4>{{ selectedNode.label }}</h4>
        <button @click="selectedNode = null" class="close-btn">✕</button>
      </div>
      <div class="detail-body">
        <div class="detail-row"><span class="detail-k">Type</span><span class="detail-v">{{ selectedNode.typeName }}</span></div>
        <div class="detail-row"><span class="detail-k">ID</span><span class="detail-v">{{ selectedNode.id }}</span></div>
        <div v-if="selectedNode.file" class="detail-row"><span class="detail-k">Fichier</span><span class="detail-v">{{ selectedNode.file }}</span></div>
        <div v-if="selectedNode.next?.length" class="detail-row"><span class="detail-k">Suite</span><span class="detail-v">{{ selectedNode.next.join(', ') }}</span></div>
        <div v-if="selectedNode.choices?.length" class="detail-row"><span class="detail-k">Choix</span><span class="detail-v">{{ selectedNode.choices.map(c => c.text || c.next).join(' / ') }}</span></div>
      </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NODE_TYPES } from '../config/story-nodes.js'

const STORY_MODULES = import.meta.glob('../../../shared/data/stories/*/manifest.json', { eager: true })

const props = defineProps({ storyFolder: String })
const router = useRouter()

const title = ref('Chargement...')
const loading = ref(true)
const svgRef = ref(null)
const containerRef = ref(null)
const svgWrapperRef = ref(null)
const svgW = ref(2000)
const svgH = ref(1600)

// Pan & zoom
const zoom = ref(1)
const panX = ref(50)
const panY = ref(60)
const fitToScreen = ref(false)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

const nodes = ref([])
const edges = ref([])
const selectedNode = ref(null)

const selectNode = (n) => selectedNode.value = n

const zoomIn = () => zoom.value = Math.min(zoom.value + 0.15, 4)
const zoomOut = () => zoom.value = Math.max(zoom.value - 0.15, 0.2)
const resetView = () => { zoom.value = 1; panX.value = 50; panY.value = 60 }
const toggleFit = () => {
  fitToScreen.value = !fitToScreen.value
  if (fitToScreen.value) doFit()
}
const handleWheel = (e) => zoom.value = e.deltaY < 0 ? Math.min(zoom.value + 0.06, 4) : Math.max(zoom.value - 0.06, 0.2)
const startPan = (e) => { isPanning.value = true; panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value } }
const onPan = (e) => { if (isPanning.value) { panX.value = e.clientX - panStart.value.x; panY.value = e.clientY - panStart.value.y } }
const endPan = () => isPanning.value = false

const doFit = () => {
  if (!nodes.value.length) return
  const xs = nodes.value.map(n => n.x)
  const ys = nodes.value.map(n => n.y)
  const minX = Math.min(...xs) - 100
  const maxX = Math.max(...xs) + 100
  const minY = Math.min(...ys) - 60
  const maxY = Math.max(...ys) + 60
  const w = maxX - minX
  const h = maxY - minY
  const sw = svgWrapperRef.value?.clientWidth || 800
  const sh = svgWrapperRef.value?.clientHeight || 600
  zoom.value = Math.min(sw / w, sh / h, 1.5)
  panX.value = sw / 2 - (minX + w / 2) * zoom.value
  panY.value = sh / 2 - (minY + h / 2) * zoom.value
}

function loadStory() {
  loading.value = true
  try {
    // Find matching manifest from pre-loaded modules
    let m = null
    for (const [path, mod] of Object.entries(STORY_MODULES)) {
      if (path.includes(props.storyFolder)) {
        m = mod.default
        break
      }
    }
    if (!m) throw new Error(`Manifest not found for ${props.storyFolder}`)
    title.value = m.title || props.storyFolder

    const situations = m.situations || []
    const graph = {}
    const childrenOf = {}
    situations.forEach(s => {
      graph[s.situationId] = s
      childrenOf[s.situationId] = []
    })

    situations.forEach(s => {
      let targets = []
      if (s.type === 'situation-choice') targets = s.options?.map(o => o.nextSituationId) || []
      else if (s.type === 'situation-battle') targets = [s.onWinSituationId, s.onLoseSituationId]
      else if (s.nextSituationId) targets = [s.nextSituationId]
      targets.forEach(t => {
        if (t && childrenOf[s.situationId]) childrenOf[s.situationId].push(t)
      })
    })

    // Assign levels via BFS
    const entry = situations.find(s => s.file === m.entry_point)
    const nodeLevel = {}
    const queue = [{ id: entry?.situationId || 's0', level: 0 }]
    const visited = new Set()
    while (queue.length) {
      const { id, level } = queue.shift()
      if (visited.has(id)) continue
      visited.add(id)
      nodeLevel[id] = level
      (childrenOf[id] || []).forEach(c => {
        if (!visited.has(c)) queue.push({ id: c, level: level + 1 })
      })
    }

    // Handle orphan nodes
    situations.forEach(s => {
      if (!(s.situationId in nodeLevel)) nodeLevel[s.situationId] = 99
    })

    // Group
    const grouped = {}
    for (const [id, lv] of Object.entries(nodeLevel)) {
      if (!grouped[lv]) grouped[lv] = []
      grouped[lv].push(id)
    }

    // Layout
    const N_H = 50
    const N_W = 180
    const LV_GAP = 160
    const N_GAP = 20
    const positions = {}
    Object.keys(grouped).sort((a, b) => a - b).forEach(lv => {
      const items = grouped[lv]
      const totalW = items.length * (N_W + N_GAP) - N_GAP
      items.forEach((id, i) => {
        const y = 50 + parseInt(lv) * (N_H + LV_GAP)
        const x = 80 + i * (N_W + N_GAP) + N_W / 2
        positions[id] = { x, y }
      })
    })

    // Update svg size
    const maxLv = Object.keys(grouped).length
    const maxItemsPerLv = Math.max(...Object.values(grouped).map(g => g.length))
    svgH.value = 60 + maxLv * (N_H + LV_GAP) + 100
    svgW.value = Math.max(2000, maxItemsPerLv * (N_W + N_GAP) + 200)

    nodes.value = Object.entries(nodeLevel).map(([id, lv]) => {
      const sit = graph[id] || {}
      const typeInfo = NODE_TYPES[sit.type] || { label: sit.type || 'Unknown', color: '#444', edgeColor: '#555' }
      const pos = positions[id] || { x: 100, y: 100 }
      const badge = typeInfo.label?.substring(0, 4).toUpperCase() || '???'
      return {
        id,
        x: pos.x,
        y: pos.y,
        w: N_W,
        h: N_H,
        color: typeInfo.color,
        badgeColor: 'rgba(255,255,255,0.1)',
        badge,
        typeName: typeInfo.label || sit.type,
        label: sit.type?.replace('situation-', '') || id,
        sub: id,
        file: sit.file || '',
        next: childrenOf[id] || [],
        choices: sit.options || [],
        situation: sit
      }
    })

    edges.value = situations.flatMap(sit => {
      let targets = []
      if (sit.type === 'situation-choice') targets = sit.options?.map(o => ({ t: o.nextSituationId, label: o.text?.substring(0, 25) || '' })) || []
      else if (sit.type === 'situation-battle') targets = [
        { t: sit.onWinSituationId, label: '✅ Win' },
        { t: sit.onLoseSituationId, label: '❌ Lose' }
      ]
      else if (sit.nextSituationId) targets = [{ t: sit.nextSituationId, label: '' }]
      return targets.map(({ t, label }) => {
        const sp = positions[sit.situationId]
        const tp = positions[t]
        if (!sp || !tp) return null
        const typeInfo = NODE_TYPES[sit.type] || { edgeColor: '#555' }
        const dy = tp.y - sp.y
        const midY = sp.y + dy / 2
        const curvature = Math.abs(dy) > 100 ? 25 : 10
        const dx = tp.x - sp.x
        const cp1x = sp.x + dx * 0.3
        const cp2x = tp.x - dx * 0.3
        const path = `M${sp.x},${sp.y + N_H / 2} C${cp1x},${midY} ${cp2x},${midY} ${tp.x},${tp.y - N_H / 2}`
        const edgeEndX = tp.x
        const edgeEndY = tp.y - N_H / 2
        return {
          id: `${sit.situationId}-${t}`,
          path,
          color: typeInfo.edgeColor || '#555',
          strokeWidth: 1.8 / zoom.value,
          dashed: sit.type === 'situation-battle' && label.includes('Lose'),
          endX: edgeEndX,
          endY: edgeEndY,
          label: label || undefined,
          labelX: (sp.x + tp.x) / 2,
          labelY: midY,
          labelAngle: Math.abs(dx) > 50 ? 20 : 0
        }
      }).filter(Boolean)
    })

  } catch (e) {
    title.value = 'Erreur'
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStory()
  setTimeout(() => doFit(), 200)
})
watch(() => props.storyFolder, () => loadStory())
</script>

<style scoped>
.story-diagram-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0b0d12;
  overflow: hidden;
}

.diagram-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #0f1117;
  border-bottom: 1px solid #1e2028;
  flex-shrink: 0;
}

.story-title {
  color: #e8e0d4;
  font-weight: 700;
  font-size: 14px;
  margin: 0 8px;
}

.toolbar-controls { display: flex; gap: 4px; margin-left: auto; }

.toolbar-btn {
  background: #1a1d25;
  color: #aaa;
  border: 1px solid #2a2d37;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.toolbar-btn:hover { background: #252830; color: #fff; }
.toolbar-btn.active { background: #2a4a6a; color: #7ab8f4; border-color: #4a8ac4; }

.svg-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.svg-wrapper svg {
  display: block;
  cursor: grab;
}
.svg-wrapper svg:active { cursor: grabbing; }

.node-group { cursor: pointer; }
.node-group:hover rect:first-child { stroke: rgba(255,255,255,0.5) !important; stroke-width: 1.5 !important; }

.detail-panel {
  position: absolute;
  top: 56px;
  right: 12px;
  background: #16191f;
  border: 1px solid #2a2d37;
  border-radius: 12px;
  padding: 14px;
  min-width: 230px;
  color: #ccc;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  z-index: 10;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.detail-header h4 { margin: 0; font-size: 14px; color: #e8e0d4; }

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  padding: 2px;
}
.close-btn:hover { color: #fff; }

.detail-body { display: flex; flex-direction: column; gap: 6px; }
.detail-row { display: flex; justify-content: space-between; font-size: 11px; }
.detail-k { color: #666; font-weight: 600; }
.detail-v { color: #aaa; text-align: right; word-break: break-all; max-width: 140px; }

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.25s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>