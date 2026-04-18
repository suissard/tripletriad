<template>
  <div class="weekly-quest-container" :class="{ 'is-small': small }">
    <div class="header">
      <div class="header-left">
        <h3 class="section-title">{{ small ? 'HEBDO' : 'QUÊTES HEBDOMADAIRES' }}</h3>
        <div class="expiration-badge">Expire le {{ expiresAt }}</div>
      </div>
      <div class="progress-text">{{ completedQuests }} {{ small ? 'accomplies' : 'Quêtes accomplies cette semaine' }}</div>
    </div>

    <div class="tiers-wrapper">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>

      <div class="tiers-row">
        <div
          v-for="tier in sortedTiers"
          :key="tier.id || tier.requiredCount"
          class="tier-node"
          :class="{
            'completed': completedQuests >= tier.requiredCount,
            'claimed': hasClaimed(tier.requiredCount),
            'claimable': canClaim(tier.requiredCount)
          }"
          :style="{ left: getTierPosition(tier.requiredCount) + '%' }"
        >
          <div class="tier-marker" @click="handleTierClick(tier)">
            <span class="marker-count">{{ tier.requiredCount }}</span>
            <div v-if="hasClaimed(tier.requiredCount)" class="claimed-check">✓</div>
            <div v-else-if="canClaim(tier.requiredCount)" class="claimable-pulse">!</div>
          </div>

          <div class="tier-rewards">
            <div v-if="tier.coins > 0" class="reward-item" title="Coins">
              <span class="icon">🪙</span>{{ tier.coins }}
            </div>
            <div v-if="tier.gems > 0" class="reward-item" title="Gems">
              <span class="icon">💎</span>{{ tier.gems }}
            </div>
            <div v-if="tier.cardRarity && tier.cardRarity !== 'None'" class="reward-item" title="Card">
              <span class="icon">🃏</span>{{ tier.cardRarity }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  weeklyConfig: Object,
  weeklyProgress: Object,
  small: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['claim']);

const tiers = computed(() => props.weeklyConfig?.tiers || []);
const sortedTiers = computed(() => [...tiers.value].sort((a, b) => a.requiredCount - b.requiredCount));
const completedQuests = computed(() => props.weeklyProgress?.completedCount || 0);
const claimedTiers = computed(() => props.weeklyProgress?.claimedTiers || []);
const expiresAt = computed(() => {
  const now = new Date();
  const day = now.getDay();
  const daysToSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysToSunday);
  return sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
});
const maxTierCount = computed(() => {
  if (sortedTiers.value.length === 0) return 1;
  return sortedTiers.value[sortedTiers.value.length - 1].requiredCount;
});

const progressPercentage = computed(() => {
  if (maxTierCount.value === 0) return 0;
  return Math.min(100, (completedQuests.value / maxTierCount.value) * 100);
});

function getTierPosition(requiredCount) {
  if (maxTierCount.value === 0) return 0;
  return (requiredCount / maxTierCount.value) * 100;
}

function hasClaimed(requiredCount) {
  return claimedTiers.value.includes(requiredCount);
}

function canClaim(requiredCount) {
  return completedQuests.value >= requiredCount && !hasClaimed(requiredCount);
}

function handleTierClick(tier) {
  if (canClaim(tier.requiredCount)) {
    emit('claim', tier.requiredCount);
  }
}
</script>

<style scoped>
.weekly-quest-container {
  background: rgba(20, 25, 40, 0.8);
  border: 1px solid rgba(0, 210, 255, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-title {
  color: #00d2ff;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
}
.expiration-badge {
  font-size: 0.75rem;
  color: #ff9d00;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 1px;
  margin-top: 4px;
}
.header-left {
  display: flex;
  flex-direction: column;
}

.progress-text {
  font-size: 1rem;
  color: #aaa;
}

.tiers-wrapper {
  position: relative;
  height: 80px;
  margin: 0 2rem;
}

.progress-bar-bg {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.progress-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #00d2ff, #3a7bd5);
  border-radius: 4px;
  transition: width 0.5s ease-out;
}

.tiers-row {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 100%;
}

.tier-node {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
}

.tier-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #2a2d3e;
  border: 2px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  font-weight: bold;
  color: #888;
}

.tier-node.completed .tier-marker {
  border-color: #00d2ff;
  color: #00d2ff;
}

.tier-node.claimed .tier-marker {
  background: #00d2ff;
  color: #000;
  border-color: #00d2ff;
}

.tier-node.claimable .tier-marker {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  transform: scale(1.1);
}

.claimed-check {
  position: absolute;
  font-size: 1rem;
}

.claimable-pulse {
  position: absolute;
  font-size: 1.2rem;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.5; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.1); }
}

.tier-rewards {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  color: #ccc;
  background: rgba(0,0,0,0.5);
  padding: 4px;
  border-radius: 4px;
  width: 100%;
  text-align: center;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* Small mode overrides */
.weekly-quest-container.is-small {
  padding: 0.8rem;
  margin-bottom: 1rem;
  background: rgba(20, 25, 40, 0.4);
}

.weekly-quest-container.is-small .header {
  margin-bottom: 1rem;
}

.weekly-quest-container.is-small .section-title {
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.weekly-quest-container.is-small .expiration-badge {
  font-size: 0.65rem;
}

.weekly-quest-container.is-small .progress-text {
  font-size: 0.8rem;
}

.weekly-quest-container.is-small .tiers-wrapper {
  height: 55px;
  margin: 0 1rem;
}

.weekly-quest-container.is-small .progress-bar-bg {
  top: 15px;
  height: 6px;
}

.weekly-quest-container.is-small .tiers-row {
  top: 8px;
}

.weekly-quest-container.is-small .tier-marker {
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
}

.weekly-quest-container.is-small .tier-rewards {
  margin-top: 5px;
  font-size: 0.65rem;
  padding: 2px;
  width: 50px;
}

.weekly-quest-container.is-small .tier-node {
  width: 50px;
}

.weekly-quest-container.is-small .claimable-pulse {
  font-size: 0.9rem;
}

.weekly-quest-container.is-small .claimed-check {
  font-size: 0.8rem;
}
</style>
