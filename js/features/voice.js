import { showToast } from '../core/utils.js';

export function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const micBtns = [
    { btnId: 'chat-mic-btn', inputId: 'app-chat-input', submitId: 'app-chat-send' },
    { btnId: 'voice-quick-add', inputId: 'quick-add-reminder', submitId: 'quick-add-btn' },
    { btnId: 'voice-full-add', inputId: 'full-add-reminder', submitId: 'full-add-btn' }
  ];

  micBtns.forEach(({ btnId, inputId, submitId }) => {
    const micBtn = document.getElementById(btnId);
    if (!micBtn) return;

    micBtn.addEventListener('click', () => {
      if (!SpeechRecognition) {
        showToast('⚠️ Voice input not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let autoSendTimer = null;
      let isAborted = false;

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

      waves.classList.add('active');
      transcriptEl.textContent = 'Listening for speech...';
      transcriptEl.className = 'voice-transcript placeholder';
      statusEl.innerHTML = '<span class="recording-dot"></span>Listening...';
      sendBtn.disabled = true;
      micBtn.classList.add('recording');

      function resetAutoSendTimer() {
        if (autoSendTimer) clearTimeout(autoSendTimer);
        if (finalTranscript.trim()) {
          autoSendTimer = setTimeout(() => {
            submitSpeech();
          }, 2000); 
        }
      }

      function cleanup() {
        if (autoSendTimer) clearTimeout(autoSendTimer);
        micBtn.classList.remove('recording');
        overlay.style.display = 'none';
        try {
          recognition.stop();
        } catch (e) {}
        
        sendBtn.replaceWith(sendBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      }

      function submitSpeech() {
        const text = finalTranscript.trim();
        cleanup();
        if (text && !isAborted) {
          const targetInput = document.getElementById(inputId);
          const targetSubmit = document.getElementById(submitId);
          if (targetInput && targetSubmit) {
            targetInput.value = text;
            if (targetInput.tagName.toLowerCase() === 'textarea') {
              targetInput.style.height = 'auto';
              targetInput.style.height = Math.min(targetInput.scrollHeight, 120) + 'px';
            }
            targetSubmit.click();
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

      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition failed to start:', err);
        showToast('⚠️ Could not access microphone.');
        cleanup();
      }
    });
  });
}
