"use strict";

/* ============ COMMAND PALETTE (Ctrl/Cmd + K) ============
   One box to reach everything: your icons (on every webtop), the built-in apps, your webtops,
   themes and actions like "New bookmark" or "Next background". Type to filter; with nothing
   typed it shows what you opened recently. Up/Down moves, Enter runs, Esc closes.
   On a phone it opens from the menu (long-press the background, or the + button). */

const CMDK_MAX_ROWS = 60;
let cmdkEntries = [];           // everything that can be run, rebuilt each time the palette opens
let cmdkRows = [];              // the entries currently shown (after filtering and ranking)
let cmdkActive = 0;
let cmdkReturnFocus = null;
let cmdkOverlay = null, cmdkInput = null, cmdkList = null;

const cmdkIsOpen = ()=> !!(cmdkOverlay && !cmdkOverlay.hidden);

/* ---------- building the list of things you can run ---------- */
function cmdkSpaceOf(item){            // which webtop an icon lives on (top-level icons carry it; nested ones follow their parent)
  let cur = item, guard = 0;
  while(cur && cur.parentId && guard++ < 20) cur = state.icons.find(i=> i.id === cur.parentId);
  return cur ? (cur.space || state.activeWebtop) : state.activeWebtop;
}
function cmdkWebtopName(id){ const w = state.webtops.find(x=> x.id === id); return w ? w.name : ""; }
function cmdkLooksLikeUrl(q){
  if(/^https?:\/\//i.test(q)) return true;
  return /^[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(q) && !/\s/.test(q);
}

function cmdkBuildEntries(){
  const out = [];
  const add = (e)=> out.push(e);

  // Icons on every webtop
  state.icons.forEach(it=>{
    if(it.type === "widget") return;
    const space = cmdkSpaceOf(it), here = space === state.activeWebtop;
    if(webtopNeedsUnlock(space)) return;                       // icons on a locked webtop stay out of search
    const kind = it.type === "folder" ? "Folder" : it.type === "app" ? "App" : (domainLabel(it.url || "") || "Link");
    add({
      group: "Icons", title: it.label || "Untitled", sub: kind + (here ? "" : " · " + cmdkWebtopName(space)),
      keywords: (it.url || ""), glyphItem: it, weight: 0, usage: (usageOf(it.id) || {}).n || 0,
      run: ()=>{ if(!here) switchWebtop(space); openItem(it); }
    });
  });

  // Built-in apps (skip the ones that already have an icon, those are listed above)
  const haveApp = new Set(state.icons.filter(i=> i.type === "app").map(i=> i.appId));
  AppManager.listApps().forEach(a=>{
    if(haveApp.has(a.id)) return;
    add({ group: "Apps", title: a.name, sub: "App", keywords: (a.description || "") + " " + (a.category || ""), icon: "grid", weight: -2,
      run: ()=> AppManager.launch(a.id, { title: a.name, color: COLORS[1] }) });
  });

  // Webtops
  state.webtops.forEach(w=>{
    if(w.id === state.activeWebtop) return;
    add({ group: "Webtops", title: "Switch to " + w.name, sub: "Webtop", keywords: "webtop workspace " + w.name, emoji: w.icon, weight: -1, run: ()=> switchWebtop(w.id) });
  });
  allBoardPresets().filter(p=> p.id !== "blank").forEach(p=>{
    add({ group: "Webtops", title: "New " + p.name + " webtop", sub: "Template" + (Array.isArray(p.apps) && p.apps.length ? " · " + p.apps.length + " apps" : ""), keywords: "template starter new webtop " + (p.desc || ""),
      emoji: p.emoji || "\u{1F9E9}", weight: -3, run: ()=> createWebtopFromTemplate(p) });
  });
  allBoardPresets().filter(p=> p.id !== "blank").forEach(p=> add({ group: "Webtops", title: "New " + p.name + " webtop", sub: "Template" + (Array.isArray(p.apps) && p.apps.length ? " · " + p.apps.length + " apps" : ""),
    keywords: "new webtop template starter " + p.name + " " + (p.desc || ""), emoji: p.emoji || "\u{1F9E9}", weight: -3, run: ()=> createWebtopFromTemplate(p) }));
  add({ group: "Webtops", title: "New webtop…", sub: "Create another workspace", keywords: "add create workspace", icon: "grid", weight: -3, run: ()=> openWebtopDialog() });

  // Actions
  const spotFor = (pw, ph)=>{ const s = freeWidgetSpot(pw, ph); return [s.x, s.y]; };
  const act = (title, icon, run, keywords, hint)=> add({ group: "Actions", title, sub: hint || "Action", icon, keywords: keywords || "", weight: -4, run });
  act("New bookmark", "bookmark", ()=> openItemModal({ mode:"create", type:"bookmark", parentId:null }), "add link website");
  act("New folder", "folder", ()=> openItemModal({ mode:"create", type:"folder", parentId:null }), "add group");
  act("Add a web app", "globe", ()=> openWebAppPicker({ parentId:null }), "web app catalog install");
  act("Add a utility app", "grid", ()=> openAppPicker(null), "calculator todo notes clock calendar");
  act("Add a Shelf widget", "grid", ()=> openWidgetSettings(addWidget(...spotFor(340, 260), []), window.innerWidth - 260, 120), "widget group");
  act("Add a Clock widget", "clock", ()=> openClockSettings(addClockWidget(...spotFor(300, 160)), window.innerWidth - 260, 120), "widget time");
  act("Add a Calendar widget", "calendar", ()=> openClockSettings(addCalendarWidget(...spotFor(300, 300)), window.innerWidth - 260, 120), "widget date");
  act("Add a Most used widget", "star", ()=> openRecentsSettings(addRecentsWidget(...spotFor(340, 210)), window.innerWidth - 260, 120), "widget favourites recent frequent");
  TILE_WIDGET_TYPES.forEach(type=>{ const d = TILE_TYPES[type];
    act("Add a " + d.name + " widget", "grid", ()=>{ const sz = TILE_WIDGET_SIZE[type] || [280, 240], at = spotFor(sz[0], sz[1]), w = addTileWidget(type, at[0], at[1]); if(w && (type === "countdown" || type === "headlines")) openTileWidgetSettings(w, window.innerWidth - 260, 120); }, "widget " + d.desc); });
  act(state.hideIcons ? "Show icons" : "Hide icons", state.hideIcons ? "view" : "eyeOff", ()=> toggleHideIcons(), "toggle clean desktop");
  if(canAdvanceWallpaper()) act("Next background", "wallpaper", ()=> advanceWallpaper(), "wallpaper change picture");
  if(canUndo()) act("Undo", "reset", ()=> undoLast(), "revert last change", "Ctrl+Z");
  { const wt = activeWebtopObj();
    if(wt && wt.lock) act("Lock this webtop now", "lock", ()=> lockWebtopNow(wt.id), "private pin");
    else if(wt) act("Set a PIN for this webtop", "lock", ()=> promptSetPin(wt.id), "private lock pin password"); }
  act("Settings", "view", ()=> document.getElementById("settingsBtn").click(), "preferences options appearance wallpaper");
  act("Check my links for dead ones", "globe", ()=> AppManager.launch("linkcheck", { title:"Link checker", color: COLORS[3] }), "broken bookmarks dead links check website");
  act("Cloud backup & sync", "export", ()=> document.getElementById("cloudBtn").click(), "sync email account");
  act("Backup & restore", "export", ()=> document.getElementById("backupBtn").click(), "export import file download");
  act("Import bookmarks…", "import", ()=> triggerBookmarkImport(null), "browser html file");
  act("Open Getting Started", "view", ()=> AppManager.launch("getting-started", { title:"Getting Started", color: COLORS[1] }), "help guide tour");

  // Themes
  THEMES.forEach(t=> add({ group: "Themes", title: "Theme: " + t.name, sub: state.theme === t.id ? "Current theme" : "Theme", keywords: "colours colors appearance dark light", icon: "view", weight: -5,
    run: ()=>{ state.theme = t.id; applyAppearance(); save(); } }));

  return out;
}

// Notes and tasks live in the apps' own storage, so they are read after the palette opens and added to the list.
function cmdkLoadContent(){
  Promise.all([
    Store.getAppData("notes", "notes").catch(()=> []),
    typeof todoLoad === "function" ? todoLoad() : Promise.resolve([])
  ]).then(([notes, tasks])=>{
    if(!cmdkIsOpen()) return;
    (Array.isArray(notes) ? notes : []).forEach(n=>{
      const body = String(n.text || "").replace(/\s+/g, " ").trim();
      cmdkEntries.push({ group: "Notes", title: n.title || "Untitled note", sub: body.slice(0, 70) || "Empty note", keywords: body.slice(0, 600), icon: "rename", weight: -1, usage: 0,
        run: ()=> openNoteById(n.id) });
    });
    (Array.isArray(tasks) ? tasks : []).filter(t=> !t.done).forEach(t=>{
      const di = todoDueInfo(t);
      cmdkEntries.push({ group: "Tasks", title: t.text, sub: "Task" + (di ? " · " + di.text : ""), keywords: "task todo", icon: "check", weight: -1, usage: 0,
        run: ()=> AppManager.launch("todo", { title:"Todo", color: COLORS[2] }) });
    });
    if(cmdkInput.value.trim()) cmdkRender();                     // refresh only when a search is showing, so the list doesn't jump
  }).catch(()=>{});
}

/* ---------- matching ---------- */
function cmdkSubsequence(text, q){
  let i = 0;
  for(const ch of text){ if(ch === q[i]) i++; if(i === q.length) return true; }
  return false;
}
function cmdkFieldScore(text, q){
  text = text.toLowerCase();
  if(!text) return 0;
  if(text === q) return 100;
  if(text.startsWith(q)) return 85;
  if(new RegExp("(^|[\\s/._:-])" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text)) return 70;
  if(text.includes(q)) return 55;
  if(q.length >= 3 && cmdkSubsequence(text, q)) return 25;
  return 0;
}
function cmdkScore(e, tokens){
  let total = 0;
  for(const tk of tokens){
    const s = Math.max(cmdkFieldScore(e.title, tk), cmdkFieldScore(e.sub, tk) * 0.5, cmdkFieldScore(e.keywords || "", tk) * 0.6);
    if(!s) return 0;
    total += s;
  }
  return total / tokens.length + e.weight + Math.min(8, e.usage || 0);
}

function cmdkCompute(query){
  const q = query.trim().toLowerCase();
  const groupOrder = ["Recent", "Icons", "Notes", "Tasks", "Apps", "Webtops", "Actions", "Themes", "Web"];
  let rows;
  if(!q){
    const recent = usageRanked("recent", 6, true).map(r=> cmdkEntries.find(e=> e.glyphItem && e.glyphItem.id === r.item.id)).filter(Boolean)
      .map(e=> Object.assign({}, e, { group: "Recent" }));
    const common = cmdkEntries.filter(e=> e.group === "Actions" || e.group === "Webtops").slice(0, 14);
    rows = recent.concat(common);
  }else{
    const tokens = q.split(/\s+/).filter(Boolean);
    rows = cmdkEntries.map(e=> ({ e, s: cmdkScore(e, tokens) })).filter(x=> x.s > 0).sort((a, b)=> b.s - a.s).map(x=> x.e);
    if(cmdkLooksLikeUrl(query.trim())){
      const href = /^https?:\/\//i.test(query.trim()) ? query.trim() : "https://" + query.trim();
      rows.push({ group: "Web", title: "Open " + query.trim(), sub: "Opens in a new tab", icon: "openLink", weight: 0, run: ()=> window.open(href, "_blank", "noopener") });
    }
    const engine = (typeof ENGINES !== "undefined" && (ENGINES[state.searchEngine] || ENGINES.google)) || null;
    if(engine) rows.push({ group: "Web", title: "Search the web for “" + query.trim() + "”", sub: engine.name || "Web search", icon: "globe", weight: 0,
      run: ()=> window.open(engine.url + encodeURIComponent(query.trim()), "_blank", "noopener") });
  }
  // Keep the top-level order stable by group when nothing is typed; with a query the best score leads.
  if(!q) rows.sort((a, b)=> groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
  return rows.slice(0, CMDK_MAX_ROWS);
}

/* ---------- drawing ---------- */
function cmdkHighlight(el, text, query){
  el.textContent = "";
  const q = query.trim().toLowerCase().split(/\s+/)[0];
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if(i < 0){ el.textContent = text; return; }
  el.append(document.createTextNode(text.slice(0, i)));
  const m = document.createElement("mark"); m.textContent = text.slice(i, i + q.length); el.appendChild(m);
  el.append(document.createTextNode(text.slice(i + q.length)));
}
function cmdkRender(){
  const q = cmdkInput.value;
  cmdkRows = cmdkCompute(q);
  cmdkActive = Math.min(cmdkActive, Math.max(0, cmdkRows.length - 1));
  cmdkList.innerHTML = "";
  if(!cmdkRows.length){
    const li = document.createElement("li"); li.className = "cmdk-empty"; li.setAttribute("role", "presentation"); li.textContent = "Nothing matches. Try another word.";
    cmdkList.appendChild(li); cmdkInput.removeAttribute("aria-activedescendant"); return;
  }
  let lastGroup = "";
  cmdkRows.forEach((e, i)=>{
    if(e.group !== lastGroup){
      lastGroup = e.group;
      const h = document.createElement("li"); h.className = "cmdk-group"; h.setAttribute("role", "presentation");
      h.textContent = e.group === "Recent" ? "Recently opened" : e.group; cmdkList.appendChild(h);
    }
    const li = document.createElement("li"); li.id = "cmdk-opt-" + i; li.className = "cmdk-row"; li.setAttribute("role", "option"); li.dataset.index = i;
    const ic = document.createElement("span"); ic.className = "cmdk-ic";
    if(e.glyphItem){ ic.innerHTML = glyphFor(e.glyphItem); ic.classList.add("is-glyph"); }
    else if(e.emoji){ ic.textContent = e.emoji; }
    else ic.innerHTML = menuIcon(e.icon || "grid");
    const txt = document.createElement("span"); txt.className = "cmdk-text";
    const t = document.createElement("span"); t.className = "cmdk-title"; cmdkHighlight(t, e.title, q);
    const s = document.createElement("span"); s.className = "cmdk-sub"; s.textContent = e.sub || "";
    txt.append(t, s); li.append(ic, txt);
    li.addEventListener("pointermove", ()=>{ if(cmdkActive !== i){ cmdkActive = i; cmdkMarkActive(false); } });
    li.addEventListener("click", ()=> cmdkRun(i));
    cmdkList.appendChild(li);
  });
  cmdkMarkActive(true);
}
function cmdkMarkActive(scroll){
  cmdkList.querySelectorAll(".cmdk-row").forEach(li=>{
    const on = +li.dataset.index === cmdkActive;
    li.classList.toggle("active", on); li.setAttribute("aria-selected", on ? "true" : "false");
    if(on){ cmdkInput.setAttribute("aria-activedescendant", li.id); if(scroll) li.scrollIntoView({ block: "nearest" }); }
  });
}
function cmdkMove(delta){
  if(!cmdkRows.length) return;
  cmdkActive = (cmdkActive + delta + cmdkRows.length) % cmdkRows.length;
  cmdkMarkActive(true);
}
function cmdkRun(i){
  const e = cmdkRows[i]; if(!e) return;
  closeCommandPalette(false);
  setTimeout(()=>{ try{ e.run(); }catch(err){ console.error("on369: palette command failed", err); } }, 0);
}

/* ---------- open / close ---------- */
function openCommandPalette(prefill){
  if(!cmdkOverlay) return;
  closeCtxMenu();
  cmdkReturnFocus = document.activeElement;
  cmdkEntries = cmdkBuildEntries();
  cmdkInput.value = typeof prefill === "string" ? prefill : "";
  cmdkActive = 0;
  cmdkOverlay.hidden = false;
  cmdkRender();
  cmdkLoadContent();
  cmdkInput.focus();            // right away (not on a timer), so letters typed immediately after Ctrl+K aren't lost
}
function closeCommandPalette(restoreFocus){
  if(!cmdkIsOpen()) return;
  cmdkOverlay.hidden = true;
  if(restoreFocus !== false && cmdkReturnFocus && cmdkReturnFocus.focus){ try{ cmdkReturnFocus.focus({ preventScroll: true }); }catch(e){} }
  cmdkReturnFocus = null;
}

/* Runs once at startup (see main.js). */
function initUiCommandPalette(){
  cmdkOverlay = document.createElement("div");
  cmdkOverlay.className = "cmdk-overlay"; cmdkOverlay.hidden = true;
  cmdkOverlay.innerHTML = `
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmdk-inputwrap">
        <span class="cmdk-search">${menuIcon("search")}</span>
        <input type="text" class="cmdk-input" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list"
          placeholder="Search icons, apps and actions…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
        <button type="button" class="cmdk-close" aria-label="Close">&times;</button>
      </div>
      <ul class="cmdk-list" id="cmdkList" role="listbox" aria-label="Results"></ul>
      <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
    </div>`;
  document.body.appendChild(cmdkOverlay);
  cmdkInput = cmdkOverlay.querySelector(".cmdk-input");
  cmdkList = cmdkOverlay.querySelector(".cmdk-list");

  cmdkInput.addEventListener("input", ()=>{ cmdkActive = 0; cmdkRender(); });
  cmdkInput.addEventListener("keydown", (e)=>{
    if(e.isComposing) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); cmdkMove(1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); cmdkMove(-1); }
    else if(e.key === "PageDown"){ e.preventDefault(); cmdkMove(6); }
    else if(e.key === "PageUp"){ e.preventDefault(); cmdkMove(-6); }
    else if(e.key === "Tab"){ e.preventDefault(); cmdkMove(e.shiftKey ? -1 : 1); }
    else if(e.key === "Enter"){ e.preventDefault(); cmdkRun(cmdkActive); }
    else if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); closeCommandPalette(); }
  });
  cmdkOverlay.addEventListener("pointerdown", (e)=>{ if(e.target === cmdkOverlay) closeCommandPalette(); });
  cmdkOverlay.querySelector(".cmdk-close").addEventListener("click", ()=> closeCommandPalette());

  // Ctrl/Cmd + K opens and closes it from anywhere, even while typing in a field.
  document.addEventListener("keydown", (e)=>{
    if((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k"){
      e.preventDefault();
      if(cmdkIsOpen()) closeCommandPalette(); else openCommandPalette();
    }
  }, true);
}
