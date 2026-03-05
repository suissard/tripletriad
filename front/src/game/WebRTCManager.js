export class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.uuid = null;
        this.isHost = false;

        // Configuration STUN servers
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };


        // Callbacks
        this.onConnected = null;
        this.messageListeners = [];
        this.onError = null;

        this.strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
    }

    // Helper to generate a simple UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'disconnected' ||
                this.peerConnection.iceConnectionState === 'failed') {
                if (this.onError) this.onError("Connection lost");
            }
        };
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log("DataChannel opened!");
            if (this.onConnected) this.onConnected();
        };
        this.dataChannel.onmessage = (event) => {
            let parsed = event.data;
            try {
                parsed = JSON.parse(event.data);
            } catch (e) { }
            this.messageListeners.forEach(fn => fn(parsed));
        };
        this.dataChannel.onerror = (error) => {
            console.error("DataChannel error:", error);
            if (this.onError) this.onError(error);
        };
        this.dataChannel.onclose = () => {
            console.log("DataChannel closed");
            if (this.onError) this.onError("Connection closed");
        };
    }

    // returns a promise that resolves with the offer/answer when all ICE candidates are gathered
    gatherIceCandidates() {
        return new Promise((resolve) => {
            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve(this.peerConnection.localDescription);
            } else {
                const checkState = () => {
                    if (this.peerConnection.iceGatheringState === 'complete') {
                        this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                        resolve(this.peerConnection.localDescription);
                    }
                };
                this.peerConnection.addEventListener('icegatheringstatechange', checkState);

                // Fallback timeout in case gathering takes too long
                setTimeout(() => {
                    if (this.peerConnection.iceGatheringState !== 'complete') {
                        this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                        resolve(this.peerConnection.localDescription);
                    }
                }, 3000);
            }
        });
    }

    async createSession() {
        try {
            this.isHost = true;
            this.uuid = this.generateUUID();
            this.setupPeerConnection();

            // Create data channel before creating offer
            this.dataChannel = this.peerConnection.createDataChannel("gameData");
            this.setupDataChannel();

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Wait for ICE gathering
            const completeOffer = await this.gatherIceCandidates();

            // Send to Strapi
            const response = await fetch(`${this.strapiUrl}/api/webrtc/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uuid: this.uuid,
                    offer: completeOffer
                })
            });

            if (!response.ok) throw new Error("Failed to create match on server");

            // Start polling for answer
            this.pollForAnswer();

            return this.uuid;
        } catch (error) {
            console.error("Error creating session:", error);
            if (this.onError) this.onError(error.message);
            throw error;
        }
    }

    async pollForAnswer() {
        const interval = setInterval(async () => {
            try {
                if (this.peerConnection.signalingState === 'stable') {
                    clearInterval(interval);
                    return;
                }

                const response = await fetch(`${this.strapiUrl}/api/webrtc/matches/${this.uuid}`);
                if (!response.ok) return;

                const { data } = await response.json();
                if (data && data.answer) {
                    clearInterval(interval);
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 2000);

        // Store interval so we can clear it if needed
        this.pollInterval = interval;
    }

    async joinSession(uuid) {
        try {
            this.isHost = false;
            this.uuid = uuid;
            this.setupPeerConnection();

            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };

            // Fetch offer from Strapi
            const response = await fetch(`${this.strapiUrl}/api/webrtc/matches/${uuid}`);
            if (!response.ok) throw new Error("Match not found");

            const { data } = await response.json();
            if (!data || !data.offer) throw new Error("Invalid match data");

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            const completeAnswer = await this.gatherIceCandidates();

            // Send answer to Strapi
            const putResponse = await fetch(`${this.strapiUrl}/api/webrtc/matches/${uuid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: completeAnswer })
            });

            if (!putResponse.ok) throw new Error("Failed to send answer to server");

            return true;
        } catch (error) {
            console.error("Error joining session:", error);
            if (this.onError) this.onError(error.message);
            throw error;
        }
    }

    sendMessage(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
            console.warn("Attempted to send message but DataChannel is not open");
        }
    }

    addMessageListener(fn) {
        this.messageListeners.push(fn);
    }

    removeMessageListener(fn) {
        this.messageListeners = this.messageListeners.filter(f => f !== fn);
    }

    close() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
        this.peerConnection = null;
        this.dataChannel = null;
    }
}
