"use strict";

/* ============ SELECTION ============ */
// The icon you last plain-clicked (or Ctrl-clicked): the starting point for Shift-click ranges.
let selectionAnchor = null;

// Shift-click: select everything between the anchor and the clicked icon, in reading
// order (left to right, top to bottom) within the same folder, widget or webtop.
// With Ctrl held too, the range is added to what is already selected.
function selectRange(targetId, parentId, additive){
  const order = childrenOf(parentId).slice().sort((a, b)=> a.y - b.y || a.x - b.x).map(i=> i.id);
  const to = order.indexOf(targetId);
  if(to < 0) return;
  const from = selectionAnchor && selectionAnchor.parentId === parentId ? order.indexOf(selectionAnchor.id) : -1;
  if(from < 0){
    selectionAnchor = { id: targetId, parentId };
    selected = new Set(additive ? [...selected, targetId] : [targetId]);
  }else{
    const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
    selected = new Set(additive ? [...selected, ...range] : range);
  }
  updateSelectionClasses();
}

function clearSelection(){ selected.clear(); render(); }


function selectOnly(id){ selected = new Set([id]); render(); }


// Non-destructive selection update: toggles .selected on whatever icon
// elements already exist, without tearing any of them down and rebuilding
// — unlike render()/selectOnly(), which remove and recreate every icon
// node. Needed specifically where a selection change happens mid-gesture
// (see wireIconEvents' pointerdown): destroying the very element a drag
// is about to manipulate makes the drag continue against a detached,
// invisible clone until the next real render on release.
function updateSelectionClasses(){
  document.querySelectorAll(".icon").forEach(el=>{
    const isSel = selected.has(el.dataset.id);
    el.classList.toggle("selected", isSel);
    const check = el.querySelector(".select-check");
    if(check) check.classList.toggle("checked", isSel);
  });
  if(multiSelectMode) updateStatusBar();
}


// Single source of truth for the status bar text: what it shows depends
// on whether multi-select mode is active, not just which container is
// being rendered. Called from render() (full rebuild) and from
// updateSelectionClasses() (mid-gesture, no rebuild) so both paths agree.
function updateStatusBar(){
  if(multiSelectMode){
    statusEl.textContent = `${selected.size} selected`;
  }else{
    const n = childrenOf(null).length;
    statusEl.textContent = `${n} item${n===1?"":"s"} on webtop`;
  }
}


function toggleMultiSelect(){
  multiSelectMode = !multiSelectMode;
  if(!multiSelectMode) selected.clear();
  render();
}


function selectAllInContext(parentId){
  selected = new Set(childrenOf(parentId).map(i=>i.id));
  updateSelectionClasses();
}

function deselectAll(){
  selected.clear();
  updateSelectionClasses();
}

function invertSelectionInContext(parentId){
  const allIds = childrenOf(parentId).map(i=>i.id);
  selected = new Set(allIds.filter(id => !selected.has(id)));
  updateSelectionClasses();
}

