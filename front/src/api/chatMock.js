export const mockGuilds = [
  { id: '1', documentId: 'guild_1', name: 'Global', description: 'Canal de discussion général pour tous les joueurs.' },
  { id: '2', documentId: 'guild_2', name: 'La Résistance', description: 'Canal pour les rebelles de Terra Nullius.' },
];

export const mockMessages = {
  // Key format: "guild_X" or "dm_user1_user2"
  "guild_1": [
    { id: 1, content: "Salut tout le monde !", sender: { id: 2, username: "PlayerOne" }, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, content: "Hello ! Qui pour une partie ?", sender: { id: 3, username: "CardMaster99" }, createdAt: new Date(Date.now() - 1800000).toISOString() },
  ],
  "dm_1_2": [
    { id: 3, content: "Bien joué pour la partie d'hier !", sender: { id: 2, username: "PlayerOne" }, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 4, content: "Merci, c'était serré ! Revanche ce soir ?", sender: { id: 1, username: "MockUser" }, createdAt: new Date(Date.now() - 86000000).toISOString() },
  ]
};

export const getMockMessages = (targetRoom) => {
    return mockMessages[targetRoom] || [];
};

export const addMockMessage = (targetRoom, message) => {
    if (!mockMessages[targetRoom]) {
        mockMessages[targetRoom] = [];
    }
    const newMessage = {
        ...message,
        id: Date.now(),
        createdAt: new Date().toISOString()
    };
    mockMessages[targetRoom].push(newMessage);
    return newMessage;
};
