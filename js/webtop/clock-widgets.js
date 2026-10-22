"use strict";

/* ============ CLOCK WIDGETS ============
   A clock is a widget with kind "clock". Six styles (digital, analog, hybrid) share
   one ticker; every date is a button that opens the calendar. Sizes use container
   units (cq*), so a clock scales cleanly when you resize it. */
const CLOCK_STYLES = {
  poster:  { name:"Poster",      group:"Digital", w:230, h:300, build:buildPosterClock },
  digital: { name:"Big digits",  group:"Digital", w:320, h:150, build:buildDigitalClock },
  glass:   { name:"Glass hands", group:"Analog",  w:260, h:260, build:buildGlassClock },
  classic: { name:"Classic",     group:"Analog",  w:260, h:260, build:buildClassicClock },
  rings:   { name:"Neon rings",  group:"Hybrid",  w:280, h:280, build:buildRingsClock },
  dots:    { name:"Dot rings",   group:"Hybrid",  w:300, h:300, build:buildDotsClock }
};
const clockUpdaters = new Map();
const pad2 = (n)=> String(n).padStart(2, "0");

function uses12h(){
  if(state.timeFormat === "12h") return true;
  if(state.timeFormat === "24h") return false;
  try{ return !!new Intl.DateTimeFormat([], { hour:"numeric" }).resolvedOptions().hour12; }catch(_){ return false; }
}
function clockParts(date){
  const tz = state.timeZone || undefined, map = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hour:"numeric", minute:"numeric", second:"numeric", day:"numeric", hour12:false })
    .formatToParts(date).forEach(p=> map[p.type] = p.value);
  const h = Number(map.hour) % 24, m = Number(map.minute), s = Number(map.second), use12 = uses12h();
  const nm = (o)=> date.toLocaleDateString([], { timeZone: tz, ...o });
  return { h, m, s, day: Number(map.day), use12, ampm: h < 12 ? "AM" : "PM",
    hm: use12 ? `${h % 12 || 12}:${pad2(m)}` : `${pad2(h)}:${pad2(m)}`,
    weekday: nm({ weekday:"long" }), weekdayShort: nm({ weekday:"short" }), month: nm({ month:"long" }),
    dateText: formatDateWithPreset(date, state.dateFormat, tz) };
}
function setAngle(el, deg){            // hands only animate forward; wrapping past 360 snaps back
  if(!el) return;
  el.style.transition = deg < (el._d || 0) ? "none" : "";
  el._d = deg; el.style.transform = `rotate(${deg}deg)`;
}
const show = (el, on)=>{ if(el) el.style.display = on ? "" : "none"; };

function buildPosterClock(root, w){
  root.innerHTML = `<div class="clk clk-poster"><div class="p-month clk-date"></div><div class="p-day clk-date"></div><div class="p-week clk-date"></div><div class="p-time"></div></div>`;
  const q = (c)=> root.querySelector(c), mo = q(".p-month"), dy = q(".p-day"), wk = q(".p-week"), tm = q(".p-time");
  return (p)=>{
    mo.textContent = p.month.toUpperCase(); dy.textContent = pad2(p.day); wk.textContent = p.weekday;
    tm.textContent = p.hm + (w.showSeconds ? ":" + pad2(p.s) : "") + (p.use12 ? p.ampm : "");
    [mo, dy, wk].forEach(e=> show(e, w.showDate));
  };
}
function buildDigitalClock(root, w){
  root.innerHTML = `<div class="clk clk-digital"><div class="d-time"><span class="d-hm"></span><span class="d-side"><span class="d-s"></span><span class="d-ap"></span></span></div><div class="d-date clk-date"></div></div>`;
  const q = (c)=> root.querySelector(c), hm = q(".d-hm"), s = q(".d-s"), ap = q(".d-ap"), dt = q(".d-date");
  return (p)=>{ hm.textContent = p.hm; s.textContent = w.showSeconds ? pad2(p.s) : ""; ap.textContent = p.use12 ? p.ampm : ""; dt.textContent = p.dateText; show(dt, w.showDate); };
}
function buildGlassClock(root, w){
  root.innerHTML = `<div class="clk clk-glass"><div class="g-dial"><i class="g-disc g-h"></i><i class="g-disc g-m"></i><i class="g-disc g-s"></i><div class="g-date clk-date"></div></div></div>`;
  const q = (c)=> root.querySelector(c), hh = q(".g-h"), mm = q(".g-m"), ss = q(".g-s"), dt = q(".g-date");
  return (p)=>{
    setAngle(hh, ((p.h % 12) + p.m / 60) * 30); setAngle(mm, (p.m + p.s / 60) * 6); setAngle(ss, p.s * 6);
    show(ss, w.showSeconds); dt.textContent = `${p.weekdayShort} ${p.day}`; show(dt, w.showDate);
  };
}
function buildClassicClock(root, w){
  let ticks = "";
  for(let i = 0; i < 60; i++){
    const big = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = big ? 40 : 44, r2 = 47;
    ticks += `<line class="${big ? "c-tk big" : "c-tk"}" x1="${50 + r1 * Math.sin(a)}" y1="${50 - r1 * Math.cos(a)}" x2="${50 + r2 * Math.sin(a)}" y2="${50 - r2 * Math.cos(a)}"/>`;
  }
  root.innerHTML = `<div class="clk clk-classic"><svg viewBox="0 0 100 100"><circle class="c-face" cx="50" cy="50" r="48"/>${ticks}<line class="c-h" x1="50" y1="52" x2="50" y2="28"/><line class="c-m" x1="50" y1="54" x2="50" y2="15"/><line class="c-s" x1="50" y1="58" x2="50" y2="11"/><circle class="c-cap" cx="50" cy="50" r="2.4"/></svg><div class="c-date clk-date"></div></div>`;
  const q = (c)=> root.querySelector(c), hh = q(".c-h"), mm = q(".c-m"), ss = q(".c-s"), dt = q(".c-date");
  return (p)=>{
    setAngle(hh, ((p.h % 12) + p.m / 60) * 30); setAngle(mm, (p.m + p.s / 60) * 6); setAngle(ss, p.s * 6);
    show(ss, w.showSeconds); dt.textContent = `${p.weekdayShort} ${p.day}`; show(dt, w.showDate);
  };
}
function buildRingsClock(root, w){
  root.innerHTML = `<div class="clk clk-rings"><svg viewBox="0 0 100 100"><circle class="r-track" cx="50" cy="50" r="44"/><circle class="r-track" cx="50" cy="50" r="35"/><circle class="r-track r-st" cx="50" cy="50" r="26"/><g class="r-hand r-h"><circle class="r-dot" cx="50" cy="6" r="3"/></g><g class="r-hand r-m"><circle class="r-dot" cx="50" cy="15" r="2.6"/></g><g class="r-hand r-s"><circle class="r-dot" cx="50" cy="24" r="2.2"/></g></svg><div class="r-center"><div class="r-time"></div><div class="r-date clk-date"></div></div></div>`;
  const q = (c)=> root.querySelector(c), hh = q(".r-h"), mm = q(".r-m"), ss = q(".r-s"), st = q(".r-st"), tm = q(".r-time"), dt = q(".r-date");
  return (p)=>{
    setAngle(hh, ((p.h % 12) + p.m / 60) * 30); setAngle(mm, (p.m + p.s / 60) * 6); setAngle(ss, p.s * 6);
    show(ss, w.showSeconds); show(st, w.showSeconds);
    tm.textContent = p.hm + (w.showSeconds ? ":" + pad2(p.s) : "") + (p.use12 ? " " + p.ampm : "");
    dt.textContent = p.dateText; show(dt, w.showDate);
  };
}
function buildDotsClock(root, w){
  let dots = "";
  [[12, 44, "h"], [60, 37, "m"], [60, 30, "s"]].forEach(([n, r, k])=>{
    for(let i = 0; i < n; i++){
      const a = (i / n) * 2 * Math.PI;
      dots += `<circle class="dt dt-${k}" cx="${(50 + r * Math.sin(a)).toFixed(2)}" cy="${(50 - r * Math.cos(a)).toFixed(2)}" r="${k === "h" ? 1.9 : 1.1}"/>`;
    }
  });
  root.innerHTML = `<div class="clk clk-dots"><svg viewBox="0 0 100 100">${dots}</svg><div class="r-center"><div class="r-time"></div><div class="r-date clk-date"></div></div></div>`;
  const q = (c)=> root.querySelector(c), all = (c)=> Array.from(root.querySelectorAll(c));
  const H = all(".dt-h"), M = all(".dt-m"), S = all(".dt-s"), tm = q(".r-time"), dt = q(".r-date");
  const mark = (list, i)=> list.forEach((d, k)=> d.classList.toggle("on", k === i));
  return (p)=>{
    mark(H, p.h % 12); mark(M, p.m); mark(S, p.s); S.forEach(d=> show(d, w.showSeconds));
    tm.textContent = p.hm + (w.showSeconds ? ":" + pad2(p.s) : "") + (p.use12 ? " " + p.ampm : "");
    dt.textContent = p.dateText; show(dt, w.showDate);
  };
}

function tickClockWidgets(){
  if(!clockUpdaters.size || document.hidden) return;
  const p = clockParts(new Date());
  clockUpdaters.forEach(fn=> fn(p));
}
function addClockWidget(wx, wy){
  const d = CLOCK_STYLES.poster;
  const w = createItem("widget", { label:"Clock", kind:"clock", clockStyle:"poster", pw:d.w, ph:d.h, opacity:0, blur:false, color:"#0b0f1a",
    wx: Math.max(0, Math.round(wx)), wy: Math.max(0, Math.round(wy)), parentId:null });
  state.icons.push(w); save(); render();
  return w;
}

function renderClockWidget(w){
  const def = CLOCK_STYLES[w.clockStyle] || CLOCK_STYLES.poster;
  const hex = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : "#0b0f1a";
  const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const narrow = window.innerWidth <= 820, pw = narrow ? Math.min(w.pw, window.innerWidth - 16) : w.pw;
  const left = narrow ? Math.max(0, Math.min(w.wx, window.innerWidth - pw - 8)) : w.wx;
  const el = document.createElement("div");
  el.className = "widget clock-widget" + (w.opacity < 0.04 ? " bare" : "");
  el.dataset.id = w.id;
  el.style.cssText = `left:${left}px;top:${w.wy}px;width:${pw}px;height:${w.ph}px;background:rgba(${r},${g},${b},${w.opacity});` + (w.blur && w.opacity >= 0.04 ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
  if(w.accent) el.style.setProperty("--clk-accent", w.accent);
  if(w.opacity >= 0.6) el.style.color = (0.299*r + 0.587*g + 0.114*b) / 255 > 0.6 ? "#14161c" : "#fff";
  const face = document.createElement("div"); face.className = "clk-face";
  const cog = document.createElement("span"); cog.className = "clock-cog"; cog.textContent = "\u2699"; cog.title = "Clock settings";
  const grip = document.createElement("div"); grip.className = "widget-grip";
  el.append(face, cog, grip);
  gridLayer.prepend(el);
  const update = def.build(face, w);
  clockUpdaters.set(w.id, update); update(clockParts(new Date()));

  el.addEventListener("click", (e)=>{ if(e.target.closest(".clk-date")){ e.stopPropagation(); toggleCalendar(); } });   // the date opens the calendar
  el.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); openClockSettings(w, e.clientX, e.clientY); });
  cog.addEventListener("click", ()=>{ const rc = cog.getBoundingClientRect(); openClockSettings(w, rc.left, rc.bottom + 6); });
  el.addEventListener("pointerdown", (e)=>{
    if(e.target.closest(".clock-cog, .widget-grip, .clk-date") || e.button > 0) return;
    const x0 = w.wx, y0 = w.wy;
    dragWidgetPart(e, (dx, dy)=>{ w.wx = Math.max(0, x0 + dx); w.wy = Math.max(0, y0 + dy); el.style.left = w.wx + "px"; el.style.top = w.wy + "px"; }, ()=>{ w.wx = Math.round(w.wx); w.wy = Math.round(w.wy); save(); });
  });
  grip.addEventListener("pointerdown", (e)=>{
    const w0 = w.pw, h0 = w.ph;
    dragWidgetPart(e, (dx, dy)=>{ w.pw = Math.max(120, Math.round(w0 + dx)); w.ph = Math.max(80, Math.round(h0 + dy)); el.style.width = w.pw + "px"; el.style.height = w.ph + "px"; }, ()=>{ save(); render(); });
  });
}

function openClockSettings(w, x, y){
  closeWidgetPop();
  const pop = document.createElement("div"); pop.className = "widget-pop";
  pop.innerHTML = `<label>Style<select class="cs-style"></select></label>
    <div><div class="wp-cap">Accent color</div><div class="wp-sw cs-sw"></div></div>
    <label>Panel transparency <b class="wp-opv"></b><input type="range" class="wp-op" min="0" max="100"></label>
    <label>Panel color<input type="color" class="wp-color"></label>
    <label class="wp-row"><input type="checkbox" class="cs-date"> Show date</label>
    <label class="wp-row"><input type="checkbox" class="cs-sec"> Show seconds</label>
    <label class="wp-row"><input type="checkbox" class="wp-blur"> Frosted blur</label>
    <div class="wp-row"><button class="wp-del">Delete clock</button></div>`;
  const q = (c)=> pop.querySelector(c), sel = q(".cs-style"), op = q(".wp-op"), opv = q(".wp-opv"), color = q(".wp-color");
  ["Digital", "Analog", "Hybrid"].forEach(grp=>{
    const og = document.createElement("optgroup"); og.label = grp;
    Object.entries(CLOCK_STYLES).filter(([, s])=> s.group === grp).forEach(([id, s])=>{ const o = document.createElement("option"); o.value = id; o.textContent = s.name; og.appendChild(o); });
    sel.appendChild(og);
  });
  sel.value = w.clockStyle; op.value = Math.round((1 - w.opacity) * 100); opv.textContent = op.value + "%";
  color.value = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : "#0b0f1a";
  q(".cs-date").checked = w.showDate; q(".cs-sec").checked = w.showSeconds; q(".wp-blur").checked = w.blur;
  ["", ...COLORS].forEach(c=>{
    const b = document.createElement("button"); b.className = "wp-dot"; b.style.background = c || "var(--accent)"; b.title = c ? c : "Theme color";
    b.addEventListener("click", ()=>{ w.accent = c; save(); render(); });
    q(".cs-sw").appendChild(b);
  });
  sel.addEventListener("change", ()=>{ const d = CLOCK_STYLES[sel.value]; w.clockStyle = sel.value; w.pw = d.w; w.ph = d.h; save(); render(); });
  op.addEventListener("input", ()=>{ w.opacity = 1 - op.value / 100; opv.textContent = op.value + "%"; render(); });
  color.addEventListener("input", ()=>{ w.color = color.value; render(); });
  [op, color].forEach(i=> i.addEventListener("change", ()=> save()));
  q(".cs-date").addEventListener("change", (e)=>{ w.showDate = e.target.checked; save(); render(); });
  q(".cs-sec").addEventListener("change", (e)=>{ w.showSeconds = e.target.checked; save(); render(); });
  q(".wp-blur").addEventListener("change", (e)=>{ w.blur = e.target.checked; save(); render(); });
  q(".wp-del").addEventListener("click", ()=>{ if(confirm("Delete this clock?")){ closeWidgetPop(); removeWidget(w, false); } });
  document.body.appendChild(pop);
  pop.style.left = Math.max(8, Math.min(x, window.innerWidth - 250)) + "px";
  pop.style.top = Math.max(8, Math.min(y, window.innerHeight - pop.offsetHeight - 8)) + "px";
  setTimeout(()=> document.addEventListener("pointerdown", function away(e){
    if(pop.contains(e.target)) return;
    pop.remove(); document.removeEventListener("pointerdown", away);
  }), 0);
}

/* Runs once at startup (see main.js). */
function initWebtopClockWidgets(){
  setInterval(tickClockWidgets, 1000);
  document.addEventListener("visibilitychange", tickClockWidgets);
}
