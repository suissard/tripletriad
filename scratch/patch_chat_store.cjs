const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../front/src/stores/chatStore.js');
let content = fs.readFileSync(storePath, 'utf8');

if (!content.includes('socket.io-client')) {
  // Add socket.io import
  content = content.replace(
    "import { getMockMessages, addMockMessage, mockGuilds } from '../api/chatMock.js';",
    "import { getMockMessages, addMockMessage, mockGuilds } from '../api/chatMock.js';\nimport { io } from 'socket.io-client';\nimport { getStrapiUrl } from '../utils/url.js';"
  );

  // Add socket initialization
  const socketSetup = `
    let socket = null;

    const initSocket = () => {
        if (socket || !userStore.strapiConnected) return;
        const strapiBase = getStrapiUrl('').replace(/\\/api\\/?$/, '');
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

    // Watch for connection changes
    import { watch } from 'vue';
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
  `;

  content = content.replace(
    "const widgetOpen = ref(false);",
    "const widgetOpen = ref(false);\n" + socketSetup
  );

  // remove duplicate vue import if any
  content = content.replace("import { ref, computed } from 'vue';", "import { ref, computed, watch } from 'vue';");
  content = content.replace("import { watch } from 'vue';", "");

  fs.writeFileSync(storePath, content);
  console.log("Patched chatStore.js with Socket.io");
}
