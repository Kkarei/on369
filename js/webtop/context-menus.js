"use strict";

/* ============ CONTEXT MENUS ============ */
let activeSubmenu = null;

let activeSubmenuTrigger = null;


function closeSubmenu(){
  if(activeSubmenu){ activeSubmenu.remove(); activeSubmenu = null; }
  if(activeSubmenuTrigger){ activeSubmenuTrigger.setAttribute("aria-expanded", "false"); activeSubmenuTrigger = null; }
}

function closeCtxMenu(){
  closeSubmenu();
  if(activeCtxMenu){ activeCtxMenu.remove(); activeCtxMenu = null; }
}

// Builds one menu level (either the top-level menu or a submenu flyout)
// as a detached element — positioning and insertion happen in the two
// call sites below, since a submenu is measured before it's placed.
function buildMenuEl(items){
  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.setAttribute("role", "menu");
  items.forEach(it=>{
    if(it === "sep"){
      const s = document.createElement("div");
      s.className = "ctx-sep";
      s.setAttribute("role", "separator");
      menu.appendChild(s);
      return;
    }
    const row = document.createElement("div");
    row.className = "ctx-item" + (it.danger ? " danger" : "") + (it.disabled ? " disabled" : "");
    if(it.disabled) row.setAttribute("aria-disabled", "true");
    row.setAttribute("role", "menuitem");
    row.tabIndex = -1;
    const iconHTML = it.icon ? `<span class="ctx-icon">${menuIcon(it.icon)}</span>` : "";
    const trailing = it.submenu
      ? `<span class="ctx-chevron">${menuIcon("chevron")}</span>`
      : (it.hint ? `<span class="ctx-hint">${it.hint}</span>` : "");
    row.innerHTML = `<span class="ctx-main">${iconHTML}<span>${it.label}</span></span>${trailing}`;
    if(it.submenu){
      row.setAttribute("aria-haspopup", "true");
      row.setAttribute("aria-expanded", "false");
      row.addEventListener("click", (e)=>{ e.stopPropagation(); openSubmenu(row, it.submenu); });
    }else{
      row.addEventListener("click", ()=>{ if(it.disabled) return; closeCtxMenu(); it.action(); });
    }
    menu.appendChild(row);
  });
  // Scoped to this level's own rows (direct children) so an open submenu's
  // keyboard nav doesn't also get intercepted by the parent menu's
  // identical listener further up the (bubbling) DOM chain.
  menu.addEventListener("keydown", (e)=>{
    const rows = Array.from(menu.children).filter(el => el.getAttribute && el.getAttribute("role") === "menuitem");
    const i = rows.indexOf(document.activeElement);
    if(e.key === "ArrowDown"){ e.preventDefault(); e.stopPropagation(); (rows[i+1] || rows[0]).focus(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); e.stopPropagation(); (rows[i-1] || rows[rows.length-1]).focus(); }
    else if(e.key === "Home"){ e.preventDefault(); e.stopPropagation(); rows[0].focus(); }
    else if(e.key === "End"){ e.preventDefault(); e.stopPropagation(); rows[rows.length-1].focus(); }
    else if(e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); document.activeElement.click(); }
  });
  return menu;
}


// Submenus are appended to <body> (a sibling of the main menu, not a
// descendant) rather than nested inside the trigger row — buildMenu's
// .ctx-menu uses backdrop-filter, which in some browsers establishes a
// containing block for fixed-position descendants and would throw off
// viewport-relative left/top math. Keeping it a body-level sibling avoids
// that entirely; closeCtxMenu()/the outside-click handler above track it
// explicitly instead of relying on DOM nesting for cleanup.
function openSubmenu(triggerRow, items){
  if(activeSubmenuTrigger === triggerRow){ closeSubmenu(); return; }
  closeSubmenu();
  const sub = buildMenuEl(items);
  sub.style.visibility = "hidden";
  document.body.appendChild(sub);
  const r = triggerRow.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = sub.offsetWidth, sh = sub.offsetHeight;
  const left = (r.right + sw <= vw - 8) ? r.right - 2 : Math.max(8, r.left - sw + 2);
  const top = Math.min(Math.max(8, r.top - 6), vh - sh - 8);
  sub.style.left = left + "px";
  sub.style.top = top + "px";
  sub.style.visibility = "";
  activeSubmenu = sub;
  activeSubmenuTrigger = triggerRow;
  triggerRow.setAttribute("aria-expanded", "true");
  const firstRow = sub.querySelector('[role="menuitem"]');
  if(firstRow) firstRow.focus();
}


function buildMenu(items, x, y){
  closeCtxMenu();
  const menu = buildMenuEl(items);
  document.body.appendChild(menu);
  const vw = window.innerWidth, vh = window.innerHeight;
  const mw = 200, mh = items.length * 34 + 20;
  menu.style.left = Math.min(x, vw-mw-8) + "px";
  menu.style.top = Math.min(y, vh-mh-8) + "px";
  activeCtxMenu = menu;
  const firstRow = menu.querySelector('[role="menuitem"]');
  if(firstRow) firstRow.focus();
}


function showCanvasContextMenu(x, y, parentId){
  const items = [
    undoMenuItem(), "sep",
    { label:"View", icon:"view", submenu: [
      { label:"Larger icons", icon:"zoomIn", action: ()=> setIconScale(state.iconScale + 0.1) },
      { label:"Smaller icons", icon:"zoomOut", action: ()=> setIconScale(state.iconScale - 0.1) },
      { label:"Reset icon size", icon:"reset", action: ()=> setIconScale(1) }
    ] },
    { label:"Sort by", icon:"sort", submenu: [
      { label:"Name", icon:"sort", action: ()=> sortChildren(parentId, "name") },
      { label:"Date modified", icon:"clock", action: ()=> sortChildren(parentId, "modified") },
      { label:"Type", icon:"tag", action: ()=> sortChildren(parentId, "type") }
    ] },
    { label:"Refresh", icon:"refresh", action: ()=> refreshWebtop(parentId) }
  ];
  items.push("sep");
  items.push({ label: multiSelectMode ? "Exit multi-select" : "Select multiple", icon:"check", action: toggleMultiSelect });
  if(multiSelectMode){
    items.push({ label:"Select all", icon:"check", hint:"Ctrl+A", action: ()=> selectAllInContext(parentId) });
    items.push({ label:"Deselect all", icon:"checkEmpty", hint:"Ctrl+Shift+A", action: deselectAll });
    items.push({ label:"Invert selection", icon:"invert", hint:"Ctrl+I", action: ()=> invertSelectionInContext(parentId) });
  }
  items.push("sep");
  if(clipboard && clipboard.itemIds.length > 0){
    items.push({ label: clipboard.mode==="copy" ? "Paste" : "Paste (move here)", icon:"paste", hint:"Ctrl+V", action: ()=> pasteClipboard(parentId) });
    items.push("sep");
  }
  if(parentId === null){
    const gr = gridLayer.getBoundingClientRect(), wx = x - gr.left, wy = y - gr.top;
    items.push({ label:"Add widget", icon:"grid", submenu: [
      { label:"Shelf (group icons)", icon:"grid", action: ()=> openWidgetSettings(addWidget(wx, wy, []), x, y) },
      { label:"Clock", icon:"clock", action: ()=> openClockSettings(addClockWidget(wx, wy), x, y) },
      { label:"Calendar", icon:"calendar", action: ()=> openClockSettings(addCalendarWidget(wx, wy), x, y) },
      { label:"Board (presets)\u2026", icon:"grid", action: ()=> openBoardPresetPicker({ title:"Add a board", onPick: (p)=> addBoardWidget(wx, wy, p) }) }
    ] });
  }
  items.push({ label:"New folder", icon:"folder", action: ()=> openItemModal({mode:"create", type:"folder", parentId}) });
  items.push({ label:"New bookmark", icon:"bookmark", action: ()=> openItemModal({mode:"create", type:"bookmark", parentId}) });
  items.push({ label:"New app", icon:"grid", action: ()=> openAppPicker(parentId) });
  items.push({ label:"Add web app…", icon:"globe", hint:"by URL", action: ()=> openItemModal({mode:"create", type:"webapp", parentId}) });
  items.push("sep");
  items.push({ label:"Import bookmarks…", icon:"import", action: ()=> triggerBookmarkImport(parentId) });
  items.push({ label:"Export bookmarks…", icon:"export", action: exportBookmarks });
  items.push("sep");
  items.push({ label:"Arrange to grid", icon:"arrange", action: ()=> arrangeGrid(parentId) });
  buildMenu(items, x, y);
}


function showIconContextMenu(x, y, item, parentId){
  const opts = [
    undoMenuItem(), "sep",
    { label: item.type==="folder" ? "Open folder" : "Open link", icon: item.type==="folder" ? "folder" : "openLink", action: ()=> openItem(item) },
    { label:"Rename", icon:"rename", hint:"dbl-click", action: ()=>{
        const el = containerFor(parentId).querySelector(`.icon-label[data-id="${item.id}"]`);
        if(el) startRename(el, item);
      } },
  ];
  if(item.type === "bookmark"){
    opts.push({ label:"Edit URL", icon:"editUrl", action: ()=> openItemModal({mode:"edit", item}) });
  }
  opts.push("sep");
  if(parentId === null){
    opts.push({ label:"Group into a shelf", icon:"grid", action: ()=>{
      const c = getCellSize(), o = getGridOffset(null);
      const w = addWidget(item.x*c.w + o.left - 8, item.y*c.h + o.top - 40, Array.from(selected));
      openWidgetSettings(w, x, y);
    } });
  }
  if(parentId === null){ const mv = moveToWebtopMenuItem(selected.has(item.id) ? Array.from(selected) : [item.id]); if(mv) opts.push(mv); }
  opts.push({ label: selected.size>1 ? `Copy ${selected.size} items` : "Copy", icon:"copy", hint:"Ctrl+C", action: copySelection });
  opts.push({ label: selected.size>1 ? `Move ${selected.size} items…` : "Move to…", icon:"move", action: openMovePicker });
  opts.push({ label: selected.size>1 ? `Cut ${selected.size} items` : "Cut", icon:"cut", hint:"Ctrl+X", action: cutSelection });
  if(item.type === "folder" && clipboard && clipboard.itemIds.length > 0 && !clipboard.itemIds.includes(item.id)){
    opts.push({ label: clipboard.mode==="copy" ? "Paste into folder" : "Move into folder", icon:"paste", action: ()=> pasteClipboard(item.id) });
  }
  opts.push("sep");
  opts.push({ label: selected.size>1 ? `Delete ${selected.size} items` : "Delete", icon:"delete", danger:true, hint:"Del", action: deleteSelected });
  buildMenu(opts, x, y);
}


const SORT_TYPE_ORDER = { folder:0, app:1, bookmark:2, webapp:3 };

function sortChildren(parentId, mode){
  const items = childrenOf(parentId);
  if(mode === "modified"){
    items.sort((a,b)=> (b.modifiedAt||0) - (a.modifiedAt||0) || a.label.localeCompare(b.label));
  }else if(mode === "type"){
    items.sort((a,b)=> ((SORT_TYPE_ORDER[a.type]??9) - (SORT_TYPE_ORDER[b.type]??9)) || a.label.localeCompare(b.label));
  }else{
    items.sort((a,b)=> a.label.localeCompare(b.label));
  }
  const cell = getCellSize();
  let x=0, y=0, cols = Math.max(1, Math.floor((window.innerWidth-48)/cell.w));
  items.forEach((it)=>{
    it.x = x; it.y = y;
    x++; if(x>=cols){ x=0; y++; }
  });
  save(); render();
}

function arrangeGrid(parentId){ sortChildren(parentId); }


// Re-rendering rebuilds every icon element from scratch, including the
// favicon <img> tags and their onerror fallback chains — so this doubles
// as a genuine retry for any icon whose favicon/manifest fetch failed
// earlier, not just a cosmetic no-op.
function refreshWebtop(parentId){
  render();
  const layer = parentId === null ? gridLayer : folderBody;
  layer.classList.remove("refresh-pulse");
  void layer.offsetWidth; // restart the animation if Refresh is clicked again quickly
  layer.classList.add("refresh-pulse");
  setTimeout(()=> layer.classList.remove("refresh-pulse"), 500);
}


/* Runs once at startup (see main.js), in the original order. */
function initWebtopContextMenus(){
  document.addEventListener("click", (e)=>{
    const inMenu = activeCtxMenu && activeCtxMenu.contains(e.target);
    const inSubmenu = activeSubmenu && activeSubmenu.contains(e.target);
    if(activeCtxMenu && !inMenu && !inSubmenu) closeCtxMenu();
  });

  gridLayer.addEventListener("contextmenu", (e)=>{
    if(e.target.closest(".icon, .widget")) return;
    e.preventDefault();
    showCanvasContextMenu(e.clientX, e.clientY, null);
  });
  folderBody.addEventListener("contextmenu", (e)=>{
    if(e.target.closest(".icon")) return;
    e.preventDefault();
    showCanvasContextMenu(e.clientX, e.clientY, currentFolderId);
  });
  gridLayer.addEventListener("keydown", (e)=> handleIconGridKeydown(e, null));
  folderBody.addEventListener("keydown", (e)=> handleIconGridKeydown(e, currentFolderId));

}
