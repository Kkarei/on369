"use strict";

/* ============ ADD / EDIT MODAL ============ */
const itemOverlay = document.getElementById("itemOverlay");

const itemLabel = document.getElementById("itemLabel");

const itemUrl = document.getElementById("itemUrl");

const urlField = document.getElementById("urlField");

const colorPicks = document.getElementById("colorPicks");

let modalCtx = null;

let modalColor = COLORS[0];


function openItemModal(ctx){
  modalCtx = ctx;
  const title = document.getElementById("itemModalTitle");
  if(ctx.mode === "create"){
    title.textContent = ctx.type === "folder" ? "New folder" : ctx.type === "webapp" ? "Add web app" : "New bookmark";
    itemLabel.value = "";
    itemUrl.value = "";
    itemLabel.placeholder = ctx.type === "webapp" ? "Leave blank to auto-detect" : "e.g. GitHub";
    modalColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    urlField.style.display = ctx.type === "folder" ? "none" : "block";
  }else{
    title.textContent = "Edit bookmark";
    itemLabel.value = ctx.item.label;
    itemUrl.value = ctx.item.url || "";
    itemLabel.placeholder = "e.g. GitHub";
    modalColor = ctx.item.color;
    urlField.style.display = "block";
  }
  colorPicks.querySelectorAll(".colorpick").forEach(d=>d.classList.toggle("active", d.dataset.color===modalColor));
  itemOverlay.classList.add("open");
  setTimeout(()=> itemLabel.focus(), 30);
  if(ctx.mode === "create" && ctx.type !== "folder") autofillUrlFromClipboard(ctx);
  else showClipHint("");
}

function closeItemModal(){ itemOverlay.classList.remove("open"); modalCtx = null; }


/* Runs once at startup (see main.js), in the original order. */
function initUiModals(){
  COLORS.forEach(c=>{
    const dot = document.createElement("div");
    dot.className = "colorpick";
    dot.style.background = c;
    dot.dataset.color = c;
    dot.addEventListener("click", ()=>{
      modalColor = c;
      colorPicks.querySelectorAll(".colorpick").forEach(d=>d.classList.toggle("active", d.dataset.color===c));
    });
    colorPicks.appendChild(dot);
  });

  document.getElementById("itemCancel").addEventListener("click", closeItemModal);
  itemOverlay.addEventListener("mousedown", (e)=>{ if(e.target === itemOverlay) closeItemModal(); });

  document.getElementById("itemSave").addEventListener("click", ()=>{
    if(!modalCtx) return;
    let label = itemLabel.value.trim();
    const isUrlType = modalCtx.mode === "create" ? (modalCtx.type === "bookmark" || modalCtx.type === "webapp") : modalCtx.item.type !== "folder";
    let url = itemUrl.value.trim();

    if(modalCtx.mode === "create"){
      if(isUrlType){
        if(!url){ itemUrl.focus(); return; }
        if(!/^https?:\/\//i.test(url)) url = "https://" + url;
      }
      let autoLabel = false;
      if(isUrlType && !label){
        label = domainLabel(url);
        autoLabel = true;
      }
      if(!label){ itemLabel.focus(); return; }
      const slot = nextFreeSlot(modalCtx.parentId);
      const newItem = createItem(modalCtx.type, {
        label,
        url: isUrlType ? url : undefined,
        color: modalColor, x: slot.x, y: slot.y, parentId: modalCtx.parentId,
        metadata: autoLabel ? { autoLabel:true } : {}
      });
      state.icons.push(newItem);
      if(modalCtx.type === "webapp") tryEnrichWebApp(newItem);
    }else{
      if(!label){ itemLabel.focus(); return; }
      modalCtx.item.label = label;
      if(modalCtx.item.type === "bookmark" || modalCtx.item.type === "webapp"){
        if(!/^https?:\/\//i.test(url)) url = "https://" + url;
        modalCtx.item.url = url;
      }
      modalCtx.item.color = modalColor;
    }
    save();
    closeItemModal();
    render();
  });

  /* ============ FAB ============ */
  const fab = document.getElementById("fab");
  const openAddMenu = ()=>{
    const parentId = currentFolderId, onWebtop = parentId === null;
    const n = state.icons.filter(i=> i.type === "widget").length, wx = 60 + (n % 8) * 26, wy = 130 + (n % 8) * 26;   // stagger new widgets so they don't stack exactly
    const items = [
      { label:"Bookmark", icon:"bookmark", action: ()=> openItemModal({ mode:"create", type:"bookmark", parentId }) },
      { label:"Folder", icon:"folder", action: ()=> openItemModal({ mode:"create", type:"folder", parentId }) },
      { label:"Web app (from a website)", icon:"globe", action: ()=> openItemModal({ mode:"create", type:"webapp", parentId }) },
      { label:"Native app\u2026", icon:"grid", hint:"Calculator, Todo\u2026", action: ()=> openAppPicker(parentId) }
    ];
    if(onWebtop) items.push({ label:"Widget", icon:"grid", submenu: [
      { label:"Shelf (group icons)", icon:"grid", action: ()=> openWidgetSettings(addWidget(wx, wy, []), window.innerWidth - 260, 120) },
      { label:"Clock", icon:"clock", action: ()=> openClockSettings(addClockWidget(wx, wy), window.innerWidth - 260, 120) },
      { label:"Calendar", icon:"calendar", action: ()=> openClockSettings(addCalendarWidget(wx, wy), window.innerWidth - 260, 120) },
      { label:"Board (presets)\u2026", icon:"grid", action: ()=> openBoardPresetPicker({ title:"Add a board", onPick: (p)=> startAddBoard(p) }) }
    ] });
    items.push("sep", { label:"Import bookmarks\u2026", icon:"import", action: ()=> triggerBookmarkImport(parentId) });
    if(clipboard && clipboard.itemIds.length) items.push({ label: clipboard.mode === "copy" ? "Paste" : "Paste (move here)", icon:"paste", action: ()=> pasteClipboard(parentId) });
    const r = fab.getBoundingClientRect();
    buildMenu(items, Math.max(8, r.right - 210), Math.max(8, r.top - (items.length * 34 + 30) - 8));
  };
  fab.addEventListener("click", (e)=>{ e.stopPropagation(); openAddMenu(); });
  fab.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openAddMenu(); } });

}
