// Node types for story diagrams
export const NODE_TYPES = {
  'situation-dialogue':   { label: 'Dialogue',    color: '#2f6e3a', edgeColor: '#4a9f5a' },
  'situation-choice':     { label: 'Choix',        color: '#1a5c8a', edgeColor: '#4a9fd4' },
  'situation-battle':     { label: 'Combat',       color: '#8a5a1a', edgeColor: '#d4a04a' },
  'situation-success':    { label: 'Succès ✅',    color: '#1e8e5e', edgeColor: '#3ecb8e' },
  'situation-failure':    { label: 'Échec ❌',     color: '#8a2a2a', edgeColor: '#d44a4a' },
  'situation-game-over':  { label: 'Game Over 💀', color: '#551a1a', edgeColor: '#8a2a2a' },
}

export const NODE_COLORS = {
  dialogue: '#2f6e3a',
  choice:   '#1a5c8a',
  battle:   '#8a5a1a',
  success:  '#1e8e5e',
  failure:  '#8a2a2a',
  gameOver: '#551a1a'
}