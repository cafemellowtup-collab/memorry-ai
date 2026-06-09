export function showToast(message, duration = 3000) {
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

export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch(e) { return dateStr; }
}
