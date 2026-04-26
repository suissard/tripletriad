export default {
  routes: [
    {
      method: 'GET',
      path: '/friendships/me',
      handler: 'friendship.getMyFriendships',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/friendships/request',
      handler: 'friendship.sendRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/friendships/:id/accept',
      handler: 'friendship.acceptRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/friendships/:id/reject',
      handler: 'friendship.rejectRequest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/friendships/:id',
      handler: 'friendship.removeFriend',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/friendships/block',
      handler: 'friendship.blockUser',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ],
};
