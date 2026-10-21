"use strict";

async function persistPrefs(){
  try{
    await Store.putPrefs([
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
      { key:"timeFormat", value: state.timeFormat },
      { key:"dateFormat", value: state.dateFormat },
      { key:"timeZone", value: state.timeZone }
    ]);
  }catch(e){ console.warn("on369: preference save failed", e); }
}


// Separate from persistPrefs() on purpose: customLogo/customWallpaperImage
// are data URLs that can run tens to hundreds of KB. persistPrefs() runs
// on every save() (any icon add/edit/move), so bundling large, usually-
// unchanged blobs into that call would mean rewriting them to storage on
// every unrelated edit. This is only called when one of them actually
// changes (upload, change, or reset).
async function saveImagePrefs(){
  try{
    await Store.putPrefs([
      { key:"customLogo", value: state.customLogo },
      { key:"customWallpaperImage", value: state.customWallpaperImage }
    ]);
  }catch(e){ console.warn("on369: image preference save failed", e); }
}


// Fire-and-forget from every existing call site (save(); with no await) —
// the in-memory state is already correct by the time this runs, so
// rendering never waits on persistence. Errors are caught internally.
async function saveNow(){
  if(window.__on369Wiping) return;
  const currentIds = new Set();
  const toPut = [];
  state.icons.forEach(item=>{
    currentIds.add(item.id);
    const body = snapshotBody(item);
    if(persistedSnapshot.get(item.id) !== body){
      item.modifiedAt = Date.now();
      toPut.push(item);
    }
  });
  const toDeleteIds = [];
  persistedSnapshot.forEach((_, id)=>{ if(!currentIds.has(id)) toDeleteIds.push(id); });

  try{
    if(toPut.length) await Store.putItems(toPut);
    if(toDeleteIds.length) await Store.deleteItems(toDeleteIds);
    toPut.forEach(item=> persistedSnapshot.set(item.id, snapshotBody(item)));
    toDeleteIds.forEach(id=> persistedSnapshot.delete(id));
  }catch(e){
    console.warn("on369: item save failed", e);
  }
  await persistPrefs();
}


// Every save() queues behind the previous one, so the snapshot diff always
// runs against fully-written state instead of racing an in-flight write.
let saveChain = Promise.resolve();

function save(){
  saveChain = saveChain.then(saveNow, saveNow).then(cloudSchedule);
  return saveChain;
}

