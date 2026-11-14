export default {
  routes: [
    {
      method: "POST",
      path: "/webrtc/matches",
      handler: "match.createMatch",
    },
    {
      method: "GET",
      path: "/webrtc/matches/:uuid",
      handler: "match.findByUuid",
    },
    {
      method: "PUT",
      path: "/webrtc/matches/:uuid",
      handler: "match.updateByUuid",
    },
    {
      method: "POST",
      path: "/webrtc/matches/:uuid/log",
      handler: "match.addLog",
    },
    {
      method: "POST",
      path: "/match/arbitrate",
      handler: "match.arbitrate",
    },
  ],
};
