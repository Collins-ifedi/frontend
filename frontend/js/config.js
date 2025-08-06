// Configuration
const CONFIG = {
    API_BASE_URL: 'https://voxai-umxl.onrender.com',
    WS_URL: 'wss://voxai-umxl.onrender.com/ws',
    BREVO_API_KEY: 'your-brevo-api-key-here', // This is handled by backend
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx', '.txt'],
    VOICE_RECOGNITION_LANG: 'en-US',
    FREE_MESSAGE_LIMIT: 10, // Messages per day for free users
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000
};

// Global application state
const STATE = {
    currentUser: null,
    currentChatId: null,
    isConnected: false,
    isRecording: false,
    uploadedFiles: [],
    chatHistory: [],
    messageCount: 0,
    settings: {
        theme: localStorage.getItem('voxaroid_theme') || 'light',
        fontStyle: localStorage.getItem('voxaroid_fontStyle') || 'font-sans',
        fontSize: localStorage.getItem('voxaroid_fontSize') || 'text-base'
    }
};
