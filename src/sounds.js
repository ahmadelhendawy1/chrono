/* Chrono alarm sounds: built-in tones synthesised with WebAudio (no asset files) + the user's own music file. */
(function () {
  'use strict';
  const TONES = ['classic', 'chimes', 'digital', 'gentle'];

  // One pattern "bar" per tone; it repeats until stopped. Each note: [startSec, freqHz, durSec, type]
  const PATTERNS = {
    classic: { len: 1.0, notes: [[0, 880, 0.12, 'square'], [0.18, 880, 0.12, 'square'], [0.36, 880, 0.12, 'square'], [0.54, 880, 0.12, 'square']] },
    digital: { len: 1.2, notes: [[0, 2093, 0.08, 'square'], [0.12, 2093, 0.08, 'square'], [0.24, 2093, 0.08, 'square'], [0.36, 2093, 0.08, 'square']] },
    chimes: { len: 2.4, notes: [[0, 1046.5, 1.1, 'sine'], [0.35, 1318.5, 1.1, 'sine'], [0.7, 1568, 1.1, 'sine'], [1.05, 2093, 1.3, 'sine']] },
    gentle: { len: 3.2, notes: [[0, 523.25, 1.4, 'triangle'], [0.8, 659.25, 1.4, 'triangle'], [1.6, 783.99, 1.6, 'triangle']] }
  };

  function toneSource(name, volume, rampUp) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const master = ac.createGain();
    master.connect(ac.destination);
    const target = Math.max(0.05, Math.min(1, volume)) * 0.6;
    const t0 = ac.currentTime + 0.05;
    if (rampUp) { master.gain.setValueAtTime(target * 0.15, t0); master.gain.linearRampToValueAtTime(target, t0 + 30); }
    else master.gain.setValueAtTime(target, t0);
    const pat = PATTERNS[name] || PATTERNS.classic;
    let nextBar = t0; let stopped = false;
    function schedule() {
      if (stopped) return;
      while (nextBar < ac.currentTime + 1.5) {
        pat.notes.forEach(([st, f, d, type]) => {
          const o = ac.createOscillator(); const g = ac.createGain();
          o.type = type; o.frequency.value = f;
          const s = nextBar + st;
          g.gain.setValueAtTime(0, s);
          g.gain.linearRampToValueAtTime(type === 'square' ? 0.35 : 0.9, s + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, s + d);
          o.connect(g); g.connect(master); o.start(s); o.stop(s + d + 0.05);
        });
        nextBar += pat.len;
      }
    }
    schedule();
    const timer = setInterval(schedule, 400);
    return () => { stopped = true; clearInterval(timer); try { master.gain.cancelScheduledValues(0); master.gain.value = 0; ac.close(); } catch (e) { /* closed */ } };
  }

  function fileSource(file, volume, rampUp, onError) {
    const url = 'file:///' + String(file).replace(/\\/g, '/').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
    const audio = new Audio(url);
    audio.loop = true;
    const target = Math.max(0.05, Math.min(1, volume));
    audio.volume = rampUp ? target * 0.15 : target;
    let ramp = null;
    if (rampUp) { const started = Date.now(); ramp = setInterval(() => { const k = Math.min(1, (Date.now() - started) / 30000); audio.volume = target * (0.15 + 0.85 * k); if (k >= 1) clearInterval(ramp); }, 500); }
    audio.addEventListener('error', () => { if (onError) onError(); });
    audio.play().catch(() => { if (onError) onError(); });
    return () => { clearInterval(ramp); audio.pause(); audio.src = ''; };
  }

  // play({ sound, file, volume, rampUp }) -> stop(). Falls back to the classic tone if the music file can't play.
  function play(opts) {
    const o = Object.assign({ sound: 'classic', volume: 0.8, rampUp: true }, opts || {});
    let stop = null;
    if (o.sound === 'file' && o.file) {
      stop = fileSource(o.file, o.volume, o.rampUp, () => { if (stop) stop(); stop = toneSource('classic', o.volume, o.rampUp); if (o.onFallback) o.onFallback(); });
    } else stop = toneSource(TONES.includes(o.sound) ? o.sound : 'classic', o.volume, o.rampUp);
    return () => { if (stop) stop(); stop = null; };
  }

  window.ChronoSound = { play, TONES };
})();
