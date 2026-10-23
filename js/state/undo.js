"use strict";

/* ============ UNDO ============
   Every save() notices when the icons, folders or widgets differ from the last
   saved version and keeps that earlier version. Undo puts the newest one back.
   (Themes, wallpapers and app data such as notes are not part of this.) */
const UNDO_LIMIT = 30;
const undoStack = [];
let undoBaseline = null, undoApplying = false;

function undoReset(){ undoStack.length = 0; undoBaseline = JSON.stringify(state.icons); }
function undoCapture(){
  if(undoApplying || undoBaseline === null) return;
  const now = JSON.stringify(state.icons);
  if(now === undoBaseline) return;
  undoStack.push(undoBaseline);
  if(undoStack.length > UNDO_LIMIT) undoStack.shift();
  undoBaseline = now;
}
const canUndo = ()=> undoStack.length > 0;
function undoLast(){
  if(!canUndo()) return false;
  const prev = undoStack.pop();
  undoApplying = true;
  state.icons = JSON.parse(prev).map(o=> createItem(o.type, o)).filter(Boolean);
  undoBaseline = prev;
  selected.clear(); selectionAnchor = null;
  if(currentFolderId && !state.icons.some(i=> i.id === currentFolderId)){          // the open folder no longer exists
    folderOverlay.classList.remove("open"); currentFolderId = null; folderStack = [];
  }else folderStack = folderStack.filter(id=> state.icons.some(i=> i.id === id));
  undoApplying = false;
  save(); render();
  statusEl.textContent = "Undid the last change";
  return true;
}
const undoMenuItem = ()=> ({ label:"Undo", icon:"undo", hint:"Ctrl+Z", disabled: !canUndo(), action: ()=> undoLast() });

/* Runs once at startup (see main.js). */
function initStateUndo(){
  document.addEventListener("keydown", (e)=>{
    if(!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
    const t = e.target;
    if(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;   // let text fields undo their own typing
    if(undoLast()) e.preventDefault();
  });
}
