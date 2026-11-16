'use strict';
// Prayer times - fully offline, computed with the "adhan" library.
const adhan = require('adhan');

const METHODS = {
  Egyptian: 'Egyptian General Authority of Survey',
  UmmAlQura: 'Umm al-Qura, Makkah',
  MuslimWorldLeague: 'Muslim World League',
  Karachi: 'University of Islamic Sciences, Karachi',
  NorthAmerica: 'ISNA (North America)',
  Kuwait: 'Kuwait',
  Qatar: 'Qatar',
  Dubai: 'Dubai (UAE)',
  Turkey: 'Diyanet (Turkey)',
  Singapore: 'Singapore',
  Tehran: 'Tehran',
  MoonsightingCommittee: 'Moonsighting Committee'
};

const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function paramsFor(cfg) {
  const make = adhan.CalculationMethod[cfg.method] || adhan.CalculationMethod.Egyptian;
  const p = make();
  p.madhab = cfg.asr === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  const adj = cfg.adjust || {};
  ORDER.forEach((k) => { p.adjustments[k] = (p.adjustments[k] || 0) + (Number(adj[k]) || 0); });
  return p;
}

// Returns ISO strings so the result can cross the IPC boundary unchanged.
function compute(location, cfg, date) {
  const coords = new adhan.Coordinates(location.lat, location.lon);
  const params = paramsFor(cfg);
  const day = date || new Date();
  const pt = new adhan.PrayerTimes(coords, day, params);
  const times = {};
  ORDER.forEach((k) => { times[k] = pt[k].toISOString(); });
  const qibla = Math.round(adhan.Qibla(coords) * 10) / 10;
  return { times, qibla, date: day.toISOString() };
}

// Next prayer from `now`; after Isha it rolls to tomorrow's Fajr.
function nextPrayer(location, cfg, now) {
  const today = compute(location, cfg, now);
  for (const k of ORDER) {
    if (new Date(today.times[k]) > now) return { name: k, time: today.times[k] };
  }
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const t = compute(location, cfg, tomorrow);
  return { name: 'fajr', time: t.times.fajr };
}

module.exports = { METHODS, ORDER, compute, nextPrayer };
