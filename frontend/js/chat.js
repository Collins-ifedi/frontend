// Update chat module to work with the backend's conversation flow
const Chat = {
    currentMessageElement: null,
    currentMessageContent: '',
    
    // Load chat history (simplified since backend doesn't have separate chat endpoints)
    async loadChatHistory() {
        // For now, we'll store chat history locally since the backend uses conversation_history table
        // but doesn't expose separate chat endpoints
        const storedHistory = localStorage.getItem('voxaroid_chatHistory');
        if (storedHistory) {
            try {
                STATE.chatHistory = JSON.parse(storedHistory);
                this.renderChatHistory();
            } catch (error) {
                console.error('Error loading chat history:', error);
                STATE.chatHistory = [];
            }
        }
    },
    
    // Save chat history locally
    saveChatHistory() {
        localStorage.setItem('voxaroid_chatHistory', JSON.stringify(STATE.chatHistory));
    },
    
    renderChatHistory() {
        const historyContainer = document.getElementById('chatHistory');
        historyContainer.innerHTML = '';
        
        if (STATE.chatHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                    <i class="fas fa-comments text-3xl mb-2"></i>
                    <p>No conversations yet</p>
                    <p class="text-sm">Start a new chat to begin</p>
                </div>
            `;
            return;
        }
        
        STATE.chatHistory.forEach((chat, index) => {
            const chatElement = document.createElement('div');
            chatElement.className = `p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                index === 0 ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`;
            
            chatElement.innerHTML = `
                <div class="font-medium text-gray-900 dark:text-white truncate mb-1">
                    ${Utils.sanitizeHtml(chat.title || 'New Chat')}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${Utils.formatTimestamp(chat.timestamp)}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.loadChat(index);
            });
            
            historyContainer.appendChild(chatElement);
        });
    },
    
    loadChat(chatIndex) {
        const chat = STATE.chatHistory[chatIndex];
        if (!chat) return;
        
        STATE.currentChatId = chatIndex;
        this.renderMessages(chat.messages || []);
        document.getElementById('chatTitle').textContent = chat.title || 'Chat';
        this.renderChatHistory(); // Update sidebar to show active chat
    },
    
    renderMessages(messages) {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        
        const messagesWrapper = document.createElement('div');
        messagesWrapper.className = 'max-w-4xl mx-auto space-y-6';
        
        messages.forEach(message => {
            this.addMessageToDOM(message.content, message.role, message.timestamp, message.files, messagesWrapper);
        });
        
        messagesContainer.appendChild(messagesWrapper);
        this.scrollToBottom();
    },
    
    addMessageToDOM(content, role, timestamp = new Date().toISOString(), files = [], container = null) {
        const messagesContainer = container || document.getElementById('chatMessages').querySelector('.max-w-4xl') || this.createMessagesWrapper();
        
        const messageElement = document.createElement('div');
        messageElement.className = 'fade-in';
        
        const isUser = role === 'user';
        const alignmentClass = isUser ? 'justify-end' : 'justify-start';
        const bgClass = isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
        
        let filesHtml = '';
        if (files && files.length > 0) {
            filesHtml = files.map(file => {
                if (file.type && file.type.startsWith('image/')) {
                    return `
                        <div class="mb-3">
                            <img src="${file.url}" alt="${Utils.sanitizeHtml(file.name)}" 
                                 class="max-w-xs rounded-lg shadow-sm cursor-pointer"
                                 onclick="this.classList.toggle('max-w-xs'); this.classList.toggle('max-w-full')">
                        </div>
                    `;
                } else {
                    const icon = this.getFileIcon(file.type || file.name);
                    return `
                        <div class="flex items-center space-x-2 bg-white bg-opacity-20 rounded-lg p-2 mb-2">
                            <i class="fas ${icon}"></i>
                            <span class="text-sm font-medium">${Utils.sanitizeHtml(file.name)}</span>
                            <span class="text-xs opacity-75">${Utils.formatFileSize(file.size || 0)}</span>
                        </div>
                    `;
                }
            }).join('');
        }
        
        messageElement.innerHTML = `
            <div class="flex ${alignmentClass}">
                <div class="flex items-start space-x-3 max-w-3xl">
                    ${!isUser ? `
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                    ` : ''}
                    <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'}">
                        <div class="${bgClass} rounded-2xl px-4 py-3 shadow-sm">
                            ${filesHtml}
                            <div class="whitespace-pre-wrap">${Utils.sanitizeHtml(content)}</div>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                            ${Utils.formatTimestamp(timestamp)}
                        </div>
                    </div>
                    ${isUser ? `
                        <div class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-gray-600 dark:text-gray-300 text-sm"></i>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        return messageElement;
    },
    
    createMessagesWrapper() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'max-w-4xl mx-auto space-y-6';
        messagesContainer.appendChild(wrapper);
        
        return wrapper;
    },
    
    getFileIcon(fileType) {
        if (fileType.includes('pdf')) return 'fa-file-pdf text-red-500';
        if (fileType.includes('word') || fileType.includes('docx')) return 'fa-file-word text-blue-500';
        if (fileType.includes('text')) return 'fa-file-text text-gray-500';
        if (fileType.includes('image')) return 'fa-file-image text-green-500';
        return 'fa-file text-gray-500';
    },
    
    async sendMessage(content, files = []) {
        if (!content.trim() && files.length === 0) return;
        
        // Check message limit for free users
        if (!Subscription.checkMessageLimit()) return;
        
        // Create messages wrapper if needed
        if (!document.getElementById('chatMessages').querySelector('.max-w-4xl')) {
            this.createMessagesWrapper();
        }
        
        // Add user message to UI
        const userMessage = {
            content: content,
            role: 'user',
            timestamp: new Date().toISOString(),
            files: files
        };
        
        this.addMessageToDOM(content, 'user', userMessage.timestamp, files);
        
        // Add to current chat or create new one
        if (STATE.currentChatId === null) {
            // Create new chat
            const newChat = {
                title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                timestamp: new Date().toISOString(),
                messages: [userMessage]
            };
            STATE.chatHistory.unshift(newChat);
            STATE.currentChatId = 0;
            document.getElementById('chatTitle').textContent = newChat.title;
        } else {
            // Add to existing chat
            STATE.chatHistory[STATE.currentChatId].messages.push(userMessage);
        }
        
        this.saveChatHistory();
        this.renderChatHistory();
        
        // Clear input and files
        document.getElementById('messageInput').value = '';
        FileUpload.clearUploadedFiles();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Send via WebSocket
        const sent = WebSocketManager.sendMessage(content);
        
        if (!sent) {
            // Fallback to HTTP API
            this.sendMessageHTTP(content);
        }
        
        // Increment message count
        STATE.messageCount++;
    },
    
    async sendMessageHTTP(content) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: Auth.getAuthHeaders(),
                body: JSON.stringify({
                    query: content,
                    userId: localStorage.getItem('voxaroid_userId')
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.handleAssistantMessage(data.response);
            } else {
                Utils.showToast('Failed to send message', 'error');
                this.hideTypingIndicator();
            }
        } catch (error) {
            console.error('Error sending message via HTTP:', error);
            Utils.showToast('Error sending message', 'error');
            this.hideTypingIndicator();
        }
    },
    
    handleAssistantMessage(content) {
        this.hideTypingIndicator();
        
        // Add assistant message to UI
        const assistantMessage = {
            content: content,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            files: []
        };
        
        this.addMessageToDOM(content, 'assistant', assistantMessage.timestamp);
        
        // Add to current chat
        if (STATE.currentChatId !== null) {
            STATE.chatHistory[STATE.currentChatId].messages.push(assistantMessage);
            this.saveChatHistory();
        }
        
        // Text-to-speech for AI responses (if enabled)
        if (Voice.isEnabled()) {
            Voice.speak(content);
        }
    },
    
    showTypingIndicator() {
        document.getElementById('typingIndicator').classList.remove('hidden');
        this.scrollToBottom();
    },
    
    hideTypingIndicator() {
        document.getElementById('typingIndicator').classList.add('hidden');
    },
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    newChat() {
        STATE.currentChatId = null;
        document.getElementById('chatTitle').textContent = 'New Chat';
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="text-center py-20">
                    <div class="voxaroid-icon text-8xl font-bold mb-6">VX</div>
                    <h2 class="text-3xl font-bold mb-4">Welcome to Voxaroid</h2>
                    <p class="text-gray-600 dark:text-gray-400 text-lg">Start a conversation with our AI assistant</p>
                </div>
            </div>
        `;
        
        // Update sidebar to remove active chat highlighting
        this.renderChatHistory();
        
        // Clear any uploaded files
        FileUpload.clearUploadedFiles();
    }
};
