export const STATE_KEY = 'nexmem_state';

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

export const serendipityQuotes = [
  { text: '"The goal is not to be better than the other man, but your previous self." — A memory from May 3rd.', date: 'May 3, 2025' },
  { text: '"I want to build something I\'d use every single day." — A goal you wrote down on March 15th.', date: 'March 15, 2025' },
  { text: '"The extended mind — thinking happens outside the brain. Leverage tools as cognitive extensions." — Book note from April 28th.', date: 'April 28, 2025' },
  { text: '"Mornings are my superpower. Protect them fiercely." — Insight noted on May 20th.', date: 'May 20, 2025' },
  { text: '"Every expert was once a beginner. Keep shipping, keep learning." — A note to self from February 12th.', date: 'February 12, 2025' },
];

export const aiInsights = [
  "✦ You're most productive on Fridays — consider protecting that time for deep work.",
  "✦ You've completed 87% of reminders this week. That's your best streak yet!",
  "✦ 3 reminders pending for today. Start with the high-priority one to free mental space.",
  "✦ Pattern detected: You tend to remember your best ideas in the evening. Consider journaling before sleep.",
  "✦ Your focus sessions have doubled this week. Great momentum — keep it going!",
];

export let state = {};

export function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = Object.assign({}, defaultState, parsed);
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

export function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushStateToCloud();
    }, 2000);
  } catch(e) {}
}

export async function pushStateToCloud() {
  if (!window.RAG || !window.RAG.supabaseClient) return;
  if (!window.RAG.userId) {
    await window.RAG.getCurrentUser();
    if (!window.RAG.userId) return;
  }
  const stateToSync = { ...state };
  delete stateToSync.memories;
  await window.RAG.pushJsonState(stateToSync);
}
