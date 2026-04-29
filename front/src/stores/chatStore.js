import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useUserStore } from './userStore.js';
import api from '../api/strapi.js';
import { getMockMessages, addMockMessage, mockGuilds } from '../api/chatMock.js';
import { io } from 'socket.io-client';
import { getStrapiUrl } from '../utils/url.js';

// If Strapi is connected we use real API, otherwise we use Mocks
export const useChatStore = defineStore('chatStore', () => {
    const userStore = useUserStore();

    // --- STATE ---
    const activeTab = ref('guilds'); // 'friends' or 'guilds'
    const activeTargetId = ref(null); // The ID of the friend or guild
    const messages = ref({}); // Dictionary where keys are room strings ("guild_X" or "dm_1_2")
    const guilds = ref([]);
    const loading = ref(false);
    const widgetOpen = ref(false);
    let socket = null;

    // --- HELPERS ---
    // Determines the canonical room name based on targets
    const getRoomName = (type, targetId) => {
        if (type === 'guild') {
            return `guild_${targetId}`;
        } else {
            const myId = userStore.user?.id || 1; // 1 fallback for mock
            const smallerId = Math.min(myId, targetId);
            const largerId = Math.max(myId, targetId);
            return `dm_${smallerId}_${largerId}`;
        }
    };

    // --- ACTIONS / FUNCTIONS ---
    // Called by the SocketManager when a new message event is received
    const receiveMessage = (msg) => {
        const type = msg.guild ? 'guild' : 'dm';
        const targetId = msg.guild ? msg.guild : (msg.sender.id === userStore.user?.id ? msg.receiver : msg.sender.id);
        const roomName = getRoomName(type, targetId);

        if (!messages.value[roomName]) messages.value[roomName] = [];
        if (!messages.value[roomName].find(m => m.id === msg.id)) {
             messages.value[roomName] = [...messages.value[roomName], msg];
        }
    };

    const initSocket = () => {
        if (socket || !userStore.strapiConnected) return;
        const strapiBase = getStrapiUrl('').replace(/\/api\/?$/, '');
        socket = io(strapiBase, {
            transports: ['websocket', 'polling'],
        });

        socket.on('new-chat-message', (msg) => {
            receiveMessage(msg);
        });

        socket.on('connect', () => {
            console.log('[ChatStore] Socket connected');
            // Rejoin rooms if needed, but in our design rooms are joined dynamically
        });
    };

    const fetchGuilds = async () => {
        if (!userStore.strapiConnected) {
            guilds.value = mockGuilds;
            return;
        }
        try {
            const response = await api.request('GET', '/guilds');
            guilds.value = response.data;
        } catch (err) {
            console.error('Failed to fetch guilds', err);
        }
    };

    const fetchMessages = async (type, targetId) => {
        const roomName = getRoomName(type, targetId);
        if (messages.value[roomName] && messages.value[roomName].length > 0) return; // Cache hit

        loading.value = true;
        if (!userStore.strapiConnected) {
            messages.value[roomName] = getMockMessages(roomName);
            loading.value = false;
            return;
        }

        try {
            const isGuild = type === 'guild' || type === 'guilds';
            const params = isGuild ? { guildId: targetId } : { targetUserId: targetId };
            const response = await api.request('GET', '/chat-messages', { params });
            messages.value[roomName] = response.data;
        } catch (err) {
            console.error('Failed to fetch chat messages', err);
        } finally {
            loading.value = false;
        }
    };

    const searchGuilds = async (query = '') => {
        if (!userStore.strapiConnected) {
            return mockGuilds.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));
        }
        try {
            const params = query ? { 'filters[name][$containsi]': query } : {};
            const response = await api.request('GET', '/guilds', { params });
            return response.data;
        } catch (err) {
            console.error('Failed to search guilds', err);
            return [];
        }
    };

    const joinGuild = async (guildId) => {
        if (!userStore.strapiConnected) {
            const guild = mockGuilds.find(g => g.id === guildId);
            if (guild && !guilds.value.find(g => g.id === guildId)) {
                guilds.value = [...guilds.value, guild];
            }
            return;
        }
        try {
            await api.request('POST', `/guilds/${guildId}/join`);
            await fetchGuilds();
        } catch (err) {
            console.error('Failed to join guild', err);
            throw err;
        }
    };

    const createGuild = async (name, description) => {
        if (!userStore.strapiConnected) {
            const newGuild = { id: Date.now(), name, description };
            mockGuilds.push(newGuild);
            guilds.value = [...mockGuilds];
            return newGuild;
        }
        try {
            const response = await api.request('POST', '/guilds', {
                body: { data: { name, description } }
            });
            await fetchGuilds();
            return response.data;
        } catch (err) {
            console.error('Failed to create guild', err);
            throw err;
        }
    };

    const sendMessage = async (content) => {
        if (!content.trim() || !activeTargetId.value) return;
        const roomName = activeRoomName.value;

        if (!userStore.strapiConnected) {
            const msg = addMockMessage(roomName, {
                content,
                sender: { id: userStore.user?.id || 1, username: userStore.user?.username || 'MockUser' }
            });
            // Update reactively
            if (!messages.value[roomName]) messages.value[roomName] = [];
            messages.value[roomName] = [...messages.value[roomName], msg];
            return;
        }

        try {
            const payload = { content };
            if (activeTab.value === 'guilds') {
                payload.guildId = activeTargetId.value;
            } else {
                payload.receiverId = activeTargetId.value;
            }

            const response = await api.request('POST', '/chat-messages', {
                body: payload
            });

            // Add locally instantly, the socket will also broadcast it but we might skip double adding
            // For now let's just let the socket handle it, or add it instantly and handle dupes
            const msg = response.data;
            if (!messages.value[roomName]) messages.value[roomName] = [];

            // Basic dupe check
            if (!messages.value[roomName].find(m => m.id === msg.id)) {
                messages.value[roomName] = [...messages.value[roomName], msg];
            }

        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    const toggleWidget = () => {
        widgetOpen.value = !widgetOpen.value;
        if (widgetOpen.value && guilds.value.length === 0) {
            fetchGuilds();
        }
    };

    const selectTarget = (type, id) => {
        activeTab.value = type;
        activeTargetId.value = id;
        fetchMessages(type, id);
    };

    // --- COMPUTED ---
    const activeRoomName = computed(() => {
        if (!activeTargetId.value) return null;
        return getRoomName(activeTab.value === 'guilds' ? 'guild' : 'dm', activeTargetId.value);
    });

    const activeMessages = computed(() => {
        if (!activeRoomName.value) return [];
        return messages.value[activeRoomName.value] || [];
    });

    // --- WATCHERS ---
    watch(() => userStore.strapiConnected, (isConnected) => {
        if (isConnected) {
            initSocket();
        }
    }, { immediate: true });

    // When switching rooms, we need to join them
    watch(activeRoomName, (newRoom, oldRoom) => {
        if (socket && socket.connected) {
            if (oldRoom) socket.emit('leave-chat-room', { room: oldRoom });
            if (newRoom) socket.emit('join-chat-room', { room: newRoom });
        }
    });

    return {
        widgetOpen,
        activeTab,
        activeTargetId,
        guilds,
        activeMessages,
        loading,
        toggleWidget,
        selectTarget,
        fetchGuilds,
        searchGuilds,
        joinGuild,
        createGuild,
        sendMessage,
        receiveMessage
    };
});
