"use strict";

/* ============ INIT ============ */
const initTimeout = new Promise((_, reject)=>{
  setTimeout(()=> reject(new Error("on369: initialization timed out")), 6000);
});

let resizeTimer = null;

/* Runs once at startup (see main.js), in the original order. */
function initMain(){
  Promise.race([loadAndInit(), initTimeout]).then(()=>{
    applyAppearance();
    applyChromeVisibility();
    applyIconScale();
    tickClock();
    render();
    if(sess && sess.needsResolve) AppManager.launch("cloud", { title:"Cloud Backup", color: COLORS[1] });
    cloudBaseline();
  }).catch(err=>{
    console.error("on369: initialization failed or timed out, recovering with in-memory defaults", err);
    // Last-resort recovery: whatever got this far stays (state.icons may
    // already be partially populated); anything still missing gets seeded
    // fresh, so the desktop is usable even if storage never came up.
    if(state.icons.length === 0) applySeedInto(state);
    state.icons.forEach(item=> persistedSnapshot.set(item.id, snapshotBody(item)));
    applyAppearance();
    applyChromeVisibility();
    applyIconScale();
    tickClock();
    render();
  });

  window.addEventListener("resize", ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{ applyIconScale(); render(); }, 120);
  });

}

/* Boot: run every module's startup code in order. */
initUiAppearance();
initUiWallpapers();
initUiClockCalendar();
initUiGlyphs();
initDesktopMoveToFolder();
initDesktopIconEvents();
initDesktopDelete();
initDesktopRubberBand();
initDesktopContextMenus();
initUiModals();
initWindowsWindowManager();
initUiAppPicker();
initServicesBookmarkImport();
initAppsCalculator();
initAppsNotes();
initAppsTodo();
initUiSearchBar();
initUiTouchLongPress();
initServicesCloudBackup();
initServicesFileBackup();
initMain();
