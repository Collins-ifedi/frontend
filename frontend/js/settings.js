// Settings module
const Settings = {
  init() {
    this.loadSettings();
    this.bindEvents();
  },

  loadSettings() {
    // Apply theme immediately and update toggle UI
    this.applyTheme(STATE.settings.theme);
    this.updateThemeToggle();

    // Apply fonts
    this.applyFontStyle(STATE.settings.fontStyle);
    this.applyFontSize(STATE.settings.fontSize);

    // Dropdown values
    const fontStyle = document.getElementById('fontStyle');
    const fontSize = document.getElementById('fontSize');

    if (fontStyle) {
      fontStyle.innerHTML = `
        <option value="font-sans">Sans Serif</option>
        <option value="font-serif">Serif</option>
        <option value="font-mono">Monospace</option>
      `;
      fontStyle.value = STATE.settings.fontStyle;
    }

    if (fontSize) {
      fontSize.innerHTML = `
        <option value="text-sm">Small</option>
        <option value="text-base">Medium</option>
        <option value="text-lg">Large</option>
      `;
      fontSize.value = STATE.settings.fontSize;
    }
  },

  bindEvents() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    const fontStyle = document.getElementById('fontStyle');
    if (fontStyle) {
      fontStyle.addEventListener('change', (e) => this.changeFontStyle(e.target.value));
    }

    const fontSize = document.getElementById('fontSize');
    if (fontSize) {
      fontSize.addEventListener('change', (e) => this.changeFontSize(e.target.value));
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
      });
    }

    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
      });
    }

    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
          settingsModal.classList.add('hidden');
        }
      });
    }
  },

  toggleTheme() {
    const newTheme = STATE.settings.theme === 'light' ? 'dark' : 'light';
    this.changeTheme(newTheme);
  },

  changeTheme(theme) {
    STATE.settings.theme = theme;
    try {
      localStorage.setItem('voxaroid_theme', theme);
    } catch (e) {}
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
    const toggle = document.getElementById('themeToggle');
    const knob = document.getElementById('themeToggleSpan');
    if (!toggle || !knob) return;

    if (STATE.settings.theme === 'dark') {
      knob.classList.add('translate-x-5');
      toggle.classList.add('bg-blue-600');
      toggle.classList.remove('bg-gray-200');
    } else {
      knob.classList.remove('translate-x-5');
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
  },
};
