"use strict";

/* ============ ICON EVENTS (drag, click, dblclick, rename) ============ */
let dragState = null;


// Is the dragged icon's current center point over another icon that's a
// folder? Uses the SAME style.left/top coordinate space the drag already
// tracks (both the dragged element's and candidates') rather than
// getBoundingClientRect/offsetWidth, which depend on real browser layout.
function containerFor(parentId){
  if(parentId === null) return gridLayer;
  if(widgetById(parentId)) return gridLayer.querySelector(`.widget[data-id="${parentId}"] .widget-body`) || gridLayer;
  return folderBody;
}

function handleWidgetDrop(item, parentId, ev){
  if(parentId !== null && !widgetById(parentId)) return false;
  const el = document.elementsFromPoint(ev.clientX, ev.clientY).find(n=> n.classList && n.classList.contains("widget"));
  const target = el ? el.dataset.id : null;
  if(target === parentId) return false;
  const ids = selected.has(item.id) && selected.size > 1 ? Array.from(selected) : [item.id];
  const cell = getCellSize(), off = getGridOffset(null), gr = gridLayer.getBoundingClientRect();
  ids.forEach(id=>{
    const it = state.icons.find(i=> i.id === id);
    if(!it || it.type === "widget" || (target && wouldCreateCycle(it, target))) return;
    const slot = target ? nextFreeSlot(target)
      : nearestFreeSlot(null, Math.max(0, Math.round((ev.clientX - gr.left - cell.w/2 - off.left) / cell.w)), Math.max(0, Math.round((ev.clientY - gr.top - cell.h/2 - off.top) / cell.h)), it.id);
    it.parentId = target; it.x = slot.x; it.y = slot.y;
  });
  return true;
}

function findFolderDropTarget(draggedEl, draggedItemId, container){
  const cell = getCellSize();
  const dl = parseFloat(draggedEl.style.left), dt = parseFloat(draggedEl.style.top);
  const dcx = dl + cell.w/2, dcy = dt + cell.h/2;
  let best = null;
  container.querySelectorAll(".icon").forEach(candEl=>{
    if(candEl === draggedEl) return;
    const id = candEl.dataset.id;
    if(id === draggedItemId) return;
    const candItem = state.icons.find(i=>i.id===id);
    if(!candItem || candItem.type !== "folder") return;
    const l = parseFloat(candEl.style.left), t = parseFloat(candEl.style.top);
    if(dcx >= l && dcx <= l+cell.w && dcy >= t && dcy <= t+cell.h){
      best = candEl;
    }
  });
  return best;
}


function wireIconEvents(el, item, parentId){
  let downX, downY, moved=false, startLeft, startTop;

  el.addEventListener("focus", ()=>{ focusedIconId = item.id; });

  el.addEventListener("pointerdown", (e)=>{
    if(e.pointerType === "mouse" && e.button !== 0) return;
    if(e.target.isContentEditable) return;
    e.stopPropagation();
    const pointerType = e.pointerType || "mouse";
    const pointerId = e.pointerId;
    downX = e.clientX; downY = e.clientY; moved = false;
    startLeft = parseFloat(el.style.left);
    startTop = parseFloat(el.style.top);
    try{ el.setPointerCapture(pointerId); }catch(err){}
    el.focus({ preventScroll: true });

    if(multiSelectMode){
      if(selected.has(item.id)) selected.delete(item.id); else selected.add(item.id);
      updateSelectionClasses();
    } else if(!e.shiftKey && !selected.has(item.id)){
      selected = new Set([item.id]);
      updateSelectionClasses();
    } else if(e.shiftKey){
      if(selected.has(item.id)) selected.delete(item.id); else selected.add(item.id);
      updateSelectionClasses();
    }

    dragState = { item, el, parentId, offsetX: downX-startLeft, offsetY: downY-startTop };

    function onMove(ev){
      if(ev.pointerId !== pointerId) return;
      if(ev.pointerType === "mouse" && ev.buttons === 0){ onUp(ev); return; } // button was released somewhere we never heard about
      const dx = ev.clientX - downX, dy = ev.clientY - downY;
      if(Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if(!moved) return;
      ev.preventDefault();
      el.classList.add("dragging");
      el.style.left = (startLeft + dx) + "px";
      el.style.top = (startTop + dy) + "px";

      const container = containerFor(parentId);
      const target = findFolderDropTarget(el, item.id, container);
      container.querySelectorAll(".icon.drop-target").forEach(o=>{ if(o!==target) o.classList.remove("drop-target"); });
      if(target) target.classList.add("drop-target");
    }
    function onUp(ev){
      if(ev.pointerId !== pointerId) return;
      try{ el.releasePointerCapture(pointerId); }catch(err){}
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      el.classList.remove("dragging");
      const container = containerFor(parentId);
      const dropTargetEl = container.querySelector(".icon.drop-target");
      if(dropTargetEl) dropTargetEl.classList.remove("drop-target");

      if(moved){
        const dropFolderId = dropTargetEl ? dropTargetEl.dataset.id : null;
        if(dropFolderId && !wouldCreateCycle(item, dropFolderId)){
          // Move into the folder. If the dragged icon was part of a
          // multi-selection, bring the whole selection along with it.
          const idsToMove = selected.has(item.id) && selected.size > 1 ? Array.from(selected) : [item.id];
          idsToMove.forEach(id=>{
            const it = state.icons.find(i=>i.id===id);
            if(!it || it.id === dropFolderId || wouldCreateCycle(it, dropFolderId)) return;
            const slot = nextFreeSlot(dropFolderId);
            it.parentId = dropFolderId;
            it.x = slot.x; it.y = slot.y;
          });
        }else if(handleWidgetDrop(item, parentId, ev)){
          // moved between desktop and a widget
        }else{
          const left = parseFloat(el.style.left), top = parseFloat(el.style.top);
          const cell = getCellSize();
          const offset = getGridOffset(parentId);
          const gx = Math.min(Math.max(0, Math.round((left - offset.left) / cell.w)), maxColsFor(parentId) - 1);
          const gy = Math.max(0, Math.round((top - offset.top) / cell.h));
          const multi = selected.has(item.id) && selected.size > 1;
          const occupant = multi ? null : childrenOf(parentId).find(i=> i.id !== item.id && i.x === gx && i.y === gy);
          if(occupant){            // dropped on another icon: trade places instead of bouncing somewhere else
            occupant.x = item.x; occupant.y = item.y;
            item.x = gx; item.y = gy;
          }else{
            const slot = nearestFreeSlot(parentId, gx, gy, item.id);
            item.x = slot.x; item.y = slot.y;
          }
        }
        save();
        render();
      } else if((pointerType === "touch" || pointerType === "pen") && !multiSelectMode){
        // Touch/stylus: a tap that didn't drag opens the item directly.
        openItem(item);
      }
      setTimeout(()=>{ moved = false; }, 0);
    }
    document.addEventListener("pointermove", onMove, {passive:false});
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  });

  // Desktop/mouse: double-click opens. Touch opens on single tap (handled above).
  el.addEventListener("dblclick", (e)=>{
    if(e.target.classList.contains("icon-label")) return;
    openItem(item);
  });

  const label = el.querySelector(".icon-label");
  label.addEventListener("dblclick", (e)=>{
    e.stopPropagation();
    startRename(label, item);
  });

  el.addEventListener("contextmenu", (e)=>{
    e.preventDefault(); e.stopPropagation();
    if(!selected.has(item.id)) selectOnly(item.id);
    showIconContextMenu(e.clientX, e.clientY, item, parentId);
  });
}


function startRename(label, item){
  label.contentEditable = "true";
  label.classList.add("editing");
  const range = document.createRange();
  range.selectNodeContents(label);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range);
  label.focus();

  function commit(){
    label.contentEditable = "false";
    const text = label.textContent.trim() || "Untitled";
    item.label = text;
    save();
    render();
  }
  label.addEventListener("blur", commit, {once:true});
  label.addEventListener("keydown", function ke(e){
    e.stopPropagation(); // this input owns its own keystrokes; nothing above (grid arrow-key nav, open-on-Enter/Space) should see them while editing
    if(e.key === "Enter"){ e.preventDefault(); label.blur(); }
    if(e.key === "Escape"){ label.textContent = item.label; label.blur(); }
  });
}


const folderBackBtn = document.getElementById("folderBack");

function updateFolderBackButton(){
  folderBackBtn.style.display = folderStack.length > 0 ? "" : "none";
}


function openItem(item){
  if(item.type === "folder"){
    if(currentFolderId !== null) folderStack.push(currentFolderId); // drilling deeper from an already-open folder
    currentFolderId = item.id;
    folderTitle.innerHTML = `${folderSVG(item.color)} ${escapeHtml(item.label)}`;
    folderOverlay.classList.add("open");
    updateFolderBackButton();
    render();
  }else if(item.type === "app"){
    AppManager.launch(item.appId, { title: item.label, color: item.color });
  }else if(/^https?:\/\//i.test(item.url || "")){
    window.open(item.url, "_blank", "noopener");
  }
}


/* Runs once at startup (see main.js), in the original order. */
function initDesktopIconEvents(){
  // Browsers start a native drag when you drag an <img> or selected text. That
  // cancels our pointer events mid-gesture, so the icon never gets "dropped"
  // and snaps back on the next redraw. Block it for everything on the desktop.
  document.addEventListener("dragstart", (e)=>{
    if(e.target && e.target.closest && e.target.closest(".icon, .widget")) e.preventDefault();
  }, true);

  folderBackBtn.addEventListener("click", ()=>{
    if(folderStack.length === 0) return;
    currentFolderId = folderStack.pop();
    const item = state.icons.find(i=>i.id===currentFolderId);
    if(item) folderTitle.innerHTML = `${folderSVG(item.color)} ${escapeHtml(item.label)}`;
    updateFolderBackButton();
    render();
  });

  document.getElementById("folderClose").addEventListener("click", ()=>{
    folderOverlay.classList.remove("open");
    currentFolderId = null;
    folderStack = [];
  });
  folderOverlay.addEventListener("mousedown", (e)=>{
    if(e.target === folderOverlay){ folderOverlay.classList.remove("open"); currentFolderId = null; folderStack = []; }
  });

}
