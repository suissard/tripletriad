const fs = require('fs');
const path = require('path');

const socketIoPath = path.join(__dirname, '../back/strapi/src/socketio.ts');
let content = fs.readFileSync(socketIoPath, 'utf8');

// I need to add auth to sockets, or at least a way for them to join chat rooms
// Let's replace the `io.on("connection")` block to include a join-chat-room event
const newEvents = `
    socket.on("join-chat-room", (payload) => {
      const { room } = payload;
      if (room) {
        socket.join(room);
        strapi.log.info(\`💬 Socket \${socket.id} joined chat room: \${room}\`);
      }
    });

    socket.on("leave-chat-room", (payload) => {
      const { room } = payload;
      if (room) {
        socket.leave(room);
        strapi.log.info(\`👋 Socket \${socket.id} left chat room: \${room}\`);
      }
    });
`;

if (!content.includes('join-chat-room')) {
  content = content.replace(/socket\.on\("disconnect"/, newEvents + "\n    socket.on(\"disconnect\"");
  fs.writeFileSync(socketIoPath, content);
  console.log("Patched socketio.ts to add chat rooms");
} else {
  console.log("Already patched socketio.ts");
}
