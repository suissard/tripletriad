export default {
  routes: [
    {
      method: 'GET',
      path: '/chat-messages',
      handler: 'chat-message.getMessages',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/chat-messages',
      handler: 'chat-message.sendMessage',
      config: { policies: [] }
    }
  ]
};
