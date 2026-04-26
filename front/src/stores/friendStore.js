import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/strapi.js';
import { useUserStore } from './userStore.js'; // To access the user ID natively

export const useFriendStore = defineStore('friendStore', () => {
    const friendships = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const userStore = useUserStore();

    const fetchFriendships = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.strapiClient.client.get('/friendships/me');
            friendships.value = response.data.data;
        } catch (err) {
            console.error('Error fetching friendships:', err);
            error.value = err.response?.data?.error?.message || 'Failed to fetch friends.';
        } finally {
            loading.value = false;
        }
    };

    const sendFriendRequest = async (identifier) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.strapiClient.client.post('/friendships/request', {
                identifier
            });
            await fetchFriendships(); // Refresh list
            return response.data;
        } catch (err) {
            console.error('Error sending friend request:', err);
            error.value = err.response?.data?.error?.message || 'Failed to send friend request.';
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    };

    const acceptRequest = async (friendshipId) => {
        loading.value = true;
        try {
            await api.strapiClient.client.post(`/friendships/${friendshipId}/accept`);
            await fetchFriendships();
        } catch (err) {
            console.error('Error accepting friend request:', err);
            error.value = err.response?.data?.error?.message || 'Failed to accept request.';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const rejectRequest = async (friendshipId) => {
        loading.value = true;
        try {
            await api.strapiClient.client.post(`/friendships/${friendshipId}/reject`);
            await fetchFriendships();
        } catch (err) {
            console.error('Error rejecting friend request:', err);
            error.value = err.response?.data?.error?.message || 'Failed to reject request.';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const removeFriend = async (friendshipId) => {
        loading.value = true;
        try {
            await api.strapiClient.client.delete(`/friendships/${friendshipId}`);
            await fetchFriendships();
        } catch (err) {
            console.error('Error removing friend:', err);
            error.value = err.response?.data?.error?.message || 'Failed to remove friend.';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const blockUser = async (targetUserId) => {
        loading.value = true;
        try {
            await api.strapiClient.client.post('/friendships/block', {
                targetUserId
            });
            await fetchFriendships();
        } catch (err) {
            console.error('Error blocking user:', err);
            error.value = err.response?.data?.error?.message || 'Failed to block user.';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const myId = computed(() => {
        return userStore.user?.id;
    });

    const acceptedFriends = computed(() => {
        if (!myId.value) return [];
        return friendships.value.filter(f => f.status === 'accepted').map(f => {
            const friendData = f.requester?.id === myId.value ? f.receiver : f.requester;
            return {
              ...friendData,
              friendshipId: f.documentId || f.id // fallback for id if documentId not populated
            };
        }).filter(u => u && u.id);
    });

    const pendingIncomingRequests = computed(() => {
        if (!myId.value) return [];
        return friendships.value.filter(f => f.status === 'pending' && f.receiver?.id === myId.value);
    });

    const pendingOutgoingRequests = computed(() => {
        if (!myId.value) return [];
        return friendships.value.filter(f => f.status === 'pending' && f.requester?.id === myId.value);
    });

    const blockedUsers = computed(() => {
        if (!myId.value) return [];
        return friendships.value.filter(f => f.status === 'blocked' && f.blockedBy?.id === myId.value).map(f => {
             const userData = f.requester?.id === myId.value ? f.receiver : f.requester;
             return {
                 ...userData,
                 friendshipId: f.documentId || f.id
             };
        }).filter(u => u && u.id);
    });

    return {
        friendships,
        loading,
        error,
        myId,
        acceptedFriends,
        pendingIncomingRequests,
        pendingOutgoingRequests,
        blockedUsers,
        fetchFriendships,
        sendFriendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        blockUser
    };
});
