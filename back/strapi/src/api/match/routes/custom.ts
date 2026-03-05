export default {
    routes: [
        {
            method: 'POST',
            path: '/webrtc/matches',
            handler: 'match.createMatch',
            config: {
                auth: false,
            },
        },
        {
            method: 'GET',
            path: '/webrtc/matches/:uuid',
            handler: 'match.findByUuid',
            config: {
                auth: false,
            },
        },
        {
            method: 'PUT',
            path: '/webrtc/matches/:uuid',
            handler: 'match.updateByUuid',
            config: {
                auth: false,
            },
        }
    ]
};
