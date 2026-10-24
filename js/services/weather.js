"use strict";

/* ============ WEATHER (Open-Meteo) ============
   Free, no account or key. Only the city name you type and its coordinates are sent.
   Results are kept for an hour so redrawing the webtop never causes more requests. */
const WEATHER_CACHE_MS = 60 * 60 * 1000;
const weatherPending = new Map();

function weatherInfo(code){
  if(code === 0) return { icon:"\u2600\uFE0F", label:"Clear" };
  if(code === 1) return { icon:"\u{1F324}\uFE0F", label:"Mostly clear" };
  if(code === 2) return { icon:"\u26C5", label:"Partly cloudy" };
  if(code === 3) return { icon:"\u2601\uFE0F", label:"Cloudy" };
  if(code === 45 || code === 48) return { icon:"\u{1F32B}\uFE0F", label:"Fog" };
  if(code >= 51 && code <= 57) return { icon:"\u{1F326}\uFE0F", label:"Drizzle" };
  if(code >= 61 && code <= 67) return { icon:"\u{1F327}\uFE0F", label:"Rain" };
  if(code >= 71 && code <= 77) return { icon:"\u2744\uFE0F", label:"Snow" };
  if(code >= 80 && code <= 82) return { icon:"\u{1F326}\uFE0F", label:"Showers" };
  if(code === 85 || code === 86) return { icon:"\u{1F328}\uFE0F", label:"Snow showers" };
  if(code >= 95) return { icon:"\u26C8\uFE0F", label:"Thunderstorm" };
  return { icon:"\u{1F321}\uFE0F", label:"" };
}
// Turns Open-Meteo's response into [{date, code, max, min, wind}], or throws if it isn't what we expect.
function parseForecast(j){
  const d = j && j.daily;
  if(!d || !Array.isArray(d.time) || !Array.isArray(d.temperature_2m_max)) throw new Error("The weather service sent something unexpected.");
  return d.time.map((date, i)=>({ date, code: d.weather_code ? d.weather_code[i] : -1, max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], wind: d.wind_speed_10m_max ? d.wind_speed_10m_max[i] : null }));
}
async function geocodeCity(q){
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
  if(!r.ok) throw new Error("Couldn't look that city up.");
  const j = await r.json(), x = j.results && j.results[0];
  return x ? { lat: x.latitude, lon: x.longitude, place: [x.name, x.country].filter(Boolean).join(", ") } : null;
}
function fetchForecast(lat, lon, unit, days){
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${unit},${days}`, cacheKey = "on369.wx." + key;
  try{ const c = JSON.parse(localStorage.getItem(cacheKey) || "null"); if(c && Date.now() - c.t < WEATHER_CACHE_MS) return Promise.resolve(c.data); }catch(_){}
  if(weatherPending.has(key)) return weatherPending.get(key);
  const f = unit === "f" ? "fahrenheit" : "celsius", w = unit === "f" ? "mph" : "kmh";
  const p = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto&forecast_days=${days}&temperature_unit=${f}&wind_speed_unit=${w}`)
    .then(r=>{ if(!r.ok) throw new Error("The weather service isn't answering."); return r.json(); })
    .then(j=>{ const data = parseForecast(j); try{ localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), data })); }catch(_){} return data; })
    .catch(e=>{ throw (e && e.name === "TypeError" ? new Error("Can't reach the weather service. Check your connection.") : e); })
    .finally(()=> weatherPending.delete(key));
  weatherPending.set(key, p);
  return p;
}
// Resolves the city once (remembering its coordinates on the tile), then returns the forecast.
async function loadForecastFor(p){
  if(p.lat == null || p.lon == null){
    const g = await geocodeCity(p.city);
    if(!g) throw new Error(`Couldn't find \u201C${p.city}\u201D.`);
    p.lat = g.lat; p.lon = g.lon; p.place = g.place; save();
  }
  return fetchForecast(p.lat, p.lon, p.unit === "f" ? "f" : "c", 7);
}
