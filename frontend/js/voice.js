// Voice input and output functionality
const Voice = {
    recognition: null,
    synthesis: null,
    isRecording: false,
    isEnabled: false,
    
    // Initialize voice features
    init() {
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        this.bindEvents();
    },
    
    // Initialize speech recognition
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = CONFIG.VOICE_RECOGNITION_LANG;
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateVoiceButton(true);
                Utils.showToast('Listening...', 'info', 2000);
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                const messageInput = document.getElementById('messageInput');
                if (finalTranscript) {
                    messageInput.value = finalTranscript;
                    messageInput.focus();
                } else if (interimTranscript) {
                    messageInput.placeholder = `Listening: "${interimTranscript}"`;
                }
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateVoiceButton(false);
                document.getElementById('messageInput').placeholder = 'Type your message...';
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.updateVoiceButton(false);
                
                let errorMessage = 'Voice recognition error';
                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not accessible. Please check permissions.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please enable microphone permissions.';
                        break;
                    default:
                        errorMessage = `Voice recognition error: ${event.error}`;
                }
                
                Utils.showToast(errorMessage, 'error');
            };
            
            this.isEnabled = true;
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    },
    
    // Initialize speech synthesis
    initSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
            this.isEnabled = true;
        } else {
            console.warn('Speech synthesis not supported in this browser');
        }
    },
    
    // Bind event listeners
    bindEvents() {
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.toggleRecording();
        });
    },
    
    // Toggle voice recording
    toggleRecording() {
        if (!this.recognition) {
            Utils.showToast('Voice recognition not supported in this browser', 'error');
            return;
        }
        
        // Check if user has pro plan for voice features
        if (Subscription.currentPlan === 'free') {
            Utils.showToast('Voice features are available for Pro users only', 'warning');
            Subscription.showSubscriptionModal();
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    },
    
    // Update voice button appearance
    updateVoiceButton(isRecording) {
        const voiceBtn = document.getElementById('voiceBtn');
        const icon = voiceBtn.querySelector('i');
        
        if (isRecording) {
            icon.className = 'fas fa-stop';
            voiceBtn.classList.add('voice-recording', 'text-red-500');
        } else {
            icon.className = 'fas fa-microphone';
            voiceBtn.classList.remove('voice-recording', 'text-red-500');
        }
    },
    
    // Speak text using text-to-speech
    speak(text) {
        if (!this.synthesis || !text) return;
        
        // Check if user has pro plan for voice features
        if (Subscription.currentPlan === 'free') {
            return; // Silently skip for free users
        }
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // Use a pleasant voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') ||
            (voice.lang.startsWith('en') && voice.name.includes('Female'))
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        utterance.onstart = () => {
            console.log('Speech synthesis started');
        };
        
        utterance.onend = () => {
            console.log('Speech synthesis ended');
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
        };
        
        this.synthesis.speak(utterance);
    },
    
    // Stop current speech
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    },
    
    // Check if voice features are enabled
    isEnabled() {
        return this.isEnabled && Subscription.currentPlan === 'pro';
    }
};
