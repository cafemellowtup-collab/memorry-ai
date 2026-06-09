import { state, saveState } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';

export function renderLists() {
  const container = document.getElementById('lists-container');
  if (!container) return;

  container.innerHTML = '';

  state.lists.forEach(list => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.id = `list-card-${list.id}`;

    const completedCount = list.items.filter(i => i.done).length;

    card.innerHTML = `
      <div class="list-header">
        <span class="list-icon">${list.icon}</span>
        <span class="list-name">${escapeHtml(list.name)}</span>
        <span class="list-count">${completedCount}/${list.items.length}</span>
      </div>
      <div class="list-items" id="list-items-${list.id}">
        ${list.items.map(item => `
          <div class="list-item ${item.done ? 'checked-item' : ''}" data-item-id="${item.id}" data-list-id="${list.id}">
            <div class="list-item-check ${item.done ? 'checked' : ''}" role="checkbox" aria-checked="${item.done}" tabindex="0">
              ${item.done ? '✓' : ''}
            </div>
            <span>${escapeHtml(item.text)}</span>
          </div>
        `).join('')}
      </div>
      <div class="list-add-input">
        <input type="text" placeholder="Add item..." data-list-id="${list.id}" aria-label="Add item to ${list.name}" />
        <button class="list-add-btn" data-list-id="${list.id}" aria-label="Add item">+</button>
      </div>
    `;

    // Toggle items
    card.querySelectorAll('.list-item').forEach(item => {
      const check = item.querySelector('.list-item-check');
      const toggle = () => {
        const listId = parseInt(item.dataset.listId);
        const itemId = parseInt(item.dataset.itemId);
        const l = state.lists.find(l => l.id === listId);
        const i = l?.items.find(i => i.id === itemId);
        if (i) {
          i.done = !i.done;
          saveState();
          renderLists();
        }
      };
      check.addEventListener('click', toggle);
      check.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggle(); });
    });

    // Add item
    const addInput = card.querySelector('.list-add-input input');
    const addBtn = card.querySelector('.list-add-input .list-add-btn');

    const addItem = () => {
      const text = addInput.value.trim();
      if (!text) return;
      const l = state.lists.find(l => l.id === list.id);
      if (l) {
        l.items.push({ id: Date.now(), text, done: false });
        saveState();
        renderLists();
      }
      addInput.value = '';
    };

    addBtn.addEventListener('click', addItem);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });

    container.appendChild(card);
  });
}
