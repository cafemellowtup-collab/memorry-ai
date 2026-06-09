/* =====================================================
   NexMem — App Dashboard JS
   All dashboard logic, localStorage, AI chat, etc.
   ===================================================== */

'use strict';

// ===========================
// STATE MANAGEMENT
// ===========================
const STATE_KEY = 'nexmem_state';

const defaultState = {
  user: { name: 'You', email: '' },
  reminders: [
    { id: 1, text: 'Review project proposal', time: '2:00 PM', priority: 'high', done: false },
    { id: 2, text: 'Call dentist for appointment', time: '10:00 AM', priority: 'medium', done: false },
    { id: 3, text: 'Gym session', time: '6:00 PM', priority: 'low', done: false },
    { id: 4, text: 'Read chapter 3 of Atomic Habits', time: '9:00 PM', priority: 'low', done: true },
  ],
  memories: [
    { id: 1, title: 'Product Ideas', text: 'AI-powered memory apps have huge market potential. Focus on the "second brain" angle and serendipity feature differentiation.', date: '2025-06-01', tags: ['ideas', 'product', 'AI'] },
    { id: 2, title: 'Book Recommendation', text: 'Sarah recommended "The Extended Mind" by Annie Paul. About how thinking happens outside the brain. Very relevant.', date: '2025-05-28', tags: ['books', 'reading'] },
    { id: 3, title: 'Goal: Morning Routine', text: 'Wake up at 6:30, 10 mins meditation, 20 mins reading, then work. This combination has been most energizing.', date: '2025-05-20', tags: ['habits', 'morning', 'goals'] },
    { id: 4, title: 'Meeting Notes', text: 'Client meeting with Acme Corp. They want the MVP by Q3. Focus on core features first, avoid scope creep.', date: '2025-06-03', tags: ['work', 'client', 'meetings'] },
  ],
  lists: [
    { id: 1, name: 'Grocery', icon: '🛒', items: [
      { id: 1, text: 'Oat milk', done: false },
      { id: 2, text: 'Greek yogurt', done: false },
      { id: 3, text: 'Almonds', done: true },
      { id: 4, text: 'Blueberries', done: false },
    ]},
    { id: 2, name: 'Work Tasks', icon: '💼', items: [
      { id: 1, text: 'Finish design mockups', done: false },
      { id: 2, text: 'Review PR #142', done: true },
      { id: 3, text: 'Update roadmap doc', done: false },
    ]},
    { id: 3, name: 'Ideas', icon: '💡', items: [
      { id: 1, text: 'Blog post: AI productivity tools', done: false },
      { id: 2, text: 'Weekend project: CLI tool', done: false },
    ]},
    { id: 4, name: 'Reading', icon: '📚', items: [
      { id: 1, text: 'The Extended Mind', done: false },
      { id: 2, text: 'Atomic Habits (re-read)', done: true },
      { id: 3, text: 'Deep Work', done: false },
    ]},
  ],
  mood: null,
  focusMode: 'off',
  serendipityIndex: 0,
  chatHistory: [],
  settings: { briefing: true, serendipity: true, insights: true },
  focusSessions: 0,
  streak: 1,
  focusMinutes: 0,
};

const serendipityQuotes = [
  { text: '"The goal is not to be better than the other man, but your previous self." — A memory from May 3rd.', date: 'May 3, 2025' },
  { text: '"I want to build something I\'d use every single day." — A goal you wrote down on March 15th.', date: 'March 15, 2025' },
  { text: '"The extended mind — thinking happens outside the brain. Leverage tools as cognitive extensions." — Book note from April 28th.', date: 'April 28, 2025' },
  { text: '"Mornings are my superpower. Protect them fiercely." — Insight noted on May 20th.', date: 'May 20, 2025' },
  { text: '"Every expert was once a beginner. Keep shipping, keep learning." — A note to self from February 12th.', date: 'February 12, 2025' },
];

const aiInsights = [
  "✦ You're most productive on Fridays — consider protecting that time for deep work.",
  "✦ You've completed 87% of reminders this week. That's your best streak yet!",
  "✦ 3 reminders pending for today. Start with the high-priority one to free mental space.",
  "✦ Pattern detected: You tend to remember your best ideas in the evening. Consider journaling before sleep.",
  "✦ Your focus sessions have doubled this week. Great momentum — keep it going!",
];

let state = {};

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = Object.assign({}, defaultState, parsed);
      // Deep merge arrays
      if (!parsed.reminders) state.reminders = defaultState.reminders;
      if (!parsed.memories) state.memories = defaultState.memories;
      if (!parsed.lists) state.lists = defaultState.lists;
    } else {
      state = JSON.parse(JSON.stringify(defaultState));
    }
  } catch(e) {
    state = JSON.parse(JSON.stringify(defaultState));
  }
}

let syncTimeout;

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    // Trigger debounced cloud sync for Full App State
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushStateToCloud();
    }, 2000);
  } catch(e) {}
}

async function pushStateToCloud() {
  if (!window.RAG || !window.RAG.supabaseClient) return;
  if (!window.RAG.userId) {
    await window.RAG.getCurrentUser();
    if (!window.RAG.userId) return;
  }

  // Clone state and remove memories (synced via Vector DB)
  const stateToSync = { ...state };
  delete stateToSync.memories;

  await window.RAG.pushJsonState(stateToSync);
}

function clearAllData() {
  localStorage.removeItem(STATE_KEY);
  location.reload();
}

// ===========================
// SIDEBAR NAVIGATION
// ===========================
(function() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  let collapsed = false;
  let mobileOpen = false;

  // Desktop toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      sidebar.classList.toggle('collapsed', collapsed);
      toggle.textContent = collapsed ? '›' : '‹';
      toggle.setAttribute('aria-expanded', !collapsed);
    });
  }

  // Mobile hamburger (topbar)
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      mobileOpen = !mobileOpen;
      sidebar.classList.toggle('mobile-open', mobileOpen);
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      mobileOpen = false;
      sidebar.classList.remove('mobile-open');
    });
  }

  // Panel switching
  const navItems = document.querySelectorAll('.nav-item[data-panel]');
  const panels = document.querySelectorAll('.panel-view');
  const topbarTitle = document.getElementById('topbar-title');

  const panelTitles = {
    dashboard: 'Dashboard',
    chat: 'AI Chat',
    reminders: 'Reminders',
    memories: 'Memories',
    lists: 'Lists',
    focus: 'Focus Modes',
    briefing: 'Daily Briefing',
    settings: 'Settings',
  };

  function switchPanel(panelId) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panelId);
      item.setAttribute('aria-current', item.dataset.panel === panelId ? 'page' : 'false');
    });

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${panelId}`);
    });

    if (topbarTitle) topbarTitle.textContent = panelTitles[panelId] || 'Dashboard';

    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
      mobileOpen = false;
      sidebar.classList.remove('mobile-open');
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.panel));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchPanel(item.dataset.panel);
      }
    });
  });

  // "View all reminders" shortcut
  const viewAllReminders = document.getElementById('view-all-reminders');
  if (viewAllReminders) {
    viewAllReminders.addEventListener('click', () => switchPanel('reminders'));
  }

})();

// ===========================
// DATE / GREETING
// ===========================
function updateDateTime() {
  const now = new Date();
  const hour = now.getHours();
  let greeting;
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  const name = state.user?.name || 'You';
  const greetingText = `${greeting}, ${name}! ${hour < 12 ? '☀️' : hour < 17 ? '⛅' : '🌙'}`;

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Update all greeting elements
  ['briefing-greeting', 'full-briefing-greeting'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = greetingText;
  });

  ['briefing-date', 'full-briefing-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${dateStr} · ${timeStr}`;
  });

  const topDate = document.getElementById('topbar-date');
  if (topDate) topDate.textContent = dateStr;
}

// ===========================
// STATS / BRIEFING
// ===========================
function updateBriefingStats() {
  const pending = state.reminders.filter(r => !r.done).length;
  const total = state.memories.length;

  const bsTasks = document.getElementById('bs-tasks');
  const bsMeetings = document.getElementById('bs-meetings');
  const bsMemories = document.getElementById('bs-memories');

  if (bsTasks) bsTasks.textContent = pending;
  if (bsMeetings) bsMeetings.textContent = 2; // demo value
  if (bsMemories) bsMemories.textContent = total;

  // AI insight
  const insightEl = document.getElementById('insight-text');
  const fullInsightEl = document.getElementById('full-insight');
  const insight = aiInsights[Math.floor(Math.random() * aiInsights.length)];
  if (insightEl) insightEl.textContent = insight;
  if (fullInsightEl) fullInsightEl.textContent = insight;

  // Reminder badge
  const badge = document.getElementById('reminder-badge');
  if (badge) badge.textContent = pending;
  const countBadge = document.getElementById('reminder-count-badge');
  if (countBadge) countBadge.textContent = `${pending} pending`;

  // Briefing text
  const briefingText = document.getElementById('full-briefing-text');
  if (briefingText) {
    briefingText.innerHTML = `
      You have <strong style="color:var(--primary-400)">${pending} tasks</strong> on your list today and <strong style="color:var(--accent-400)">2 meetings</strong> on your calendar.
      Your memory bank holds <strong style="color:var(--fuchsia-400)">${total} memories</strong> — and they're all working for you behind the scenes.
      <br/><br/>
      Based on your patterns, your peak focus window is <strong>9–11am</strong>. I recommend tackling your most important task during that time.
      You've maintained a <strong style="color:var(--primary-400)">${state.streak || 1}-day streak</strong> of checking in — keep it going! 🔥
    `;
  }
}

// ===========================
// REMINDERS
// ===========================
function renderReminders(containerId) {
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
        <div class="reminder-time">🕐 ${escapeHtml(r.time)}</div>
      </div>
      <div class="reminder-priority ${r.priority}" title="${r.priority} priority"></div>
      <button class="list-add-btn" style="color:var(--text-muted); font-size:16px;" title="Delete reminder" aria-label="Delete reminder">×</button>
    `;

    // Toggle done
    const checkbox = item.querySelector('.reminder-checkbox');
    checkbox.addEventListener('click', () => toggleReminder(r.id));
    checkbox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleReminder(r.id); });

    // Delete
    const delBtn = item.querySelector('.list-add-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteReminder(r.id);
    });

    container.appendChild(item);
  });
}

function toggleReminder(id) {
  const r = state.reminders.find(r => r.id === id);
  if (r) {
    r.done = !r.done;
    saveState();
    renderReminders('dashboard-reminder-list');
    renderReminders('full-reminder-list');
    updateBriefingStats();
  }
}

function deleteReminder(id) {
  state.reminders = state.reminders.filter(r => r.id !== id);
  saveState();
  renderReminders('dashboard-reminder-list');
  renderReminders('full-reminder-list');
  updateBriefingStats();
}

async function parseReminderWithAI(text) {
  const currentApiKey = state.user?.apiKey || 'gsk_...';
  if (currentApiKey === 'gsk_...') {
    // Fallback to basic if no API key
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
    const time = timeMatch ? timeMatch[1].toUpperCase() : 'Today';
    const cleanText = text.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i, '').trim();
    // Default to +1 hour for fallback timestamp
    return [{ text: cleanText, displayTime: time, isoDate: new Date(Date.now() + 3600000).toISOString(), priority: 'medium' }];
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
          { role: 'system', content: `You are an AI reminder parser. Return ONLY a valid JSON object containing an array of reminders. 
Extract the reminder task and exact time(s) from the user's text. If the user mentions multiple dates/times, create multiple reminder objects.
Current Date/Time String: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
You MUST calculate the precise future LOCAL date string for each reminder. OMIT the 'Z' at the end of the isoDate so it stays in Local Time.
Vague dates rules: If user says "last week of December", default to the Monday of that week at 9:00 AM. If they say "next month", default to the 1st of that month at 9:00 AM. Always make a logical decision.
JSON format: {"reminders": [{"text": "Cleaned task description", "displayTime": "Tomorrow (Jun 10) 1:45 PM", "localIsoDate": "YYYY-MM-DDTHH:mm:00.000", "priority": "low" | "medium" | "high"}]}
Ensure displayTime always includes the exact Month and Day (e.g., "Next Wed (Jun 17) 1:20 PM") so there is no ambiguity.` },
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
    return [{ text, displayTime: 'Today', localIsoDate: new Date(Date.now() + 3600000).toISOString().slice(0, 23), priority: 'medium' }]; // Fallback
  }
}

async function addReminder(text) {
  if (!text.trim()) return;
  
  showToast('🧠 Thinking...', 1000);
  const parsedReminders = await parseReminderWithAI(text);

  parsedReminders.forEach(parsed => {
    // Attempt to safely parse the localIsoDate (without 'Z') to force Local Time parsing
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
      done: false,
    };
    state.reminders.unshift(newReminder);
  });

  saveState();
  renderReminders('dashboard-reminder-list');
  renderReminders('full-reminder-list');
  updateBriefingStats();
  
  if (parsedReminders.length > 1) {
    showToast(`✅ Added ${parsedReminders.length} reminders!`);
  } else if (parsedReminders.length === 1) {
    showToast(`✅ Reminder added for ${parsedReminders[0].time}`);
  }
}

// Setup reminder inputs
function setupReminderInputs() {
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

// ===========================
// MEMORIES
// ===========================
function renderMemories() {
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
      updateBriefingStats();
    });

    container.appendChild(item);
  });
}

function setupMemoryForm() {
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
      
      // Async sync to RAG (Supabase + Vector)
      if (window.RAG) {
        window.RAG.saveMemoryToRAG(`Title: ${memory.title}\nText: ${memory.text}\nTags: ${memory.tags.join(',')}`);
      }
      
      renderMemories();
      updateBriefingStats();

      // Reset form
      document.getElementById('memory-title-input').value = '';
      document.getElementById('memory-content-input').value = '';
      document.getElementById('memory-tags-input').value = '';
      if (form) form.style.display = 'none';
      showToast('🧠 Memory saved!');
    });
  }
}

// ===========================
// LISTS
// ===========================
function renderLists() {
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

// ===========================
// MOOD TRACKER
// ===========================
function setupMoodTracker() {
  const btns = document.querySelectorAll('.mood-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = parseInt(btn.dataset.mood);
      state.mood = mood;
      saveState();
      btns.forEach(b => b.classList.toggle('selected', b.dataset.mood === btn.dataset.mood));
      showToast('😊 Mood logged!');

    const chip = document.getElementById('chip-4');
    const moodMap = { 1: '😄 Great', 2: '🙂 Good', 3: '😐 Okay', 4: '😔 Meh', 5: '😩 Rough' };
    if (chip) chip.textContent = state.mood ? moodMap[state.mood] : '😊 Mood: Not set';
    updateContextChips();
    updateBriefingStats();
    });

    // Restore saved mood
    if (state.mood && parseInt(btn.dataset.mood) === state.mood) {
      btn.classList.add('selected');
    }
  });
}

// ===========================
// FOCUS MODES
// ===========================
function setupFocusModes() {
  const allBtns = document.querySelectorAll('.focus-mode-btn[data-mode]');

  function setMode(mode) {
    state.focusMode = mode;
    saveState();
    allBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    const labels = { off: 'Off', deep: 'Deep Work', flow: 'Flow', rest: 'Rest' };
    updateContextChips();
    showToast(`🎯 Focus Mode: ${labels[mode] || 'Off'}`);
  }

  allBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
    // Restore saved mode
    if (state.focusMode && btn.dataset.mode === state.focusMode) {
      btn.classList.add('active');
    }
  });
}

// ===========================
// SERENDIPITY — pulls from real memories
// ===========================
function updateSerendipity() {
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
    // Fallback to curated quotes if no memories yet
    const q = serendipityQuotes[state.serendipityIndex % serendipityQuotes.length];
    el.textContent = q.text;
    if (dateEl) dateEl.textContent = q.date;
  }
}

function setupSerendipity() {
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

// ===========================
// LIVE CONTEXT CHIPS — update to reflect current state
// ===========================
function updateContextChips() {
  const pending = (state.reminders || []).filter(r => !r.done).length;
  const moodMap = { 1: '😄 Great', 2: '🙂 Good', 3: '😐 Okay', 4: '😔 Meh', 5: '😩 Rough' };
  const focusMap = { off: 'Off', deep: 'Deep Work', flow: 'Flow', rest: 'Rest' };

  const c1 = document.getElementById('chip-1');
  const c2 = document.getElementById('chip-2');
  const c3 = document.getElementById('chip-3');
  const c4 = document.getElementById('chip-4');

  if (c1) c1.textContent = `📋 ${pending} task${pending !== 1 ? 's' : ''} today`;
  if (c2) c2.textContent = `🔔 ${pending} upcoming reminder${pending !== 1 ? 's' : ''}`;
  if (c3) c3.textContent = `🎯 Focus: ${focusMap[state.focusMode] || 'Off'}`;
  if (c4) c4.textContent = state.mood ? `${moodMap[state.mood]}` : '😊 Mood: Not set';
}

// ===========================
// AI CHAT (APP) — Live Gemini API
// Defined as a function, called from init() AFTER state is loaded
// ===========================
function setupAppChat() {
  const input = document.getElementById('app-chat-input');
  const sendBtn = document.getElementById('app-chat-send');
  const messages = document.getElementById('app-chat-messages');
  if (!input || !sendBtn || !messages) return;

  const GEMINI_MODEL   = 'gemini-2.5-flash';

  // Ensure chatHistory is always an array
  if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

  // Build a system prompt from the user's real data
  function buildSystemPrompt() {
    const name    = state.user?.name || 'the user';
    const pending = (state.reminders || []).filter(r => !r.done).map(r => `• ${r.text} (${r.time})`).join('\n') || 'None';
    const done    = (state.reminders || []).filter(r =>  r.done).map(r => `• ${r.text}`).join('\n') || 'None';
    const mems    = (state.memories  || []).slice(-6).map(m => `• [${m.title}]: ${m.text}`).join('\n') || 'None';
    const moodMap = ['', 'Great 😄', 'Good 🙂', 'Okay 😐', 'Meh 😔', 'Rough 😩'];
    const mood    = state.mood ? moodMap[state.mood] : 'Not logged today';
    const focus   = state.focusMode || 'off';
    const lists   = (state.lists || []).map(l => `${l.name}: ${l.items.filter(i => !i.done).map(i => i.text).join(', ')}`).join('\n') || 'None';

    return `You are NexMem AI — a brilliant, warm, and insightful personal memory assistant. You are having a conversation with ${name}.

You have full knowledge of ${name}'s current state:

PENDING REMINDERS:
${pending}

COMPLETED REMINDERS:
${done}

RECENT MEMORIES (their second brain):
${mems}

ACTIVE LISTS:
${lists}

TODAY'S MOOD: ${mood}
FOCUS MODE: ${focus}
FOCUS SESSIONS TODAY: ${state.focusSessions || 0}
DAY STREAK: ${state.streak || 1} days

GUIDELINES:
- Be warm, concise, and genuinely helpful — like a brilliant assistant who truly knows them
- Reference their actual data naturally when relevant (e.g. their reminders, memories, mood)
- When they ask you to add a reminder or memory, acknowledge it warmly and guide them to use the sidebar panels
- Use occasional emojis to keep things friendly, but don't overdo it
- Give actionable, specific advice based on their real data
- Keep responses under 150 words unless they ask for detail
- Format with **bold** for emphasis when helpful
- You are powered by Groq Llama 3`;
  }

  // Rolling conversation context for multi-turn chat
  let aiHistory = [];

  // Restore previous chat messages to the UI and seed history
  if (state.chatHistory.length > 0) {
    state.chatHistory.slice(-10).forEach(msg => addMsg(msg.text, msg.role));
    state.chatHistory.slice(-20).forEach(msg => {
      aiHistory.push({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.text
      });
    });
  }

  function addMsg(text, role) {
    const msg    = document.createElement('div');
    msg.className = `chat-msg ${role}`;

    const avatar  = document.createElement('div');
    avatar.className = `msg-avatar ${role === 'ai' ? 'ai' : 'usr'}`;
    avatar.textContent = role === 'ai' ? '✦' : (state.user?.name?.[0]?.toUpperCase() || 'Y');
    avatar.setAttribute('aria-label', role === 'ai' ? 'NexMem AI' : 'You');

    const bubble  = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = (text || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,    '<em>$1</em>')
      .replace(/\n/g,            '<br/>');

    if (role === 'ai') { msg.appendChild(avatar); msg.appendChild(bubble); }
    else               { msg.appendChild(bubble); msg.appendChild(avatar); }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.id = 'app-typing';
    t.className = 'chat-msg ai';
    t.innerHTML = `<div class="msg-avatar ai" aria-hidden="true">✦</div>
      <div class="msg-bubble"><div class="chat-typing">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div></div>`;
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('app-typing');
    if (t) t.remove();
  }

  function streamTextIntoBubble(bubble, fullText) {
    const words = (fullText || '').split(' ');
    let i = 0;
    bubble.innerHTML = '';
    const iv = setInterval(() => {
      if (i < words.length) {
        bubble.innerHTML = words.slice(0, i + 1).join(' ')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g,    '<em>$1</em>')
          .replace(/\n/g,            '<br/>');
        messages.scrollTop = messages.scrollHeight;
        i++;
      } else {
        clearInterval(iv);
      }
    }, 18);
  }

  async function callGemini(textOrObj) {
    let userText = '';
    let ragContext = '';
    if (typeof textOrObj === 'object') {
      userText = textOrObj.text;
      ragContext = textOrObj.ragContext || '';
    } else {
      userText = textOrObj;
    }
    aiHistory.push({ role: 'user', content: userText });

    const currentApiKey = state.user?.apiKey || 'gsk_...';
    
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildSystemPrompt() + (ragContext ? `\n\n[RAG Semantic Memory Context]:\n${ragContext}` : '') },
          ...aiHistory
        ],
        temperature: 0.8,
        max_tokens: 400,
        top_p: 0.9
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content
               || 'I had trouble processing that. Please try again.';

    aiHistory.push({ role: 'assistant', content: text });
    if (aiHistory.length > 20) aiHistory = aiHistory.slice(-20);
    return text;
  }

  async function sendMsg() {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;

    sendBtn.disabled  = true;
    sendBtn.style.opacity = '0.5';
    input.disabled    = true;

    addMsg(text, 'user');
    input.value = '';
    input.style.height = 'auto';

    if (!state.chatHistory) state.chatHistory = [];
    state.chatHistory.push({ text, role: 'user' });
    if (state.chatHistory.length > 50) state.chatHistory = state.chatHistory.slice(-50);

    showTyping();
    try {
      let ragContext = '';
      if (window.RAG) {
        const matches = await window.RAG.searchMemories(text);
        if (matches && matches.length > 0) {
          ragContext = matches.map(m => `- ${m.content}`).join('\n');
          console.log('RAG Matches found:', matches);
        }
      }

      const aiText = await callGemini({ text, ragContext });
      removeTyping();

      // Build response bubble and stream text into it
      const msg    = document.createElement('div');
      msg.className = 'chat-msg ai';
      const av     = document.createElement('div');
      av.className  = 'msg-avatar ai';
      av.textContent = '✦';
      av.setAttribute('aria-label', 'NexMem AI');
      const bub    = document.createElement('div');
      bub.className = 'msg-bubble';
      msg.appendChild(av);
      msg.appendChild(bub);
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
      streamTextIntoBubble(bub, aiText);

      state.chatHistory.push({ text: aiText, role: 'ai' });
      saveState();
    } catch (err) {
      removeTyping();
      console.error('Groq API error:', err);
      addMsg(`⚠️ Groq error: ${err.message}`, 'ai');
    } finally {
      sendBtn.disabled  = false;
      sendBtn.style.opacity = '1';
      input.disabled    = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMsg);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Live AI badge
  const chips = document.getElementById('memory-chips');
  if (chips) {
    const badge = document.createElement('span');
    badge.className  = 'memory-chip';
    badge.style.cssText = 'background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#10b981;';
    badge.innerHTML = '🟢 Groq &mdash; Llama 3 70B';
    chips.appendChild(badge);
  }
}

// ===========================
// NOTIFICATIONS PANEL
// ===========================
function setupNotifications() {
  const btn = document.getElementById('notif-btn');
  const dropdown = document.getElementById('notif-dropdown');
  const clearBtn = document.getElementById('clear-notifs');

  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.style.display === 'none' || !dropdown.style.display;
    dropdown.style.display = open ? 'block' : 'none';
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
    if (btn) btn.setAttribute('aria-expanded', false);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const list = document.getElementById('notif-list');
      if (list) list.innerHTML = `<div style="padding:var(--space-5); text-align:center; color:var(--text-muted); font-size:14px;">✓ All caught up!</div>`;
    });
  }
}

// ===========================
// SETTINGS
// ===========================
function setupSettings() {
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('settings-name')?.value;
      const email = document.getElementById('settings-email')?.value;
      const apiKey = document.getElementById('settings-api-key')?.value;
      if (name) {
        state.user.name = name;
        // Update UI
        const disp = document.getElementById('user-name-display');
        if (disp) disp.textContent = name;
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.textContent = name[0].toUpperCase();
        const settingsAvatar = document.getElementById('settings-avatar');
        if (settingsAvatar) settingsAvatar.textContent = name[0].toUpperCase();
      }
      if (email) state.user.email = email;
      if (apiKey) state.user.apiKey = apiKey;
      saveState();
      updateDateTime();
      updateContextChips();
      showToast('✓ Profile saved!');
    });
  }

  // Load saved values
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

  // Toggle switches
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const current = toggle.getAttribute('aria-checked') === 'true';
      toggle.setAttribute('aria-checked', !current);
      toggle.style.background      = !current ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'var(--neutral-700, #374151)';
      toggle.querySelector('div').style.right = !current ? '3px' : 'calc(100% - 21px)';
    });
  });

  // ── Clear All Data ─────────────────────────────
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
}

// ===========================
// FOCUS TIMER
// ===========================
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;

function updateTimerDisplay() {
  const el = document.getElementById('focus-timer-display');
  if (!el) return;
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const secs = (timerSeconds % 60).toString().padStart(2, '0');
  el.textContent = `${mins}:${secs}`;
}

function startTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    const btn = document.getElementById('timer-start');
    if (btn) btn.textContent = '▶ Start';
    return;
  }

  timerRunning = true;
  const btn = document.getElementById('timer-start');
  if (btn) btn.textContent = '⏸ Pause';

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSeconds = 25 * 60;
      updateTimerDisplay();
      state.focusSessions = (state.focusSessions || 0) + 1;
      state.focusMinutes  = (state.focusMinutes  || 0) + 25;
      saveState();
      updateFocusStats();
      showToast('🎉 Focus session complete! Great work!');
      const b = document.getElementById('timer-start');
      if (b) b.textContent = '▶ Start';
    }
  }, 1000);
}
// Expose to global scope for onclick handlers in HTML (required in strict mode)
window.startTimer = startTimer;

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
  const btn = document.getElementById('timer-start');
  if (btn) btn.textContent = '▶ Start';
}
window.resetTimer = resetTimer;

function updateFocusStats() {
  const sessEl = document.getElementById('sessions-count');
  const streakEl = document.getElementById('streak-count');
  const focusTodayEl = document.getElementById('today-focus');
  const focusBar = document.getElementById('focus-bar');

  if (sessEl) sessEl.textContent = state.focusSessions || 0;
  if (streakEl) streakEl.textContent = state.streak || 1;

  const hrs = Math.floor((state.focusMinutes || 0) / 60);
  const mins = (state.focusMinutes || 0) % 60;
  if (focusTodayEl) focusTodayEl.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  // Bar — max 8 hours = 100%
  const percent = Math.min(((state.focusMinutes || 0) / 480) * 100, 100);
  if (focusBar) focusBar.style.width = percent + '%';
}

// ===========================
// DAILY BRIEFING SCHEDULE
// ===========================
function renderSchedule() {
  const el = document.getElementById('schedule-list');
  if (!el) return;

  const now = new Date();
  const scheduleItems = [
    { time: '9:00 AM', title: 'Morning deep work block', type: 'focus', emoji: '🧠' },
    { time: '11:30 AM', title: 'Team standup meeting', type: 'meeting', emoji: '👥' },
    { time: '2:00 PM', title: 'Review project proposal', type: 'task', emoji: '📋' },
    { time: '4:00 PM', title: 'Client check-in call', type: 'meeting', emoji: '📞' },
    { time: '6:00 PM', title: 'Gym session', type: 'personal', emoji: '💪' },
  ];

  el.innerHTML = scheduleItems.map(item => `
    <div style="display:flex; align-items:center; gap:16px; padding:12px 0; border-bottom:1px solid var(--border-subtle);">
      <div style="min-width:72px; font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">${item.time}</div>
      <div style="font-size:20px;">${item.emoji}</div>
      <div>
        <div style="font-size:14px; font-weight:500; color:var(--text-primary);">${item.title}</div>
        <div style="font-size:11px; color:var(--text-muted); text-transform:capitalize;">${item.type}</div>
      </div>
    </div>
  `).join('');
}

// ===========================
// SEARCH
// ===========================
function setupSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) return;

    // Simple search — could be enhanced
    const results = [
      ...state.reminders.filter(r => r.text.toLowerCase().includes(q)),
      ...state.memories.filter(m => m.text.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)),
    ];

    if (results.length > 0) {
      showToast(`🔍 Found ${results.length} result${results.length > 1 ? 's' : ''} for "${q}"`);
    }
  });
}

// ===========================
// USER PROFILE
// ===========================
function updateUserDisplay() {
  const name = state.user?.name || 'You';
  const initial = name[0]?.toUpperCase() || 'Y';

  const nameEl = document.getElementById('user-name-display');
  const avatarEl = document.getElementById('user-avatar');
  const settingsAvatarEl = document.getElementById('settings-avatar');

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = initial;
  if (settingsAvatarEl) settingsAvatarEl.textContent = initial;
}

// ===========================
// TOAST NOTIFICATIONS
// ===========================
function showToast(message, duration = 3000) {
  // Remove existing toasts
  const existing = document.querySelector('.nexmem-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'nexmem-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 14px;
    color: var(--text-primary);
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.2);
    animation: fadeInUp 0.3s ease forwards;
    max-width: 360px;
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===========================
// UTILITY FUNCTIONS
// ===========================
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch(e) { return dateStr; }
}

// ===========================
// VOICE INPUT (Web Speech API)
// ===========================
function setupVoiceInput() {
  const micBtn = document.getElementById('chat-mic-btn');
  if (!micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  micBtn.addEventListener('click', () => {
    if (!SpeechRecognition) {
      showToast('⚠️ Voice input not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Initialize Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';
    let autoSendTimer = null;
    let isAborted = false;

    // Create Modal Elements
    let overlay = document.getElementById('voice-input-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'voice-input-overlay';
      overlay.className = 'voice-overlay';
      overlay.innerHTML = `
        <div class="voice-modal">
          <div class="voice-modal-title">Voice Input</div>
          <div class="voice-waves" id="voice-waves">
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
          </div>
          <div class="voice-transcript placeholder" id="voice-transcript">Listening for speech...</div>
          <div class="voice-modal-actions">
            <button class="voice-stop-btn" id="voice-cancel-btn">Cancel</button>
            <button class="voice-send-btn" id="voice-send-btn" disabled>Send Now</button>
          </div>
          <div class="voice-status" id="voice-status">
            <span class="recording-dot"></span>Connecting...
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.style.display = 'flex';
    }

    const waves = document.getElementById('voice-waves');
    const transcriptEl = document.getElementById('voice-transcript');
    const statusEl = document.getElementById('voice-status');
    const sendBtn = document.getElementById('voice-send-btn');
    const cancelBtn = document.getElementById('voice-cancel-btn');

    // Reset Modal UI State
    waves.classList.add('active');
    transcriptEl.textContent = 'Listening for speech...';
    transcriptEl.className = 'voice-transcript placeholder';
    statusEl.innerHTML = '<span class="recording-dot"></span>Listening...';
    sendBtn.disabled = true;
    micBtn.classList.add('recording');

    // Silence detection helper
    function resetAutoSendTimer() {
      if (autoSendTimer) clearTimeout(autoSendTimer);
      if (finalTranscript.trim()) {
        autoSendTimer = setTimeout(() => {
          submitSpeech();
        }, 2000); // 2 seconds of silence triggers auto-send
      }
    }

    function cleanup() {
      if (autoSendTimer) clearTimeout(autoSendTimer);
      micBtn.classList.remove('recording');
      overlay.style.display = 'none';
      try {
        recognition.stop();
      } catch (e) {}
    }

    function submitSpeech() {
      const text = finalTranscript.trim();
      cleanup();
      if (text && !isAborted) {
        const chatInput = document.getElementById('app-chat-input');
        const chatSendBtn = document.getElementById('app-chat-send');
        if (chatInput && chatSendBtn) {
          chatInput.value = text;
          // Trigger textarea resize
          chatInput.style.height = 'auto';
          chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
          chatSendBtn.click();
        }
      }
    }

    recognition.onstart = () => {
      statusEl.innerHTML = '<span class="recording-dot"></span>Speak now...';
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const display = finalTranscript + interimTranscript;
      if (display.trim()) {
        transcriptEl.textContent = display;
        transcriptEl.className = 'voice-transcript has-text';
        sendBtn.disabled = false;
        resetAutoSendTimer();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      statusEl.textContent = `Error: ${event.error}`;
      waves.classList.remove('active');
      showToast(`⚠️ Voice Input Error: ${event.error}`);
      setTimeout(cleanup, 2000);
    };

    recognition.onend = () => {
      waves.classList.remove('active');
      statusEl.textContent = 'Stopped listening.';
      // If we stopped but have text and user didn't cancel, send it after a short delay
      if (finalTranscript.trim() && !isAborted && sendBtn.disabled === false) {
        setTimeout(submitSpeech, 500);
      }
    };

    cancelBtn.onclick = () => {
      isAborted = true;
      cleanup();
      showToast('🎤 Voice input cancelled');
    };

    sendBtn.onclick = () => {
      submitSpeech();
    };

    // Start recognition
    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to start:', err);
      showToast('⚠️ Could not access microphone.');
      cleanup();
    }
  });
}

async function syncWithCloud() {
  if (window.RAG) {
    let fullSyncTriggered = false;
    let addedMemories = false;

    // 1. Fetch Dedicated App State JSON
    if (window.RAG.fetchJsonState) {
      const cloudState = await window.RAG.fetchJsonState();
      if (cloudState) {
        if (cloudState.reminders) state.reminders = cloudState.reminders;
        if (cloudState.lists) state.lists = cloudState.lists;
        if (cloudState.chatHistory) state.chatHistory = cloudState.chatHistory;
        if (cloudState.user) state.user = cloudState.user;
        fullSyncTriggered = true;
        console.log('☁️ Downloaded Full App State from dedicated JSON table!');
      }
    }

    // 2. Fetch Vector Memories
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

    // 3. UI Update if anything changed
    if (addedMemories || fullSyncTriggered) {
      // Save silently without triggering another push
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      
      // Force UI re-render for everything that relies on state arrays
      if (typeof renderReminders === 'function') {
        renderReminders('dashboard-reminder-list');
        renderReminders('full-reminder-list');
        updateUserDisplay();
        updateBriefingStats();
        console.log('🔄 Cloud Sync Complete: UI perfectly updated!');
      }
    }
  }
}

// ===========================
// INIT — state must be loaded before any function that reads it
// ===========================
async function init() {
  // 1. Check Authentication FIRST
  if (window.RAG) {
    const user = await window.RAG.getCurrentUser();
    if (!user) {
      window.location.replace('login.html');
      return;
    }
    // Update local state with user info
    state.user = state.user || {};
    state.user.name = user.user_metadata?.full_name || user.email;
    state.user.email = user.email;
  }

  loadState();
  await syncWithCloud();

  // 2. Setup Live Realtime WebSockets
  if (window.RAG && window.RAG.subscribeToRealtime) {
    window.RAG.subscribeToRealtime(() => {
      syncWithCloud(); // Silently pull updates if cloud changes
    });
  }

  // 3. Setup Wake-up Sync (When unlocking phone or switching tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncWithCloud();
    }
  });

  // Ensure critical arrays always exist after load
  if (!Array.isArray(state.reminders))   state.reminders   = defaultState.reminders;
  if (!Array.isArray(state.memories))    state.memories    = defaultState.memories;
  if (!Array.isArray(state.lists))       state.lists       = defaultState.lists;
  if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

  updateUserDisplay();
  updateDateTime();
  updateBriefingStats();
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
  setupSerendipity();
  setupNotifications();
  setupSettings();
  setupSearch();
  updateTimerDisplay();
  setupAppChat(); // ← called HERE, after state is loaded
  setupVoiceInput();

  // Update time every minute
  setInterval(updateDateTime, 60000);

  console.log('✦ NexMem Dashboard initialized successfully');
}

// Expose clearAllData for inline onclick
window.clearAllData = clearAllData;

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===========================
// PROGRESSIVE WEB APP (PWA) & PUSH NOTIFICATIONS
// ===========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('✅ ServiceWorker registered with scope:', registration.scope);
      
      // Ask for notification permission handled by settings
      
      // Start the Background Reminder Checker
      startReminderChecker(registration);
    } catch (err) {
      console.error('❌ ServiceWorker registration failed:', err);
    }
  });
}

// Global Notification Toggle Setup
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-notifications');
  if (toggle) {
    const updateToggleUI = (granted) => {
      toggle.setAttribute('aria-checked', granted);
      toggle.style.background = granted ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'var(--neutral-700, #374151)';
      toggle.querySelector('div').style.right = granted ? '3px' : 'calc(100% - 21px)';
    };

    // Initial state
    if ('Notification' in window) {
      updateToggleUI(Notification.permission === 'granted');
    }

    toggle.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!('Notification' in window)) return showToast('⚠️ Notifications not supported.');
      
      if (Notification.permission === 'granted') {
        showToast('ℹ️ Notifications already granted. Revoke in browser settings.');
      } else if (Notification.permission === 'denied') {
        showToast('⚠️ Permission blocked. Please reset in browser URL bar.');
      } else {
        const permission = await Notification.requestPermission();
        updateToggleUI(permission === 'granted');
        if (permission === 'granted') showToast('🔔 Push Notifications Enabled!');
        else showToast('⚠️ Notification permission denied.');
      }
    });
  }
});

// Check every 60 seconds if any reminder matches the current time
function startReminderChecker(registration) {
  setInterval(() => {
    if (Notification.permission !== 'granted') return;
    
    const nowMs = Date.now();
    let updated = false;

    state.reminders.forEach(r => {
      // Check if reminder is pending, has a timestamp, hasn't fired yet, and the exact time has arrived/passed!
      if (!r.done && r.timestamp && !r.notified && nowMs >= r.timestamp) {
        r.notified = true; // Mark as fired so it never triggers again
        updated = true;
        
        // Send push notification directly
        if (registration) {
          registration.showNotification('NexMem Reminder', {
            body: r.text,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%237c3aed" width="100" height="100" rx="20"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em" fill="white">✨</text></svg>',
            requireInteraction: true,
            vibrate: [200, 100, 200]
          });
        }
        
        // Play fallback audio chime
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log('Audio autoplay blocked by browser'));
        } catch(e) {}
      }
    });

    if (updated) {
      saveState();
    }
  }, 60000); // Check every 60,000 ms (1 minute)
}
