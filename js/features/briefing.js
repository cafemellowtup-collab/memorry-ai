import { state, saveState, aiInsights } from '../core/state.js';

export function updateBriefingStats() {
  const pending = state.reminders.filter(r => !r.done).length;
  const total = state.memories.length;

  const bsTasks = document.getElementById('bs-tasks');
  const bsMeetings = document.getElementById('bs-meetings');
  const bsMemories = document.getElementById('bs-memories');

  if (bsTasks) bsTasks.textContent = pending;
  if (bsMeetings) bsMeetings.textContent = 2; // demo value
  if (bsMemories) bsMemories.textContent = total;

  const insightEl = document.getElementById('insight-text');
  const fullInsightEl = document.getElementById('full-insight');
  
  if (state.settings && state.settings.insights) {
    const nowMs = Date.now();
    if (!state.lastInsightMs || nowMs - state.lastInsightMs > 300000) {
      if (insightEl) insightEl.textContent = "✨ Analyzing recent activity...";
      if (fullInsightEl) fullInsightEl.textContent = "✨ Analyzing recent activity...";
      generateAIInsight();
    } else {
      const cached = state.lastInsightText || "✨ Focus on high leverage tasks today.";
      if (insightEl) insightEl.textContent = cached;
      if (fullInsightEl) fullInsightEl.textContent = cached;
    }
  } else {
    const insight = aiInsights[Math.floor(Math.random() * aiInsights.length)];
    if (insightEl) insightEl.textContent = insight;
    if (fullInsightEl) fullInsightEl.textContent = insight;
  }

  const badge = document.getElementById('reminder-badge');
  if (badge) badge.textContent = pending;
  const countBadge = document.getElementById('reminder-count-badge');
  if (countBadge) countBadge.textContent = `${pending} pending`;

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

export async function generateAIInsight() {
  const currentApiKey = state.user?.apiKey || 'gsk_...'; 
  if (!currentApiKey.startsWith('gsk_')) return;
  
  const pendingCount = state.reminders.filter(r => !r.done).length;
  const memCount = state.memories.length;
  const recentMems = state.memories.slice(-3).map(m => m.text).join(' | ');

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: `You are an AI productivity coach. The user has ${pendingCount} pending tasks and ${memCount} memories. Recent memories: ${recentMems}. Give a very short, punchy, customized 1-sentence insight or tip to boost their productivity.` }
        ],
        max_tokens: 60
      })
    });
    const data = await resp.json();
    if (data.choices && data.choices.length > 0) {
      const result = data.choices[0].message.content.trim().replace(/^"|"$/g, '');
      state.lastInsightText = `🔮 ${result}`;
      state.lastInsightMs = Date.now();
      saveState();
      
      const insightEl = document.getElementById('insight-text');
      const fullInsightEl = document.getElementById('full-insight');
      if (insightEl) insightEl.textContent = state.lastInsightText;
      if (fullInsightEl) fullInsightEl.textContent = state.lastInsightText;
    }
  } catch (e) {
    console.error('Failed to generate AI insight:', e);
  }
}

export function checkDailyBriefing() {
  if (!state.settings || !state.settings.briefing) return;
  
  const todayDate = new Date().toDateString();
  if (state.lastBriefingDate !== todayDate) {
    state.lastBriefingDate = todayDate;
    saveState();
    showDailyBriefingModal();
  }
}

export function showDailyBriefingModal() {
  const pending = state.reminders.filter(r => !r.done);
  const pendingCount = pending.length;
  const topTask = pendingCount > 0 ? pending[0].text : 'No immediate tasks.';
  
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; justify-content:center; align-items:center; z-index:10000; animation:fadeIn 0.3s ease;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-elevated); width:90%; max-width:400px; padding:30px; border-radius:24px; border:1px solid var(--border-subtle); box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); text-align:center; animation:scaleIn 0.4s ease;';
  
  modal.innerHTML = `
    <div style="font-size:40px; margin-bottom:15px;">🌅</div>
    <h2 style="margin:0 0 10px 0; color:var(--text-primary);">Good Morning!</h2>
    <p style="color:var(--text-muted); margin-bottom:20px;">Here is your quick summary for the day.</p>
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin-bottom:20px; text-align:left;">
      <div style="font-size:14px; color:var(--text-muted); margin-bottom:5px;">Pending Tasks</div>
      <div style="font-size:18px; font-weight:bold; color:var(--text-primary);">${pendingCount}</div>
      <div style="font-size:14px; color:var(--text-muted); margin-top:10px; margin-bottom:5px;">Top Priority</div>
      <div style="font-size:16px; color:var(--text-primary);">${topTask}</div>
    </div>
    <button id="close-briefing-btn" class="btn btn-primary" style="width:100%;">Let's Go 🚀</button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  document.getElementById('close-briefing-btn').addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  });
}

export function renderSchedule() {
  const el = document.getElementById('schedule-list');
  if (!el) return;

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
