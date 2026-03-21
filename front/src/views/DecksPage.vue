<template>
    <div class="decks-page ui-layer" >
        <div class="page-header">
            <AppButton variant="secondary"  class="glass-panel" @click="closeDecksPage">← RETOUR</AppButton>
            <h2 class="page-title">MES DECKS</h2>
            <div class="header-stats">{{ userStore.userDecks.length }} / 5 Decks</div>
        </div>

        <div class="page-content">
            <AppButton variant="secondary"  class="glass-panel w-full py-4 mb-8 text-lg flex items-center justify-center gap-4" @click="openNewDeck" :disabled="userStore.userDecks.length >= 5">
                <span class="new-deck-icon">+</span>
                <span>Créer un Nouveau Deck</span>
            </AppButton>

            <div class="decks-grid" v-if="userStore.userDecks.length > 0">
                <MiniDeck v-for="deck in userStore.userDecks" :key="deck.id" :deck="deck" class="deck-item" @click="openEditDeck(deck)">
                    <template #actions>
                        <AppButton variant="accent" class="action-btn delete-btn" title="Supprimer le deck" @click.stop="deleteDeck(deck)">
                            <span>🗑️</span>
                        </AppButton>
                    </template>
                </MiniDeck>
            </div>

            <div v-else class="empty-state">
                <div class="empty-icon">
                    <AnimatedCardBack type="recto" style="width: 120px; height: 120px; margin: 0 auto;" />
                </div>
                <h3>Aucun deck créé</h3>
                <p>Créez votre premier deck pour affronter vos adversaires !</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();


import { onMounted } from 'vue';
import { state, getCardById, confirmAction } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import AnimatedCardBack from '../components/AnimatedCardBack.vue';
import MiniDeck from '../components/MiniDeck.vue';

const userStore = useUserStore();

onMounted(() => {
    userStore.fetchUserDecks();
});

function closeDecksPage() {
    router.push('/');
}

function openNewDeck() {
    state.editingDeck.id = null;
    state.editingDeck.documentId = null;
    state.editingDeck.name = 'Nouveau Deck';
    state.editingDeck.cover = null;
    state.editingDeck.cards = [];
    state.editingDeck.cardBack = 'default';
    router.push({ name: 'deck-editor-new' });
}

function openEditDeck(deck) {
    state.editingDeck.id = deck.id;
    state.editingDeck.documentId = deck.documentId;
    state.editingDeck.name = deck.name;
    state.editingDeck.cover = deck.cover;
    state.editingDeck.cards = [...deck.cards];
    state.editingDeck.cardBack = deck.cardBack || 'default';
    router.push({ name: 'deck-editor-edit', params: { documentId: deck.documentId } });
}

async function deleteDeck(deck) {
    const confirmed = await confirmAction(
        'Supprimer le deck ?',
        `Voulez-vous vraiment supprimer "${deck.name}" ? Cette action est irréversible.`
    );
    if (confirmed) {
        await userStore.deleteDeck(deck.documentId);
    }
}
</script>

<style scoped>
.decks-page {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at 60% 30%, #1a1a2e 0%, #0d0d14 100%);
    z-index: 500;
    display: flex;
    flex-direction: column;
    color: white;
    pointer-events: auto;
    overflow: hidden;
}

.page-header {
    height: 80px;
    background: rgba(0, 0, 0, 0.6);
    border-bottom: 2px solid #ff0055;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    box-shadow: 0 4px 20px rgba(255, 0, 85, 0.2);
    flex-shrink: 0;
}

.page-title {
    margin: 0;
    font-size: 2rem;
    letter-spacing: 4px;
    text-shadow: 0 0 15px #ff0055;
}

.header-stats {
    font-size: 1.2rem;
    font-weight: bold;
    color: #a0a0ff;
}

.page-content {
    flex: 1;
    padding: 30px 40px;
    overflow-y: auto;
}

.new-deck-icon {
    font-size: 1.5rem;
    font-weight: bold;
    margin-right: 8px;
}

/* Decks Grid */
.decks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 30px;
}

.action-btn {
    width: 54px !important;
    height: 54px !important;
    min-width: 54px !important;
    padding: 0 !important;
    border-radius: 14px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 1.5rem !important;
    backdrop-filter: blur(8px) !important;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

.edit-btn {
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    background: rgba(255, 255, 255, 0.1) !important;
}

.delete-btn {
    border: 1px solid rgba(255, 40, 80, 0.6) !important;
    background: rgba(255, 40, 80, 0.4) !important;
    color: #ffffff !important;
    box-shadow: 0 0 20px rgba(255, 40, 80, 0.3) !important;
}

.delete-btn:hover {
    background: rgba(255, 40, 80, 0.6) !important;
    border-color: rgba(255, 40, 80, 1) !important;
    transform: scale(1.1) rotate(5deg) !important;
    box-shadow: 0 0 25px rgba(255, 40, 80, 0.6) !important;
}

.edit-btn:hover {
    background: rgba(255, 255, 255, 0.25) !important;
    border-color: rgba(255, 255, 255, 0.8) !important;
    transform: scale(1.1) rotate(-5deg) !important;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.3) !important;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 80px 20px;
}

.empty-icon {
    font-size: 5rem;
    margin-bottom: 20px;
    opacity: 0.3;
}

.empty-state h3 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    color: #666;
}

.empty-state p {
    color: #444;
    font-size: 1rem;
}

/* Scrollbar */
.page-content::-webkit-scrollbar {
    width: 6px;
}

.page-content::-webkit-scrollbar-track {
    background: transparent;
}

.page-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

@media (max-width: 768px) {
    .decks-grid {
        grid-template-columns: 1fr;
    }

    .page-header {
        padding: 0 20px;
    }

    .page-content {
        padding: 20px;
    }
}
</style>
