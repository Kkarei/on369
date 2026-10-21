"use strict";

/* ============ GRID PLACEMENT ============ */
function childrenOf(parentId){
  return state.icons.filter(i => i.parentId === parentId && !(parentId === null && i.type === "widget"));
}

function widgetById(id){ const w = state.icons.find(i=> i.id === id); return w && w.type === "widget" ? w : null; }


function occupied(parentId, x, y, excludeId){
  return childrenOf(parentId).some(i => i.id !== excludeId && i.x === x && i.y === y);
}


function maxColsFor(parentId){
  const cell = getCellSize();
  if(parentId === null){
    return Math.max(3, Math.floor((window.innerWidth - 48) / cell.w));
  }
  const wdg = widgetById(parentId);
  if(wdg) return Math.max(1, Math.floor((wdg.pw - 16) / cell.w));
  // Folder panel is a fixed, narrower width (max-width: 560px, minus padding).
  return Math.max(2, Math.floor(520 / cell.w));
}


function nextFreeSlot(parentId){
  const maxCols = maxColsFor(parentId);
  for(let y=0; y<500; y++){
    for(let x=0; x<maxCols; x++){
      if(!occupied(parentId, x, y, null)) return {x,y};
    }
  }
  return {x:0,y:0};
}


function nearestFreeSlot(parentId, targetX, targetY, excludeId){
  if(!occupied(parentId, targetX, targetY, excludeId)) return {x: Math.max(0,targetX), y: Math.max(0,targetY)};
  let best = null, bestDist = Infinity;
  for(let y=0; y<40; y++){
    for(let x=0; x<40; x++){
      if(occupied(parentId, x, y, excludeId)) continue;
      const d = Math.hypot(x-targetX, y-targetY);
      if(d < bestDist){ bestDist = d; best = {x,y}; }
    }
  }
  return best || {x:0,y:0};
}


/* ============ ACCESSIBILITY: labels + roving tabindex ============ */
function ariaLabelFor(item){
  if(item.type === "folder") return `Folder: ${item.label}`;
  if(item.type === "app" || item.type === "webapp") return `App: ${item.label}`;
  return `Bookmark: ${item.label}`;
}

