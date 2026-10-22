"use strict";

function applySeedInto(targetState){
  const seed = seedState();
  targetState.icons = seed.icons.map(raw => createItem(raw.type, raw)).filter(Boolean);
  targetState.theme = seed.theme;
  targetState.wallpaper = seed.wallpaper;
  targetState.searchEngine = seed.searchEngine;
  targetState.iconScale = seed.iconScale;
  targetState.builtinAppsSeeded = seed.builtinAppsSeeded;
  targetState.defaultThemeMigrated = seed.defaultThemeMigrated;
  targetState.verdantDefaultMigrated = seed.verdantDefaultMigrated;
  targetState.chromeLocked = seed.chromeLocked;
  targetState.showLogo = seed.showLogo;
  targetState.showSearchBar = seed.showSearchBar;
  targetState.customLogo = seed.customLogo;
  targetState.customWallpaperImage = seed.customWallpaperImage;
  targetState.wallpaperFit = seed.wallpaperFit;
  targetState.myWallpapers = seed.myWallpapers;
  targetState.wallpaperShow = seed.wallpaperShow;
  targetState.timeFormat = seed.timeFormat;
  targetState.dateFormat = seed.dateFormat;
  targetState.timeZone = seed.timeZone;
}


// One-time migration: guarantee Calculator + Todo are on the webtop even
// for pre-existing saved state (from before these apps existed). Runs
// once — after that, deleting one is a real, respected choice rather than
// getting re-added on every reload.
function ensureBuiltinApps(){
  if(state.builtinAppsSeeded) return;
  const existingAppIds = new Set(state.icons.filter(i=>i.type==="app").map(i=>i.appId));
  const wanted = [
    { appId:"calculator", label:"Calculator", color: COLORS[5] },
    { appId:"todo", label:"Todo", color: COLORS[2] }
  ];
  wanted.forEach(w=>{
    if(!existingAppIds.has(w.appId)){
      const slot = nextFreeSlot(null);
      state.icons.push(createItem("app", { appId:w.appId, label:w.label, color:w.color, x:slot.x, y:slot.y, parentId:null }));
    }
  });
  state.builtinAppsSeeded = true;
  // No save() here — loadAndInit() does a single save() after all
  // migrations run, so this and ensureDefaultTheme() never race each
  // other with overlapping async writes against a still-stale snapshot.
}


// One-time: add Notes to the webtop (new and existing users). Deleting it
// afterwards is respected.
function ensureNotesApp(){
  if(state.notesAppSeeded) return;
  if(!state.icons.some(i=> i.type === "app" && i.appId === "notes")){
    const slot = nextFreeSlot(null);
    state.icons.push(createItem("app", { appId:"notes", label:"Notes", color: COLORS[3], x:slot.x, y:slot.y, parentId:null }));
  }
  state.notesAppSeeded = true;
}


function ensureCloudApp(){
  // Cloud Backup lives in the top bar now; drop any webtop icon left from earlier versions.
  state.icons = state.icons.filter(i=> !(i.type === "app" && i.appId === "cloud"));
}


// One-time default-theme migration: daylight is now the app default.
// Existing saved sessions get switched once; after that, an explicit
// theme choice (including switching back to noctis) always sticks.
function ensureDefaultTheme(){
  if(state.defaultThemeMigrated) return;
  state.theme = "daylight";
  state.defaultThemeMigrated = true;
}


// One-time default-theme migration #2: verdant is now the app default
// (previously daylight). Uses its own flag rather than reusing
// defaultThemeMigrated above, so this runs exactly once more for every
// session regardless of whether the daylight migration already fired —
// after it runs, an explicit theme choice always sticks, same as above.
function ensureVerdantDefault(){
  if(state.verdantDefaultMigrated) return;
  state.theme = "verdant";
  state.verdantDefaultMigrated = true;
}


// Async bootstrap: open the store, migrate the old single-blob format in
// if this is the first run under the new architecture (or seed fresh if
// there's nothing at all), then run the same built-in-app / theme
// migrations as before. Everything that depends on state.icons being
// populated (render, applyAppearance) waits on this promise before running.
async function loadAndInit(){
  await Store.init();
  const [existingItems, existingPrefs] = await Promise.all([Store.getAllItems(), Store.getAllPrefs()]);

  if(existingItems.length === 0 && existingPrefs.length === 0){
    // Nothing in the new store yet. This data (seeded or migrated) has
    // never actually been written anywhere — persistedSnapshot stays
    // empty here on purpose, so the save() below correctly treats every
    // item as new and writes all of it.
    let legacyRaw = null;
    try{ legacyRaw = localStorage.getItem(STORAGE_KEY); }catch(e){}
    if(legacyRaw){
      try{
        const legacy = JSON.parse(legacyRaw);
        state.icons = (legacy.icons || []).map(raw => createItem(raw.type, raw)).filter(Boolean);
        state.theme = legacy.theme || "daylight";
        state.wallpaper = legacy.wallpaper || "dots";
        state.searchEngine = legacy.searchEngine || "google";
        state.builtinAppsSeeded = !!legacy.builtinAppsSeeded;
        state.defaultThemeMigrated = !!legacy.defaultThemeMigrated;
        state.verdantDefaultMigrated = !!legacy.verdantDefaultMigrated;
        state.chromeLocked = legacy.chromeLocked !== undefined ? !!legacy.chromeLocked : true;
        state.showLogo = legacy.showLogo !== undefined ? !!legacy.showLogo : true;
        state.showSearchBar = legacy.showSearchBar !== undefined ? !!legacy.showSearchBar : true;
        state.customLogo = legacy.customLogo || null;
        state.customWallpaperImage = legacy.customWallpaperImage || null;
        state.wallpaperFit = legacy.wallpaperFit || "fill";
        state.timeFormat = legacy.timeFormat || "auto";
        state.dateFormat = legacy.dateFormat || "weekday-short";
        state.timeZone = legacy.timeZone || null;
      }catch(e){
        console.warn("on369: legacy state migration failed, reseeding", e);
        applySeedInto(state);
      }
    }else{
      applySeedInto(state);
    }
  }else{
    // This data came FROM storage — it's already persisted, so snapshot
    // it immediately. Anything ensureBuiltinApps()/ensureDefaultTheme()
    // add on top of this will correctly show up as new in save().
    state.icons = existingItems.map(raw => createItem(raw.type, raw)).filter(Boolean);
    state.icons.forEach(item=> persistedSnapshot.set(item.id, snapshotBody(item)));
    const prefsMap = {};
    existingPrefs.forEach(p=> prefsMap[p.key] = p.value);
    if("theme" in prefsMap) state.theme = prefsMap.theme;
    if("wallpaper" in prefsMap) state.wallpaper = prefsMap.wallpaper;
    if("searchEngine" in prefsMap) state.searchEngine = prefsMap.searchEngine;
    if("iconScale" in prefsMap && typeof prefsMap.iconScale === "number") state.iconScale = prefsMap.iconScale;
    state.builtinAppsSeeded = !!prefsMap.builtinAppsSeeded;
    state.notesAppSeeded = !!prefsMap.notesAppSeeded;
    state.cloudAppSeeded = !!prefsMap.cloudAppSeeded;
    state.defaultThemeMigrated = !!prefsMap.defaultThemeMigrated;
    state.verdantDefaultMigrated = !!prefsMap.verdantDefaultMigrated;
    state.chromeLocked = "chromeLocked" in prefsMap ? !!prefsMap.chromeLocked : true;
    state.showLogo = "showLogo" in prefsMap ? !!prefsMap.showLogo : true;
    state.showSearchBar = "showSearchBar" in prefsMap ? !!prefsMap.showSearchBar : true;
    state.customLogo = prefsMap.customLogo || null;
    state.customWallpaperImage = prefsMap.customWallpaperImage || null;
    state.wallpaperFit = prefsMap.wallpaperFit || "fill";
    state.myWallpapers = Array.isArray(prefsMap.myWallpapers) ? prefsMap.myWallpapers : [];
    state.wallpaperShow = { on:false, minutes:15, source:"all", shuffle:false, last:0, ...(prefsMap.wallpaperShow || {}) };
    state.timeFormat = prefsMap.timeFormat || "auto";
    state.dateFormat = prefsMap.dateFormat || "weekday-short";
    state.timeZone = "timeZone" in prefsMap ? prefsMap.timeZone : null;
  }

  if(!ENGINES[state.searchEngine]) state.searchEngine = "google";

  ensureBuiltinApps();
  ensureNotesApp();
  ensureCloudApp();
  ensureDefaultTheme();
  ensureVerdantDefault();
  await save(); // writes whatever save() finds new/changed against persistedSnapshot above
}

