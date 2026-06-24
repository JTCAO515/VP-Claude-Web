// Voice — TTS playback via /api/tts, STT recording via MediaRecorder → /api/stt.
// Both fall back to Web Speech API when the server reports unavailable.

const isChinese = (s) => /[一-鿿]/.test(s);

// ---------- TTS ----------
let currentAudio = null;

export async function play(text, { voice } = {}) {
  if (!text) return;
  stop();
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('tts_unavailable');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('ended', () => URL.revokeObjectURL(url));
    audio.addEventListener('error', () => URL.revokeObjectURL(url));
    currentAudio = audio;
    await audio.play();
  } catch (e) {
    // Web Speech fallback
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = isChinese(text) ? 'zh-CN' : 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }
}

export function stop() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch (_) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
}

// ---------- STT ----------
export async function record({ onResult, onError } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onError && onError(new Error('Microphone unavailable'));
    return { stop: () => {} };
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    onError && onError(e);
    return { stop: () => {} };
  }
  // Try MediaRecorder first; fall back to Web Speech API.
  let mimeType = '';
  if (window.MediaRecorder) {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
    else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
    else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
  }
  if (mimeType) {
    return recordViaMediaRecorder(stream, mimeType, onResult, onError);
  }
  // Last resort: stop the stream, use SpeechRecognition
  stream.getTracks().forEach((t) => t.stop());
  return recordViaWebSpeech(onResult, onError);
}

function recordViaMediaRecorder(stream, mimeType, onResult, onError) {
  const mr = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  let stopped = false;
  mr.addEventListener('dataavailable', (e) => { if (e.data && e.data.size) chunks.push(e.data); });
  mr.addEventListener('stop', async () => {
    stream.getTracks().forEach((t) => t.stop());
    if (!chunks.length) {
      onError && onError(new Error('No audio captured'));
      return;
    }
    const blob = new Blob(chunks, { type: mimeType });
    try {
      const fd = new FormData();
      fd.append('file', blob, 'audio.webm');
      const res = await fetch('/api/stt', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.fallback === 'web_speech') {
          // Server says no Qwen — fall back.
          recordViaWebSpeech(onResult, onError);
          return;
        }
        throw new Error('stt_failed');
      }
      const data = await res.json();
      onResult && onResult({ text: data.text || '', provider: data.provider || 'qwen' });
    } catch (e) {
      onError && onError(e);
    }
  });
  mr.start();
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { mr.stop(); } catch (_) {}
    },
  };
}

function recordViaWebSpeech(onResult, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError && onError(new Error('Speech recognition unavailable'));
    return { stop: () => {} };
  }
  const recog = new SR();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.addEventListener('result', (e) => {
    const text = Array.from(e.results).map((r) => r[0].transcript).join(' ');
    onResult && onResult({ text: text.trim(), provider: 'web_speech' });
  });
  recog.addEventListener('error', (e) => onError && onError(e));
  try { recog.start(); } catch (e) { onError && onError(e); }
  return { stop: () => { try { recog.stop(); } catch (_) {} } };
}
