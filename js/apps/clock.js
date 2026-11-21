"use strict";

/* ============ APP: CLOCK ============
   Five tabs: Clock (the widget styles), World clocks, Timer, Stopwatch and Pomodoro.

   The Clock tab reuses the clock widget builders (CLOCK_STYLES in webtop/clock-widgets.js)
   instead of re-implementing a clock.

   Timers and the Pomodoro keep running when the window is closed or minimised: their state
   lives at module level (clkState, saved to localStorage) and one small ticker started in
   initAppsClock() watches them. The window is only a view onto that state. When a countdown
   ends you get a sound, a vibration, an on-page banner and (if allowed) a system notification. */

const CLK_LS_KEY = "on369.clock.v1";
const CLK_PRESETS = [60, 300, 600, 900, 1800];                       // timer presets, in seconds
const CLK_POMO_DEFAULT = { work: 25, short: 5, long: 15, every: 4, auto: false };
const CLK_WORLD_FALLBACK = ["UTC", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney", "Africa/Nairobi"];

function clockAppSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.2 2"></path></svg>`;
}

/* ---------- shared state ---------- */
function clkDefaultState(){
  return {
    timer: { total: 300, endsAt: null, left: 300 },                  // endsAt set while running; left while paused
    pomo: { phase: "work", round: 1, endsAt: null, left: CLK_POMO_DEFAULT.work * 60, cfg: { ...CLK_POMO_DEFAULT } },
    sw: { startedAt: null, elapsed: 0, laps: [] },
    world: [],                                                       // [{ tz }]
    style: "poster"
  };
}
function clkLoadState(){
  const base = clkDefaultState();
  try{
    const raw = JSON.parse(localStorage.getItem(CLK_LS_KEY) || "null");
    if(raw && typeof raw === "object"){
      if(raw.timer) Object.assign(base.timer, raw.timer);
      if(raw.pomo){ Object.assign(base.pomo, raw.pomo); base.pomo.cfg = { ...CLK_POMO_DEFAULT, ...(raw.pomo.cfg || {}) }; }
      if(raw.sw) Object.assign(base.sw, raw.sw);
      if(Array.isArray(raw.world)) base.world = raw.world.filter(z=> z && typeof z.tz === "string").slice(0, 12);
      if(typeof raw.style === "string") base.style = raw.style;
    }
  }catch(e){ console.warn("on369: clock state not loaded", e); }
  return base;
}
let clkState = clkLoadState();
function clkSave(){ try{ localStorage.setItem(CLK_LS_KEY, JSON.stringify(clkState)); }catch(e){} }

let clkView = null;      // the open window's refresh function, or null when no window is showing
let clkTicker = null;
let clkAudio = null;

/* ---------- helpers ---------- */
const clkPad = (n)=> String(n).padStart(2, "0");
function clkFmtDuration(sec){
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return (h ? h + ":" + clkPad(m) : m) + ":" + clkPad(s);
}
function clkFmtStopwatch(ms){
  const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return clkPad(m) + ":" + clkPad(s) + "." + clkPad(cs);
}
function clkRemaining(t){ return t.endsAt ? Math.max(0, (t.endsAt - Date.now()) / 1000) : t.left; }
function clkSwElapsed(){ return clkState.sw.elapsed + (clkState.sw.startedAt ? Date.now() - clkState.sw.startedAt : 0); }
function clkPomoPhaseSeconds(phase){
  const c = clkState.pomo.cfg;
  return (phase === "work" ? c.work : phase === "short" ? c.short : c.long) * 60;
}
const CLK_PHASE_LABEL = { work: "Focus", short: "Short break", long: "Long break" };

/* ---------- alerts ---------- */
function clkPrimeAudio(){        // must run from a click so the browser lets sound play later
  try{
    if(!clkAudio) clkAudio = new (window.AudioContext || window.webkitAudioContext)();
    if(clkAudio.state === "suspended") clkAudio.resume();
  }catch(e){}
}
function clkBeep(){
  try{
    if(!clkAudio) return;
    [0, 0.28, 0.56].forEach(offset=>{
      const t0 = clkAudio.currentTime + offset, osc = clkAudio.createOscillator(), gain = clkAudio.createGain();
      osc.type = "sine"; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0); gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain); gain.connect(clkAudio.destination); osc.start(t0); osc.stop(t0 + 0.25);
    });
  }catch(e){}
}
function clkAskNotifyPermission(){
  try{ if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }catch(e){}
}
function clkToast(message){
  document.querySelectorAll(".clk-toast").forEach(n=> n.remove());
  const t = document.createElement("div");
  t.className = "clk-toast"; t.setAttribute("role", "alert");
  const msg = document.createElement("span"); msg.textContent = message;
  const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Dismiss";
  btn.addEventListener("click", ()=> t.remove());
  t.append(msg, btn); document.body.appendChild(t);
  setTimeout(()=> t.remove(), 12000);
}
function clkAlert(title, body){
  clkBeep();
  try{ if(navigator.vibrate) navigator.vibrate([200, 100, 200]); }catch(e){}
  clkToast(title + (body ? " — " + body : ""));
  try{
    if("Notification" in window && Notification.permission === "granted" && document.hidden){
      new Notification(title, { body: body || "", icon: "icons/icon-192.png", tag: "on369-clock" });
    }
  }catch(e){}
}

/* ---------- the ticker (runs whether or not the window is open) ---------- */
function clkTick(){
  let changed = false;
  const t = clkState.timer;
  if(t.endsAt && t.endsAt <= Date.now()){
    t.endsAt = null; t.left = t.total; changed = true;
    clkAlert("Timer finished", clkFmtDuration(t.total));
  }
  const p = clkState.pomo;
  if(p.endsAt && p.endsAt <= Date.now()){
    changed = true;
    const finished = p.phase;
    if(finished === "work"){
      p.phase = (p.round % p.cfg.every === 0) ? "long" : "short";
    }else{
      p.phase = "work"; if(finished === "long") p.round = 1; else p.round++;
    }
    const secs = clkPomoPhaseSeconds(p.phase);
    p.left = secs; p.endsAt = p.cfg.auto ? Date.now() + secs * 1000 : null;
    clkAlert(CLK_PHASE_LABEL[finished] + " done", "Next: " + CLK_PHASE_LABEL[p.phase] + (p.cfg.auto ? "" : " — press Start"));
  }
  if(changed) clkSave();
  if(clkView){
    if(clkView.isGone()){ clkView = null; }
    else clkView.refresh();
  }
}
function clkEnsureTicker(){
  if(clkTicker) return;
  clkTicker = setInterval(clkTick, 200);
}

/* ---------- the window ---------- */
async function renderClockApp(body, api){
  let tab = "clock";
  body.innerHTML = `
    <div class="clockapp">
      <div class="clockapp-tabs" role="tablist" aria-label="Clock tools">
        <button type="button" role="tab" data-tab="clock">Clock</button>
        <button type="button" role="tab" data-tab="world">World</button>
        <button type="button" role="tab" data-tab="timer">Timer</button>
        <button type="button" role="tab" data-tab="stopwatch">Stopwatch</button>
        <button type="button" role="tab" data-tab="pomodoro">Pomodoro</button>
      </div>
      <div class="clockapp-pane" data-pane="clock">
        <div class="clockapp-bar"><select class="clockapp-style" aria-label="Clock style"></select></div>
        <div class="clockapp-stage"><div class="clk-face"></div></div>
      </div>
      <div class="clockapp-pane" data-pane="world"></div>
      <div class="clockapp-pane" data-pane="timer"></div>
      <div class="clockapp-pane" data-pane="stopwatch"></div>
      <div class="clockapp-pane" data-pane="pomodoro"></div>
    </div>`;
  const root = body.querySelector(".clockapp");
  const pane = (n)=> root.querySelector(`[data-pane="${n}"]`);

  /* ----- Clock tab ----- */
  const sel = root.querySelector(".clockapp-style"), face = root.querySelector(".clk-face");
  let style = CLOCK_STYLES[clkState.style] ? clkState.style : "poster", clockUpdate = null;
  Object.keys(CLOCK_STYLES).forEach(k=>{ const o = document.createElement("option"); o.value = k; o.textContent = CLOCK_STYLES[k].name; sel.appendChild(o); });
  sel.value = style;
  const mountClock = ()=>{
    const fake = { id:"app-clock", kind:"clock", clockStyle:style, showSeconds:true, showDate:true };
    clockUpdate = CLOCK_STYLES[style].build(face, fake);
    clockUpdate(clockParts(new Date()));
  };
  mountClock();
  sel.addEventListener("change", ()=>{ style = sel.value; clkState.style = style; clkSave(); mountClock(); });
  face.addEventListener("click", (e)=>{ if(e.target.closest(".clk-date")) AppManager.launch("calendar"); });

  /* ----- World tab ----- */
  const worldPane = pane("world");
  let zoneList = [];
  try{ zoneList = Intl.supportedValuesOf("timeZone"); }catch(e){ zoneList = CLK_WORLD_FALLBACK; }
  if(!zoneList.includes("UTC")) zoneList = ["UTC", ...zoneList];
  worldPane.innerHTML = `
    <div class="clk-world-add">
      <input type="text" class="clk-world-input" list="clkZones" placeholder="Add a city or time zone (e.g. Tokyo)" autocomplete="off" aria-label="Add a time zone">
      <datalist id="clkZones"></datalist>
      <button type="button" class="btn clk-world-addbtn">Add</button>
    </div>
    <div class="clk-world-quick"></div>
    <div class="clk-world-list" role="list"></div>`;
  const zl = worldPane.querySelector("#clkZones");
  zoneList.forEach(z=>{ const o = document.createElement("option"); o.value = z; o.label = z.replace(/_/g, " "); zl.appendChild(o); });
  const worldInput = worldPane.querySelector(".clk-world-input"), worldListEl = worldPane.querySelector(".clk-world-list");
  const zoneLabel = (tz)=> tz === "UTC" ? "UTC" : tz.split("/").pop().replace(/_/g, " ");
  const matchZone = (text)=>{
    const q = text.trim().toLowerCase().replace(/\s+/g, "_");
    if(!q) return null;
    return zoneList.find(z=> z.toLowerCase() === q) || zoneList.find(z=> z.toLowerCase().endsWith("/" + q)) || zoneList.find(z=> z.toLowerCase().includes(q)) || null;
  };
  const addZone = (tz)=>{
    if(!tz || clkState.world.some(z=> z.tz === tz)) return;
    if(clkState.world.length >= 12){ api.notify && api.notify("You can keep up to 12 world clocks", "info"); return; }
    clkState.world.push({ tz }); clkSave(); worldInput.value = ""; refreshWorld(true);
  };
  worldPane.querySelector(".clk-world-addbtn").addEventListener("click", ()=>{ const z = matchZone(worldInput.value); if(z) addZone(z); else worldInput.focus(); });
  worldInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); const z = matchZone(worldInput.value); if(z) addZone(z); } });
  const quick = worldPane.querySelector(".clk-world-quick");
  CLK_WORLD_FALLBACK.slice(0, 6).forEach(z=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "clk-chip"; b.textContent = "+ " + zoneLabel(z);
    b.addEventListener("click", ()=> addZone(z)); quick.appendChild(b);
  });
  worldListEl.addEventListener("click", (e)=>{
    const rm = e.target.closest("[data-remove]"); if(!rm) return;
    clkState.world = clkState.world.filter(z=> z.tz !== rm.dataset.remove); clkSave(); refreshWorld(true);
  });
  let worldBuilt = "";
  function clkOffsetHours(date, tz){
    const d = new Date(date.toLocaleString("en-US", { timeZone: tz || undefined }));
    const u = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    return (d - u) / 3600000;
  }
  function refreshWorld(force){
    const now = new Date();
    const sig = clkState.world.map(z=> z.tz).join("|");
    if(force || sig !== worldBuilt){
      worldBuilt = sig; worldListEl.innerHTML = "";
      if(!clkState.world.length){
        const empty = document.createElement("div"); empty.className = "clk-empty"; empty.textContent = "No world clocks yet. Add a city above or tap a suggestion.";
        worldListEl.appendChild(empty);
      }
      clkState.world.forEach(z=>{
        const row = document.createElement("div"); row.className = "clk-world-row"; row.setAttribute("role", "listitem"); row.dataset.tz = z.tz;
        row.innerHTML = `<div class="clk-world-name"><b></b><span></span></div><div class="clk-world-time"></div><button type="button" class="clk-x" aria-label="Remove">×</button>`;
        row.querySelector("b").textContent = zoneLabel(z.tz);
        row.querySelector(".clk-x").dataset.remove = z.tz;
        worldListEl.appendChild(row);
      });
    }
    const localDay = clockParts(now).day;
    worldListEl.querySelectorAll(".clk-world-row").forEach(row=>{
      const tz = row.dataset.tz;
      try{
        const p = clockParts(now, tz);
        row.querySelector(".clk-world-time").textContent = p.hm + (p.use12 ? " " + p.ampm : "");
        const diffDays = p.day === localDay ? 0 : ((p.day > localDay || (localDay > 27 && p.day < 5)) ? 1 : -1);
        const offsetH = clkOffsetHours(now, tz) - clkOffsetHours(now, state.timeZone || undefined);
        const off = offsetH === 0 ? "Same time" : (offsetH > 0 ? "+" : "−") + Math.abs(Math.round(offsetH * 10) / 10) + "h";
        row.querySelector(".clk-world-name span").textContent = (diffDays === 0 ? "Today" : diffDays > 0 ? "Tomorrow" : "Yesterday") + " · " + off;
      }catch(e){ row.querySelector(".clk-world-time").textContent = "—"; }
    });
  }

  /* ----- Timer tab ----- */
  const timerPane = pane("timer");
  timerPane.innerHTML = `
    <div class="clk-bigtime" data-timer-display>5:00</div>
    <div class="clk-progress"><i data-timer-bar></i></div>
    <div class="clk-chips" data-timer-presets></div>
    <div class="clk-custom">
      <label>h <input type="number" min="0" max="99" inputmode="numeric" data-th></label>
      <label>m <input type="number" min="0" max="59" inputmode="numeric" data-tm></label>
      <label>s <input type="number" min="0" max="59" inputmode="numeric" data-ts></label>
      <button type="button" class="btn" data-timer-set>Set</button>
    </div>
    <div class="clk-actions">
      <button type="button" class="btn primary" data-timer-toggle>Start</button>
      <button type="button" class="btn" data-timer-reset>Reset</button>
    </div>`;
  const tq = (s)=> timerPane.querySelector(s);
  CLK_PRESETS.forEach(sec=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "clk-chip"; b.textContent = sec >= 60 ? (sec / 60) + " min" : sec + " s"; b.dataset.sec = sec;
    tq("[data-timer-presets]").appendChild(b);
  });
  const setTimerTotal = (sec)=>{
    sec = Math.max(1, Math.min(99 * 3600 + 59 * 60 + 59, Math.round(sec)));
    const t = clkState.timer; t.total = sec; t.left = sec; t.endsAt = null; clkSave(); refreshTimer();
  };
  tq("[data-timer-presets]").addEventListener("click", (e)=>{ const b = e.target.closest("[data-sec]"); if(b) setTimerTotal(+b.dataset.sec); });
  tq("[data-timer-set]").addEventListener("click", ()=>{
    const v = (s)=> Math.max(0, parseInt(tq(s).value, 10) || 0);
    const sec = v("[data-th]") * 3600 + v("[data-tm]") * 60 + v("[data-ts]");
    if(sec > 0) setTimerTotal(sec);
  });
  tq("[data-timer-toggle]").addEventListener("click", ()=>{
    const t = clkState.timer;
    clkPrimeAudio();
    if(t.endsAt){ t.left = clkRemaining(t); t.endsAt = null; }
    else{ clkAskNotifyPermission(); if(t.left <= 0) t.left = t.total; t.endsAt = Date.now() + t.left * 1000; }
    clkSave(); refreshTimer();
  });
  tq("[data-timer-reset]").addEventListener("click", ()=>{ const t = clkState.timer; t.endsAt = null; t.left = t.total; clkSave(); refreshTimer(); });
  function refreshTimer(){
    const t = clkState.timer, rem = clkRemaining(t);
    tq("[data-timer-display]").textContent = clkFmtDuration(rem);
    tq("[data-timer-bar]").style.width = (t.total ? Math.min(100, (1 - rem / t.total) * 100) : 0) + "%";
    tq("[data-timer-toggle]").textContent = t.endsAt ? "Pause" : (rem < t.total ? "Resume" : "Start");
    timerPane.querySelectorAll("[data-sec]").forEach(b=> b.classList.toggle("active", +b.dataset.sec === t.total));
  }

  /* ----- Stopwatch tab ----- */
  const swPane = pane("stopwatch");
  swPane.innerHTML = `
    <div class="clk-bigtime clk-mono" data-sw-display>00:00.00</div>
    <div class="clk-actions">
      <button type="button" class="btn primary" data-sw-toggle>Start</button>
      <button type="button" class="btn" data-sw-lap>Lap</button>
      <button type="button" class="btn" data-sw-reset>Reset</button>
    </div>
    <ol class="clk-laps" data-sw-laps></ol>`;
  const sq = (s)=> swPane.querySelector(s);
  sq("[data-sw-toggle]").addEventListener("click", ()=>{
    const s = clkState.sw;
    if(s.startedAt){ s.elapsed += Date.now() - s.startedAt; s.startedAt = null; }
    else s.startedAt = Date.now();
    clkSave(); refreshStopwatch(true);
  });
  sq("[data-sw-lap]").addEventListener("click", ()=>{
    const s = clkState.sw; if(!s.startedAt && !s.elapsed) return;
    s.laps.push(clkSwElapsed()); if(s.laps.length > 200) s.laps.shift(); clkSave(); refreshStopwatch(true);
  });
  sq("[data-sw-reset]").addEventListener("click", ()=>{ clkState.sw = { startedAt: null, elapsed: 0, laps: [] }; clkSave(); refreshStopwatch(true); });
  let lapsBuilt = -1;
  function refreshStopwatch(force){
    const s = clkState.sw;
    sq("[data-sw-display]").textContent = clkFmtStopwatch(clkSwElapsed());
    sq("[data-sw-toggle]").textContent = s.startedAt ? "Pause" : (s.elapsed ? "Resume" : "Start");
    if(force || lapsBuilt !== s.laps.length){
      lapsBuilt = s.laps.length;
      const ol = sq("[data-sw-laps]"); ol.innerHTML = "";
      s.laps.forEach((total, i)=>{
        const li = document.createElement("li"); const prev = i ? s.laps[i - 1] : 0;
        li.innerHTML = `<span class="clk-lap-n"></span><span class="clk-lap-split"></span><span class="clk-lap-total"></span>`;
        li.querySelector(".clk-lap-n").textContent = "Lap " + (i + 1);
        li.querySelector(".clk-lap-split").textContent = "+" + clkFmtStopwatch(total - prev);
        li.querySelector(".clk-lap-total").textContent = clkFmtStopwatch(total);
        ol.prepend(li);
      });
    }
  }

  /* ----- Pomodoro tab ----- */
  const pomoPane = pane("pomodoro");
  pomoPane.innerHTML = `
    <div class="clk-phase" data-pomo-phase>Focus</div>
    <div class="clk-bigtime" data-pomo-display>25:00</div>
    <div class="clk-progress"><i data-pomo-bar></i></div>
    <div class="clk-dots" data-pomo-dots aria-label="Round"></div>
    <div class="clk-actions">
      <button type="button" class="btn primary" data-pomo-toggle>Start</button>
      <button type="button" class="btn" data-pomo-skip>Skip</button>
      <button type="button" class="btn" data-pomo-reset>Reset</button>
    </div>
    <details class="clk-settings"><summary>Settings</summary>
      <div class="clk-custom">
        <label>Focus <input type="number" min="1" max="120" inputmode="numeric" data-cfg="work"> min</label>
        <label>Short <input type="number" min="1" max="60" inputmode="numeric" data-cfg="short"> min</label>
        <label>Long <input type="number" min="1" max="90" inputmode="numeric" data-cfg="long"> min</label>
        <label>Long break every <input type="number" min="2" max="10" inputmode="numeric" data-cfg="every"> rounds</label>
      </div>
      <label class="clockapp-check"><input type="checkbox" data-cfg-auto> Start the next phase automatically</label>
    </details>`;
  const pq = (s)=> pomoPane.querySelector(s);
  pomoPane.querySelectorAll("[data-cfg]").forEach(inp=>{
    inp.value = clkState.pomo.cfg[inp.dataset.cfg];
    inp.addEventListener("change", ()=>{
      const k = inp.dataset.cfg, max = +inp.max, v = Math.max(1, Math.min(max, parseInt(inp.value, 10) || CLK_POMO_DEFAULT[k]));
      inp.value = v; clkState.pomo.cfg[k] = v;
      const p = clkState.pomo; if(!p.endsAt) p.left = clkPomoPhaseSeconds(p.phase);
      clkSave(); refreshPomo();
    });
  });
  pq("[data-cfg-auto]").checked = !!clkState.pomo.cfg.auto;
  pq("[data-cfg-auto]").addEventListener("change", (e)=>{ clkState.pomo.cfg.auto = e.target.checked; clkSave(); });
  pq("[data-pomo-toggle]").addEventListener("click", ()=>{
    const p = clkState.pomo; clkPrimeAudio();
    if(p.endsAt){ p.left = clkRemaining(p); p.endsAt = null; }
    else{ clkAskNotifyPermission(); p.endsAt = Date.now() + p.left * 1000; }
    clkSave(); refreshPomo();
  });
  const pomoGoto = (phase, round)=>{
    const p = clkState.pomo; p.phase = phase; p.round = round; p.left = clkPomoPhaseSeconds(phase); p.endsAt = null; clkSave(); refreshPomo();
  };
  pq("[data-pomo-skip]").addEventListener("click", ()=>{
    const p = clkState.pomo;
    if(p.phase === "work") pomoGoto((p.round % p.cfg.every === 0) ? "long" : "short", p.round);
    else pomoGoto("work", p.phase === "long" ? 1 : p.round + 1);
  });
  pq("[data-pomo-reset]").addEventListener("click", ()=> pomoGoto("work", 1));
  function refreshPomo(){
    const p = clkState.pomo, rem = clkRemaining(p), total = clkPomoPhaseSeconds(p.phase);
    pq("[data-pomo-phase]").textContent = CLK_PHASE_LABEL[p.phase];
    pq("[data-pomo-phase]").dataset.phase = p.phase;
    pq("[data-pomo-display]").textContent = clkFmtDuration(rem);
    pq("[data-pomo-bar]").style.width = Math.min(100, (1 - rem / total) * 100) + "%";
    pq("[data-pomo-toggle]").textContent = p.endsAt ? "Pause" : (rem < total ? "Resume" : "Start");
    const dots = pq("[data-pomo-dots]"), n = p.cfg.every, cur = ((p.round - 1) % n) + 1;
    if(dots.children.length !== n){ dots.innerHTML = ""; for(let i = 0; i < n; i++) dots.appendChild(document.createElement("i")); }
    [...dots.children].forEach((d, i)=>{ d.className = i < cur - 1 || (i === cur - 1 && p.phase !== "work") ? "done" : (i === cur - 1 ? "now" : ""); });
  }

  /* ----- tabs ----- */
  const tabButtons = [...root.querySelectorAll("[data-tab]")];
  function showTab(name){
    tab = name;
    tabButtons.forEach(b=>{ const on = b.dataset.tab === name; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    root.querySelectorAll("[data-pane]").forEach(p=>{ p.hidden = p.dataset.pane !== name; });
    refreshAll();
  }
  tabButtons.forEach(b=> b.addEventListener("click", ()=> showTab(b.dataset.tab)));

  let lastSecond = -1;
  function refreshAll(){
    if(tab === "clock"){ const s = Math.floor(Date.now() / 1000); if(clockUpdate && s !== lastSecond){ lastSecond = s; clockUpdate(clockParts(new Date())); } }
    else if(tab === "world"){ refreshWorld(false); }
    else if(tab === "timer") refreshTimer();
    else if(tab === "stopwatch") refreshStopwatch(false);
    else if(tab === "pomodoro") refreshPomo();
  }

  clkView = { refresh: refreshAll, isGone: ()=> !body.isConnected };
  clkEnsureTicker();
  showTab("clock");
}

/* Runs once at startup (see main.js). The ticker starts here so timers keep counting with no window open. */
function initAppsClock(){
  clkEnsureTicker();
  AppManager.register({
    id: "clock",
    name: "Clock",
    description: "Clock, world clocks, timer, stopwatch and Pomodoro.",
    version: "2.0.0",
    developer: "on369",
    category: "utilities",
    icon: clockAppSVG,
    render: renderClockApp,
    permissions: ["storage"],
    fileAssociations: [],
    shortcuts: [],
    defaultWidth: 380, defaultHeight: 480,
    minWidth: 300, minHeight: 380,
    maxWidth: 800, maxHeight: 800,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });
}
