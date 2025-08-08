// Settings module
const Settings = {
  init() {
    this.loadSettings();
    this.bindEvents();
  },

  loadSettings() {
    // Apply theme and toggle UI immediately
    this.applyTheme(STATE.settings.theme);
    this.updateThemeToggle();

    // Apply font settings
    this.applyFontStyle(STATE.settings.fontStyle);
    this.applyFontSize(STATE.settings.fontSize);

    // Update UI elements
    const fs = document.getElementById('fontStyle');
    const fz = document.getElementById('fontSize');
    if (fs) fs.value = STATE.settings.fontStyle;
    if (fz) fz.value = STATE.settings.fontSize;
  },

  bindEvents() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Font style change
    const fs = document.getElementById('fontStyle');
    if (fs) {
      fs.addEventListener('change', (e) => this.changeFontStyle(e.target.value));
    }

    // Font size change
    const fz = document.getElementById('fontSize');
    if (fz) {
      fz.addEventListener('change', (e) => this.changeFontSize(e.target.value));
    }

    // Settings modal
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const modal = document.getElementById('settingsModal');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') modal.classList.add('hidden');
      });
    }
  },

  toggleTheme() {
    const newTheme = STATE.settings.theme === 'light' ? 'dark' : 'light';
    this.changeTheme(newTheme);
  },

  changeTheme(theme) {
    STATE.settings.theme = theme;
    try { localStorage.setItem('voxaroid_theme', theme); } catch (e) {}
    this.applyTheme(theme);
    this.updateThemeToggle();
  },

  applyTheme(theme) {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  },

  updateThemeToggle() {
    const toggleSpan = document.getElementById('themeToggleSpan');
    const toggle = document.getElementById('themeToggle');
    if (!toggleSpan || !toggle) return;
    if (STATE.settings.theme === 'dark') {
      toggleSpan.classList.add('translate-x-5');
      toggle.classList.add('bg-blue-600');
      toggle.classList.remove('bg-gray-200');
    } else {
      toggleSpan.classList.remove('translate-x-5');
      toggle.classList.remove('bg-blue-600');
      toggle.classList.add('bg-gray-200');
    }
  },

  changeFontStyle(fontStyle) {
    STATE.settings.fontStyle = fontStyle;
    try { localStorage.setItem('voxaroid_fontStyle', fontStyle); } catch (e) {}
    this.applyFontStyle(fontStyle);
  },

  applyFontStyle(fontStyle) {
    document.body.classList.remove('font-sans', 'font-serif', 'font-mono');
    document.body.classList.add(fontStyle);
  },

  changeFontSize(fontSize) {
    STATE.settings.fontSize = fontSize;
    try { localStorage.setItem('voxaroid_fontSize', fontSize); } catch (e) {}
    this.applyFontSize(fontSize);
  },

  applyFontSize(fontSize) {
    document.body.classList.remove('text-sm', 'text-base', 'text-lg');
    document.body.classList.add(fontSize);
  },

  resetSettings() {
    STATE.settings = { theme: 'light', fontStyle: 'font-sans', fontSize: 'text-base' };
    try {
      localStorage.removeItem('voxaroid_theme');
      localStorage.removeItem('voxaroid_fontStyle');
      localStorage.removeItem('voxaroid_fontSize');
    } catch (e) {}
    this.loadSettings();
    Utils.showToast('Settings reset to default', 'success');
  }
};
