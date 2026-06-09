import { state, saveState } from '../core/state.js';
import { showToast, escapeHtml } from '../core/utils.js';
// We will import updateBriefingStats globally or from briefing module
// For safety, we can dispatch events or reference window.updateBriefingStats if not fully modularized yet
// To make it safe during transition, we check window.updateBriefingStats

export function renderReminders(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const toShow = containerId === 'dashboard-reminder-list'
    ? state.reminders.slice(0, 4)
    : state.reminders;

  if (toShow.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:var(--space-8); color:var(--text-muted); font-size:14px;">
      🎉 No reminders! Add one below.
    </div>`;
    return;
  }

  toShow.forEach(r => {
    const item = document.createElement('div');
    item.className = `reminder-item${r.done ? ' done' : ''}`;
    item.setAttribute('data-id', r.id);
    item.innerHTML = `
      <div class="reminder-checkbox ${r.done ? 'checked' : ''}" role="checkbox" aria-checked="${r.done}" tabindex="0" title="Mark as done">
        ${r.done ? '✓' : ''}
      </div>
      <div class="reminder-info">
        <div class="reminder-title">${escapeHtml(r.text)}</div>
        <div class="reminder-meta" style="display:flex; align-items:center; gap:8px;">
          <div class="reminder-time">🕐 ${escapeHtml(r.time)}</div>
          ${r.category ? `<span class="category-badge category-${r.category.toLowerCase()}">${escapeHtml(r.category)}</span>` : ''}
        </div>
      </div>
      <div class="reminder-priority ${r.priority}" title="${r.priority} priority"></div>
      <button class="list-add-btn" style="color:var(--text-muted); font-size:16px;" title="Delete reminder" aria-label="Delete reminder">×</button>
    `;

    const checkbox = item.querySelector('.reminder-checkbox');
    checkbox.addEventListener('click', () => toggleReminder(r.id));
    checkbox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleReminder(r.id); });

    const delBtn = item.querySelector('.list-add-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteReminder(r.id);
    });

    container.appendChild(item);
  });
}

export function toggleReminder(id) {
  const r = state.reminders.find(r => r.id === id);
  if (r) {
    r.done = !r.done;
    saveState();
    renderReminders('dashboard-reminder-list');
    renderReminders('full-reminder-list');
    if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
  }
}

export function deleteReminder(id) {
  state.reminders = state.reminders.filter(r => r.id !== id);
  saveState();
  renderReminders('dashboard-reminder-list');
  renderReminders('full-reminder-list');
  if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
}

export async function parseReminderWithAI(text) {
  const currentApiKey = state.user?.apiKey || 'gsk_...';
  if (currentApiKey === 'gsk_...') {
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|in the morning|in the evening|at night|o'?clock|in the afternoon))\b/i);
    const time = timeMatch ? timeMatch[1].toUpperCase() : 'Today';
    const cleanText = text.replace(/\b(?:at|on|tomorrow|today|next)\b\s*\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|in the morning|in the evening|at night|o'?clock|in the afternoon))\b/i, '').trim();
    return [{ text: cleanText, displayTime: time, localIsoDate: new Date(Date.now() + 3600000).toISOString().slice(0, 23), priority: 'medium', category: 'Other' }];
  }

  try {
    const now = new Date();
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: `You are an advanced AI reminder parser. Your strict job is to extract the core task and precise future time, returning ONLY valid JSON.
Current Local Date/Time: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}

Rules:
1. Clean the 'text' field: REMOVE all time/date words from the task description.
2. Time phrasing: Understand human phrases perfectly. "9 o'clock in the morning", "9 in the morning", and "9am" all mean 09:00 AM.
3. Vague dates: If a day is mentioned without a time (e.g. "tomorrow"), default to 9:00 AM.
4. Output 'localIsoDate' exactly as: "YYYY-MM-DDTHH:mm:00.000" (NO 'Z' at the end).
5. Output 'displayTime' containing the friendly day, month/date, and time: e.g. "Tomorrow (Jun 10) 9:00 AM".
6. Categorize the task into 'category'. Valid categories: Work, Personal, Health, Shopping, Finance, Other.

JSON Schema:
{"reminders": [{"text": "string", "displayTime": "string", "localIsoDate": "string", "priority": "low"|"medium"|"high", "category": "string"}]}` },
          { role: 'user', content: text }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    if (!resp.ok) throw new Error('API Error');
    const data = await resp.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.reminders || [{ text: text, displayTime: 'Today', localIsoDate: new Date(Date.now() + 3600000).toISOString().slice(0, 23), priority: 'medium' }];
  } catch (e) {
    console.error('NLP Parse Error:', e);
    return [{ text, displayTime: 'Today', localIsoDate: new Date(Date.now() + 3600000).toISOString().slice(0, 23), priority: 'medium' }];
  }
}

export async function addReminder(text) {
  if (!text.trim()) return;
  
  showToast('🧠 Thinking...', 1000);
  const parsedReminders = await parseReminderWithAI(text);

  parsedReminders.forEach(parsed => {
    let ts = Date.now() + 3600000;
    try {
      if (parsed.localIsoDate) {
        ts = new Date(parsed.localIsoDate).getTime();
      }
    } catch(e) {}

    const newReminder = {
      id: Date.now() + Math.random(),
      text: parsed.text || text,
      time: parsed.displayTime || parsed.time || 'Today',
      timestamp: ts,
      notified: false,
      priority: parsed.priority || 'medium',
      category: parsed.category || 'Other',
      done: false,
    };
    state.reminders.unshift(newReminder);
  });

  saveState();
  renderReminders('dashboard-reminder-list');
  renderReminders('full-reminder-list');
  if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
  
  if (parsedReminders.length > 1) {
    showToast(`✅ Added ${parsedReminders.length} reminders!`);
  } else if (parsedReminders.length === 1) {
    showToast(`✅ Reminder added for ${parsedReminders[0].time}`);
  }
}

export function setupReminderInputs() {
  const pairs = [
    ['quick-add-reminder', 'quick-add-btn'],
    ['full-add-reminder', 'full-add-btn'],
  ];

  pairs.forEach(([inputId, btnId]) => {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;

    btn.addEventListener('click', () => {
      addReminder(input.value);
      input.value = '';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addReminder(input.value);
        input.value = '';
      }
    });
  });
}
