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
  shelf:    { name:"Shelf",       icon:"\u{1F5C2}\uFE0F", desc:"Holds icons you drag in",  w:3, h:3 },
  countdown:{ name:"Countdown",   icon:"\u23F3",           desc:"Days until a date",        w:2, h:1 },
  habits:   { name:"Habits",      icon:"\u{1F525}",        desc:"Daily streaks",            w:3, h:3 },
  headlines:{ name:"Headlines",   icon:"\u{1F4F0}",        desc:"News feed (needs internet)", w:3, h:3 },
  tasks:    { name:"Tasks",       icon:"\u2705",           desc:"Your To-do app's list, with due times", w:2, h:3 },
  pinnote:  { name:"Pinned note", icon:"\u{1F4CC}",        desc:"A note from the Notes app", w:2, h:2, hidden:true }    // made with "Pin" in Notes, not from the add-tile menu
};
const TILE_PREVIEW_COLORS = { todo:"#7c9cff", search:"#9aa5b1", link:"#ffb454", links:"#f08fb0", clock:"#5fd3b3", calendar:"#c792ea", note:"#f6d365", forecast:"#6ec6ff", shelf:"#ff8a65", countdown:"#ffd166", habits:"#ef476f", headlines:"#06d6a0", tasks:"#7c9cff", pinnote:"#f6d365" };
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
    case "countdown": { const d = new Date(); d.setDate(d.getDate() + 30); return { title:"Countdown", date: localISODate(d) }; }
    case "habits": return { title:"Habits", list:[] };
    case "headlines": return { title:"Headlines", feed:"https://hnrss.org/frontpage", custom:"", count:6 };
    case "tasks": return { title:"Tasks", show:"open" };
    case "pinnote": return { noteId:"" };
  }
  return {};
}
const BL = (label, url)=> ({ label, url });
// `apps`, where present, is a list of js/data/app-catalog.js ids. Beyond the
// board's own tiles, choosing this preset while creating a webtop also adds
// one real webapp icon per id to the new webtop's grid (see openWebtopDialog
// in webtops.js) — the board's "links" tiles stay as in-board shortcuts;
// `apps` is what actually populates the webtop itself, which is the gap
// these presets used to have (widgets only, nothing to actually launch).
// Tile list: [type, col, row, width, height, settings]. The "shelf" tile marked appsShelf:true is where the
// preset's `apps` (ids from js/data/app-catalog.js) are placed when the board is created, evenly spaced and
// centred, so a template starts neat with real icons and nothing overlapping the other tiles.
const APPS_SHELF = (title)=> ["shelf", 0, 3, 6, 2, { title, appsShelf:true }];
const BOARD_PRESETS = [
  { id:"student", emoji:"\u{1F393}", name:"Student", desc:"Assignments, calendar, notes and study apps", cols:6, tiles:[
    ["todo",0,0,2,3,{ title:"Assignments" }], ["calendar",2,0,2,3,{}], ["clock",4,0,2,1,{ label:"Local" }], ["note",4,1,2,2,{ title:"Study notes" }],
    APPS_SHELF("Study apps")
  ], apps:["khan-academy","google-scholar","quizlet","geogebra","notebooklm","wikipedia","ankiweb","desmos"] },
  { id:"developer", emoji:"\u{1F4BB}", name:"Developer", desc:"Tasks, a scratchpad and your coding tools", cols:6, tiles:[
    ["todo",0,0,2,3,{ title:"Tasks" }], ["note",2,0,2,3,{ title:"Scratchpad" }], ["clock",4,0,2,2,{ style:"rings", label:"" }], ["link",4,2,2,1,{ label:"GitHub", url:"https://github.com" }],
    APPS_SHELF("Dev tools")
  ], apps:["github","mdn","codepen","stackblitz","replit","w3schools","devto","chatgpt","excalidraw"] },
  { id:"creative", emoji:"\u{1F3A8}", name:"Designer", desc:"Ideas, projects and your design tools", cols:6, tiles:[
    ["note",0,0,2,3,{ title:"Ideas" }], ["todo",2,0,2,3,{ title:"Projects" }], ["clock",4,0,2,2,{ style:"glass", label:"Local" }], ["link",4,2,2,1,{ label:"Figma", url:"https://www.figma.com" }],
    APPS_SHELF("Design tools")
  ], apps:["figma","canva","photopea","pixlr","unsplash","removebg","squoosh","vectr"] },
  { id:"work", emoji:"\u{1F4BC}", name:"Work", desc:"Tasks, calendar and your office apps", cols:6, tiles:[
    ["todo",0,0,2,3,{ title:"Tasks" }], ["calendar",2,0,2,3,{}], ["clock",4,0,2,1,{ label:"Local" }], ["note",4,1,2,2,{ title:"Focus on" }],
    APPS_SHELF("Work apps")
  ], apps:["google-docs","google-sheets","google-slides","gmail","google-drive","google-calendar","slack","zoom"] },
  { id:"writer", emoji:"\u270D\uFE0F", name:"Writer", desc:"A draft, writing goals and your writing tools", cols:6, tiles:[
    ["note",0,0,3,3,{ title:"Draft" }], ["todo",3,0,3,2,{ title:"Writing goals" }], ["clock",3,2,3,1,{ style:"digital", label:"Local" }],
    APPS_SHELF("Writing tools")
  ], apps:["google-docs","notion","google-keep","deepl","google-translate","wikipedia","chatgpt","claude"] },
  { id:"business", emoji:"\u{1F4C8}", name:"Business", desc:"Priorities, calendar, two clocks and team apps", cols:6, tiles:[
    ["todo",0,0,2,3,{ title:"Priorities" }], ["calendar",2,0,2,3,{}], ["clock",4,0,2,1,{ label:"Local" }], ["clock",4,1,2,1,{ tz:"Europe/London", label:"London" }], ["note",4,2,2,1,{ title:"Deals" }],
    APPS_SHELF("Business tools")
  ], apps:["canva","notion","trello","slack","zoom","gamma","google-sheets","google-calendar"] },
  { id:"gaming", emoji:"\u{1F3AE}", name:"Gaming", desc:"A clock, a backlog and the games you play", cols:6, tiles:[
    ["clock",0,0,2,3,{ style:"classic", label:"Local" }], ["note",2,0,2,3,{ title:"Game night" }], ["todo",4,0,2,3,{ title:"Backlog" }],
    APPS_SHELF("Games")
  ], apps:["poki","crazygames","itchio","lichess","chesscom","discord","twitch","youtube"] },
  { id:"media", emoji:"\u{1F3A7}", name:"Media", desc:"A watchlist, listen-later list and your players", cols:6, tiles:[
    ["clock",0,0,2,3,{ style:"poster", showDate:true }], ["note",2,0,2,3,{ title:"Watchlist" }], ["todo",4,0,2,3,{ title:"Listen later" }],
    APPS_SHELF("Watch & listen")
  ], apps:["youtube","spotify","soundcloud","twitch","google-photos"] },
  { id:"start", emoji:"\u{1F3E0}", name:"Start page", desc:"The week ahead and your everyday sites", cols:6, tiles:[
    ["clock",0,0,2,3,{ style:"rings", label:"" }], ["calendar",2,0,4,1,{ style:"week" }], ["note",2,1,4,2,{ title:"Today" }],
    APPS_SHELF("Favourites")
  ], apps:["gmail","youtube","google-maps","github","wikipedia","google-calendar"] },
  { id:"dashboard", emoji:"\u{1F4CA}", name:"Dashboard", desc:"Everything at a glance", cols:8, tiles:[
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
  { id:"focus", emoji:"\u{1F3AF}", name:"Focus", desc:"A big clock, tasks and a note", cols:4, tiles:[
    ["clock",0,0,2,3,{ style:"poster", showDate:true }], ["todo",2,0,2,2,{ title:"Today" }], ["note",2,2,2,1,{ title:"Focus on" }], ["search",0,3,4,1,{}]
  ] },
  { id:"world", emoji:"\u{1F30D}", name:"World clocks", desc:"Three cities, side by side", cols:6, tiles:[
    ["clock",0,0,2,2,{ style:"classic", label:"Local" }], ["clock",2,0,2,2,{ style:"classic", tz:"Europe/London", label:"London" }], ["clock",4,0,2,2,{ style:"classic", tz:"Asia/Tokyo", label:"Tokyo" }],
    ["note",0,2,6,1,{ title:"Meeting planner" }]
  ] },
  { id:"shelves", emoji:"\u{1F5C2}\uFE0F", name:"Shelves", desc:"Two shelves for your icons, plus tasks and a note", cols:6, tiles:[
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
  const wdg = widgetById(parentId), auto = !!(wdg && wdg.autoFlow);
  const cols = maxColsFor(parentId), items = childrenOf(parentId);
  if(!auto && !items.some(i=> i.x >= cols)) return;
  items.sort((a, b)=> a.y - b.y || a.x - b.x);
  let x = 0, y = 0, changed = false;
  items.forEach(it=>{ if(it.x !== x || it.y !== y){ it.x = x; it.y = y; changed = true; } if(++x >= cols){ x = 0; y++; } });
  if(changed) save();
}
// On a phone the board is one column of tiles; a shelf tile there grows to show all of its icons (rather than scrolling).
function fitCompactShelfTile(body){
  const tile = body.closest(".tile"), board = body.closest(".board-widget");
  if(!tile || !board || !board.classList.contains("compact")) return;
  const id = body.dataset.shelf, items = childrenOf(id);
  if(!items.length) return;
  const cell = getCellSize(id), rows = Math.max(...items.map(i=> i.y)) + 1;
  const need = rows * cell.h + 14 + (tile.offsetHeight - body.offsetHeight);
  const gap = parseFloat(tile.parentElement.style.gap) || 10, rowH = 84;
  const span = Math.max(2, Math.ceil((need + gap) / (rowH + gap)));
  if(tile.style.gridRow !== "span " + span){ tile.style.gridRow = "span " + span; renderInto(body, id); }   // redraw once so the icons centre in the new height
}
function populateShelves(root){ root.querySelectorAll("[data-shelf]").forEach(body=>{ reflowShelf(body.dataset.shelf); renderInto(body, body.dataset.shelf); fitCompactShelfTile(body); }); }

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
  fillPresetApps(board, preset);
  save(); render();
}
// Puts a template's catalog apps into its "apps" shelf tile (created at the bottom if the preset has none).
// The icons go in as real icons, in order; the shelf arranges them evenly across its width on the next draw.
function fillPresetApps(board, preset){
  const ids = preset && Array.isArray(preset.apps) ? preset.apps : [];
  if(!ids.length || typeof catalogApps !== "function") return;
  let tile = board.tiles.find(t=> t.type === "shelf" && t.p && t.p.appsShelf);
  if(!tile){
    const spot = firstFreeSpot(board.tiles, board.cols, board.cols, 2);
    tile = { id: uid(), type:"shelf", col: spot.col, row: spot.row, w: board.cols, h: 2, p:{ ...tileDefaults("shelf"), title:"Apps", appsShelf:true } };
    board.tiles.push(tile); board.tiles = resolveLayout(board.tiles, board.cols);
  }
  const shelf = shelfOf(tile) || newShelfFor(tile);
  shelf.autoFlow = true;
  const have = new Set(childrenOf(shelf.id).map(i=> (i.url || "").replace(/\/$/, "")));
  let n = childrenOf(shelf.id).length;
  catalogApps(ids).forEach(app=>{
    if(have.has(app.url.replace(/\/$/, ""))) return;
    const item = createItem("webapp", { label: app.label, url: app.url, color: COLORS[state.icons.length % COLORS.length], x: n++, y: 0, parentId: shelf.id });
    if(!item) return;
    state.icons.push(item);
    if(typeof tryEnrichWebApp === "function") tryEnrichWebApp(item);
  });
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

/* ---------- countdown, habits, headlines ---------- */
function localISODate(d){ return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function parseLocalDate(iso){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }

function renderCountdownTile(w, tile, box){
  const p = tile.p; box.classList.add("t-countdown");
  const big = bx("div", "t-cd-big"), sub = bx("div", "t-cd-sub");
  box.append(bx("div", "t-title", p.title || "Countdown"), big, sub);
  const draw = ()=>{
    const d = parseLocalDate(p.date);
    if(!d){ big.textContent = "\u2014"; sub.textContent = "Pick a date in this tile's settings."; return; }
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((d - today) / 86400000), when = d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short", year:"numeric" });
    if(days === 0){ big.textContent = "Today!"; sub.textContent = when; }
    else{ big.textContent = String(Math.abs(days)); sub.textContent = (Math.abs(days) === 1 ? "day " : "days ") + (days > 0 ? "to go" : "ago") + " \u00b7 " + when; }
  };
  draw();
  const timer = setInterval(()=>{ if(!box.isConnected) clearInterval(timer); else draw(); }, 60000);   // rolls over at midnight
}

function renderHabitsTile(w, tile, box){
  const p = tile.p; if(!Array.isArray(p.list)) p.list = [];
  box.classList.add("t-habits");
  const list = bx("div", "t-hb-list"), input = bx("input", "t-input");
  input.placeholder = "Add a habit\u2026"; input.maxLength = 40;
  const dayKeys = [];                                           // the last 7 days, oldest first
  for(let i = 6; i >= 0; i--){ const d = new Date(); d.setDate(d.getDate() - i); dayKeys.push({ key: localISODate(d), letter: d.toLocaleDateString([], { weekday:"narrow" }), today: i === 0 }); }
  const streakOf = (h)=>{                                       // consecutive days up to today (or up to yesterday if today isn't ticked yet)
    let n = 0; const d = new Date(); if(!(h.done && h.done[localISODate(d)])) d.setDate(d.getDate() - 1);
    while(h.done && h.done[localISODate(d)]){ n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  const draw = ()=>{
    list.innerHTML = "";
    if(!p.list.length){ list.appendChild(bx("div", "t-hint", "Add a habit, then tick each day you do it.")); return; }
    p.list.forEach((h, i)=>{
      const row = bx("div", "t-hb-row"), name = bx("span", "t-hb-name", h.name), dots = bx("span", "t-hb-dots");
      dayKeys.forEach(d=>{
        const b = bx("button", "t-hb-dot" + (h.done && h.done[d.key] ? " on" : "") + (d.today ? " today" : ""), d.letter); b.type = "button";
        b.title = d.key; b.setAttribute("aria-pressed", h.done && h.done[d.key] ? "true" : "false");
        b.addEventListener("click", ()=>{
          h.done = h.done || {}; if(h.done[d.key]) delete h.done[d.key]; else h.done[d.key] = 1;
          const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 120); Object.keys(h.done).forEach(k=>{ if(k < localISODate(cutoff)) delete h.done[k]; });
          save(); draw();
        });
        dots.appendChild(b);
      });
      const streak = bx("span", "t-hb-streak", streakOf(h) ? "\u{1F525}" + streakOf(h) : ""), x = bx("b", "t-x", "\u00d7"); x.title = "Remove habit";
      x.addEventListener("click", ()=>{ p.list.splice(i, 1); save(); draw(); });
      row.append(name, dots, streak, x); list.appendChild(row);
    });
  };
  input.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter" || !input.value.trim() || p.list.length >= 12) return;
    p.list.push({ name: input.value.trim().slice(0, 40), done:{} }); input.value = ""; save(); draw();
  });
  box.append(bx("div", "t-title", p.title || "Habits"), list, input); draw();
}

const HEADLINE_FEEDS = [
  ["https://hnrss.org/frontpage", "Hacker News"], ["https://feeds.bbci.co.uk/news/rss.xml", "BBC News"],
  ["https://feeds.npr.org/1001/rss.xml", "NPR News"], ["https://www.nasa.gov/feed/", "NASA"], ["https://www.theverge.com/rss/index.xml", "The Verge"]
];
const headlineCache = new Map();    // feed address -> { t, items }, so redraws don't refetch
function parseFeedXml(text){
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if(doc.querySelector("parsererror")) return [];
  const out = [];
  doc.querySelectorAll("item, entry").forEach(n=>{
    const title = (n.querySelector("title") || {}).textContent, linkEl = n.querySelector("link");
    const link = linkEl ? (linkEl.getAttribute("href") || linkEl.textContent) : "";
    const href = safeHttp((link || "").trim());
    if(title && href) out.push({ title: title.trim().replace(/\s+/g, " ").slice(0, 200), link: href });
  });
  return out;
}
async function loadHeadlines(feed){
  const hit = headlineCache.get(feed);
  if(hit && Date.now() - hit.t < 20 * 60 * 1000) return hit.items;
  let items = [];
  try{ const r = await fetch(feed, { cache:"no-store" }); if(r.ok) items = parseFeedXml(await r.text()); }catch(_){}      // works for feeds that allow it
  if(!items.length){                                                                                                  // most feeds don't: use a public feed-to-JSON service
    const r = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed));
    const j = await r.json();
    if(j && j.status === "ok" && Array.isArray(j.items)) items = j.items.map(i=> ({ title: String(i.title || "").slice(0, 200), link: safeHttp(i.link) })).filter(i=> i.title && i.link);
  }
  if(!items.length) throw new Error("Couldn't load this feed.");
  headlineCache.set(feed, { t: Date.now(), items });
  return items;
}
function renderHeadlinesTile(w, tile, box){
  const p = tile.p, feed = safeHttp(p.custom) || safeHttp(p.feed) || HEADLINE_FEEDS[0][0];
  box.classList.add("t-headlines");
  const list = bx("div", "t-hl-list", "Loading\u2026"); box.append(bx("div", "t-title", p.title || "Headlines"), list);
  loadHeadlines(feed).then(items=>{
    if(!box.isConnected) return;
    list.innerHTML = "";
    items.slice(0, Math.max(1, p.count || 6)).forEach(it=>{
      const a = bx("a", "t-hl", it.title); a.href = it.link; a.target = "_blank"; a.rel = "noopener noreferrer"; list.appendChild(a);
    });
  }).catch(err=>{ if(box.isConnected) list.textContent = err.message || "Couldn't load headlines."; });
}

// The To-do app's own list (shared with the app and the reminders): tick things off, add tasks, see due times.
function renderTasksTile(w, tile, box){
  const p = tile.p; box.classList.add("t-tasks");
  const list = bx("div", "t-todo"), input = bx("input", "t-input");
  input.placeholder = "Add a task\u2026"; input.maxLength = 120;
  box.append(bx("div", "t-title", p.title || "Tasks"), list, input);
  const draw = async ()=>{
    const all = await todoLoad(); if(!box.isConnected) return;
    const mode = p.show || "open";
    const rows = all.filter(t=> mode === "all" || (mode === "due" ? (!t.done && t.due) : !t.done)).sort((a, b)=>{
      const da = todoDueDate(a), db = todoDueDate(b); return da && db ? da - db : da ? -1 : db ? 1 : 0;
    });
    list.innerHTML = "";
    if(!rows.length){ list.appendChild(bx("div", "t-hint", mode === "due" ? "No tasks with a due time." : "Nothing to do. Add a task below.")); return; }
    rows.forEach(t=>{
      const row = bx("label", "t-row" + (t.done ? " done" : "")), cb = bx("input"), tx = bx("span", "", t.text);
      cb.type = "checkbox"; cb.checked = !!t.done;
      cb.addEventListener("change", ()=>{ todoMutate(l=>{ const x = l.find(y=> y.id === t.id); if(x) x.done = cb.checked; return l; }, "widget").then(draw); });
      row.append(cb, tx);
      const di = todoDueInfo(t); if(di) row.appendChild(bx("span", "t-due " + di.cls, di.text));
      list.appendChild(row);
    });
  };
  input.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter" || !input.value.trim()) return;
    const text = input.value.trim().slice(0, 120); input.value = "";
    todoMutate(l=>{ l.push({ id: uid(), text, done:false, createdAt: Date.now() }); return l; }, "widget").then(draw);
  });
  const off = EventBus.on("todo-changed", ()=>{ if(!box.isConnected){ off(); return; } draw(); });
  draw();
}

// A note from the Notes app, shown as formatted text and kept up to date as you edit it there.
function renderPinnedNoteTile(w, tile, box){
  const p = tile.p; box.classList.add("t-pinnote");
  const head = bx("div", "t-title", "Pinned note"), body = bx("div", "t-pn-body md"), open = bx("button", "t-pn-open", "Open in Notes"); open.type = "button";
  box.append(head, body, open);
  const draw = async ()=>{
    let notes = []; try{ const v = await Store.getAppData("notes", "notes"); if(Array.isArray(v)) notes = v; }catch(_){}
    if(!box.isConnected) return;
    const n = notes.find(x=> x.id === p.noteId);
    if(!n){ head.textContent = "Pinned note"; body.textContent = "This note was deleted, or isn't pinned yet. Remove this widget, or pin a note from the Notes app."; return; }
    head.textContent = n.title || "Untitled"; body.innerHTML = renderMarkdown(n.text || "");
  };
  open.addEventListener("click", ()=> openNoteById(p.noteId));
  const off = EventBus.on("notes-changed", ()=>{ if(!box.isConnected){ off(); return; } draw(); });
  draw();
}
const TILE_RENDER = { todo: renderTodoTile, search: renderSearchTile, link: renderLinkTile, links: renderLinksTile, clock: renderClockTile, calendar: renderCalendarTile, note: renderNoteTile, forecast: renderForecastTile, countdown: renderCountdownTile, habits: renderHabitsTile, headlines: renderHeadlinesTile, tasks: renderTasksTile, pinnote: renderPinnedNoteTile };

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
  buildMenu(Object.entries(TILE_TYPES).filter(([, d])=> !d.hidden).map(([type, d])=>({ label: `${d.icon}  ${d.name}`, hint: d.desc, action: ()=>{
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
  countdown:[{ k:"title", t:"text", l:"What are you counting to?", max:30 }, { k:"date", t:"date", l:"Date" }],
  habits:   [{ k:"title", t:"text", l:"Title", max:30 }],
  tasks:    [{ k:"title", t:"text", l:"Title", max:30 }, { k:"show", t:"select", l:"Show", opts:()=> [["open", "Open tasks"], ["due", "Tasks with a due time"], ["all", "All tasks"]] }],
  pinnote:  [],
  headlines:[{ k:"feed", t:"select", l:"News source", opts:()=> HEADLINE_FEEDS }, { k:"custom", t:"url", l:"Or your own feed address (optional)" },
             { k:"count", t:"select", l:"How many", opts:()=> [[3, "3"], [5, "5"], [6, "6"], [8, "8"], [10, "10"]] }],
  forecast: [{ k:"city", t:"text", l:"City", max:60 }, { k:"unit", t:"select", l:"Units", opts:()=> [["c", "\u00b0C, km/h"], ["f", "\u00b0F, mph"]] }, { k:"days", t:"select", l:"Days (up to the tile's height)", opts:()=> [[3, "3"], [5, "5"], [7, "7"]] }]
};
function openTileSettings(w, tile, x, y, opts){
  closeWidgetPop();
  const pop = bx("div", "widget-pop"), p = tile.p;
  (TILE_FIELDS[tile.type] || []).forEach(f=>{
    let ctl;
    if(f.t === "check"){ ctl = bx("input"); ctl.type = "checkbox"; ctl.checked = !!p[f.k]; ctl.addEventListener("change", ()=>{ p[f.k] = ctl.checked; save(); render(); }); const l = bx("label", "wp-row"); l.append(ctl, document.createTextNode(" " + f.l)); pop.appendChild(l); return; }
    if(f.t === "date"){
      ctl = bx("input"); ctl.type = "date"; ctl.value = p[f.k] || "";
      ctl.addEventListener("change", ()=>{ if(parseLocalDate(ctl.value)){ p[f.k] = ctl.value; save(); render(); } });
    }else if(f.t === "select"){
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
  if(tile.type === "headlines") pop.appendChild(bx("div", "cloud-note", "Headlines come straight from the feed when it allows that; otherwise through the public service rss2json.com, which then sees the feed address."));
  if(tile.type === "shelf") pop.appendChild(bx("div", "cloud-note", "Drag icons onto this shelf to put them in it. Removing the tile puts its icons back on the webtop."));
  const del = bx("button", "wp-del", "Remove this tile"); del.type = "button";
  del.addEventListener("click", ()=>{ closeWidgetPop(); if(opts && opts.onRemove) opts.onRemove(); else removeTile(w, tile); });
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
