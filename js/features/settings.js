import { state, saveState } from '../core/state.js';
import { showToast } from '../core/utils.js';
import { updateDateTime, updateContextChips } from './ui.js';

export const STATE_KEY = 'nexmem_state';

export function setupSettings() {
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('settings-name')?.value;
      const email = document.getElementById('settings-email')?.value;
      const apiKey = document.getElementById('settings-api-key')?.value;
      if (name) {
        state.user.name = name;
        updateUserDisplay();
      }
      if (email) state.user.email = email;
      if (apiKey) state.user.apiKey = apiKey;
      saveState();
      updateDateTime();
      updateContextChips();
      showToast('✓ Profile saved!');
    });
  }

  const nameInput  = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  const apiKeyInput = document.getElementById('settings-api-key');
  if (nameInput  && state.user?.name)  nameInput.value  = state.user.name;
  if (emailInput && state.user?.email) emailInput.value = state.user.email;
  if (apiKeyInput) {
    if (state.user?.apiKey) apiKeyInput.value = state.user.apiKey;
    apiKeyInput.addEventListener('input', (e) => {
      state.user.apiKey = e.target.value.trim();
      saveState();
    });
  }

  window.syncUIToggles = function() {
    const sync = (id, isActive) => {
      const toggle = document.getElementById(id);
      if (!toggle) return;
      toggle.setAttribute('aria-checked', isActive.toString());
      toggle.style.background = isActive ? 'var(--gradient-aurora)' : 'var(--neutral-700, #374151)';
      const knob = toggle.querySelector('div');
      if (knob) {
        knob.style.right = isActive ? '3px' : 'calc(100% - 21px)';
      }
    };
    const s = state.settings || {};
    sync('toggle-notifications', !!s.notifications);
    sync('toggle-briefing', !!s.briefing);
    sync('toggle-serendipity', !!s.serendipity);
    sync('toggle-insights', !!s.insights);
  };

  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const current = toggle.getAttribute('aria-checked') === 'true';
      const newState = !current;
      
      state.settings = state.settings || {};
      if (toggle.id === 'toggle-notifications') state.settings.notifications = newState;
      if (toggle.id === 'toggle-briefing') state.settings.briefing = newState;
      if (toggle.id === 'toggle-serendipity') state.settings.serendipity = newState;
      if (toggle.id === 'toggle-insights') state.settings.insights = newState;
      
      saveState();
      window.syncUIToggles();
    });
  });

  const clearBtn = document.getElementById('clear-data-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure? This will permanently delete all your reminders, memories, lists, and settings.')) {
        localStorage.removeItem(STATE_KEY);
        showToast('🗑️ All data cleared. Reloading...');
        setTimeout(() => location.reload(), 1200);
      }
    });
  }

  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      if (window.RAG) window.RAG.signOut();
    });
  }
}

export function updateUserDisplay() {
  const name = state.user?.name || 'You';
  const disp = document.getElementById('user-name-display');
  if (disp) disp.textContent = name;
  const avatar = document.getElementById('user-avatar');
  if (avatar) avatar.textContent = name[0].toUpperCase();
  const settingsAvatar = document.getElementById('settings-avatar');
  if (settingsAvatar) settingsAvatar.textContent = name[0].toUpperCase();
}
