import { state } from '../core/state.js';

export function setupNavigation() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  let collapsed = false;
  let mobileOpen = false;

  if (toggle) {
    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      sidebar.classList.toggle('collapsed', collapsed);
      toggle.textContent = collapsed ? '›' : '‹';
      toggle.setAttribute('aria-expanded', !collapsed);
    });
  }

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

  const viewAllReminders = document.getElementById('view-all-reminders');
  if (viewAllReminders) {
    viewAllReminders.addEventListener('click', () => switchPanel('reminders'));
  }
}

export function updateDateTime() {
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

export function updateContextChips() {
  const pending = (state.reminders || []).filter(r => !r.done).length;
  const inFocus = state.focusMode && state.focusMode !== 'off';

  const chipContainer = document.getElementById('live-context-chips');
  if (!chipContainer) return;

  chipContainer.innerHTML = '';

  const chips = [];
  if (pending > 0) chips.push({ icon: '📋', text: `${pending} pending tasks` });
  else chips.push({ icon: '✨', text: 'All caught up' });

  if (inFocus) {
    chips.push({ icon: '🎯', text: `${state.focusMode.toUpperCase()} MODE ACTIVE` });
  }

  const hour = new Date().getHours();
  if (hour < 12) chips.push({ icon: '🌅', text: 'Morning Routine' });
  else if (hour < 17) chips.push({ icon: '⚡', text: 'Peak Energy Window' });
  else chips.push({ icon: '🌙', text: 'Wind Down' });

  chips.forEach(c => {
    const el = document.createElement('div');
    el.className = 'context-chip';
    if (c.icon === '🎯') el.classList.add('urgent');
    el.innerHTML = `<span style="font-size:14px">${c.icon}</span> ${c.text}`;
    chipContainer.appendChild(el);
  });
}
