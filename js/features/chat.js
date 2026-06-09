import { state, saveState } from '../core/state.js';
import { showToast } from '../core/utils.js';

export function setupAppChat() {
  const input = document.getElementById('app-chat-input');
  const sendBtn = document.getElementById('app-chat-send');
  const messages = document.getElementById('app-chat-messages');
  if (!input || !sendBtn || !messages) return;

  if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

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

You MUST return your response as a strictly valid JSON object.
Format: {"reply": "Your conversational text response", "action": "ACTION_CODE" | null}

Valid Action Codes (use ONLY if the user explicitly asks you to perform the action):
- "ENABLE_DEEP_WORK" : turn on Deep Work focus mode
- "ENABLE_FLOW" : turn on Flow focus mode
- "ENABLE_REST" : turn on Rest focus mode
- "DISABLE_FOCUS" : turn off focus modes
- "DARK_MODE" : switch to dark theme
- "LIGHT_MODE" : switch to light theme
- "ENABLE_NOTIFICATIONS" : turn on push notifications (or simply "notifications on")
- "DISABLE_NOTIFICATIONS" : turn off push notifications (or simply "notifications off", "notification off")
- "ENABLE_BRIEFING" : turn on daily briefing
- "DISABLE_BRIEFING" : turn off daily briefing
- "ENABLE_SERENDIPITY" : turn on serendipity notifications
- "DISABLE_SERENDIPITY" : turn off serendipity notifications
- "ENABLE_INSIGHTS" : turn on AI insights
- "DISABLE_INSIGHTS" : turn off AI insights
- "CLEAR_COMPLETED" : delete or clear all completed reminders
Otherwise, set "action" to null.
CRITICAL: ALWAYS return the appropriate "action" code if the user requests it, even if the app is ALREADY in that state! The app relies on the action code to render the UI widget.

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
- Give actionable, specific advice based on their real data
- Keep replies under 150 words unless they ask for detail
- Format with **bold** for emphasis when helpful`;
  }

  let aiHistory = [];

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
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: buildSystemPrompt() + (ragContext ? `\n\n[RAG Semantic Memory Context]:\n${ragContext}` : '') },
          ...aiHistory
        ],
        temperature: 0.5,
        max_tokens: 400,
        top_p: 0.9,
        response_format: { type: "json_object" }
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    let replyText = 'I had trouble processing that. Please try again.';
    let action = null;
    
    try {
      const rawContent = data?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawContent);
      replyText = parsed.reply || rawContent;
      action = parsed.action || null;
    } catch (e) {
      replyText = data?.choices?.[0]?.message?.content || replyText;
    }

    aiHistory.push({ role: 'assistant', content: JSON.stringify({ reply: replyText, action }) });
    if (aiHistory.length > 20) aiHistory = aiHistory.slice(-20);
    return { text: replyText, action };
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

      const response = await callGemini({ text, ragContext });
      const replyText = typeof response === 'object' ? response.text : response;
      const action = typeof response === 'object' ? response.action : null;
      removeTyping();

      const msg    = document.createElement('div');
      msg.className = 'chat-msg ai';
      const av     = document.createElement('div');
      av.className  = 'msg-avatar ai';
      av.textContent = '✨';
      av.setAttribute('aria-label', 'NexMem AI');
      const bub    = document.createElement('div');
      bub.className = 'msg-bubble';
      const textContainer = document.createElement('div');
      bub.appendChild(textContainer);
      msg.appendChild(av);
      msg.appendChild(bub);
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
      streamTextIntoBubble(textContainer, replyText);

      state.chatHistory.push({ text: replyText, role: 'ai' });
      saveState();

      if (action) {
        executeAIAction(action, bub);
      }
    } catch (err) {
      removeTyping();
      addMsg(`Error: ${err.message}. Check your API key.`, 'ai');
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

  const chips = document.getElementById('memory-chips');
  if (chips) {
    const badge = document.createElement('span');
    badge.className  = 'memory-chip';
    badge.style.cssText = 'background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#10b981;';
    badge.innerHTML = '🟢 Groq &mdash; Llama 3 70B';
    chips.appendChild(badge);
  }
}

export function renderActionWidget(container, icon, title, initialActive, toggleCallback) {
  if (!container) return;
  const widget = document.createElement('div');
  widget.style.cssText = "margin-top: 12px; padding: 12px; background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between; animation: scaleIn 0.3s ease; cursor: pointer;";
  
  let isActive = initialActive;
  
  const renderToggle = () => `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 20px;">${icon}</span>
      <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${title}</span>
    </div>
    <div style="width: 44px; height: 24px; background: ${isActive ? "var(--gradient-aurora)" : "var(--neutral-700, #374151)"}; border-radius: 999px; position: relative; transition: all 0.3s;">
      <div style="width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 3px; ${isActive ? "right: 3px;" : "left: 3px;"} transition: all 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `;
  
  widget.innerHTML = renderToggle();
  
  widget.addEventListener('click', () => {
    isActive = !isActive;
    widget.innerHTML = renderToggle();
    if (toggleCallback) toggleCallback(isActive);
  });
  
  container.appendChild(widget);
  
  const messages = document.getElementById('chat-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

export function executeAIAction(action, container) {
  console.log("AI Requested Action:", action);
  state.settings = state.settings || {};

  switch (action) {
    case 'ENABLE_DEEP_WORK':
      if (typeof window.setFocusMode === 'function') window.setFocusMode('deep');
      renderActionWidget(container, '🧠', 'Deep Work', true, (active) => {
        if (typeof window.setFocusMode === 'function') window.setFocusMode(active ? 'deep' : 'off');
      });
      break;
    case 'ENABLE_FLOW':
    case 'ENABLE_FOCUS':
      if (typeof window.setFocusMode === 'function') window.setFocusMode('flow');
      renderActionWidget(container, '🌊', 'Flow State', true, (active) => {
        if (typeof window.setFocusMode === 'function') window.setFocusMode(active ? 'flow' : 'off');
      });
      break;
    case 'ENABLE_REST':
      if (typeof window.setFocusMode === 'function') window.setFocusMode('rest');
      renderActionWidget(container, '☕', 'Rest Mode', true, (active) => {
        if (typeof window.setFocusMode === 'function') window.setFocusMode(active ? 'rest' : 'off');
      });
      break;
    case 'DISABLE_FOCUS':
      if (typeof window.setFocusMode === 'function') window.setFocusMode('off');
      renderActionWidget(container, '🎯', 'Focus Mode', false, (active) => {
        if (typeof window.setFocusMode === 'function') window.setFocusMode(active ? 'deep' : 'off');
      });
      break;
    case 'DARK_MODE':
      document.documentElement.setAttribute('data-theme', 'dark');
      state.settings.theme = 'dark';
      saveState();
      renderActionWidget(container, '🌙', 'Dark Mode', true, (active) => {
        const t = active ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', t);
        state.settings.theme = t;
        saveState();
      });
      break;
    case 'LIGHT_MODE':
      document.documentElement.setAttribute('data-theme', 'light');
      state.settings.theme = 'light';
      saveState();
      renderActionWidget(container, '☀️', 'Light Mode', true, (active) => {
        const t = active ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', t);
        state.settings.theme = t;
        saveState();
      });
      break;
    case 'ENABLE_NOTIFICATIONS':
    case 'ENABLE_NOTIFICATION':
      state.settings.notifications = true;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🔔', 'Notifications', true, (active) => {
        state.settings.notifications = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'DISABLE_NOTIFICATIONS':
    case 'DISABLE_NOTIFICATION':
      state.settings.notifications = false;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🔕', 'Notifications', false, (active) => {
        state.settings.notifications = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'ENABLE_BRIEFING':
      state.settings.briefing = true;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🌅', 'Daily Briefing', true, (active) => {
        state.settings.briefing = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'DISABLE_BRIEFING':
      state.settings.briefing = false;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🌅', 'Daily Briefing', false, (active) => {
        state.settings.briefing = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'ENABLE_SERENDIPITY':
    case 'ENABLE_SERENDIPITY_NOTIFICATION':
    case 'ENABLE_SERENDIPITY_NOTIFICATIONS':
      state.settings.serendipity = true;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '✨', 'Serendipity', true, (active) => {
        state.settings.serendipity = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'DISABLE_SERENDIPITY':
    case 'DISABLE_SERENDIPITY_NOTIFICATION':
    case 'DISABLE_SERENDIPITY_NOTIFICATIONS':
      state.settings.serendipity = false;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '✨', 'Serendipity', false, (active) => {
        state.settings.serendipity = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'ENABLE_INSIGHTS':
    case 'ENABLE_INSIGHT':
    case 'ENABLE_AI_INSIGHTS':
    case 'ENABLE_AI_INSIGHT':
      state.settings.insights = true;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🔮', 'AI Insights', true, (active) => {
        state.settings.insights = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'DISABLE_INSIGHTS':
    case 'DISABLE_INSIGHT':
    case 'DISABLE_AI_INSIGHTS':
    case 'DISABLE_AI_INSIGHT':
      state.settings.insights = false;
      saveState();
      if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      renderActionWidget(container, '🔮', 'AI Insights', false, (active) => {
        state.settings.insights = active;
        saveState();
        if (typeof window.syncUIToggles === 'function') window.syncUIToggles();
      });
      break;
    case 'CLEAR_COMPLETED':
      state.reminders = state.reminders.filter(r => !r.done);
      saveState();
      if (typeof window.renderReminders === 'function') {
        window.renderReminders('dashboard-reminder-list');
        window.renderReminders('full-reminder-list');
      }
      if (typeof window.updateBriefingStats === 'function') window.updateBriefingStats();
      renderActionWidget(container, '🧹', 'Clear Completed', true);
      break;
  }
}
