/* =====================================================
   NexMem — Landing Page JS
   Particles, scroll effects, counter animations, AI demo
   ===================================================== */

'use strict';

// ===========================
// PARTICLE SYSTEM
// ===========================
(function() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? 'rgba(124,58,237,' : (Math.random() > 0.5 ? 'rgba(6,182,212,' : 'rgba(232,121,249,')
    };
  }

  function init() {
    resize();
    particles = [];
    const count = Math.min(Math.floor((W * H) / 12000), 120);
    for (let i = 0; i < count; i++) particles.push(createParticle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist/120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.opacity + ')';
      ctx.fill();
    });
    animId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => { init(); });
  init();
  animate();
})();

// ===========================
// NAVBAR SCROLL EFFECT
// ===========================
(function() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let lastY = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastY = y;
  }, { passive: true });
})();

// ===========================
// HAMBURGER MENU
// ===========================
(function() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  // Close when clicking a link
  nav.querySelectorAll('a, .btn').forEach(el => {
    el.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', false);
    });
  });
})();

// ===========================
// SMOOTH SCROLL
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }
  });
});

// ===========================
// SCROLL REVEAL
// ===========================
(function() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => obs.observe(el));
})();

// ===========================
// COUNTER ANIMATION
// ===========================
(function() {
  function formatNumber(n, target) {
    if (target >= 1000000) return (n / 1000000).toFixed(1) + 'M+';
    if (target >= 10000)   return (n / 1000).toFixed(0) + 'K+';
    if (target >= 50 && target <= 100) return n + '%';
    return n + 'h+';
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = Math.floor(eased * target);
      el.textContent = formatNumber(current, target);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = formatNumber(target, target);
    }

    requestAnimationFrame(update);
  }

  const counters = document.querySelectorAll('.stat-number[data-count]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => obs.observe(c));
})();

// ===========================
// AI DEMO CHAT
// ===========================
(function() {
  const input = document.getElementById('demo-chat-input');
  const sendBtn = document.getElementById('demo-send-btn');
  const messages = document.getElementById('demo-messages');
  const quickPrompts = document.getElementById('quick-prompts');
  if (!input || !sendBtn || !messages) return;

  // AI response logic
  const aiResponses = {
    reminder: [
      "Got it! ✓ I've set a reminder for you. I'll make sure to ping you at the perfect time. Want me to make it recurring?",
      "Reminder set! 🔔 I'll notify you exactly when you need it. I've also noted the context so I can remind you with full background.",
      "Done! I've saved that reminder and connected it to your other related memories. Anything else you'd like me to remember?"
    ],
    plan: [
      "Let me plan your day! ☀️\n\n**Morning (9-12pm):** Deep work block — 3 tasks due today\n**Afternoon (2-4pm):** Meetings + reviews\n**Evening:** 30min wind-down\n\nBased on your patterns, you're most focused at 9am. I'd recommend starting with your most important task then. Shall I set these as reminders?",
      "Planning your day... ✦\n\nYou have 3 priorities today. I suggest tackling the hardest one first — your energy is highest in the morning based on your historical mood data. Want me to block focus time in your calendar?",
    ],
    note: [
      "Memory saved! 🧠 I've stored that and linked it to your related memories. I'll resurface this at the right moment — that's what serendipity is for.",
      "Saved to your memory bank! ✦ I've tagged it and connected it to 2 related memories you stored earlier. Your second brain is growing!",
      "Got it! I've saved that note. I noticed it relates to something you mentioned 3 weeks ago — want me to connect those memories together?"
    ],
    what: [
      "Here's what I remember about you so far:\n\n🎯 **Goals:** Focus on productivity, healthier habits\n🔔 **Pending:** 3 reminders today\n😊 **Patterns:** Most focused 9-11am, prefer concise info\n📋 **Lists:** Grocery, Work tasks, Ideas\n\nThe more you share, the smarter I get! What would you like me to remember?",
      "Your memory summary:\n\n• **5 memories** stored this week\n• **3 upcoming reminders**\n• **Focus streak:** 2 days 🔥\n• **Most active:** Weekday mornings\n\nI've noticed you tend to be most productive on Fridays. Want me to protect your Friday mornings for deep work?"
    ],
    default: [
      "Interesting! I've processed that and stored it in your memory. Want me to set a reminder or do anything specific with this?",
      "Got it! ✦ I've noted that. Is there anything specific you'd like me to do with this information?",
      "I've saved that to your memory bank. I'll connect it to relevant future contexts. Anything else on your mind?",
      "Noted! I'm building a better picture of what matters to you. The more we talk, the more I can help you stay organized and focused.",
      "Great! I've captured that. Would you like me to set a reminder, add it to a list, or just store it as a memory?"
    ]
  };

  function getResponse(text) {
    const lower = text.toLowerCase();
    if (lower.includes('remind') || lower.includes('reminder') || lower.includes('alert') || lower.includes('notify')) {
      return aiResponses.reminder[Math.floor(Math.random() * aiResponses.reminder.length)];
    }
    if (lower.includes('plan') || lower.includes('day') || lower.includes('schedule') || lower.includes('today')) {
      return aiResponses.plan[Math.floor(Math.random() * aiResponses.plan.length)];
    }
    if (lower.includes('save') || lower.includes('note') || lower.includes('remember') || lower.includes('store')) {
      return aiResponses.note[Math.floor(Math.random() * aiResponses.note.length)];
    }
    if (lower.includes('what') && (lower.includes('remember') || lower.includes('know') || lower.includes('have'))) {
      return aiResponses.what[Math.floor(Math.random() * aiResponses.what.length)];
    }
    return aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
  }

  let msgCount = 1;

  function addMessage(text, role) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.id = `demo-msg-${msgCount++}`;

    const avatar = document.createElement('div');
    avatar.className = `msg-avatar ${role === 'ai' ? 'ai' : 'usr'}`;
    avatar.textContent = role === 'ai' ? '✦' : 'Y';
    avatar.setAttribute('aria-label', role === 'ai' ? 'NexMem AI' : 'You');

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    // Format markdown-like bold
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

    if (role === 'ai') {
      msg.appendChild(avatar);
      msg.appendChild(bubble);
    } else {
      msg.appendChild(bubble);
      msg.appendChild(avatar);
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-msg ai';
    typing.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar ai';
    avatar.textContent = '✦';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = '<div class="chat-typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

    typing.appendChild(avatar);
    typing.appendChild(bubble);
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
  }

  function sendMessage(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    input.value = '';

    // Hide quick prompts after first use
    if (quickPrompts) quickPrompts.style.display = 'none';

    showTyping();
    const delay = 800 + Math.random() * 800;
    setTimeout(() => {
      removeTyping();
      addMessage(getResponse(text), 'ai');
    }, delay);
  }

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // Quick prompts
  const promptTexts = {
    'qp-1': 'Remind me to call my dentist tomorrow at 10am',
    'qp-2': 'Plan my day for maximum productivity',
    'qp-3': 'Remember: my goal is to read 2 books per month',
    'qp-4': 'What do you remember about me?'
  };

  document.querySelectorAll('.quick-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = promptTexts[btn.id] || btn.textContent;
      sendMessage(text);
    });
  });
})();
