"use strict";

/* ============ BOARDS ============
   A board is a widget made of tiles on a grid: to-do lists, search, link shortcuts, clocks,
   calendars, notes, a weather forecast. Start from a preset, then make it yours: add, remove,
   move and resize tiles, change the look. A tile is {id, type, col, row, w, h, p:{its settings}}. */
const BOARD_CELL = 88;
const TILE_TYPES = {
  todo:     { name:"To-do list",  icon:"\u2611\uFE0F",     desc:"Tick things off",         w:2, h:3 },
  search:   { name:"Search",      icon:"\u{1F50D}",        desc:"Search the web",          w:4, h:1 },
  link:     { name:"Link",        icon:"\u{1F517}",        desc:"One big shortcut",        w:2, h:1 },
  links:    { name:"Quick links", icon:"\u26A1",           desc:"A row of shortcuts",      w:4, h:1 },
  clock:    { name:"Clock",       icon:"\u{1F552}",        desc:"Any time zone",           w:2, h:1 },
  calendar: { name:"Calendar",    icon:"\u{1F4C5}",        desc:"Month or week",           w:2, h:3 },
  note:     { name:"Note",        icon:"\u{1F4DD}",        desc:"Quick text",              w:2, h:2 },
  forecast: { name:"Forecast",    icon:"\u26C5",           desc:"Weather (needs internet)", w:2, h:5 },
  shelf:    { name:"Shelf",       icon:"\u{1F5C2}\uFE0F", desc:"Holds icons you drag in",  w:3, h:3 }
};
const TILE_PREVIEW_COLORS = { todo:"#7c9cff", search:"#9aa5b1", link:"#ffb454", links:"#f08fb0", clock:"#5fd3b3", calendar:"#c792ea", note:"#f6d365", forecast:"#6ec6ff", shelf:"#ff8a65" };
const TILE_COLORS = ["#0f172a", "#17473f", "#3b1d4a", "#4a1d2b", "#1e3a5f", "#2b2b2b", "#f4f1ea", "#e3edf9"];
const TZ_CHOICES = ["", "UTC", "Africa/Nairobi", "Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland"];
const DEFAULT_TSTYLE = { color:"#0f172a", opacity:0.72, radius:14, gap:10, accent:"" };
const boardEditing = new Set();      // boards currently open for editing (not saved)

/* ---------- layout engine (pure, so it can be tested) ---------- */
const tilesOverlap = (a, b)=> a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
// Keeps every tile inside the columns and pushes overlapping tiles down, leaving the `pinnedId` tile where it is.
function resolveLayout(tiles, cols, pinnedId){
  const t = tiles.map(x=> ({ ...x }));
  t.forEach(x=>{ x.w = Math.max(1, Math.min(x.w, cols)); x.h = Math.max(1, x.h); x.col = Math.max(0, Math.min(x.col, cols - x.w)); x.row = Math.max(0, x.row); });
  const pinned = t.find(x=> x.id === pinnedId), placed = pinned ? [pinned] : [];
  t.filter(x=> x !== pinned).sort((a, b)=> a.row - b.row || a.col - b.col).forEach(x=>{
    while(placed.some(p=> tilesOverlap(x, p))) x.row++;
    placed.push(x);
  });
  return t;
}
function firstFreeSpot(tiles, cols, w, h){
  w = Math.min(w, cols);
  for(let row = 0; row < 300; row++) for(let col = 0; col <= cols - w; col++){
    const c = { col, row, w, h };
    if(!tiles.some(t=> tilesOverlap(c, t))) return { col, row };
  }
  return { col:0, row:0 };
}
const boardRows = (tiles)=> tiles.reduce((m, t)=> Math.max(m, t.row + t.h), 0);

/* ---------- tile defaults and presets ---------- */
function tileDefaults(type){
  switch(type){
    case "todo": return { title:"To-do", items:[] };
    case "search": return { engine:"google" };
    case "link": return { label:"GitHub", url:"https://github.com" };
    case "links": return { list:[{ label:"Gmail", url:"https://mail.google.com" }, { label:"Maps", url:"https://maps.google.com" }, { label:"YouTube", url:"https://youtube.com" }] };
    case "clock": return { style:"digital", tz:"", label:"", showSeconds:false, showDate:true };
    case "calendar": return { style:"month", weekStartMon:false };
    case "note": return { title:"Note", text:"" };
    case "forecast": return { city:"", lat:null, lon:null, place:"", unit:"c", days:5 };
    case "shelf": return { title:"Shelf", shelfId:"" };
  }
  return {};
}
const BL = (label, url)=> ({ label, url });
const BOARD_PRESETS = [
  { id:"dashboard", name:"Dashboard", desc:"Everything at a glance", cols:8, tiles:[
    ["todo",0,0,2,3,{ title:"To-do", items:[{ t:"Plan the week", d:false }, { t:"Reply to emails", d:false }, { t:"Go for a walk", d:true }] }],
    ["search",2,0,4,1,{}],
    ["link",2,1,2,1,{ label:"Drive", url:"https://drive.google.com" }], ["link",4,1,1,1,{ label:"Notion", url:"https://notion.so" }], ["link",5,1,1,1,{ label:"X", url:"https://x.com" }],
    ["clock",2,2,2,1,{ label:"Local" }], ["clock",4,2,2,1,{ tz:"America/New_York", label:"New York" }],
    ["calendar",0,3,2,3,{}],
    ["link",2,3,1,1,{ label:"GitHub", url:"https://github.com" }], ["link",3,3,2,1,{ label:"Gmail", url:"https://mail.google.com" }], ["link",5,3,1,1,{ label:"YouTube", url:"https://youtube.com" }],
    ["links",2,4,4,1,{ list:[BL("Maps","https://maps.google.com"), BL("Photos","https://photos.google.com"), BL("Docs","https://docs.google.com"), BL("Sheets","https://sheets.google.com"), BL("Calendar","https://calendar.google.com")] }],
    ["note",2,5,4,1,{ title:"Reminder", text:"" }],
    ["forecast",6,0,2,6,{}]
  ] },
  { id:"focus", name:"Focus", desc:"A big clock, tasks and a note", cols:4, tiles:[
    ["clock",0,0,2,3,{ style:"poster", showDate:true }], ["todo",2,0,2,2,{ title:"Today" }], ["note",2,2,2,1,{ title:"Focus on" }], ["search",0,3,4,1,{}]
  ] },
  { id:"student", name:"Student", desc:"Tasks, calendar, notes and study links", cols:6, tiles:[
    ["todo",0,0,2,3,{ title:"Assignments" }], ["calendar",2,0,2,3,{}], ["clock",4,0,2,1,{ label:"Local" }], ["note",4,1,2,2,{ title:"Study notes" }],
    ["links",0,3,4,1,{ list:[BL("Docs","https://docs.google.com"), BL("Drive","https://drive.google.com"), BL("Scholar","https://scholar.google.com"), BL("Wikipedia","https://wikipedia.org")] }], ["search",4,3,2,1,{}]
  ] },
  { id:"start", name:"Start page", desc:"Search, shortcuts and the week ahead", cols:6, tiles:[
    ["search",0,0,6,1,{}],
    ["links",0,1,6,1,{ list:[BL("Gmail","https://mail.google.com"), BL("YouTube","https://youtube.com"), BL("Maps","https://maps.google.com"), BL("News","https://news.google.com"), BL("GitHub","https://github.com"), BL("Wikipedia","https://wikipedia.org")] }],
    ["clock",0,2,2,2,{ style:"rings", label:"" }], ["calendar",2,2,4,1,{ style:"week" }], ["note",2,3,4,1,{ title:"Today" }]
  ] },
  { id:"world", name:"World clocks", desc:"Three cities, side by side", cols:6, tiles:[
    ["clock",0,0,2,2,{ style:"classic", label:"Local" }], ["clock",2,0,2,2,{ style:"classic", tz:"Europe/London", label:"London" }], ["clock",4,0,2,2,{ style:"classic", tz:"Asia/Tokyo", label:"Tokyo" }],
    ["note",0,2,6,1,{ title:"Meeting planner" }]
  ] },
  { id:"shelves", name:"Shelves", desc:"Two shelves for your icons, plus tasks and a note", cols:6, tiles:[
    ["shelf",0,0,3,3,{ title:"Daily" }], ["shelf",3,0,3,3,{ title:"Projects" }], ["todo",0,3,3,2,{ title:"Today" }], ["note",3,3,3,2,{ title:"Notes" }]
  ] },
  { id:"blank", name:"Blank board", desc:"Start empty and add your own tiles", cols:6, tiles:[] }
];
const allBoardPresets = ()=> BOARD_PRESETS.concat(Array.isArray(state.boardPresets) ? state.boardPresets : []);
function presetTiles(p){
  return p.tiles.map(([type, col, row, w, h, props])=> ({ id: uid(), type, col, row, w, h, p: { ...tileDefaults(type), ...(props || {}) } }));
}
function boardStyle(w){
  const s = { ...DEFAULT_TSTYLE, ...(w.tstyle || {}) };
  if(!/^#[0-9a-f]{6}$/i.test(s.color)) s.color = DEFAULT_TSTYLE.color;
  s.opacity = Math.max(0, Math.min(1, Number(s.opacity))); if(isNaN(s.opacity)) s.opacity = DEFAULT_TSTYLE.opacity;
  s.radius = Math.max(0, Math.min(40, Number(s.radius) || 0)); s.gap = Math.max(0, Math.min(30, Number.isFinite(Number(s.gap)) ? Number(s.gap) : 10));
  return s;
}
// ----- shelves that live inside boards (a Shelf tile is a hidden "shelf" widget whose icons are drawn in the tile)
function newShelfFor(tile){
  const s = createItem("widget", { kind:"group", embedded:true, label: tile.p.title || "Shelf", pw:300, ph:200, opacity:0, blur:false, color:"#0b0f1a", parentId:null, space: state.activeWebtop });
  state.icons.push(s); tile.p.shelfId = s.id; return s;
}
const shelfOf = (tile)=> state.icons.find(i=> i.id === tile.p.shelfId && i.type === "widget");
function ensureShelves(w){ w.tiles.forEach(t=>{ if(t.type === "shelf" && !shelfOf(t)) newShelfFor(t); }); }
// Removing a shelf tile never loses icons: they go back onto the webtop.
function releaseShelf(tile){
  const s = shelfOf(tile); if(!s) return;
  childrenOf(s.id).forEach(it=>{ const slot = nextFreeSlot(null); it.parentId = null; it.x = slot.x; it.y = slot.y; });
  state.icons = state.icons.filter(i=> i.id !== s.id);
}
const releaseBoardShelves = (w)=> w.tiles.filter(t=> t.type === "shelf").forEach(releaseShelf);
function removeTile(w, tile){ if(tile.type === "shelf") releaseShelf(tile); w.tiles = w.tiles.filter(x=> x !== tile); save(); render(); }
function reflowShelf(parentId){   // icons placed when the tile was a different size may now be off to the right: tidy them into the columns that fit
  const cols = maxColsFor(parentId), items = childrenOf(parentId);
  if(!items.some(i=> i.x >= cols)) return;
  items.sort((a, b)=> a.y - b.y || a.x - b.x);
  let x = 0, y = 0; items.forEach(it=>{ it.x = x; it.y = y; if(++x >= cols){ x = 0; y++; } });
  save();
}
function populateShelves(root){ root.querySelectorAll("[data-shelf]").forEach(body=>{ reflowShelf(body.dataset.shelf); renderInto(body, body.dataset.shelf); }); }

// ----- creating a board that fills the webtop
function makeBoard(preset){
  const w = createItem("widget", { label: preset.id === "blank" ? "Board" : preset.name, kind:"board", cols: preset.cols, tiles: presetTiles(preset),
    tstyle: { ...DEFAULT_TSTYLE, ...(preset.style || {}) }, opacity:0, blur:false, color:"#0b0f1a", wx:0, wy:0, parentId:null });
  ensureShelves(w); return w;
}
function addBoardWidget(wx, wy, preset){          // for an empty webtop; use startAddBoard when there may be something on it
  const w = makeBoard(preset); state.icons.push(w); if(preset.id === "blank") boardEditing.add(w.id);
  save(); render(); return w;
}
const CLOCK_TILE_SIZE = { poster:[2, 3], digital:[2, 1], glass:[2, 2], classic:[2, 2], rings:[2, 2], dots:[2, 2] };
// Brings what is already on the webtop into the board: widgets become tiles as they are, loose icons go into a new shelf tile.
function absorbIntoBoard(board){
  const add = [];
  state.icons.filter(i=> i.type === "widget" && i.id !== board.id && i.kind !== "board" && !i.embedded && inSpace(i)).forEach(wd=>{
    if(wd.kind === "group"){ wd.embedded = true; add.push({ type:"shelf", w:3, h:3, p:{ title: wd.label || "Shelf", shelfId: wd.id } }); }
    else if(wd.kind === "clock"){ const [tw, th] = CLOCK_TILE_SIZE[wd.clockStyle] || [2, 2]; add.push({ type:"clock", w:tw, h:th, p:{ ...tileDefaults("clock"), style: wd.clockStyle, showSeconds: !!wd.showSeconds, showDate: wd.showDate !== false } }); state.icons = state.icons.filter(i=> i !== wd); }
    else if(wd.kind === "calendar"){ add.push({ type:"calendar", w: wd.calStyle === "week" ? 4 : 2, h: wd.calStyle === "week" ? 1 : 3, p:{ ...tileDefaults("calendar"), style: wd.calStyle, weekStartMon: !!wd.weekStartMon } }); state.icons = state.icons.filter(i=> i !== wd); }
  });
  const loose = childrenOf(null);
  if(loose.length){
    const tile = { type:"shelf", w:3, h: Math.max(2, Math.min(5, Math.ceil(loose.length / 3) + 1)), p:{ title:"My items", shelfId:"" } };
    const shelf = newShelfFor({ p: tile.p }); shelf.label = "My items";
    loose.forEach(ic=>{ const slot = nextFreeSlot(shelf.id); ic.parentId = shelf.id; ic.x = slot.x; ic.y = slot.y; });
    add.push(tile);
  }
  add.forEach(t=>{ const spot = firstFreeSpot(board.tiles, board.cols, t.w, t.h); board.tiles.push({ id: uid(), type: t.type, col: spot.col, row: spot.row, w: Math.min(t.w, board.cols), h: t.h, p: t.p }); });
  board.tiles = resolveLayout(board.tiles, board.cols);
}
function removeWebtopContents(board, ids){        // "replace": everything that was on the webtop is removed (undo with Ctrl+Z)
  const gone = new Set(ids);
  let grew = true; while(grew){ grew = false; state.icons.forEach(i=>{ if(!gone.has(i.id) && gone.has(i.parentId)){ gone.add(i.id); grew = true; } }); }
  state.icons = state.icons.filter(i=> !gone.has(i.id) || i.id === board.id);
}
// The entry point for "add a board": the board fills the webtop, and if the webtop already has things on it we ask what to do with them.
async function startAddBoard(preset){
  const existing = state.icons.find(i=> i.type === "widget" && i.kind === "board" && inSpace(i));
  if(existing && !(await askConfirm({ title:"This webtop already has a board", message:`A webtop has one board that fills it. Replace \u201C${existing.label}\u201D with the new one? Icons in its shelves go back onto the webtop.`, confirmLabel:"Replace board", cancelLabel:"Cancel" }))) return;
  const looseIds = childrenOf(null).map(i=> i.id);
  const widgetIds = state.icons.filter(i=> i.type === "widget" && i.kind !== "board" && !i.embedded && inSpace(i)).map(i=> i.id);
  let mode = "add";
  if(looseIds.length || widgetIds.length){
    const parts = []; if(looseIds.length) parts.push(`${looseIds.length} icon${looseIds.length === 1 ? "" : "s"}`); if(widgetIds.length) parts.push(`${widgetIds.length} widget${widgetIds.length === 1 ? "" : "s"}`);
    mode = await askChoice({ title:"This webtop isn't empty", message:`It has ${parts.join(" and ")}, and the board will fill the whole webtop. What should happen to them?`,
      note:"Add to the board: your icons go into a shelf tile, and widgets become tiles just as they are. Either choice can be undone with Ctrl+Z.",
      choices:[{ label:"Add them to the board", value:"add", primary:true }, { label:"Replace them (remove them)", value:"replace", danger:true }, { label:"Cancel", value:null }] });
    if(!mode) return;
  }
  if(existing){ releaseBoardShelves(existing); boardEditing.delete(existing.id); state.icons = state.icons.filter(i=> i !== existing); }
  const board = makeBoard(preset); state.icons.push(board);
  if(mode === "replace") removeWebtopContents(board, looseIds.concat(widgetIds)); else absorbIntoBoard(board);
  if(preset.id === "blank") boardEditing.add(board.id);
  save(); render();
}
// Saves a board's layout and look (without the text you typed) so it can be reused.
function saveBoardAsPreset(w, name){
  if(state.boardPresets.length >= 8) return false;
  const tiles = w.tiles.map(t=>{ const p = { ...t.p }; delete p.items; delete p.text; delete p.lat; delete p.lon; delete p.place; delete p.shelfId; return [t.type, t.col, t.row, t.w, t.h, p]; });
  state.boardPresets.push({ id:"my" + Math.random().toString(36).slice(2, 7), name: String(name).trim().slice(0, 24) || "My board", desc:"Your layout", cols: w.cols, style: boardStyle(w), tiles });
  save(); return true;
}

/* ---------- small helpers ---------- */
const rgbOf = (hex)=>{ const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function contrastText(hex, opacity){
  if(opacity < 0.55) return "";                                   // mostly see-through: the theme's own text colour reads fine
  const [r, g, b] = rgbOf(hex); return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.6 ? "#14161c" : "#f4f6fb";
}
function safeHttp(u){ try{ const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:" ? x.href : null; }catch(_){ return null; } }
function tzLabel(tz){ return tz ? tz.split("/").pop().replace(/_/g, " ") : ""; }
function favIcon(href, label){
  const wrap = document.createElement("span"); wrap.className = "t-fav";
  const letter = String(label || "?").trim().charAt(0).toUpperCase();
  const fallback = ()=>{ wrap.textContent = letter; wrap.classList.add("letter"); };
  if(!href){ fallback(); return wrap; }
  const img = document.createElement("img"); img.alt = ""; img.draggable = false;
  img.addEventListener("error", fallback);
  img.src = `https://icons.duckduckgo.com/ip3/${new URL(href).hostname}.ico`;
  wrap.appendChild(img); return wrap;
}
const bx = (tag, cls, text)=>{ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };

/* ---------- tile contents ---------- */
function renderTodoTile(w, tile, box){
  const p = tile.p; if(!Array.isArray(p.items)) p.items = [];
  const title = bx("div", "t-title", p.title || "To-do"), list = bx("div", "t-todo"), input = bx("input", "t-input");
  input.placeholder = "Add a task\u2026"; input.maxLength = 120; box.append(title, list, input);
  const draw = ()=>{
    list.innerHTML = "";
    p.items.forEach((it, i)=>{
      const row = bx("label", "t-row" + (it.d ? " done" : "")), cb = bx("input"), tx = bx("span", "", it.t), x = bx("b", "t-x", "\u00d7");
      cb.type = "checkbox"; cb.checked = !!it.d; x.title = "Remove";
      cb.addEventListener("change", ()=>{ it.d = cb.checked; row.classList.toggle("done", it.d); save(); });
      x.addEventListener("click", (e)=>{ e.preventDefault(); p.items.splice(i, 1); save(); draw(); });
      row.append(cb, tx, x); list.appendChild(row);
    });
  };
  input.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter" || !input.value.trim() || p.items.length >= 100) return;
    p.items.push({ t: input.value.trim().slice(0, 120), d:false }); input.value = ""; save(); draw();
  });
  draw();
}
function renderSearchTile(w, tile, box){
  const p = tile.p, chips = bx("div", "t-chips"), input = bx("input", "t-input t-search");
  input.placeholder = "Search\u2026"; input.maxLength = 200;
  Object.entries(ENGINES).forEach(([k, e])=>{
    const b = bx("button", "t-chip" + (k === p.engine ? " on" : ""), e.letter); b.type = "button"; b.title = k;
    b.addEventListener("click", ()=>{ p.engine = k; chips.querySelectorAll(".t-chip").forEach(c=> c.classList.toggle("on", c === b)); save(); });
    chips.appendChild(b);
  });
  input.addEventListener("keydown", (e)=>{
    const q = input.value.trim(); if(e.key !== "Enter" || !q) return;
    window.open((ENGINES[p.engine] || ENGINES.google).url + encodeURIComponent(q), "_blank", "noopener");
  });
  box.append(chips, input);
}
function renderLinkTile(w, tile, box){
  const p = tile.p, href = safeHttp(p.url), a = bx("a", "t-link" + (tile.w === 1 && tile.h === 1 ? " small" : ""));
  if(href){ a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; }
  const text = bx("div", "t-link-text"); text.append(bx("div", "t-link-name", p.label || ""), bx("div", "t-link-dom", href ? new URL(href).hostname : "Add an address in settings"));
  a.append(favIcon(href, p.label), text); box.appendChild(a);
}
function renderLinksTile(w, tile, box){
  box.classList.add("t-links");
  const list = (Array.isArray(tile.p.list) ? tile.p.list : []).filter(x=> x && safeHttp(x.url));
  if(!list.length){ box.textContent = "Add links in this tile's settings."; return; }
  list.forEach(it=>{
    const a = bx("a", "t-quick"); a.href = safeHttp(it.url); a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = it.label || "";
    a.append(favIcon(a.href, it.label), bx("span", "", it.label || "")); box.appendChild(a);
  });
}
function renderClockTile(w, tile, box){
  const p = tile.p, def = CLOCK_STYLES[p.style] || CLOCK_STYLES.digital;
  box.classList.add("clk-face");
  const update = def.build(box, { showSeconds: !!p.showSeconds, showDate: p.showDate !== false });
  const run = ()=>{ try{ update(clockParts(new Date(), p.tz || undefined)); }catch(_){ update(clockParts(new Date())); } };
  clockUpdaters.set(tile.id, run); run();
  const label = p.label || tzLabel(p.tz); if(label) box.appendChild(bx("div", "t-clock-label", label));
}
function renderCalendarTile(w, tile, box){
  const p = tile.p, def = CALENDAR_STYLES[p.style] || CALENDAR_STYLES.month;
  box.classList.add("clk-face");
  const draw = def.build(box, { id: tile.id, weekStartMon: !!p.weekStartMon });
  clockUpdaters.set(tile.id, ()=> draw()); draw();
}
function renderNoteTile(w, tile, box){
  const p = tile.p, ta = bx("textarea", "t-text"); let timer = null;
  ta.maxLength = 2000; ta.placeholder = "Write something\u2026"; ta.spellcheck = false; ta.value = p.text || "";
  ta.addEventListener("input", ()=>{ p.text = ta.value; clearTimeout(timer); timer = setTimeout(()=> save(), 500); });
  box.append(bx("div", "t-title", p.title || "Note"), ta);
}
function renderForecastTile(w, tile, box){
  const p = tile.p; box.classList.add("t-forecast");
  if(!p.city){
    const input = bx("input", "t-input"); input.placeholder = "City, e.g. Nairobi"; input.maxLength = 60;
    input.addEventListener("keydown", (e)=>{ if(e.key === "Enter" && input.value.trim()){ p.city = input.value.trim(); p.lat = null; p.lon = null; save(); render(); } });
    box.append(bx("div", "t-title", "Forecast"), bx("div", "t-hint", "Type a city and press Enter."), input); return;
  }
  const fc = bx("div", "t-fc", "Loading\u2026"); box.append(bx("div", "t-title", "\u{1F4CD} " + (p.place || p.city)), fc);
  loadForecastFor(p).then(days=>{
    if(!box.isConnected) return;
    fc.innerHTML = "";
    const unit = p.unit === "f" ? "\u00b0F" : "\u00b0C", wind = p.unit === "f" ? "mph" : "km/h";
    days.slice(0, Math.max(1, Math.min(p.days || 5, tile.h))).forEach(d=>{
      const row = bx("div", "t-day"), info = weatherInfo(d.code);
      const t = bx("div", "t-day-main"); t.append(bx("b", "", `${Math.round(d.min)} \u2013 ${Math.round(d.max)}${unit}`), bx("small", "", d.wind == null ? "" : `${Math.round(d.wind)} ${wind}`));
      const dn = bx("small", "", new Date(d.date + "T12:00:00").toLocaleDateString([], { weekday:"long" })); dn.title = info.label;
      row.append(bx("span", "t-day-ico", info.icon), t, dn); fc.appendChild(row);
    });
  }).catch(err=>{ if(box.isConnected) fc.textContent = err.message || "Couldn't load the forecast."; });
}
const TILE_RENDER = { todo: renderTodoTile, search: renderSearchTile, link: renderLinkTile, links: renderLinksTile, clock: renderClockTile, calendar: renderCalendarTile, note: renderNoteTile, forecast: renderForecastTile };

/* ---------- editing ---------- */
const BOARD_TOP = 116, BOARD_BOTTOM = 76, BOARD_MIN_ROW = 64;     // the board fills the webtop between the top bar and the footer
function applyBoardLayout(w, pinnedId){ w.tiles = resolveLayout(w.tiles, w.cols, pinnedId); save(); render(); }
function addEditOverlay(w, tile, tEl, gridEl, st){
  const o = bx("div", "tile-edit");
  const drag = bx("div", "tile-drag"), cog = bx("button", "tile-btn", "\u2699"), del = bx("button", "tile-btn", "\u00d7"), grip = bx("div", "tile-grip");
  drag.title = "Drag to move"; cog.title = "Tile settings"; del.title = "Remove tile"; grip.title = "Drag to resize"; cog.type = del.type = "button";
  o.append(drag, cog, del, grip); tEl.appendChild(o);
  const units = ()=>{   // how many pixels one grid cell (plus gap) is, measured from the real grid
    const r = gridEl.getBoundingClientRect(), rows = Math.max(3, boardRows(w.tiles) + 1);
    return { ux: (r.width - (w.cols - 1) * st.gap) / w.cols + st.gap, uy: (r.height - (rows - 1) * st.gap) / rows + st.gap };
  };
  drag.addEventListener("pointerdown", (e)=>{
    if(e.button > 0) return; e.preventDefault();
    const sx = e.clientX, sy = e.clientY, c0 = tile.col, r0 = tile.row; tEl.classList.add("lifting");
    const mv = (ev)=>{ tEl.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px)`; };
    const up = (ev)=>{
      document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up);
      const { ux, uy } = units(); tile.col = c0 + Math.round((ev.clientX - sx) / ux); tile.row = r0 + Math.round((ev.clientY - sy) / uy); applyBoardLayout(w, tile.id);
    };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  });
  grip.addEventListener("pointerdown", (e)=>{
    if(e.button > 0) return; e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, w0 = tile.w, h0 = tile.h, pw = tEl.offsetWidth, ph = tEl.offsetHeight; tEl.classList.add("lifting"); tEl.style.justifySelf = "start"; tEl.style.alignSelf = "start";
    const mv = (ev)=>{ tEl.style.width = Math.max(40, pw + ev.clientX - sx) + "px"; tEl.style.height = Math.max(40, ph + ev.clientY - sy) + "px"; };
    const up = (ev)=>{
      document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up);
      const { ux, uy } = units(); tile.w = Math.max(1, Math.min(w0 + Math.round((ev.clientX - sx) / ux), w.cols - tile.col)); tile.h = Math.max(1, h0 + Math.round((ev.clientY - sy) / uy)); applyBoardLayout(w, tile.id);
    };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  });
  cog.addEventListener("click", ()=>{ const r = cog.getBoundingClientRect(); openTileSettings(w, tile, r.left, r.bottom + 6); });
  del.addEventListener("click", ()=> removeTile(w, tile));
}
function buildTile(w, tile, st, editing, gridEl, compact){
  const t = bx("div", `tile tile-${tile.type}` + (editing ? " editing" : "")), box = bx("div", "tile-body");
  t.dataset.id = tile.id;
  if(compact){ t.style.gridColumn = `span ${Math.min(tile.w, 2)}`; t.style.gridRow = `span ${tile.h}`; }
  else{ t.style.gridColumn = `${tile.col + 1} / span ${tile.w}`; t.style.gridRow = `${tile.row + 1} / span ${tile.h}`; }
  const [r, g, b] = rgbOf(st.color); t.style.background = `rgba(${r},${g},${b},${st.opacity})`; t.style.borderRadius = st.radius + "px";
  const txt = contrastText(st.color, st.opacity); if(txt) t.style.color = txt;
  t.appendChild(box);
  try{ TILE_RENDER[tile.type](w, tile, box); }catch(e){ console.warn("on369: tile failed", e); box.textContent = "This tile couldn't be drawn."; }
  if(tile.type === "shelf") t.dataset.shelfDrop = tile.p.shelfId;
  if(editing) addEditOverlay(w, tile, t, gridEl, st);
  return t;
}
function openAddTileMenu(w, x, y){
  buildMenu(Object.entries(TILE_TYPES).map(([type, d])=>({ label: `${d.icon}  ${d.name}`, hint: d.desc, action: ()=>{
    const spot = firstFreeSpot(w.tiles, w.cols, d.w, d.h);
    const tile = { id: uid(), type, col: spot.col, row: spot.row, w: Math.min(d.w, w.cols), h: d.h, p: tileDefaults(type) };
    if(type === "shelf") newShelfFor(tile);
    w.tiles.push(tile); save(); render();
  } })), x, y);
}
function renderShelfTile(w, tile, box){
  const shelf = shelfOf(tile) || (()=>{ const s = newShelfFor(tile); save(); return s; })();
  const title = tile.p.title || "Shelf"; if(shelf.label !== title) shelf.label = title;
  const body = bx("div", "shelf-body"), band = bx("div", "rubberband-box");
  body.dataset.shelf = shelf.id; body.appendChild(band); box.append(bx("div", "t-title", title), body);
  wireRubberBandSelect(body, body, band, false);                 // drag a box across the icons to select them
  body.addEventListener("contextmenu", (e)=>{ if(e.target.closest(".icon")) return; e.preventDefault(); e.stopPropagation(); showCanvasContextMenu(e.clientX, e.clientY, shelf.id); });
}
TILE_RENDER.shelf = renderShelfTile;

/* ---------- board widget: fills the whole webtop ---------- */
function renderBoardWidget(w){
  const st = boardStyle(w), compact = window.innerWidth <= 640;     // on a phone the tiles stack in two columns instead
  const cols = compact ? 2 : Math.max(2, Math.min(12, Number(w.cols) || 8)), gap = st.gap;
  if(!compact) w.cols = cols; if(!Array.isArray(w.tiles)) w.tiles = [];
  const editing = !compact && boardEditing.has(w.id), rows = Math.max(3, boardRows(w.tiles) + (editing ? 1 : 0));
  const [pr, pg, pb] = rgbOf(/^#[0-9a-f]{6}$/i.test(w.color) ? w.color : "#0b0f1a");
  const b = bx("div", "widget board-widget" + (compact ? " compact" : "") + (w.opacity < 0.04 ? " bare" : "") + (editing ? " editing" : ""));
  b.dataset.id = w.id; b.dataset.kind = "board";
  b.style.cssText = `top:${BOARD_TOP}px;min-height:calc(100vh - ${BOARD_TOP + BOARD_BOTTOM}px);background:rgba(${pr},${pg},${pb},${w.opacity});` + (w.blur && w.opacity >= 0.04 ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
  if(st.accent) b.style.setProperty("--clk-accent", st.accent);
  const head = bx("div", "board-head"), title = bx("span", "board-title", w.label), cog = bx("button", "board-btn", "\u2699");
  cog.type = "button"; cog.title = "Board settings"; head.appendChild(title);
  if(!compact){
    const edit = bx("button", "board-btn" + (editing ? " on" : ""), editing ? "Done" : "\u270E Edit"); edit.type = "button"; edit.title = editing ? "Finish editing" : "Edit the layout";
    if(editing){ const add = bx("button", "board-btn", "+ Add tile"); add.type = "button"; add.addEventListener("click", ()=>{ const r = add.getBoundingClientRect(); openAddTileMenu(w, r.left, r.bottom + 6); }); head.appendChild(add); }
    edit.addEventListener("click", ()=>{ if(boardEditing.has(w.id)) boardEditing.delete(w.id); else boardEditing.add(w.id); render(); });
    head.appendChild(edit);
  }
  head.appendChild(cog);
  const grid = bx("div", "board-grid" + (compact ? " compact" : ""));
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`; grid.style.gap = gap + "px";
  grid.style.gridTemplateRows = compact ? "" : `repeat(${rows}, minmax(${BOARD_MIN_ROW}px, 1fr))`;
  const list = compact ? w.tiles.slice().sort((a, c)=> a.row - c.row || a.col - c.col) : w.tiles;
  list.forEach(t=> grid.appendChild(buildTile(w, t, st, editing, grid, compact)));
  if(!w.tiles.length){ const empty = bx("div", "board-empty", editing ? "Choose \u201C+ Add tile\u201D to build your board." : "This board is empty. Press Edit to add tiles."); empty.style.gridColumn = "1 / -1"; grid.appendChild(empty); }
  b.append(head, grid); gridLayer.prepend(b);
  populateShelves(b);                                              // shelf icons are drawn once the tiles have a real size
  title.addEventListener("dblclick", ()=> startRename(title, w));
  cog.addEventListener("click", ()=>{ const r = cog.getBoundingClientRect(); openBoardSettings(w, r.left, r.bottom + 6); });
  // a click inside a board must not reach the webtop (it would redraw everything and drop what you're typing)
  b.addEventListener("pointerdown", ()=> closeCtxMenu(), true);
  b.addEventListener("click", (e)=> e.stopPropagation());
  b.addEventListener("contextmenu", (e)=>{
    if(e.target.closest("input, textarea")){ e.stopPropagation(); return; }                       // keep the browser's own copy/paste menu
    if(e.target.closest(".icon, [data-shelf]")) return;                                            // icons and shelves have their own menus
    e.preventDefault(); e.stopPropagation(); if(e.target.closest(".board-head")) openBoardSettings(w, e.clientX, e.clientY);
  });
}

/* ---------- settings panels ---------- */
function popField(label, control){ const l = bx("label"); l.append(document.createTextNode(label), control); return l; }
function swatches(colors, current, onPick, theme){
  const wrap = bx("div", "wp-sw");
  colors.forEach(c=>{ const s = bx("button", "wp-dot" + (c === current ? " picked" : "")); s.type = "button"; s.style.background = c || "var(--accent)"; s.title = c || "Theme color"; s.addEventListener("click", ()=>{ onPick(c); }); wrap.appendChild(s); });
  return wrap;
}
const TILE_FIELDS = {
  todo:     [{ k:"title", t:"text", l:"Title", max:30 }],
  search:   [{ k:"engine", t:"select", l:"Search with", opts:()=> Object.keys(ENGINES).map(k=> [k, k[0].toUpperCase() + k.slice(1)]) }],
  link:     [{ k:"label", t:"text", l:"Name", max:24 }, { k:"url", t:"url", l:"Address" }],
  links:    [{ k:"list", t:"lines", l:"Links, one per line: Name | address" }],
  clock:    [{ k:"style", t:"select", l:"Style", opts:()=> Object.entries(CLOCK_STYLES).map(([id, s])=> [id, `${s.name} (${s.group})`]) }, { k:"tz", t:"select", l:"Time zone", opts:()=> TZ_CHOICES.map(z=> [z, z ? tzLabel(z) : "Same as my webtop"]) },
             { k:"label", t:"text", l:"Label (optional)", max:20 }, { k:"showSeconds", t:"check", l:"Show seconds" }, { k:"showDate", t:"check", l:"Show date" }],
  calendar: [{ k:"style", t:"select", l:"Style", opts:()=> [["month", "Month"], ["week", "Week strip"]] }, { k:"weekStartMon", t:"check", l:"Week starts on Monday" }],
  note:     [{ k:"title", t:"text", l:"Title", max:30 }],
  shelf:    [{ k:"title", t:"text", l:"Title", max:30 }],
  forecast: [{ k:"city", t:"text", l:"City", max:60 }, { k:"unit", t:"select", l:"Units", opts:()=> [["c", "\u00b0C, km/h"], ["f", "\u00b0F, mph"]] }, { k:"days", t:"select", l:"Days (up to the tile's height)", opts:()=> [[3, "3"], [5, "5"], [7, "7"]] }]
};
function openTileSettings(w, tile, x, y){
  closeWidgetPop();
  const pop = bx("div", "widget-pop"), p = tile.p;
  (TILE_FIELDS[tile.type] || []).forEach(f=>{
    let ctl;
    if(f.t === "check"){ ctl = bx("input"); ctl.type = "checkbox"; ctl.checked = !!p[f.k]; ctl.addEventListener("change", ()=>{ p[f.k] = ctl.checked; save(); render(); }); const l = bx("label", "wp-row"); l.append(ctl, document.createTextNode(" " + f.l)); pop.appendChild(l); return; }
    if(f.t === "select"){
      ctl = bx("select"); f.opts().forEach(([v, n])=>{ const o = bx("option", "", n); o.value = v; ctl.appendChild(o); }); ctl.value = String(p[f.k] ?? "");
      ctl.addEventListener("change", ()=>{ p[f.k] = typeof tileDefaults(tile.type)[f.k] === "number" ? Number(ctl.value) : ctl.value; save(); render(); });
    }else if(f.t === "lines"){
      ctl = bx("textarea", "t-lines"); ctl.rows = 5; ctl.value = (p[f.k] || []).map(x=> `${x.label} | ${x.url}`).join("\n");
      ctl.addEventListener("change", ()=>{ p[f.k] = ctl.value.split("\n").map(s=>{ const [a, ...b] = s.split("|"), u = cleanClipboardUrl(b.join("|").trim()); return u ? { label: a.trim().slice(0, 24), url: u } : null; }).filter(Boolean).slice(0, 12); save(); render(); });
    }else{
      ctl = bx("input"); ctl.type = "text"; ctl.maxLength = f.max || 200; ctl.value = p[f.k] || "";
      ctl.addEventListener("change", ()=>{
        if(f.t === "url"){ const u = cleanClipboardUrl(ctl.value); if(!u){ ctl.classList.add("bad"); return; } p[f.k] = u; }
        else{ p[f.k] = ctl.value.trim(); if(tile.type === "forecast" && f.k === "city"){ p.lat = null; p.lon = null; p.place = ""; } }
        save(); render();
      });
    }
    pop.appendChild(popField(f.l, ctl));
  });
  if(tile.type === "note") pop.appendChild(bx("div", "cloud-note", "Notes are stored unencrypted. Please don't keep passwords here."));
  if(tile.type === "shelf") pop.appendChild(bx("div", "cloud-note", "Drag icons onto this shelf to put them in it. Removing the tile puts its icons back on the webtop."));
  const del = bx("button", "wp-del", "Remove this tile"); del.type = "button";
  del.addEventListener("click", ()=>{ closeWidgetPop(); removeTile(w, tile); });
  const row = bx("div", "wp-row"); row.appendChild(del); pop.appendChild(row);
  showWidgetPop(pop, w, `${TILE_TYPES[tile.type].name} settings`, x, y);
}
function openBoardSettings(w, x, y){
  closeWidgetPop();
  const st = boardStyle(w), pop = bx("div", "widget-pop"); w.tstyle = st;
  const name = bx("input"); name.type = "text"; name.maxLength = 30; name.value = w.label; name.addEventListener("input", ()=>{ w.label = name.value || "Board"; const t = document.querySelector(`.board-widget[data-id="${w.id}"] .board-title`); if(t) t.textContent = w.label; }); name.addEventListener("change", ()=> save());
  pop.appendChild(popField("Name", name));
  const cols = bx("select"); for(let n = 3; n <= 12; n++){ const o = bx("option", "", n + " columns"); o.value = n; cols.appendChild(o); } cols.value = w.cols;
  cols.addEventListener("change", ()=>{ w.cols = Number(cols.value); w.tiles = resolveLayout(w.tiles, w.cols); save(); render(); });
  pop.appendChild(popField("Columns", cols));
  const cap = (t)=>{ const d = bx("div", "wp-cap", t); return d; };
  pop.append(cap("Tile color"), swatches(TILE_COLORS, st.color, (c)=>{ w.tstyle.color = c; save(); render(); }));
  const op = bx("input"); op.type = "range"; op.min = 0; op.max = 100; op.value = Math.round((1 - st.opacity) * 100);
  op.addEventListener("input", ()=>{ w.tstyle.opacity = 1 - op.value / 100; render(); }); op.addEventListener("change", ()=> save());
  pop.appendChild(popField("Tile transparency", op));
  const round = bx("select"); [["4", "Sharp"], ["14", "Soft"], ["24", "Round"]].forEach(([v, n])=>{ const o = bx("option", "", n); o.value = v; round.appendChild(o); }); round.value = String(st.radius <= 8 ? 4 : st.radius <= 18 ? 14 : 24);
  round.addEventListener("change", ()=>{ w.tstyle.radius = Number(round.value); save(); render(); });
  pop.appendChild(popField("Corners", round));
  const gap = bx("select"); [["4", "Tight"], ["10", "Normal"], ["18", "Roomy"]].forEach(([v, n])=>{ const o = bx("option", "", n); o.value = v; gap.appendChild(o); }); gap.value = String(st.gap <= 6 ? 4 : st.gap <= 13 ? 10 : 18);
  gap.addEventListener("change", ()=>{ w.tstyle.gap = Number(gap.value); save(); render(); });
  pop.appendChild(popField("Spacing", gap));
  pop.append(cap("Accent color"), swatches(["", ...COLORS], st.accent, (c)=>{ w.tstyle.accent = c; save(); render(); }));
  const panel = bx("input"); panel.type = "range"; panel.min = 0; panel.max = 100; panel.value = Math.round((1 - w.opacity) * 100);
  panel.addEventListener("input", ()=>{ w.opacity = 1 - panel.value / 100; render(); }); panel.addEventListener("change", ()=> save());
  pop.appendChild(popField("Background panel transparency", panel));
  const blur = bx("input"); blur.type = "checkbox"; blur.checked = w.blur; blur.addEventListener("change", ()=>{ w.blur = blur.checked; save(); render(); });
  const bl = bx("label", "wp-row"); bl.append(blur, document.createTextNode(" Frosted blur behind the panel")); pop.appendChild(bl);
  const mk = (t, fn, cls)=>{ const b = bx("button", cls || "", t); b.type = "button"; b.addEventListener("click", fn); return b; };
  const r1 = bx("div", "wp-row"); r1.append(
    mk("Change layout\u2026", ()=>{ closeWidgetPop(); openBoardPresetPicker({ title:"Replace this board's layout", onPick: async (pr)=>{
      if(w.tiles.length && !(await askConfirm({ title:"Replace the layout?", message:`This swaps the tiles on \u201C${w.label}\u201D for the \u201C${pr.name}\u201D layout. You can undo it with Ctrl+Z.`, confirmLabel:"Replace", cancelLabel:"Keep mine" }))) return;
      releaseBoardShelves(w); w.cols = pr.cols; w.tiles = presetTiles(pr); ensureShelves(w); if(pr.style) w.tstyle = { ...DEFAULT_TSTYLE, ...pr.style }; save(); render(); } }); }),
    mk("Save as preset", ()=>{ const nm = prompt("Name this layout:", w.label); if(nm === null) return; if(!saveBoardAsPreset(w, nm)) alert("You can keep up to 8 of your own presets. Delete one from the preset list first."); else statusEl.textContent = "Layout saved as a preset"; }));
  pop.appendChild(r1);
  const r2 = bx("div", "wp-row"); r2.appendChild(mk("Delete board", async ()=>{
    if(await askConfirm({ title:"Delete this board?", message:`Delete \u201C${w.label}\u201D and all its tiles? You can undo it with Ctrl+Z.`, confirmLabel:"Delete board", cancelLabel:"Keep it" })){ closeWidgetPop(); boardEditing.delete(w.id); releaseBoardShelves(w); removeWidget(w, false); }
  }, "wp-del")); pop.appendChild(r2);
  showWidgetPop(pop, w, "Board settings", x, y);
}

/* ---------- preset picker ---------- */
function presetPreview(p){
  const pv = bx("div", "pv"); pv.style.gridTemplateColumns = `repeat(${p.cols}, 1fr)`; pv.style.gridTemplateRows = `repeat(${Math.max(1, boardRows(p.tiles.map(([type, col, row, w, h])=> ({ col, row, w, h }))))}, 9px)`;
  p.tiles.forEach(([type, col, row, w, h])=>{ const i = bx("i"); i.style.gridColumn = `${col + 1} / span ${w}`; i.style.gridRow = `${row + 1} / span ${h}`; i.style.background = TILE_PREVIEW_COLORS[type] || "#999"; i.title = TILE_TYPES[type] ? TILE_TYPES[type].name : ""; pv.appendChild(i); });
  if(!p.tiles.length) pv.appendChild(bx("span", "pv-empty", "Empty"));
  return pv;
}
function openBoardPresetPicker(opts){
  const back = bx("div", "cloud-modal-back"), box = bx("div", "cloud-modal preset-modal");
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  const close = ()=>{ document.removeEventListener("keydown", onKey, true); back.remove(); };
  const onKey = (e)=>{ if(e.key === "Escape"){ e.stopPropagation(); close(); } };
  const head = bx("div", "confirm-title", opts.title || "Choose a board"); box.append(head, bx("p", "cloud-note", "Pick a starting point. Every tile can be moved, resized, changed or removed afterwards."));
  const grid = bx("div", "preset-grid"); box.appendChild(grid);
  const draw = ()=>{
    grid.innerHTML = "";
    allBoardPresets().forEach(p=>{
      const card = bx("button", "preset-card"); card.type = "button";
      card.append(presetPreview(p), bx("b", "", p.name), bx("small", "", p.desc || ""));
      card.addEventListener("click", ()=>{ close(); opts.onPick(p); });
      if(p.id.startsWith("my")){
        const x = bx("span", "preset-x", "\u00d7"); x.title = "Delete this preset";
        x.addEventListener("click", (e)=>{ e.stopPropagation(); state.boardPresets = state.boardPresets.filter(q=> q.id !== p.id); save(); draw(); });
        card.appendChild(x);
      }
      grid.appendChild(card);
    });
  };
  draw();
  const cancel = bx("button", "", "Cancel"); cancel.type = "button"; cancel.addEventListener("click", close); box.appendChild(cancel);
  back.addEventListener("pointerdown", (e)=>{ if(e.target === back) close(); });
  document.addEventListener("keydown", onKey, true); back.appendChild(box); document.body.appendChild(back);
}
