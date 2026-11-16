'use strict';
// Weather: Open-Meteo fetch + normalisation into Chrono's icon names.
// Pure functions (no Electron imports) so they can be unit-tested with node.

const ICONS = [
  'clear_day', 'clear_night', 'mostly_clear_day', 'mostly_clear_night',
  'partly_cloudy_day', 'partly_cloudy_night', 'cloudy', 'fog', 'drizzle',
  'rain', 'heavy_rain', 'showers_day', 'showers_night', 'sleet', 'snow',
  'thunderstorm', 'wind'
];

const isThunder = (c) => c >= 95;
const isSnow = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;
const isSleet = (c) => c === 66 || c === 67;
const isHeavy = (c) => c === 65 || c === 82;
const isRain = (c) => (c >= 51 && c <= 57) || (c >= 61 && c <= 65) || (c >= 80 && c <= 82) || isSleet(c);
const isShower = (c) => c === 80 || c === 81;
const isFog = (c) => c === 45 || c === 48;

// WMO weather code -> Chrono icon (used for the "right now" reading).
function iconFor(code, isDay, windKmh) {
  const d = isDay !== 0 && isDay !== false;
  const sfx = d ? 'day' : 'night';
  const windy = typeof windKmh === 'number' && windKmh >= 40;
  if (isThunder(code)) return 'thunderstorm';
  if (isSnow(code)) return 'snow';
  if (isSleet(code)) return 'sleet';
  if (isHeavy(code)) return 'heavy_rain';
  if (isShower(code)) return 'showers_' + sfx;
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 61 || code === 63) return 'rain';
  if (isFog(code)) return 'fog';
  if (windy && code <= 2) return 'wind';
  if (code === 0) return 'clear_' + sfx;
  if (code === 1) return 'mostly_clear_' + sfx;
  if (code === 2) return 'partly_cloudy_' + sfx;
  return 'cloudy';
}

// Daily icon: Open-Meteo's daily code is the *worst* hour of the day, so one
// misty morning hour turned a sunny day into "fog". Use the daytime hours
// (07:00-19:00) instead and only show precipitation/fog when it lasts.
function dailyIcon(dayCodes, dailyCode, maxWind) {
  const codes = dayCodes.filter((c) => typeof c === 'number');
  if (!codes.length) return iconFor(dailyCode, 1, maxWind);
  const count = (fn) => codes.filter(fn).length;
  if (count(isThunder) >= 2) return 'thunderstorm';
  if (count(isSnow) >= 2) return 'snow';
  if (count(isSleet) >= 2) return 'sleet';
  const rainH = count(isRain);
  if (rainH >= 2) {
    if (count(isHeavy) >= 2) return 'heavy_rain';
    if (count(isShower) >= Math.ceil(rainH / 2)) return 'showers_day';
    return rainH >= 6 ? 'rain' : (count((c) => c >= 51 && c <= 57) >= rainH / 2 ? 'drizzle' : 'rain');
  }
  if (count(isFog) >= Math.ceil(codes.length / 2)) return 'fog';
  const sky = codes.filter((c) => c <= 3);
  const avg = sky.length ? sky.reduce((a, b) => a + b, 0) / sky.length : 3;
  const rounded = Math.min(3, Math.max(0, Math.round(avg)));
  if (typeof maxWind === 'number' && maxWind >= 45 && rounded <= 2) return 'wind';
  return ['clear_day', 'mostly_clear_day', 'partly_cloudy_day', 'cloudy'][rounded];
}

function buildUrl(lat, lon) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
    hourly: 'weather_code',
    timezone: 'auto',
    forecast_days: '8',
    wind_speed_unit: 'kmh'
  });
  return 'https://api.open-meteo.com/v1/forecast?' + q.toString();
}

function normalise(json, location) {
  const cur = json.current || {};
  const daily = json.daily || {};
  const hourly = json.hourly || {};
  const days = (daily.time || []).map((date, i) => {
    const codes = [];
    (hourly.time || []).forEach((t, h) => {
      if (t.slice(0, 10) === date) {
        const hour = parseInt(t.slice(11, 13), 10);
        if (hour >= 7 && hour <= 19) codes.push(hourly.weather_code[h]);
      }
    });
    const maxWind = daily.wind_speed_10m_max ? daily.wind_speed_10m_max[i] : undefined;
    return {
      date,
      max: round(daily.temperature_2m_max[i]),
      min: round(daily.temperature_2m_min[i]),
      pop: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null,
      sunrise: daily.sunrise ? daily.sunrise[i] : null,
      sunset: daily.sunset ? daily.sunset[i] : null,
      icon: dailyIcon(codes, daily.weather_code[i], maxWind)
    };
  });
  return {
    updated: Date.now(),
    location,
    current: {
      temp: round(cur.temperature_2m),
      feels: round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind: round(cur.wind_speed_10m),
      isDay: cur.is_day,
      icon: iconFor(cur.weather_code, cur.is_day, cur.wind_speed_10m)
    },
    days
  };
}

function round(n) { return typeof n === 'number' ? Math.round(n) : null; }

async function fetchWeather(fetchFn, location) {
  const res = await fetchFn(buildUrl(location.lat, location.lon));
  if (!res.ok) throw new Error('Weather HTTP ' + res.status);
  return normalise(await res.json(), { name: location.name, lat: location.lat, lon: location.lon });
}

async function searchCity(fetchFn, query, lang) {
  const q = new URLSearchParams({ name: query, count: '8', language: lang === 'ar' ? 'ar' : 'en', format: 'json' });
  const res = await fetchFn('https://geocoding-api.open-meteo.com/v1/search?' + q.toString());
  if (!res.ok) throw new Error('Geocoding HTTP ' + res.status);
  const j = await res.json();
  return (j.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    short: r.name,
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone
  }));
}

module.exports = { ICONS, iconFor, dailyIcon, buildUrl, normalise, fetchWeather, searchCity };
