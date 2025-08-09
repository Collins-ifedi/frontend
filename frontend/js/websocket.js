// WebSocket connection manager
const WebSocketManager = {
    ws: null,
    reconnectAttempts: 0,
    reconnectTimer: null,
    
    // Connect to WebSocket
    connect() {
        try {
            const userId = localStorage.getItem('voxaroid_userId');
            const token = localStorage.getItem('voxaroid_token');
            
            if (!userId || !token) {
                console.error('No user credentials for WebSocket connection');
                return;
            }
            
            // Connect to WebSocket without query parameters (token sent after connection)
            this.ws = new WebSocket(CONFIG.WS_URL);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected, sending authentication...');
                
                // Send authentication message as required by backend
                this.ws.send(JSON.stringify({
                    type: 'init',
                    token: token
                }));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                STATE.isConnected = false;
                this.updateConnectionStatus(false);
                
                // Handle authentication failures
                if (event.code >= 4001 && event.code <= 4003) {
                    Utils.showToast('Authentication failed. Please log in again.', 'error');
                    Auth.logout();
                    return;
                }
                
                if (event.code !== 1000) { // Not a normal closure
                    this.attemptReconnect();
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                STATE.isConnected = false;
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.attemptReconnect();
        }
    },
    
    // Handle incoming WebSocket messages
    handleMessage(data) {
        switch (data.type) {
            case 'new_message':
                if (data.sender === 'assistant') {
                    Chat.handleAssistantMessage(data.text);
                    STATE.isConnected = true;
                    this.updateConnectionStatus(true);
                }
                break;
            case 'error':
                Utils.showToast(data.message || 'An error occurred', 'error');
                Chat.hideTypingIndicator();
                break;
            default:
                console.log('Unknown message type:', data.type, data);
        }
    },
    
    // Send message through WebSocket
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else {
            console.error('WebSocket not connected');
            Utils.showToast('Connection lost. Trying to reconnect...', 'error');
            this.attemptReconnect();
            return false;
        }
    },
    
    // Send chat message
    sendMessage(text) {
        return this.send({
            type: 'send_message',
            text: text
        });
    },
    
    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts >= CONFIG.RECONNECT_ATTEMPTS) {
            Utils.showToast('Unable to connect to server. Please refresh the page.', 'error', 5000);
            return;
        }
        
        this.reconnectAttempts++;
        const delay = CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${CONFIG.RECONNECT_ATTEMPTS})`);
        
        this.reconnectTimer = setTimeout(() => {
            if (Auth.isAuthenticated()) {
                this.connect();
            }
        }, delay);
    },
    
    // Update connection status in UI
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return; // indicator removed from UI
        const statusText = statusElement.nextElementSibling;
        if (connected) {
            statusElement.className = 'w-2 h-2 bg-green-500 rounded-full';
            if (statusText) statusText.textContent = 'Connected';
        } else {
            statusElement.className = 'w-2 h-2 bg-red-500 rounded-full';
            if (statusText) statusText.textContent = 'Disconnected';
        }
    },
    
    // Disconnect WebSocket
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'User logout');
            this.ws = null;
        }
        
        STATE.isConnected = false;
        this.updateConnectionStatus(false);
    }
};
