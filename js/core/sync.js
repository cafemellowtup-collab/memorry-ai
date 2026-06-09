import { state, STATE_KEY } from './state.js';
import { renderReminders } from '../features/reminders.js';
import { updateBriefingStats } from '../features/briefing.js';
import { updateUserDisplay } from '../features/settings.js';

export async function syncWithCloud() {
  if (window.RAG) {
    let fullSyncTriggered = false;
    let addedMemories = false;

    if (window.RAG.fetchJsonState) {
      const cloudState = await window.RAG.fetchJsonState();
      if (cloudState) {
        if (cloudState.reminders) {
          state.reminders = cloudState.reminders;
          state.reminders.sort((a, b) => b.id - a.id);
        }
        if (cloudState.lists) {
          state.lists = cloudState.lists;
          state.lists.sort((a, b) => b.id - a.id);
        }
        if (cloudState.chatHistory) {
          if (cloudState.chatHistory.length > state.chatHistory.length) {
            state.chatHistory = cloudState.chatHistory;
          }
        }
        if (cloudState.user) state.user = cloudState.user;
        
        fullSyncTriggered = true;
        console.log('☁️ Successfully merged Full App State from JSON table!');
      }
    }

    const cloudMemories = await window.RAG.fetchAllMemoriesFromCloud();
    if (cloudMemories && cloudMemories.length > 0) {
      const existingTexts = new Set(state.memories.map(m => m.text));
      
      cloudMemories.forEach(cm => {
        let memText = cm.content;
        let memTitle = 'Cloud Memory';
        let memTags = ['synced'];
        
        if (cm.content.startsWith('Title: ')) {
          const lines = cm.content.split('\n');
          memTitle = lines[0].replace('Title: ', '').trim();
          memText = lines[1] ? lines[1].replace('Text: ', '').trim() : cm.content;
          if (lines[2]) {
             const tagStr = lines[2].replace('Tags: ', '').trim();
             if (tagStr) memTags = tagStr.split(',').map(t => t.trim());
          }
        }

        if (!existingTexts.has(memText)) {
          state.memories.unshift({
            id: cm.id || Date.now() + Math.random(),
            title: memTitle,
            text: memText,
            date: cm.created_at ? cm.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            tags: memTags
          });
          addedMemories = true;
        }
      });
    }

    if (addedMemories || fullSyncTriggered) {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      
      if (typeof window.renderReminders === 'function') {
        window.renderReminders('dashboard-reminder-list');
        window.renderReminders('full-reminder-list');
      } else {
        renderReminders('dashboard-reminder-list');
        renderReminders('full-reminder-list');
      }
      
      updateUserDisplay();
      updateBriefingStats();
      console.log('🔄 Cloud Sync Complete: UI perfectly updated!');
    }
  }
}
