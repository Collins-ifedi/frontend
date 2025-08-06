// WebSocket Manager
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectTimeout = null;
        this.messageHandlers = [];
        this.connectionHandlers = [];
    }

    // Add message handler
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    // Add connection status handler
    onConnectionChange(handler) {
        this.connectionHandlers.push(handler);
    }

    // Connect to WebSocket
    connect() {
        this.disconnect();

        const token = AuthManager.getToken();
        if (!token) return;

        const wsUrl = AuthManager.BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.notifyConnectionChange(true);

            // Send JWT token for authentication
            this.send({
                type: 'init',
                token: token
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.messageHandlers.forEach(handler => handler(data));
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.notifyConnectionChange(false);

            // Auto-reconnect after 3 seconds
            this.reconnectTimeout = setTimeout(() => {
                if (AuthManager.getToken()) {
                    this.connect();
                }
            }, 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    // Disconnect WebSocket
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Send message
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    // Notify connection change
    notifyConnectionChange(connected) {
        this.connectionHandlers.forEach(handler => handler(connected));
    }
}
