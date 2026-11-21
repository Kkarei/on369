"use strict";

/* ============ WHAT YOU OPEN ============
   Remembers how often and how recently each icon was opened, so the command palette and the
   "Most used" shelf can put your favourites first. Kept only on this device (localStorage), not in
   your webtop data, so opening an icon never changes your saved webtop or triggers a backup. */
const USAGE_LS_KEY = "on369.usage.v1";
let usageMap = null;
let usageSaveTimer = null;
let usageStamp = 0;          // last timestamp handed out; always increases so two opens in the same millisecond still have an order

function usageLoad(){
  if(usageMap) return usageMap;
  usageMap = {};
  try{
    const raw = JSON.parse(localStorage.getItem(USAGE_LS_KEY) || "{}");
    if(raw && typeof raw === "object") Object.keys(raw).forEach(id=>{
      const u = raw[id];
      if(u && Number.isFinite(u.n) && Number.isFinite(u.last)){ usageMap[id] = { n: u.n, last: u.last }; usageStamp = Math.max(usageStamp, u.last); }
    });
  }catch(e){ console.warn("on369: usage history not loaded", e); }
  return usageMap;
}
function usageSave(){
  clearTimeout(usageSaveTimer);
  usageSaveTimer = setTimeout(()=>{
    try{
      const live = new Set(state.icons.map(i=> i.id));
      Object.keys(usageMap).forEach(id=>{ if(!live.has(id)) delete usageMap[id]; });   // forget icons that no longer exist
      localStorage.setItem(USAGE_LS_KEY, JSON.stringify(usageMap));
    }catch(e){}
  }, 400);
}

// Called whenever an icon is opened (see openItem).
function recordOpen(item){
  if(!item || item.type === "widget") return;
  const m = usageLoad(), u = m[item.id] || { n: 0, last: 0 };
  usageStamp = Math.max(Date.now(), usageStamp + 1);
  u.n++; u.last = usageStamp; m[item.id] = u;
  usageSave();
  if(typeof refreshRecentsWidgets === "function") refreshRecentsWidgets();
}
const usageOf = (id)=> usageLoad()[id] || null;

// Icons you have opened, best first. mode "frequent" = most opened, "recent" = most recently opened.
function usageRanked(mode, limit, includeFolders){
  const m = usageLoad(), out = [];
  state.icons.forEach(it=>{
    if(it.type === "widget" || (it.type === "folder" && !includeFolders)) return;
    const u = m[it.id]; if(u) out.push({ item: it, n: u.n, last: u.last });
  });
  out.sort(mode === "recent" ? (a, b)=> b.last - a.last : (a, b)=> (b.n - a.n) || (b.last - a.last));
  return limit ? out.slice(0, limit) : out;
}
