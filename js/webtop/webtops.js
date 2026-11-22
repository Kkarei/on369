"use strict";

/* ============ MULTIPLE WEBTOPS ============
   Like worksheets in a spreadsheet: each webtop is its own workspace with its own icons,
   widgets and wallpaper. Top-level items remember which webtop they live on in `item.space`;
   items inside folders and shelves follow their parent. */
const WEBTOP_ICONS = ["\u{1F3E0}", "\u{1F4BC}", "\u{1F4DA}", "\u{1F3AE}", "\u{1F3B5}", "\u{1F6D2}", "\u{1F9EA}", "\u2708\uFE0F", "\u{1F4A1}", "\u{1F3A8}", "\u{1F4C8}", "\u2B50"];
const inSpace = (i)=> !i.space || i.space === state.activeWebtop;
const webtopTabsEl = document.getElementById("webtopTabs");

function normalizeWebtops(list, active){
  const seen = new Set(), out = [];
  (Array.isArray(list) ? list : []).forEach(w=>{
    if(!w || typeof w.id !== "string" || seen.has(w.id)) return;
    seen.add(w.id);
    out.push({ id: w.id, name: String(w.name || "Webtop").slice(0, 24), icon: String(w.icon || "\u2B50").slice(0, 4), wallpaper: typeof w.wallpaper === "string" ? w.wallpaper : null,
      ...(w.lock && typeof w.lock.salt === "string" && typeof w.lock.hash === "string" ? { lock:{ salt: w.lock.salt, hash: w.lock.hash, iter: Number(w.lock.iter) || 150000 } } : {}) });
  });
  if(!out.length) out.push({ id:"main", name:"Webtop", icon:"\u{1F3E0}", wallpaper:null });
  return { webtops: out, activeWebtop: out.some(w=> w.id === active) ? active : out[0].id };
}
const activeWebtopObj = ()=> state.webtops.find(w=> w.id === state.activeWebtop) || state.webtops[0];

// Older saves have no webtops: everything on the webtop belongs to the first one.
function webtopMigrate(){
  const first = state.webtops[0].id;
  state.icons.forEach(i=>{ if(i.parentId === null && !i.space) i.space = first; });
}
// Runs inside save(): new top-level items join the webtop you're on, items inside folders carry no
// webtop of their own, and the current wallpaper is remembered for the webtop you're on.
function webtopSync(){
  const w = activeWebtopObj();
  if(w && w.wallpaper !== state.wallpaper) w.wallpaper = state.wallpaper;
  state.icons.forEach(i=>{
    if(i.parentId === null){ if(!i.space) i.space = state.activeWebtop; }
    else if(i.space) delete i.space;
  });
}

function switchWebtop(id){
  if(id === state.activeWebtop || !state.webtops.some(w=> w.id === id)) return;
  if(webtopNeedsUnlock(id)){ promptUnlock(id).then(ok=>{ if(ok) switchWebtop(id); }); return; }   // a private webtop asks for its PIN first
  webtopSync();
  state.activeWebtop = id;
  const w = activeWebtopObj();
  if(w.wallpaper) state.wallpaper = w.wallpaper;
  if(currentFolderId){ folderOverlay.classList.remove("open"); currentFolderId = null; folderStack = []; }
  selected.clear(); selectionAnchor = null;
  applyAppearance(); renderWebtopTabs(); render(); save();
  gridLayer.classList.remove("wt-swap"); void gridLayer.offsetWidth; gridLayer.classList.add("wt-swap");
}
function addWebtop(name, icon){
  const id = "w" + Math.random().toString(36).slice(2, 8);
  state.webtops.push({ id, name: String(name || "").trim().slice(0, 24) || "Webtop " + (state.webtops.length + 1), icon: icon || "\u2B50", wallpaper: state.wallpaper });
  return id;
}
async function deleteWebtop(id){
  if(state.webtops.length < 2) return;
  const wt = state.webtops.find(w=> w.id === id); if(!wt) return;
  const gone = new Set(state.icons.filter(i=> i.parentId === null && i.space === id).map(i=> i.id));
  let grew = true;
  while(grew){ grew = false; state.icons.forEach(i=>{ if(!gone.has(i.id) && gone.has(i.parentId)){ gone.add(i.id); grew = true; } }); }
  const ok = await askConfirm({ title:"Delete this webtop?", message:`Delete \u201C${wt.name}\u201D and everything on it (${gone.size} item${gone.size === 1 ? "" : "s"})? This can't be undone.`, confirmLabel:"Delete webtop", cancelLabel:"Keep it" });
  if(!ok) return;
  const idx = state.webtops.findIndex(w=> w.id === id);
  if(state.activeWebtop === id) switchWebtop(state.webtops[idx > 0 ? idx - 1 : 1].id);
  state.icons = state.icons.filter(i=> !gone.has(i.id));
  state.webtops = state.webtops.filter(w=> w.id !== id);
  renderWebtopTabs(); render(); save();
}
function moveWebtop(id, dir){
  const i = state.webtops.findIndex(w=> w.id === id), j = i + dir;
  if(i < 0 || j < 0 || j >= state.webtops.length) return;
  const [w] = state.webtops.splice(i, 1); state.webtops.splice(j, 0, w);
  renderWebtopTabs(); save();
}
function moveToWebtop(ids, target){
  ids.forEach(id=>{ const it = state.icons.find(i=> i.id === id); if(it && it.parentId === null) it.space = target; });
  selected.clear(); save(); render();
  const t = state.webtops.find(w=> w.id === target);
  if(t) statusEl.textContent = `Moved to ${t.name}`;
}
// A menu entry listing the other webtops, or null if there is only one.
function moveToWebtopMenuItem(ids){
  const others = state.webtops.filter(w=> w.id !== state.activeWebtop);
  if(!others.length) return null;
  return { label:"Move to webtop", icon:"grid", submenu: others.map(w=>({ label: `${w.icon} ${w.name}`, action: ()=> moveToWebtop(ids, w.id) })) };
}

// Every bookmark export keeps the webtops apart: one folder per webtop.
function serializeAllWebtops(){
  if(state.webtops.length < 2) return serializeBookmarkTree(null, 0);
  const keep = state.activeWebtop; let html = "<DL><p>\n";
  try{
    state.webtops.forEach(wt=>{ state.activeWebtop = wt.id; html += `    <DT><H3>${escapeHtmlAttr(wt.name)}</H3>\n` + serializeBookmarkTree(null, 1); });
  }finally{ state.activeWebtop = keep; }
  return html + "</DL><p>\n";
}

function renderWebtopTabs(){
  webtopTabsEl.innerHTML = "";
  state.webtops.forEach(w=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "wt-tab" + (w.id === state.activeWebtop ? " active" : "");
    b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(w.id === state.activeWebtop)); b.dataset.id = w.id; b.title = w.name;
    const ic = document.createElement("span"); ic.className = "wt-ico"; ic.textContent = w.icon;
    const nm = document.createElement("span"); nm.className = "wt-name"; nm.textContent = w.name;
    b.append(ic, nm);
    if(w.lock){ const lk = document.createElement("span"); lk.className = "wt-lock"; lk.textContent = "\u{1F512}"; lk.setAttribute("aria-label", "Private"); b.appendChild(lk); }
    webtopTabsEl.appendChild(b);
  });
  const add = document.createElement("button"); add.type = "button"; add.className = "wt-add"; add.title = "New webtop"; add.setAttribute("aria-label", "New webtop"); add.textContent = "+";
  webtopTabsEl.appendChild(add);
  const on = webtopTabsEl.querySelector(".wt-tab.active"); if(on && on.scrollIntoView) on.scrollIntoView({ block:"nearest", inline:"nearest" });
}
function openWebtopMenu(id, x, y){
  const i = state.webtops.findIndex(w=> w.id === id), w = state.webtops[i]; if(!w) return;
  buildMenu([
    { label:"Rename or change icon\u2026", icon:"rename", action: ()=> openWebtopDialog(id) },
    { label:"Move left", icon:"chevron", disabled: i === 0, action: ()=> moveWebtop(id, -1) },
    { label:"Move right", icon:"chevron", disabled: i === state.webtops.length - 1, action: ()=> moveWebtop(id, 1) },
    "sep",
    ...(w.lock
      ? [{ label:"Lock now", icon:"lock", action: ()=> lockWebtopNow(id) }, { label:"Change PIN\u2026", icon:"lock", action: ()=> promptChangePin(id) }, { label:"Remove PIN\u2026", icon:"lock", action: ()=> promptRemovePin(id) }]
      : [{ label:"Set a PIN\u2026", icon:"lock", hint:"Make it private", action: ()=> promptSetPin(id) }]),
    "sep",
    { label:"Delete webtop\u2026", icon:"delete", danger:true, disabled: state.webtops.length < 2, action: ()=> deleteWebtop(id) }
  ], x, y);
}

// Templates: a board preset (js/webtop/boards.js) plus its catalog apps (js/data/app-catalog.js), shown as one-tap
// cards in the New webtop dialog below. The apps go into the board's labelled "apps" shelf, never loose on top of the tiles.
function addPresetApps(preset){      // kept for older callers: fills the current webtop's board with the preset's apps
  const board = state.icons.find(i=> i.type === "widget" && i.kind === "board" && inSpace(i));
  if(board) fillPresetApps(board, preset);
  save(); render();
}

// One tap: makes a webtop from a template (a board preset), named and iconed after it unless you typed your own name.
function createWebtopFromTemplate(preset, typedName){
  const id = addWebtop((typedName || "").trim() || preset.name, preset.emoji || "\u2B50");
  switchWebtop(id);
  const board = addBoardWidget(60, 130, preset);
  fillPresetApps(board, preset);
  save(); render();
  return id;
}

function openWebtopDialog(editId){
  const editing = editId ? state.webtops.find(w=> w.id === editId) : null;
  const back = document.createElement("div"); back.className = "cloud-modal-back";
  const box = document.createElement("div"); box.className = "cloud-modal webtop-dialog"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  const title = document.createElement("div"); title.className = "confirm-title"; title.textContent = editing ? "Edit webtop" : "New webtop";
  const name = document.createElement("input"); name.type = "text"; name.maxLength = 24; name.className = "note-input"; name.placeholder = "e.g. Work, Home, Study"; name.value = editing ? editing.name : "";
  let icon = editing ? editing.icon : WEBTOP_ICONS[1 + (state.webtops.length % (WEBTOP_ICONS.length - 1))];
  const icons = document.createElement("div"); icons.className = "wt-icons";
  WEBTOP_ICONS.forEach(e=>{
    const b = document.createElement("button"); b.type = "button"; b.textContent = e; b.className = e === icon ? "on" : "";
    b.addEventListener("click", ()=>{ icon = e; icons.querySelectorAll("button").forEach(x=> x.classList.toggle("on", x === b)); });
    icons.appendChild(b);
  });
  const done = ()=> back.remove();
  const ok = document.createElement("button"); ok.className = "primary"; ok.textContent = editing ? "Save" : "Create empty webtop";
  const no = document.createElement("button"); no.textContent = "Cancel"; no.addEventListener("click", done);
  const submit = ()=>{
    const nm = name.value.trim().slice(0, 24);
    if(editing){ editing.name = nm || editing.name; editing.icon = icon; renderWebtopTabs(); save(); done(); return; }
    const id = addWebtop(nm, icon);
    done(); switchWebtop(id);
  };
  ok.addEventListener("click", submit);
  name.addEventListener("keydown", (e)=>{ if(e.key === "Enter") submit(); else if(e.key === "Escape") done(); });
  back.addEventListener("pointerdown", (e)=>{ if(e.target === back) done(); });

  if(editing){
    box.append(title, name, icons, ok, no);
    back.appendChild(box); document.body.appendChild(back); name.focus(); name.select();
    return;
  }

  // New webtop: a gallery of one-tap templates first, with "Empty" revealing the name/icon form.
  const lead = document.createElement("div"); lead.className = "wt-tpl-lead"; lead.textContent = "Start from a template, or begin empty.";
  const grid = document.createElement("div"); grid.className = "wt-templates"; grid.setAttribute("role", "list");
  const card = (emoji, nm, desc, tag, onTap)=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "wt-template"; b.setAttribute("role", "listitem");
    const e = document.createElement("span"); e.className = "wt-tpl-emoji"; e.textContent = emoji;
    const t = document.createElement("span"); t.className = "wt-tpl-name"; t.textContent = nm;
    const d = document.createElement("span"); d.className = "wt-tpl-desc"; d.textContent = desc;
    b.append(e, t, d);
    if(tag){ const g = document.createElement("span"); g.className = "wt-tpl-tag"; g.textContent = tag; b.appendChild(g); }
    b.addEventListener("click", onTap); return b;
  };
  const form = document.createElement("div"); form.className = "wt-empty-form"; form.hidden = true;
  form.append(name, icons, ok);
  grid.appendChild(card("\u2795", "Empty", "A blank webtop to arrange yourself", "", ()=>{ form.hidden = false; grid.querySelectorAll(".wt-template").forEach(x=> x.classList.toggle("on", x.querySelector(".wt-tpl-name").textContent === "Empty")); name.focus(); }));
  allBoardPresets().filter(p=> p.id !== "blank").forEach(p=>{
    const count = Array.isArray(p.apps) ? p.apps.length : 0;
    grid.appendChild(card(p.emoji || "\u{1F9E9}", p.name, p.desc || "", count ? count + " apps" : "", ()=>{
      const typed = form.hidden ? "" : name.value;   // a name typed under "Empty" is used; otherwise the template's own
      done(); createWebtopFromTemplate(p, typed);
    }));
  });
  box.append(title, lead, grid, form, no);
  back.appendChild(box); document.body.appendChild(back);
  grid.querySelector(".wt-template").focus();
}

/* Runs once at startup (see main.js). */
function initWebtopWebtops(){
  webtopTabsEl.addEventListener("click", (e)=>{
    const add = e.target.closest(".wt-add"); if(add){ e.stopPropagation(); openWebtopDialog(null); return; }
    const t = e.target.closest(".wt-tab"); if(!t) return;
    e.stopPropagation();
    if(t.dataset.id === state.activeWebtop){ const r = t.getBoundingClientRect(); openWebtopMenu(t.dataset.id, r.left, r.bottom + 6); }   // tap the current tab for its menu
    else switchWebtop(t.dataset.id);
  });
  webtopTabsEl.addEventListener("contextmenu", (e)=>{
    const t = e.target.closest(".wt-tab"); if(!t) return;
    e.preventDefault(); e.stopPropagation(); openWebtopMenu(t.dataset.id, e.clientX, e.clientY);
  });
  document.addEventListener("keydown", (e)=>{
    if(!(e.ctrlKey || e.metaKey) || !e.shiftKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const t = e.target; if(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    const i = state.webtops.findIndex(w=> w.id === state.activeWebtop), n = state.webtops.length;
    switchWebtop(state.webtops[(i + (e.key === "ArrowRight" ? 1 : n - 1)) % n].id); e.preventDefault();
  });
  renderWebtopTabs();
}
