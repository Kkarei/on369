"use strict";

/* ============ GRID PLACEMENT ============ */
function childrenOf(parentId){
  return state.icons.filter(i => i.parentId === parentId && !(parentId === null && i.type === "widget") && (parentId !== null || inSpace(i)));
}

function widgetById(id){ const w = state.icons.find(i=> i.id === id); return w && w.type === "widget" ? w : null; }


function occupied(parentId, x, y, excludeId){
  return childrenOf(parentId).some(i => i.id !== excludeId && i.x === x && i.y === y);
}


function maxColsFor(parentId){
  const cell = getCellSize();
  if(parentId === null){
    // Same side margins getGridOffset uses (12px each on a phone, 24px otherwise, plus safe areas).
    const cs = getComputedStyle(document.documentElement);
    const safe = (parseFloat(cs.getPropertyValue("--safe-left")) || 0) + (parseFloat(cs.getPropertyValue("--safe-right")) || 0);
    const margin = (window.innerWidth <= 640 ? 24 : 48) + safe;
    return Math.max(3, Math.floor((window.innerWidth - margin) / cell.w));
  }
  const wdg = widgetById(parentId);
  if(wdg && wdg.embedded){ const c = containerFor(parentId); return Math.max(1, Math.floor(((c && c.clientWidth ? c.clientWidth : 240) - 16) / cell.w)); }
  if(wdg) return Math.max(1, Math.floor((wdg.pw - 16) / cell.w));
  // Folder panel: 560px wide at most, and never wider than 92% of the screen. Use its real width
  // once it is open (the old fixed 520px put icons past the edge on phones).
  const fbw = (typeof folderBody !== "undefined" && folderBody && folderBody.clientWidth)
    ? folderBody.clientWidth - 38
    : Math.min(520, window.innerWidth * 0.92 - 38);
  return Math.max(2, Math.floor(fbw / cell.w));
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

