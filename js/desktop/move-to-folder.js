"use strict";

/* ============ MOVE TO FOLDER ============
   A direct, one-step alternative to Cut + navigate + Paste: pick any
   folder (or the desktop root) from a single list and relocate the
   current selection there immediately. */
function listFoldersTree(parentId, depth, out){
  childrenOf(parentId).filter(i=>i.type==="folder").sort((a,b)=> a.label.localeCompare(b.label)).forEach(f=>{
    out.push({ folder:f, depth });
    listFoldersTree(f.id, depth+1, out);
  });
  return out;
}


function moveSelectionTo(targetParentId){
  const items = Array.from(selected).map(id=> state.icons.find(i=>i.id===id)).filter(Boolean);
  const validItems = items.filter(item=> !wouldCreateCycle(item, targetParentId));
  if(validItems.length === 0) return;
  const resultingIds = [];
  validItems.forEach(item=>{
    const slot = nextFreeSlot(targetParentId);
    item.parentId = targetParentId;
    item.x = slot.x; item.y = slot.y;
    resultingIds.push(item.id);
  });
  selected = new Set(resultingIds);
  save();
  render();
}


const movePickerOverlay = document.getElementById("movePickerOverlay");

const movePickerList = document.getElementById("movePickerList");

function openMovePicker(){
  const items = Array.from(selected).map(id=> state.icons.find(i=>i.id===id)).filter(Boolean);
  if(items.length === 0) return;

  document.getElementById("movePickerTitle").textContent = items.length > 1 ? `Move ${items.length} items` : `Move "${items[0].label}"`;

  const rows = [{ label:"Desktop", depth:0, id:null, icon:"desktop" }]
    .concat(listFoldersTree(null, 0, []).map(t=>({ label:t.folder.label, depth:t.depth+1, id:t.folder.id, icon:"folder" })))
    .concat(state.icons.filter(i=> i.type === "widget").map(w=>({ label:"Widget: " + w.label, depth:1, id:w.id, icon:"grid" })))
    .filter(row => items.every(item => !wouldCreateCycle(item, row.id)));

  movePickerList.innerHTML = "";
  if(rows.length === 0){
    movePickerList.innerHTML = `<div class="move-empty">No other location to move this to.</div>`;
  }
  rows.forEach(row=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "move-row";
    btn.style.paddingLeft = (10 + row.depth*18) + "px";
    btn.innerHTML = `<span class="ctx-icon">${menuIcon(row.icon)}</span><span>${escapeHtml(row.label)}</span>`;
    btn.addEventListener("click", ()=>{ moveSelectionTo(row.id); closeMovePicker(); });
    movePickerList.appendChild(btn);
  });

  movePickerOverlay.classList.add("open");
}

function closeMovePicker(){ movePickerOverlay.classList.remove("open"); }

/* Runs once at startup (see main.js), in the original order. */
function initDesktopMoveToFolder(){
  document.getElementById("movePickerCancel").addEventListener("click", closeMovePicker);
  movePickerOverlay.addEventListener("mousedown", (e)=>{ if(e.target===movePickerOverlay) closeMovePicker(); });

}
