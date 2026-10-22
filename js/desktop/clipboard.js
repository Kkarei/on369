"use strict";

/* ============ CLIPBOARD (copy / cut / paste) ============ */
let clipboard = null; // { mode: "copy"|"cut", itemIds: [...] } | null


function updateCutVisualState(){
  document.querySelectorAll(".icon").forEach(el=>{
    const isCut = !!(clipboard && clipboard.mode === "cut" && clipboard.itemIds.includes(el.dataset.id));
    el.classList.toggle("cut-pending", isCut);
  });
}


function copySelection(){
  if(selected.size === 0) return;
  clipboard = { mode:"copy", itemIds: Array.from(selected) };
  updateCutVisualState();
}


function cutSelection(){
  if(selected.size === 0) return;
  clipboard = { mode:"cut", itemIds: Array.from(selected) };
  updateCutVisualState();
}


// A folder can never be pasted into itself or into one of its own
// descendants — that would create an unreachable/cyclic hierarchy.
function wouldCreateCycle(item, targetParentId){
  if(item.type !== "folder" || targetParentId === null) return item.id === targetParentId;
  if(item.id === targetParentId) return true;
  let current = targetParentId;
  const visited = new Set();
  while(current !== null && current !== undefined){
    if(current === item.id) return true;
    if(visited.has(current)) break; // guards against already-corrupt data looping forever
    visited.add(current);
    const parentItem = state.icons.find(i=>i.id===current);
    if(!parentItem) break;
    current = parentItem.parentId;
  }
  return false;
}


// Recursively duplicates an item (and, for a folder, its entire
// contents) with fresh ids. Children of a freshly-cloned folder use
// simple row-major layout rather than nextFreeSlot: the new folder is
// guaranteed empty, so there's nothing to avoid colliding with yet, and
// checking occupancy against state.icons wouldn't see this clone's own
// still-being-built siblings anyway (they aren't pushed to state.icons
// until the whole recursive clone finishes).
function deepCloneItem(item, targetParentId, position){
  const newItem = createItem(item.type, {
    label: item.label,
    color: item.color,
    url: item.url,
    appId: item.appId,
    manifestIcon: item.manifestIcon,
    themeColor: item.themeColor,
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
    metadata: item.metadata ? {...item.metadata} : {},
    visible: item.visible,
    x: position.x, y: position.y,
    parentId: targetParentId
  });
  const clones = [newItem];
  if(item.type === "folder"){
    const children = childrenOf(item.id);
    const positions = layoutRowMajor(children.length, 5);
    children.forEach((child, i)=>{
      clones.push(...deepCloneItem(child, newItem.id, positions[i]));
    });
  }
  return clones;
}


function pasteClipboard(targetParentId){
  if(!clipboard || clipboard.itemIds.length === 0) return;
  const sourceItems = clipboard.itemIds.map(id=> state.icons.find(i=>i.id===id)).filter(Boolean);
  const validItems = sourceItems.filter(item=> !wouldCreateCycle(item, targetParentId));
  if(validItems.length === 0) return;

  const resultingIds = [];
  if(clipboard.mode === "copy"){
    validItems.forEach(item=>{
      const slot = nextFreeSlot(targetParentId);
      const clones = deepCloneItem(item, targetParentId, slot);
      state.icons.push(...clones);
      resultingIds.push(clones[0].id);
    });
  }else{
    validItems.forEach(item=>{
      const slot = nextFreeSlot(targetParentId);
      item.parentId = targetParentId;
      item.x = slot.x; item.y = slot.y;
      resultingIds.push(item.id);
    });
    clipboard = null; // cut is consumed after one paste, matching standard OS convention
  }
  selected = new Set(resultingIds);
  save();
  render();
  updateCutVisualState();
}

