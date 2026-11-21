"use strict";

/* ============ ADD / EDIT MODAL ============ */
const itemOverlay = document.getElementById("itemOverlay");

const itemLabel = document.getElementById("itemLabel");

const itemUrl = document.getElementById("itemUrl");

const urlField = document.getElementById("urlField");

const colorPicks = document.getElementById("colorPicks");

let modalCtx = null;

let modalColor = COLORS[0];

let modalIcon = null;          // null = automatic icon, or { kind:"emoji"|"image", value } the person chose
const ICON_EMOJI_CHOICES = ["\u{1F3E0}","\u{1F4C1}","\u2B50","\u{1F4BC}","\u{1F3B5}","\u{1F3AE}","\u{1F4FA}","\u{1F6D2}","\u{1F4F0}","\u{1F4E7}","\u{1F4C5}","\u{1F4AC}","\u{1F4F7}","\u{1F393}","\u{1F4A1}","\u{1F527}","\u{1F4BB}","\u{1F4DA}","\u{1F3E6}","\u2708\uFE0F","\u{1F373}","\u2764\uFE0F","\u{1F512}","\u{1F30D}"];

// First few characters the person typed, counted as whole emoji/characters (not UTF-16 halves).
function clipIconEmoji(text){
  text = (text || "").trim();
  let parts;
  try{ parts = Array.from(new Intl.Segmenter(undefined, { granularity:"grapheme" }).segment(text), x=> x.segment); }
  catch(e){ parts = Array.from(text); }
  return parts.slice(0, 3).join("");
}

// Shrinks and crops a chosen picture to a small square, so it stays light in storage and backups.
function imageFileToIconDataURL(file){
  return new Promise((resolve, reject)=>{
    if(!file || !/^image\//i.test(file.type)){ reject(new Error("That file is not an image.")); return; }
    if(file.size > 8 * 1024 * 1024){ reject(new Error("That image is larger than 8 MB.")); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = ()=>{
      try{
        const size = 128, c = document.createElement("canvas"); c.width = c.height = size;
        const g = c.getContext("2d"), side = Math.min(img.naturalWidth, img.naturalHeight) || size;
        const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        let out = c.toDataURL("image/png");
        if(out.length > 120000) out = c.toDataURL("image/jpeg", 0.86);   // photos: JPEG is far smaller
        resolve(out);
      }catch(e){ reject(e); }
      finally{ URL.revokeObjectURL(url); }
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("That image could not be read.")); };
    img.src = url;
  });
}

function syncIconUI(){
  const kind = modalIcon ? modalIcon.kind : "auto";
  document.querySelectorAll("#iconKindSeg button").forEach(b=> b.classList.toggle("active", b.dataset.kind === kind));
  document.getElementById("iconEmojiRow").hidden = kind !== "emoji";
  document.getElementById("iconImageRow").hidden = kind !== "image";
  const prev = document.getElementById("iconPreview");
  prev.innerHTML = "";
  if(modalIcon && modalIcon.kind === "image" && /^data:image\//i.test(modalIcon.value)){
    const im = document.createElement("img"); im.src = modalIcon.value; im.alt = ""; prev.appendChild(im);
  }else if(modalIcon && modalIcon.kind === "emoji" && modalIcon.value){
    const sp = document.createElement("span"); sp.textContent = modalIcon.value; prev.appendChild(sp);
  }else{
    const sp = document.createElement("span"); sp.className = "auto"; sp.textContent = "Auto"; prev.appendChild(sp);
  }
}


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
    modalIcon = null;
  }else{
    title.textContent = "Edit bookmark";
    itemLabel.value = ctx.item.label;
    itemUrl.value = ctx.item.url || "";
    itemLabel.placeholder = "e.g. GitHub";
    modalColor = ctx.item.color;
    urlField.style.display = "block";
    const had = ctx.item.metadata && ctx.item.metadata.customIcon;
    modalIcon = had && had.value ? { kind: had.kind, value: had.value } : null;
  }
  document.getElementById("iconEmojiInput").value = modalIcon && modalIcon.kind === "emoji" ? modalIcon.value : "";
  document.getElementById("iconFileHint").textContent = "";
  syncIconUI();
  colorPicks.querySelectorAll(".colorpick").forEach(d=>d.classList.toggle("active", d.dataset.color===modalColor));
  if(ctx.prefill){ itemLabel.value = ctx.prefill.label || ""; itemUrl.value = ctx.prefill.url || ""; }   // e.g. a link shared to on369
  itemOverlay.classList.add("open");
  setTimeout(()=> itemLabel.focus(), 30);
  if(ctx.prefill) showClipHint("Shared to on369");
  else if(ctx.mode === "create" && ctx.type !== "folder") autofillUrlFromClipboard(ctx);
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

  // ---- icon choice (Automatic / Emoji / Image) ----
  const emojiInput = document.getElementById("iconEmojiInput"), emojiGrid = document.getElementById("emojiGrid"), fileHint = document.getElementById("iconFileHint");
  ICON_EMOJI_CHOICES.forEach(em=>{
    const b = document.createElement("button"); b.type = "button"; b.textContent = em; b.setAttribute("aria-label", "Use " + em);
    b.addEventListener("click", ()=>{ emojiInput.value = em; modalIcon = { kind:"emoji", value: em }; syncIconUI(); });
    emojiGrid.appendChild(b);
  });
  document.querySelectorAll("#iconKindSeg button").forEach(b=> b.addEventListener("click", ()=>{
    const k = b.dataset.kind;
    if(k === "auto") modalIcon = null;
    else if(k === "emoji"){ const v = clipIconEmoji(emojiInput.value); modalIcon = v ? { kind:"emoji", value: v } : { kind:"emoji", value:"" }; setTimeout(()=> emojiInput.focus(), 0); }
    else if(k === "image"){ if(!(modalIcon && modalIcon.kind === "image")) modalIcon = { kind:"image", value:"" }; }
    syncIconUI();
  }));
  emojiInput.addEventListener("input", ()=>{
    const v = clipIconEmoji(emojiInput.value);
    modalIcon = { kind:"emoji", value: v };
    syncIconUI();
  });
  document.getElementById("iconFile").addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if(!f) return;
    fileHint.textContent = "Preparing…";
    try{ modalIcon = { kind:"image", value: await imageFileToIconDataURL(f) }; fileHint.textContent = f.name; }
    catch(err){ fileHint.textContent = err && err.message ? err.message : "Could not use that image."; }
    syncIconUI();
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
        metadata: Object.assign(autoLabel ? { autoLabel:true } : {}, (modalIcon && modalIcon.value) ? { customIcon: modalIcon } : {})
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
      modalCtx.item.metadata = modalCtx.item.metadata || {};
      if(modalIcon && modalIcon.value) modalCtx.item.metadata.customIcon = modalIcon;
      else delete modalCtx.item.metadata.customIcon;
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
      { label:"Web app", icon:"globe", action: ()=> openWebAppPicker({ parentId }) },
      { label:"Utility apps", icon:"grid", hint:"Calculator, Todo\u2026", action: ()=> openAppPicker(parentId) }
    ];
    if(onWebtop) items.push({ label:"Widget", icon:"grid", submenu: [
      { label:"Shelf (group icons)", icon:"grid", action: ()=> openWidgetSettings(addWidget(wx, wy, []), window.innerWidth - 260, 120) },
      { label:"Clock", icon:"clock", action: ()=> openClockSettings(addClockWidget(wx, wy), window.innerWidth - 260, 120) },
      { label:"Calendar", icon:"calendar", action: ()=> openClockSettings(addCalendarWidget(wx, wy), window.innerWidth - 260, 120) },
      { label:"Most used", icon:"star", hint:"Auto-filled", action: ()=> openRecentsSettings(addRecentsWidget(wx, wy), window.innerWidth - 260, 120) },
      { label:"Board (presets)\u2026", icon:"grid", action: ()=> openBoardPresetPicker({ title:"Add a board", onPick: (p)=> startAddBoard(p) }) }
    ] });
    items.push("sep", { label:"Import bookmarks\u2026", icon:"import", action: ()=> triggerBookmarkImport(parentId) });
    if(clipboard && clipboard.itemIds.length) items.push({ label: clipboard.mode === "copy" ? "Paste" : "Paste (move here)", icon:"paste", action: ()=> pasteClipboard(parentId) });
    items.push("sep", { label:"Command palette…", icon:"search", hint:"Ctrl+K", action: ()=> openCommandPalette() });
    const r = fab.getBoundingClientRect();
    buildMenu(items, Math.max(8, r.right - 210), Math.max(8, r.top - (items.length * 34 + 30) - 8));
  };
  fab.addEventListener("click", (e)=>{ e.stopPropagation(); openAddMenu(); });
  fab.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openAddMenu(); } });

}
