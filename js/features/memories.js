import { state, saveState } from '../core/state.js';
import { showToast, escapeHtml, formatDate } from '../core/utils.js';

export function renderMemories() {
  const container = document.getElementById('memory-feed-list');
  if (!container) return;

  container.innerHTML = '';

  if (state.memories.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:var(--space-8); color:var(--text-muted); font-size:14px;">
      🧠 No memories yet. Add your first memory!
    </div>`;
    return;
  }

  state.memories.slice().reverse().forEach(m => {
    const item = document.createElement('div');
    item.className = 'memory-item';
    item.setAttribute('data-id', m.id);
    item.innerHTML = `
      <div class="memory-header">
        <div class="memory-title">${escapeHtml(m.title || 'Memory')}</div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="memory-date">${formatDate(m.date)}</div>
          <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;" title="Delete" aria-label="Delete memory">×</button>
        </div>
      </div>
      <p class="memory-text">${escapeHtml(m.text)}</p>
      <div class="memory-tags">
        ${(m.tags || []).map(t => `<span class="memory-tag">#${escapeHtml(t)}</span>`).join('')}
      </div>
    `;

    const del = item.querySelector('button');
    del.addEventListener('click', () => {
      state.memories = state.memories.filter(mem => mem.id !== m.id);
      saveState();
      renderMemories();
      if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
    });

    container.appendChild(item);
  });
}

export function setupMemoryForm() {
  const addBtn = document.getElementById('add-memory-btn');
  const cancelBtn = document.getElementById('cancel-add-memory');
  const saveBtn = document.getElementById('save-memory-btn');
  const form = document.getElementById('add-memory-form');

  if (addBtn) addBtn.addEventListener('click', () => { if (form) form.style.display = 'block'; });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { if (form) form.style.display = 'none'; });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = document.getElementById('memory-title-input')?.value;
      const text = document.getElementById('memory-content-input')?.value;
      const tagsRaw = document.getElementById('memory-tags-input')?.value;

      if (!text?.trim()) return;

      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
      const memory = {
        id: Date.now(),
        title: title || 'Memory',
        text: text.trim(),
        date: new Date().toISOString().split('T')[0],
        tags,
      };

      state.memories.push(memory);
      saveState();
      
      if (window.RAG) {
        window.RAG.saveMemoryToRAG(`Title: ${memory.title}\nText: ${memory.text}\nTags: ${memory.tags.join(',')}`);
      }
      
      renderMemories();
      if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();

      const titleInput = document.getElementById('memory-title-input');
      const contentInput = document.getElementById('memory-content-input');
      const tagsInput = document.getElementById('memory-tags-input');
      
      if(titleInput) titleInput.value = '';
      if(contentInput) contentInput.value = '';
      if(tagsInput) tagsInput.value = '';

      if (form) form.style.display = 'none';
      showToast('🧠 Memory saved!');
    });
  }
}
