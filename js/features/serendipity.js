import { state, saveState, serendipityQuotes } from '../core/state.js';
import { escapeHtml, formatDate } from '../core/utils.js';

export function updateSerendipity() {
  const el     = document.getElementById('serendipity-quote');
  const dateEl = document.getElementById('serendipity-date');
  if (!el) return;

  const pool = state.memories.length > 0 ? state.memories : null;

  if (pool) {
    const idx = state.serendipityIndex % pool.length;
    const m   = pool[idx];
    el.textContent = `"${m.text}"`;
    if (dateEl) {
      dateEl.innerHTML = `<span class="serendipity-memory-tag">✦ ${escapeHtml(m.title || 'Memory')} &middot; ${formatDate(m.date)}</span>`;
    }
  } else {
    const q = serendipityQuotes[state.serendipityIndex % serendipityQuotes.length];
    el.textContent = q.text;
    if (dateEl) dateEl.textContent = q.date;
  }
}

export function setupSerendipity() {
  const btn = document.getElementById('new-serendipity');
  if (btn) {
    btn.addEventListener('click', () => {
      const pool = state.memories.length > 0 ? state.memories : serendipityQuotes;
      state.serendipityIndex = (state.serendipityIndex + 1) % pool.length;
      saveState();
      updateSerendipity();
    });
  }
  updateSerendipity();
}
