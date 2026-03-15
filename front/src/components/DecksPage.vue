<template>
    <div class="decks-page ui-layer" >
        <div class="page-header">
            <button class="btn btn-primary" @click="closeDecksPage">← RETOUR</button>
            <h2 class="page-title">MES DECKS</h2>
            <div class="header-stats">{{ userStore.userDecks.length }} / 5 Decks</div>
        </div>

        <div class="page-content">
            <button class="btn btn-secondary" style="width: 100%; margin-bottom: 30px;" @click="openNewDeck" :disabled="userStore.userDecks.length >= 5">
                <span class="new-deck-icon">+</span>
                <span>Créer un Nouveau Deck</span>
            </button>

            <div class="decks-grid" v-if="userStore.userDecks.length > 0">
                <div v-for="deck in userStore.userDecks" :key="deck.id" class="deck-card">
                    <div class="deck-cover">
                        <img v-if="deck.cover && getCardById(deck.cover)" :src="getCardById(deck.cover).img"
                            class="cover-img" />
                        <div v-else class="cover-placeholder">🎴</div>
                    </div>

                    <div class="deck-body">
                        <h3 class="deck-name">{{ deck.name }}</h3>
                        <div class="deck-stats">
                            <span class="card-count">{{ deck.cards.length }} / 15 cartes</span>
                            <span v-if="deck.cards.length === 15" class="complete-badge">✓ Complet</span>
                            <span v-else class="incomplete-badge">Incomplet</span>
                        </div>

                        <!-- Mini card preview -->
                        <div class="card-preview-row">
                            <img v-for="cardId in deck.cards.slice(0, 5)" :key="cardId" :src="getCardById(cardId)?.img"
                                class="preview-thumb" />
                            <span v-if="deck.cards.length > 5" class="more-cards">+{{ deck.cards.length - 5 }}</span>
                        </div>
                    </div>

                    <div class="deck-actions" style="display: flex; gap: 10px; padding: 10px;">
                        <button class="btn btn-primary" style="flex: 1;" @click="openEditDeck(deck)">✏️ Éditer</button>
                        <button class="btn btn-accent" style="flex: 1;" @click="deleteDeck(deck)">🗑️ Supprimer</button>
                    </div>
                </div>
            </div>

            <div v-else class="empty-state">
                <div class="empty-icon">🎴</div>
                <h3>Aucun deck créé</h3>
                <p>Créez votre premier deck pour affronter vos adversaires !</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();


import { state, getCardById, confirmAction } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';

const userStore = useUserStore();

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
    router.push('/deck-editor');
}

function openEditDeck(deck) {
    state.editingDeck.id = deck.id;
    state.editingDeck.documentId = deck.documentId;
    state.editingDeck.name = deck.name;
    state.editingDeck.cover = deck.cover;
    state.editingDeck.cards = [...deck.cards];
    state.editingDeck.cardBack = deck.cardBack || 'default';
    router.push('/deck-editor');
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

.back-btn {
    background: transparent;
    border: 1px solid #ff0055;
    color: #ff0055;
    padding: 10px 20px;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.back-btn:hover {
    background: rgba(255, 0, 85, 0.2);
    box-shadow: 0 0 10px #ff0055;
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
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

.deck-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
}

.deck-card:hover {
    border-color: rgba(255, 0, 85, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.deck-cover {
    height: 120px;
    background: linear-gradient(135deg, rgba(255, 0, 85, 0.1), rgba(0, 210, 255, 0.05));
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.cover-img {
    height: 100%;
    object-fit: cover;
    filter: brightness(0.8);
}

.cover-placeholder {
    font-size: 3rem;
    opacity: 0.3;
}

.deck-body {
    padding: 20px;
    flex: 1;
}

.deck-name {
    margin: 0 0 8px 0;
    font-size: 1.3rem;
    color: white;
    letter-spacing: 1px;
}

.deck-stats {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
}

.card-count {
    font-size: 0.9rem;
    color: #888;
}

.complete-badge {
    background: rgba(0, 255, 136, 0.15);
    color: #00ff88;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: bold;
}

.incomplete-badge {
    background: rgba(255, 200, 0, 0.15);
    color: #ffc800;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
}

.card-preview-row {
    display: flex;
    gap: 6px;
    align-items: center;
}

.preview-thumb {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.more-cards {
    font-size: 0.8rem;
    color: #666;
    margin-left: 4px;
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
