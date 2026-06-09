import { state, loadState, defaultState, saveState } from './core/state.js';
import { syncWithCloud } from './core/sync.js';
import { updateDateTime, setupSearch } from './features/ui.js';
import { renderReminders, setupReminderInputs } from './features/reminders.js';
import { renderMemories, setupMemoryForm } from './features/memories.js';
import { renderLists } from './features/lists.js';
import { updateBriefingStats, checkDailyBriefing, renderSchedule } from './features/briefing.js';
import { updateSerendipity, setupSerendipity } from './features/serendipity.js';
import { setupMoodTracker, setupFocusModes, updateFocusStats, setupFocusTimerInputs } from './features/focus.js';
import { setupSettings, updateUserDisplay } from './features/settings.js';
import { setupAppChat } from './features/chat.js';
import { setupVoiceInput } from './features/voice.js';
import { setupPWA } from './features/pwa.js';

async function init() {
  if (window.RAG) {
    const user = await window.RAG.getCurrentUser();
    if (!user) {
      window.location.replace('login.html');
      return;
    }
    state.user = state.user || {};
    state.user.name = user.user_metadata?.full_name || user.email;
    state.user.email = user.email;
  }

  loadState();

  if (state.settings?.theme) {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }

  await syncWithCloud();

  if (window.RAG && window.RAG.subscribeToRealtime) {
    window.RAG.subscribeToRealtime(() => {
      syncWithCloud();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncWithCloud();
    }
  });

  if (!Array.isArray(state.reminders))   state.reminders   = defaultState.reminders;
  if (!Array.isArray(state.memories))    state.memories    = defaultState.memories;
  if (!Array.isArray(state.lists))       state.lists       = defaultState.lists;
  if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

  updateUserDisplay();
  updateDateTime();
  updateBriefingStats();
  
  // Expose renderReminders globally as it's used by other modules (sync, clear completed)
  window.renderReminders = renderReminders;
  window.updateBriefingStats = updateBriefingStats;
  
  renderReminders('dashboard-reminder-list');
  renderReminders('full-reminder-list');
  renderMemories();
  renderLists();
  updateSerendipity();
  updateFocusStats();
  renderSchedule();
  
  setupReminderInputs();
  setupMemoryForm();
  setupMoodTracker();
  setupFocusModes();
  setupFocusTimerInputs();
  setupSerendipity();
  setupSettings();
  if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
  setupSearch();
  
  setupAppChat();
  setupVoiceInput();
  setupPWA();

  setInterval(updateDateTime, 60000);
  checkDailyBriefing();

  console.log('✦ NexMem Dashboard initialized successfully');
}

window.clearAllData = function() {
  const btn = document.getElementById('clear-data-btn');
  if (btn) btn.click();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
