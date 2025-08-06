// Settings module
const Settings = {
    init() {
        this.loadSettings();
        this.bindEvents();
    },
    
    loadSettings() {
        // Apply theme
        this.applyTheme(STATE.settings.theme);
        
        // Apply font settings
        this.applyFontStyle(STATE.settings.fontStyle);
        this.applyFontSize(STATE.settings.fontSize);
        
        // Update UI elements
        document.getElementById('fontStyle').value = STATE.settings.fontStyle;
        document.getElementById('fontSize').value = STATE.settings.fontSize;
    },
    
    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Font style change
        document.getElementById('fontStyle').addEventListener('change', (e) => {
            this.changeFontStyle(e.target.value);
        });
        
        // Font size change
        document.getElementById('fontSize').addEventListener('change', (e) => {
            this.changeFontSize(e.target.value);
        });
        
        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('hidden');
        });
        
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('hidden');
        });
        
        // Close modal on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.add('hidden');
            }
        });
    },
    
    toggleTheme() {
        const newTheme = STATE.settings.theme === 'light' ? 'dark' : 'light';
        this.changeTheme(newTheme);
    },
    
    changeTheme(theme) {
        STATE.settings.theme = theme;
        localStorage.setItem('voxaroid_theme', theme);
        this.applyTheme(theme);
        this.updateThemeToggle();
    },
    
    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },
    
    updateThemeToggle() {
        const toggleSpan = document.getElementById('themeToggleSpan');
        if (STATE.settings.theme === 'dark') {
            toggleSpan.classList.add('translate-x-5');
            document.getElementById('themeToggle').classList.add('bg-blue-600');
            document.getElementById('themeToggle').classList.remove('bg-gray-200');
        } else {
            toggleSpan.classList.remove('translate-x-5');
            document.getElementById('themeToggle').classList.remove('bg-blue-600');
            document.getElementById('themeToggle').classList.add('bg-gray-200');
        }
    },
    
    changeFontStyle(fontStyle) {
        STATE.settings.fontStyle = fontStyle;
        localStorage.setItem('voxaroid_fontStyle', fontStyle);
        this.applyFontStyle(fontStyle);
    },
    
    applyFontStyle(fontStyle) {
        // Remove existing font classes
        document.body.classList.remove('font-sans', 'font-serif', 'font-mono');
        // Add new font class
        document.body.classList.add(fontStyle);
    },
    
    changeFontSize(fontSize) {
        STATE.settings.fontSize = fontSize;
        localStorage.setItem('voxaroid_fontSize', fontSize);
        this.applyFontSize(fontSize);
    },
    
    applyFontSize(fontSize) {
        // Remove existing size classes
        document.body.classList.remove('text-sm', 'text-base', 'text-lg');
        // Add new size class
        document.body.classList.add(fontSize);
    },
    
    resetSettings() {
        STATE.settings = {
            theme: 'light',
            fontStyle: 'font-sans',
            fontSize: 'text-base'
        };
        
        // Clear localStorage
        localStorage.removeItem('voxaroid_theme');
        localStorage.removeItem('voxaroid_fontStyle');
        localStorage.removeItem('voxaroid_fontSize');
        
        // Apply defaults
        this.loadSettings();
        
        Utils.showToast('Settings reset to default', 'success');
    }
};
