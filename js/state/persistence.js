"use strict";

const TAB_ID = Math.random().toString(36).slice(2);

// The settings written with every change. (Large pictures are saved separately, see saveImagePrefs.)
function prefEntries(){
  return [
    { key:"theme", value: state.theme },
    { key:"wallpaper", value: state.wallpaper },
    { key:"searchEngine", value: state.searchEngine },
    { key:"iconScale", value: state.iconScale },
    { key:"builtinAppsSeeded", value: state.builtinAppsSeeded },
    { key:"notesAppSeeded", value: state.notesAppSeeded },
    { key:"cloudAppSeeded", value: state.cloudAppSeeded },
    { key:"defaultThemeMigrated", value: state.defaultThemeMigrated },
    { key:"verdantDefaultMigrated", value: state.verdantDefaultMigrated },
    { key:"chromeLocked", value: state.chromeLocked },
    { key:"showLogo", value: state.showLogo },
    { key:"showSearchBar", value: state.showSearchBar },
    { key:"wallpaperFit", value: state.wallpaperFit },
    { key:"wallpaperShow", value: state.wallpaperShow },
    { key:"userNote", value: state.userNote },
    { key:"clipboardUrlFill", value: state.clipboardUrlFill },
    { key:"webtops", value: state.webtops },
    { key:"activeWebtop", value: state.activeWebtop },
    { key:"boardPresets", value: state.boardPresets },
    { key:"timeFormat", value: state.timeFormat },
    { key:"dateFormat", value: state.dateFormat },
    { key:"timeZone", value: state.timeZone }
  ];
}

/* ---------- safety net: an emergency copy kept in localStorage ----------
   Writing to localStorage is synchronous, so it survives a tab closing a moment after a
   change, and a database that is unavailable or slow. At startup, if this copy is newer than
   what the database holds, the missing changes are put back (see loadAndInit). */
let lastPrefSig = null, lastAttemptSig = null, lastAttemptT = 0, committedSig = null, loadedAtT = 0, lastCommitT = 0;
let retryTimer = null, retryStep = 0, staleMarked = false;
const stateSig = ()=> state.icons.map(snapshotBody).join("|") + "#" + JSON.stringify(prefEntries());
function writeShadowNow(t){ return Store.writeShadow({ v:1, savedAt:t, items: state.icons, prefs: prefEntries() }); }
// Starts a save attempt: refreshes the emergency copy only when something changed since the last attempt.
function beginAttempt(){
  const sig = stateSig();
  if(sig !== lastAttemptSig){ lastAttemptSig = sig; lastAttemptT = Date.now(); writeShadowNow(lastAttemptT); }
  return lastAttemptT;
}
function markLoaded(){ committedSig = stateSig(); loadedAtT = Date.now(); }

async function persistPrefs(t){
  const entries = prefEntries(), sig = JSON.stringify(entries);
  if(sig === lastPrefSig) return false;                      // none of the settings changed: nothing to write
  await Store.putPrefs(entries);
  lastPrefSig = sig; return true;
}

// Separate from persistPrefs() on purpose: customLogo/customWallpaperImage/myWallpapers are
// pictures that can run to hundreds of KB, so they are only written when one of them changes.
async function saveImagePrefs(){
  try{
    await Store.putPrefs([
      { key:"customLogo", value: state.customLogo },
      { key:"customWallpaperImage", value: state.customWallpaperImage },
      { key:"myWallpapers", value: state.myWallpapers }
    ]);
  }catch(e){
    console.warn("on369: image preference save failed", e);
    showAppBanner("img", "Couldn't save that picture. Your browser's storage may be full.", [], 9000);
  }
}

function saveFailed(e){
  console.warn("on369: save failed, will retry", e);
  const delay = [3000, 10000, 30000, 60000][Math.min(retryStep++, 3)];
  showAppBanner("save", "Your latest changes haven't been saved yet. Retrying\u2026", [{ label:"Retry now", keep:true, fn: ()=>{ clearTimeout(retryTimer); retryTimer = null; save(); } }]);
  clearTimeout(retryTimer); retryTimer = setTimeout(()=>{ retryTimer = null; save(); }, delay);
}
function saveSucceeded(){ retryStep = 0; clearTimeout(retryTimer); retryTimer = null; hideAppBanner("save"); }

// Fire-and-forget from every call site (save(); with no await): the in-memory state is
// already correct, so drawing never waits on storage. A failure is never swallowed: it is
// reported, and the same changes are retried (the diff below is recomputed each time).
async function saveNow(){
  if(window.__on369Wiping || Store.isBlocked()) return;
  const t = beginAttempt();
  const currentIds = new Set(), toPut = [];
  state.icons.forEach(item=>{
    currentIds.add(item.id);
    if(persistedSnapshot.get(item.id) !== snapshotBody(item)){ item.modifiedAt = Date.now(); toPut.push(item); }
  });
  const toDeleteIds = [];
  persistedSnapshot.forEach((_, id)=>{ if(!currentIds.has(id)) toDeleteIds.push(id); });
  try{
    if(toPut.length) await Store.putItems(toPut);
    if(toDeleteIds.length) await Store.deleteItems(toDeleteIds);
    const prefsWritten = await persistPrefs(t);
    if(toPut.length || toDeleteIds.length || prefsWritten){
      await Store.putPrefs([{ key:"savedAt", value:t }]);
      Store.markHasData(); lastCommitT = t; committedSig = stateSig();
      try{ localStorage.setItem("on369.pulse", JSON.stringify({ tab: TAB_ID, t })); }catch(_){}    // lets other open tabs know this one changed
    }
    toPut.forEach(item=> persistedSnapshot.set(item.id, snapshotBody(item)));
    toDeleteIds.forEach(id=> persistedSnapshot.delete(id));
    saveSucceeded();
  }catch(e){ saveFailed(e); }
}

// Every save() queues behind the previous one, so the snapshot diff always
// runs against fully-written state instead of racing an in-flight write.
let saveChain = Promise.resolve();
function save(){
  webtopSync();
  undoCapture();
  saveChain = saveChain.then(saveNow, saveNow).then(cloudSchedule);
  return saveChain;
}

/* Runs once at startup (see main.js). */
function initStatePersistence(){
  // Changes still waiting to be written when the tab is hidden or closing: refresh the emergency copy right now.
  const flush = ()=>{ if(!Store.isBlocked()) beginAttempt(); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden){ flush(); if(!Store.isBlocked()) save(); }
    else if(staleMarked && stateSig() === committedSig) location.reload();     // another tab changed things and this tab has nothing of its own to lose
  });
  // Another tab saved after this one loaded: this tab's picture is out of date, and saving from it would overwrite the newer data.
  window.addEventListener("storage", (e)=>{
    if(e.key !== "on369.pulse" || !e.newValue) return;
    let p; try{ p = JSON.parse(e.newValue); }catch(_){ return; }
    if(!p || p.tab === TAB_ID || p.t <= Math.max(loadedAtT, lastCommitT) || staleMarked) return;
    staleMarked = true; Store.block("stale");
    showAppBanner("stale", "This webtop was changed in another tab. Reload to see the latest. Until you do, this tab won't save, so it can't overwrite the newer changes.", [{ label:"Reload", keep:true, fn: ()=> location.reload() }]);
    if(!document.hidden || stateSig() !== committedSig) return;
    location.reload();
  });
}
