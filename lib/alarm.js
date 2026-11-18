'use strict';
// Alarm scheduling helpers (pure, no Electron) - used by main.js and the tests.
//
// Alarm shape:
//   { id, time: 'HH:MM', label, days: [0..6] (0 = Sunday, empty = one time), enabled,
//     sound: 'classic' | 'chimes' | 'digital' | 'gentle' | 'file', file, fileName, volume (0..1), snooze (minutes), rampUp }

const DEFAULT_ALARM = { time: '07:00', label: '', days: [], enabled: true, sound: 'classic', file: '', fileName: '', volume: 0.8, snooze: 5, rampUp: true };

function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
}

// Clean up an alarm coming from the UI so the scheduler can trust it.
function normalize(a) {
  const out = Object.assign({}, DEFAULT_ALARM, a || {});
  out.id = String(out.id || ('a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)));
  const t = parseTime(out.time) || parseTime(DEFAULT_ALARM.time);
  out.time = String(t.h).padStart(2, '0') + ':' + String(t.min).padStart(2, '0');
  out.label = String(out.label || '').slice(0, 60);
  out.days = Array.isArray(out.days) ? [...new Set(out.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort() : [];
  out.enabled = !!out.enabled;
  out.volume = Math.min(1, Math.max(0.05, Number(out.volume) || DEFAULT_ALARM.volume));
  out.snooze = Math.min(60, Math.max(1, Math.round(Number(out.snooze) || DEFAULT_ALARM.snooze)));
  out.rampUp = out.rampUp !== false;
  if (!['classic', 'chimes', 'digital', 'gentle', 'file'].includes(out.sound)) out.sound = 'classic';
  if (out.sound === 'file' && !out.file) out.sound = 'classic';
  return out;
}

// Next time (ms) this alarm rings at or after `fromMs`, in local time. null when it never rings.
function nextFire(alarm, fromMs) {
  if (!alarm || !alarm.enabled) return null;
  const t = parseTime(alarm.time); if (!t) return null;
  const from = new Date(fromMs);
  for (let add = 0; add <= 7; add++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + add, t.h, t.min, 0, 0);
    if (d.getTime() < fromMs) continue;
    if (!alarm.days || !alarm.days.length || alarm.days.includes(d.getDay())) return d.getTime();
  }
  return null;
}

// Earliest upcoming ring among a list (enabled alarms + snoozes). Returns { at, alarm } or null.
function soonest(alarms, snoozes, nowMs) {
  let best = null;
  (alarms || []).forEach((a) => { const at = nextFire(a, nowMs); if (at != null && (!best || at < best.at)) best = { at, alarm: a }; });
  (snoozes || []).forEach((s) => { if (s.at >= nowMs && (!best || s.at < best.at)) best = { at: s.at, alarm: s.alarm, snooze: true }; });
  return best;
}

// "in 7h 05m" style countdown parts.
function untilParts(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60 };
}

module.exports = { DEFAULT_ALARM, parseTime, normalize, nextFire, soonest, untilParts };
