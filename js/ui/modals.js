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
  document.getElementById("fab").addEventListener("click", ()=>{
    openItemModal({ mode:"create", type:"bookmark", parentId: currentFolderId });
  });

}
