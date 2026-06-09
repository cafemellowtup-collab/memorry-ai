import { state, saveState } from '../core/state.js';

export function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('✅ ServiceWorker registered with scope:', registration.scope);
        
        startReminderChecker(registration);
        startSerendipityChecker(registration);
      } catch (err) {
        console.error('❌ ServiceWorker registration failed:', err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle-notifications');
    if (toggle) {
      const updateToggleUI = (granted) => {
        toggle.setAttribute('aria-checked', granted);
        toggle.style.background = granted ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'var(--neutral-700, #374151)';
        const knob = toggle.querySelector('div');
        if (knob) knob.style.right = granted ? '3px' : 'calc(100% - 21px)';
      };

      if ('Notification' in window) {
        updateToggleUI(Notification.permission === 'granted');
      }

      toggle.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
          // Keep visually in sync if they try to turn it off from UI but need to do it in browser
        } else if (Notification.permission === 'denied') {
          // Blocked by browser
        } else {
          const permission = await Notification.requestPermission();
          updateToggleUI(permission === 'granted');
        }
      });
    }
  });
}

function startReminderChecker(registration) {
  setInterval(() => {
    if (Notification.permission !== 'granted') return;
    
    const nowMs = Date.now();
    let updated = false;

    state.reminders.forEach(r => {
      if (!r.done && r.timestamp && !r.notified && nowMs >= r.timestamp) {
        r.notified = true; 
        updated = true;
        
        const isBlocked = (state.settings && state.settings.notifications === false) || 
                          (state.focusMode === 'deep' || state.focusMode === 'flow');

        if (!isBlocked) {
          if (registration) {
            registration.showNotification('NexMem Reminder', {
              body: r.text,
              icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%237c3aed" width="100" height="100" rx="20"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em" fill="white">✨</text></svg>',
              requireInteraction: true,
              vibrate: [200, 100, 200]
            });
          }
          
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio autoplay blocked by browser'));
          } catch(e) {}
        }
      }
    });

    if (updated) {
      saveState();
    }
  }, 60000);
}

function startSerendipityChecker(registration) {
  setInterval(() => {
    if (Notification.permission !== 'granted') return;
    if (!state.settings || !state.settings.serendipity) return;
    if (state.focusMode === 'deep' || state.focusMode === 'flow') return;
    
    const nowMs = Date.now();
    const lastFired = state.lastSerendipityMs || 0;
    
    if (nowMs - lastFired > 120000) { 
      if (!state.memories || state.memories.length === 0) return;
      
      const randomMemory = state.memories[Math.floor(Math.random() * state.memories.length)];
      state.lastSerendipityMs = nowMs;
      saveState();
      
      if (registration) {
        registration.showNotification('✨ Serendipity', {
          body: `Remember this?\n"${randomMemory.text}"`,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%237c3aed" width="100" height="100" rx="20"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em" fill="white">✨</text></svg>',
          requireInteraction: false,
          vibrate: [100, 50, 100]
        });
      }
    }
  }, 60000);
}
