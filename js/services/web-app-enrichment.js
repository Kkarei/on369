"use strict";

/* ============ WEB APP ENRICHMENT (best-effort manifest detection) ============
   There's no browser API that lets a page enumerate installed PWAs — that's
   a real, permanent limitation (privacy/security, not an oversight). What IS
   achievable: given a URL, try to fetch its web app manifest directly and
   pull the real name/icon/theme color from it. This works for sites that
   serve a permissive CORS header on their manifest; it silently does
   nothing otherwise, leaving the favicon-chain icon already in place. */
async function tryEnrichWebApp(item){
  let origin;
  try{ origin = new URL(item.url).origin; }catch(e){ return; }
  const candidates = ["/manifest.json", "/manifest.webmanifest", "/site.webmanifest"];
  for(const path of candidates){
    const manifestUrl = origin + path;
    try{
      const res = await fetch(manifestUrl, { mode:"cors" });
      if(!res.ok) continue;
      const manifest = await res.json();
      const current = state.icons.find(i=>i.id===item.id);
      if(!current) return; // item was deleted before this resolved

      const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
      let bestIcon = null, bestSize = -1;
      icons.forEach(ic=>{
        const sizeStr = (ic.sizes || "").split(" ")[0] || "";
        const size = parseInt(sizeStr.split("x")[0], 10) || 0;
        if(size > bestSize && size <= 512){ bestSize = size; bestIcon = ic; }
      });
      if(!bestIcon && icons.length > 0) bestIcon = icons[0];
      if(bestIcon && bestIcon.src){
        try{ current.manifestIcon = new URL(bestIcon.src, manifestUrl).href; }catch(e){}
      }
      if((manifest.short_name || manifest.name) && current.metadata && current.metadata.autoLabel){
        current.label = manifest.short_name || manifest.name;
      }
      if(manifest.theme_color){ current.themeColor = manifest.theme_color; }

      save();
      render();
      return; // first manifest that actually resolves wins
    }catch(e){
      // CORS block, 404, invalid JSON, network failure — try the next path
    }
  }
}


// Roving tabindex: exactly one icon per container is a Tab stop at a time
// (the last one that had keyboard/pointer focus); all others are tabindex=-1
// so Tab moves in and out of the grid in one step instead of one-per-icon.
let focusedIconId = null;

function getRovingId(items){
  if(items.length === 0) return null;
  if(focusedIconId && items.some(i=>i.id===focusedIconId)) return focusedIconId;
  return items[0].id;
}


function nearestInDirection(items, current, dir){
  const candidates = items.filter(i=>i.id!==current.id);
  let pool;
  if(dir==="right") pool = candidates.filter(i=>i.y===current.y && i.x>current.x).sort((a,b)=>a.x-b.x);
  else if(dir==="left") pool = candidates.filter(i=>i.y===current.y && i.x<current.x).sort((a,b)=>b.x-a.x);
  else if(dir==="down") pool = candidates.filter(i=>i.x===current.x && i.y>current.y).sort((a,b)=>a.y-b.y);
  else if(dir==="up") pool = candidates.filter(i=>i.x===current.x && i.y<current.y).sort((a,b)=>b.y-a.y);
  if(pool && pool.length) return pool[0].id;

  // No exact same row/column — fall back to nearest icon generally in that direction.
  let general = candidates.filter(i=>{
    if(dir==="right") return i.x>current.x;
    if(dir==="left") return i.x<current.x;
    if(dir==="down") return i.y>current.y;
    if(dir==="up") return i.y<current.y;
    return false;
  });
  if(general.length===0) return null;
  general.sort((a,b)=>
    (Math.abs(a.x-current.x)+Math.abs(a.y-current.y)) - (Math.abs(b.x-current.x)+Math.abs(b.y-current.y))
  );
  return general[0].id;
}


function handleIconGridKeydown(e, parentId){
  if(e.target.isContentEditable) return; // renaming a label — let its own keydown handler (Enter/Escape) own this keystroke
  const el = e.target.closest(".icon");
  if(!el) return;
  const items = childrenOf(parentId);
  const current = items.find(i=>i.id===el.dataset.id);
  if(!current) return;

  const dirMap = { ArrowRight:"right", ArrowLeft:"left", ArrowDown:"down", ArrowUp:"up" };
  if(dirMap[e.key]){
    e.preventDefault();
    const nextId = nearestInDirection(items, current, dirMap[e.key]);
    if(!nextId) return;
    const container = containerFor(parentId);
    const nextEl = container.querySelector(`.icon[data-id="${nextId}"]`);
    if(nextEl){
      el.tabIndex = -1;
      nextEl.tabIndex = 0;
      focusedIconId = nextId;
      nextEl.focus();
    }
  }else if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    const item = state.icons.find(i=>i.id===current.id);
    if(item) openItem(item);
  }
}

