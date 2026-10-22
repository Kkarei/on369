"use strict";

/* ============ DELETE ============ */
// Expands a set of directly-selected ids to include every descendant of
// any selected folder, so the confirmation prompt and the eventual
// delete both operate on the true, full set — not just what was clicked.
function computeDeleteSet(ids){
  const toDelete = new Set(ids);
  let changed = true;
  while(changed){
    changed = false;
    state.icons.forEach(i=>{
      if(toDelete.has(i.parentId) && !toDelete.has(i.id)){ toDelete.add(i.id); changed = true; }
    });
  }
  return toDelete;
}


function performDelete(ids){
  const toDelete = computeDeleteSet(ids);
  state.icons = state.icons.filter(i => !toDelete.has(i.id));
  selected.clear();
  save();
  render();
}


let pendingDeleteIds = null;

const deleteConfirmOverlay = document.getElementById("deleteConfirmOverlay");

const deleteConfirmTitle = document.getElementById("deleteConfirmTitle");

const deleteConfirmBody = document.getElementById("deleteConfirmBody");


function requestDeleteConfirm(ids){
  const items = ids.map(id=> state.icons.find(i=>i.id===id)).filter(Boolean);
  if(items.length === 0) return;
  const toDelete = computeDeleteSet(ids);
  pendingDeleteIds = ids;

  if(items.length === 1){
    const item = items[0];
    const extra = toDelete.size - 1;
    deleteConfirmTitle.textContent = `Delete "${item.label}"?`;
    deleteConfirmBody.textContent = (item.type === "folder" && extra > 0)
      ? `This will also delete everything inside it — ${extra} item${extra===1?"":"s"}. This can't be undone.`
      : `This can't be undone.`;
  }else{
    const extra = toDelete.size - items.length;
    deleteConfirmTitle.textContent = `Delete ${items.length} items?`;
    deleteConfirmBody.textContent = (extra > 0)
      ? `${toDelete.size} items will be deleted in total, including the contents of any selected folders. This can't be undone.`
      : `This can't be undone.`;
  }
  deleteConfirmOverlay.classList.add("open");
}


function closeDeleteConfirm(){
  deleteConfirmOverlay.classList.remove("open");
  pendingDeleteIds = null;
}


function deleteSelected(){
  if(selected.size === 0) return;
  requestDeleteConfirm(Array.from(selected));
}


/* Runs once at startup (see main.js), in the original order. */
function initWebtopDelete(){
  document.getElementById("deleteConfirmCancel").addEventListener("click", closeDeleteConfirm);
  document.getElementById("deleteConfirmConfirm").addEventListener("click", ()=>{
    const ids = pendingDeleteIds;
    closeDeleteConfirm();
    if(ids) performDelete(ids);
  });
  deleteConfirmOverlay.addEventListener("mousedown", (e)=>{ if(e.target===deleteConfirmOverlay) closeDeleteConfirm(); });

  document.addEventListener("keydown", (e)=>{
    const ae = document.activeElement;
    const typing = ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA");
    if(typing) return;
    if((e.key === "Delete" || e.key === "Backspace") && selected.size > 0){
      e.preventDefault();
      deleteSelected();
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selected.size > 0){
      e.preventDefault();
      copySelection();
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x" && selected.size > 0){
      e.preventDefault();
      cutSelection();
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && clipboard){
      e.preventDefault();
      pasteClipboard(currentFolderId);
    }
    if(multiSelectMode && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "a"){
      e.preventDefault();
      selectAllInContext(currentFolderId);
    }
    if(multiSelectMode && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a"){
      e.preventDefault();
      deselectAll();
    }
    if(multiSelectMode && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i"){
      e.preventDefault();
      invertSelectionInContext(currentFolderId);
    }
    if(e.key === "Escape"){
      closeCtxMenu();
      if(itemOverlay.classList.contains("open")) closeItemModal();
      if(appPickerOverlay.classList.contains("open")) closeAppPicker();
      if(deleteConfirmOverlay.classList.contains("open")) closeDeleteConfirm();
      if(movePickerOverlay.classList.contains("open")) closeMovePicker();
      if(resetConfirmOverlay.classList.contains("open")) closeResetConfirm();
      document.getElementById("settingsPop").classList.remove("open");
      document.getElementById("calendarPop").classList.remove("open");
      if(folderOverlay.classList.contains("open")){ folderOverlay.classList.remove("open"); currentFolderId=null; folderStack=[]; }
      multiSelectMode = false;
      clearSelection();
    }
  });

  // Generic keyboard-activation bridge: any role="button" element (settings
  // gear, search-go, FAB, folder close, etc.) responds to Enter/Space the
  // same way a native button element would. Icons and context-menu items manage
  // their own Enter/Space handling already, so they're excluded here to
  // avoid double-firing.
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter" && e.key !== " ") return;
    const t = e.target;
    if(!t || t.getAttribute("role") !== "button") return;
    if(t.classList.contains("icon") || t.classList.contains("ctx-item")) return;
    e.preventDefault();
    t.click();
  });

}
