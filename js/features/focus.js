import { state, saveState } from '../core/state.js';
import { showToast } from '../core/utils.js';

export function setupMoodTracker() {
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
      
      if (typeof window.updateContextChips === 'function') window.updateContextChips();
      if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
    });

    if (state.mood && parseInt(btn.dataset.mood) === state.mood) {
      btn.classList.add('selected');
    }
  });
}

export function setupFocusModes() {
  const allBtns = document.querySelectorAll('.focus-mode-btn[data-mode]');

  function setMode(mode) {
    state.focusMode = mode;
    saveState();
    allBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    if (mode === 'deep') {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }

    const labels = { off: 'Off', deep: 'Deep Work', flow: 'Flow', rest: 'Rest' };
    if (typeof window.updateContextChips === 'function') window.updateContextChips();
    showToast(`🎯 Focus Mode: ${labels[mode] || 'Off'}`);
  }
  
  window.setFocusMode = setMode; // Exposed globally if AI needs it

  allBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
    if (state.focusMode && btn.dataset.mode === state.focusMode) {
      btn.classList.add('active');
    }
  });
  
  if (state.focusMode === 'deep') {
    document.body.classList.add('zen-mode');
  }
}

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

export function startTimer() {
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

export function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
  const btn = document.getElementById('timer-start');
  if (btn) btn.textContent = '▶ Start';
}

export function updateFocusStats() {
  const sessEl = document.getElementById('sessions-count');
  const streakEl = document.getElementById('streak-count');
  const focusTodayEl = document.getElementById('today-focus');
  const focusBar = document.getElementById('focus-bar');

  if (sessEl) sessEl.textContent = state.focusSessions || 0;
  if (streakEl) streakEl.textContent = state.streak || 1;

  const hrs = Math.floor((state.focusMinutes || 0) / 60);
  const mins = (state.focusMinutes || 0) % 60;
  if (focusTodayEl) focusTodayEl.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  const percent = Math.min(((state.focusMinutes || 0) / 480) * 100, 100);
  if (focusBar) focusBar.style.width = percent + '%';
}

export function setupFocusTimerInputs() {
  const startBtn = document.getElementById('timer-start');
  const resetBtn = document.getElementById('timer-reset');

  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);
}
