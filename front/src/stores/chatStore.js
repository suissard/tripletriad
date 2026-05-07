import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useUserStore } from './userStore.js';
import { useNotificationStore } from './notificationStore.js';
import api from '../api/strapi.js';
import { getMockMessages, addMockMessage, mockGuilds } from '../api/chatMock.js';
import { io } from 'socket.io-client';
import { getStrapiUrl } from '../utils/url.js';

// If Strapi is connected we use real API, otherwise we use Mocks
export const useChatStore = defineStore('chatStore', () => {
    const userStore = useUserStore();
    const notificationStore = useNotificationStore();

    const activeGuildDetails = ref(null);
    const pageActiveGuildDetails = ref(null);
    const widgetOpen = ref(false);
    
    // Widget State
    const activeTab = ref('guilds');
    const activeTargetId = ref(null);
    
    // Page State (for GuildsPage)
    const pageActiveTab = ref('guilds');
    const pageActiveTargetId = ref(null);

    const guilds = ref([]);
    const messages = ref({});
    const loading = ref(false);
    let socket = null;


    const unreadCounts = ref({});

    // --- HELPERS ---
    // Determines the canonical room name based on targets
    const getRoomName = (type, targetId) => {
        if (type === 'guild' || type === 'guilds') {
            return `guild_${targetId}`;
        } else {
            const myId = userStore.user?.documentId;
            // Ensure we are using the documentId (string) if available for consistent sorting
            const otherId = targetId;
            if (!myId || !otherId) return `dm_pending`;
            
            // Convert to string to ensure consistent sorting even if one is numeric
            const ids = [String(myId), String(otherId)].sort();
            return `dm_${ids[0]}_${ids[1]}`;
        }
    };

    // --- ACTIONS / FUNCTIONS ---
    // Called by the SocketManager when a new message event is received
    const receiveMessage = (msg) => {
        const type = msg.guild ? 'guild' : 'dm';
        // In Strapi 5, msg.guild is often the documentId or an object with documentId
        const guildId = typeof msg.guild === 'object' ? msg.guild.documentId : msg.guild;
        const senderId = typeof msg.sender === 'object' ? msg.sender.documentId : msg.sender;
        const receiverId = typeof msg.receiver === 'object' ? msg.receiver.documentId : msg.receiver;

        const targetId = msg.guild ? guildId : (senderId === userStore.user?.documentId ? receiverId : senderId);
        const roomName = getRoomName(type, targetId);

        if (!messages.value[roomName]) messages.value[roomName] = [];
        
        // Basic dupe check
        if (!messages.value[roomName].find(m => m.id === msg.id)) {
             messages.value[roomName] = [...messages.value[roomName], msg];
             
             // Increment unread if not active in either widget or page, or widget closed
             const isSeenInWidget = widgetOpen.value && activeRoomName.value === roomName;
             const isSeenInPage = pageActiveRoomName.value === roomName;

             if (!isSeenInWidget && !isSeenInPage) {
                 unreadCounts.value[roomName] = (unreadCounts.value[roomName] || 0) + 1;
                 
                 // Notify if it's a guild message from someone else
                 if (msg.guild && senderId !== userStore.user?.documentId) {
                     const guild = guilds.value.find(g => (g.documentId === guildId || g.id === guildId));
                     const guildName = guild?.name || 'Guilde';
                     notificationStore.addNotification('GUILD_MESSAGE', `[${guildName}] ${msg.sender?.username}: ${msg.content}`, 'info');
                 }
             }
        }
    };

    const joinAllGuildRooms = () => {
        if (!socket || !socket.connected || guilds.value.length === 0) return;
        
        guilds.value.forEach(guild => {
            const docId = guild.documentId || guild.id;
            socket.emit('join-chat-room', { room: `guild_${docId}` });
        });
        console.log(`[ChatStore] Joined ${guilds.value.length} guild rooms`);
        
        // Also ensure we join the room of the active target if it's a guild not yet in the list
        if (activeTab.value === 'guilds' && activeTargetId.value) {
            socket.emit('join-chat-room', { room: `guild_${activeTargetId.value}` });
        }
        if (pageActiveTab.value === 'guilds' && pageActiveTargetId.value) {
            socket.emit('join-chat-room', { room: `guild_${pageActiveTargetId.value}` });
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
            joinAllGuildRooms();
        });
    };

    const fetchGuilds = async () => {
        if (!userStore.strapiConnected || !userStore.user) {
            guilds.value = mockGuilds;
            return;
        }
        try {
            // Fetch user's guilds and Global guild separately to avoid Strapi 5 400 error on complex $or filters
            // We use the custom /guilds/me endpoint to avoid permission issues when filtering on relations via REST
            const [userGuildsRes, globalGuildRes] = await Promise.all([
                api.request('GET', '/guilds/me'),
                api.request('GET', '/guilds', {
                    params: { 'filters[name][$containsi]': 'Global' }
                })
            ]);

            const userGuilds = userGuildsRes.data || [];
            const globalGuilds = globalGuildRes.data || [];

            // Merge and deduplicate by documentId
            const merged = [...userGuilds];
            globalGuilds.forEach(g => {
                if (!merged.find(mg => (mg.documentId || mg.id) === (g.documentId || g.id))) {
                    merged.push(g);
                }
            });

            guilds.value = merged;
        } catch (err) {
            console.error('Failed to fetch guilds', err);
        }
    };

    const fetchGuildDetails = async (guildId, context = 'widget') => {
        if (!userStore.strapiConnected) {
            const mock = mockGuilds.find(g => (g.documentId === guildId || g.id === guildId));
            if (context === 'page') pageActiveGuildDetails.value = mock;
            else activeGuildDetails.value = mock;
            return;
        }
        try {
            const response = await api.request('GET', `/guilds/${guildId}/data`);
            if (context === 'page') pageActiveGuildDetails.value = response.data;
            else activeGuildDetails.value = response.data;
            
            // Also populate messages for this guild room to avoid extra call
            const roomName = getRoomName('guild', guildId);
            if (response.data.messages) {
                messages.value[roomName] = response.data.messages;
            }
        } catch (err) {
            console.error('Failed to fetch guild details', err);
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
            await fetchGuildDetails(guildId, 'page');
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

    const sendMessage = async (content, context = 'widget') => {
        if (!content.trim()) return;
        
        const targetId = context === 'page' ? pageActiveTargetId.value : activeTargetId.value;
        const tab = context === 'page' ? pageActiveTab.value : activeTab.value;
        const roomName = context === 'page' ? pageActiveRoomName.value : activeRoomName.value;

        if (!targetId) return;

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
            if (tab === 'guilds') {
                payload.guildId = targetId;
            } else {
                payload.receiverId = targetId;
            }

            const response = await api.request('POST', '/chat-messages', {
                body: payload
            });

            // Add locally instantly
            const msg = response.data;
            if (!messages.value[roomName]) messages.value[roomName] = [];

            // Basic dupe check
            if (!messages.value[roomName].find(m => m.id === msg.id)) {
                messages.value[roomName] = [...messages.value[roomName], msg];
            }

        } catch (err) {
            console.error('Failed to send message', err);
            if (err.status === 404) {
                 console.warn('[ChatStore] Receiver or Room not found. Check if using documentId.');
            }
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
        
        const roomName = getRoomName(type === 'guilds' ? 'guild' : 'dm', id);
        // Clear unread count
        unreadCounts.value[roomName] = 0;

        if (type === 'guilds' || type === 'guild') {
            fetchGuildDetails(id, 'widget');
        } else {
            fetchMessages(type, id);
        }
    };

    const selectPageTarget = (type, id) => {
        pageActiveTab.value = type;
        pageActiveTargetId.value = id;
        
        const roomName = getRoomName(type === 'guilds' ? 'guild' : 'dm', id);
        // Clear unread count
        unreadCounts.value[roomName] = 0;

        if (type === 'guilds' || type === 'guild') {
            fetchGuildDetails(id, 'page');
        } else {
            fetchMessages(type, id);
        }
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

    const pageActiveRoomName = computed(() => {
        if (!pageActiveTargetId.value) return null;
        return getRoomName(pageActiveTab.value === 'guilds' ? 'guild' : 'dm', pageActiveTargetId.value);
    });

    const pageActiveMessages = computed(() => {
        if (!pageActiveRoomName.value) return [];
        return messages.value[pageActiveRoomName.value] || [];
    });

    // --- WATCHERS ---
    watch(() => userStore.strapiConnected, (isConnected) => {
        if (isConnected) {
            initSocket();
        }
    }, { immediate: true });

    // When guilds are fetched, join their rooms
    watch(guilds, () => {
        joinAllGuildRooms();
    }, { deep: true });

    // When switching rooms, we need to join them (mainly for DMs now, as guilds are joined globally)
    watch(activeRoomName, (newRoom, oldRoom) => {
        if (socket && socket.connected) {
            // No need to leave guild rooms as we want to stay listening
            if (oldRoom && !oldRoom.startsWith('guild_')) {
                socket.emit('leave-chat-room', { room: oldRoom });
            }
            if (newRoom) {
                socket.emit('join-chat-room', { room: newRoom });
            }
        }
    });

    watch(pageActiveRoomName, (newRoom, oldRoom) => {
        if (socket && socket.connected) {
            if (oldRoom && !oldRoom.startsWith('guild_')) {
                socket.emit('leave-chat-room', { room: oldRoom });
            }
            if (newRoom) {
                socket.emit('join-chat-room', { room: newRoom });
            }
        }
    });

    const leaveGuild = async (guildId) => {
        try {
            await api.request('POST', `/guilds/${guildId}/leave`);
            await fetchGuilds();
            pageActiveTargetId.value = null;
            pageActiveGuildDetails.value = null;
        } catch (err) {
            console.error('Failed to leave guild', err);
            throw err;
        }
    };

    const kickMember = async (guildId, memberDocId) => {
        try {
            await api.request('POST', `/guilds/${guildId}/kick`, {
                body: { memberDocId }
            });
            await fetchGuildDetails(guildId, 'page');
        } catch (err) {
            console.error('Failed to kick member', err);
            throw err;
        }
    };

    const promoteMember = async (guildId, memberDocId) => {
        try {
            await api.request('POST', `/guilds/${guildId}/promote`, {
                body: { memberDocId }
            });
            await fetchGuildDetails(guildId, 'page');
        } catch (err) {
            console.error('Failed to promote member', err);
            throw err;
        }
    };

    const demoteMember = async (guildId, memberDocId) => {
        try {
            await api.request('POST', `/guilds/${guildId}/demote`, {
                body: { memberDocId }
            });
            await fetchGuildDetails(guildId, 'page');
        } catch (err) {
            console.error('Failed to demote member', err);
            throw err;
        }
    };

    const updateGuild = async (guildId, data) => {
        try {
            await api.request('PUT', `/guilds/${guildId}`, {
                body: { data }
            });
            await fetchGuilds();
            await fetchGuildDetails(guildId, 'page');
        } catch (err) {
            console.error('Failed to update guild', err);
            throw err;
        }
    };

    const deleteGuild = async (guildId) => {
        try {
            await api.request('DELETE', `/guilds/${guildId}`);
            await fetchGuilds();
            pageActiveTargetId.value = null;
            pageActiveGuildDetails.value = null;
        } catch (err) {
            console.error('Failed to delete guild', err);
            throw err;
        }
    };

    return {
        widgetOpen,
        activeTab,
        activeTargetId,
        activeGuildDetails,
        pageActiveTab,
        pageActiveTargetId,
        pageActiveGuildDetails,
        guilds,
        activeMessages,
        pageActiveMessages,
        loading,
        unreadCounts,
        toggleWidget,
        selectTarget,
        selectPageTarget,
        fetchGuilds,
        fetchGuildDetails,
        searchGuilds,
        joinGuild,
        leaveGuild,
        createGuild,
        sendMessage,
        receiveMessage,
        kickMember,
        promoteMember,
        demoteMember,
        updateGuild,
        deleteGuild
    };
});
