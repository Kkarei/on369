"use strict";

/* ============ INIT ============ */
let resizeTimer = null;

/* Runs once at startup (see main.js), in the original order. */
function initMain(){
  let finished = false;
  const showApp = ()=>{
    applyAppearance(); applyChromeVisibility(); applyHideIcons(); applyIconScale(); applyUserNote(); updateClipFillToggle(); renderWebtopTabs(); tickClock(); render();
    const shared = takeSharedLink();     // a link shared to on369 (or ?url=...): offer to add it
    if(sess && sess.needsResolve) AppManager.launch("cloud", { title:"Cloud Backup", color: COLORS[1] });
    else if(!state.gettingStartedDismissed && !shared) AppManager.launch("getting-started", { title:"Getting Started", color: COLORS[1] });
    cloudBaseline(); undoReset();
    if(shared && !(sess && sess.needsResolve)) openSharedLink(shared);
  };
  // Loading can be slow on a cold start. Say so, and never guess: nothing is written until it really finishes.
  const slow = setTimeout(()=>{ if(!finished) showAppBanner("loading", "Still loading your data\u2026 your changes will be saved once it finishes."); }, 5000);
  loadAndInit().then(()=>{
    finished = true; clearTimeout(slow); hideAppBanner("loading"); showApp();
  }, (err)=>{
    finished = true; clearTimeout(slow); hideAppBanner("loading");
    console.error("on369: loading your data failed. Saving is switched off so nothing is overwritten.", err);
    Store.block("failed"); if(state.icons.length === 0) applySeedInto(state);
    showApp(); showStorageProblem();
  });

  window.addEventListener("resize", ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{ applyIconScale(); render(); fitWindowsToViewport(); }, 120);
  });

}

/* Boot: run every module's startup code in order. */
initUiAppearance();
initUiWallpapers();
initUiClockCalendar();
initUiGlyphs();
initWebtopMoveToFolder();
initWebtopIconEvents();
initWebtopDelete();
initWebtopRubberBand();
initWebtopContextMenus();
initWebtopClockWidgets();
initStateUndo();
initUiPopups();
initUiUserNote();
initServicesClipboardUrl();
initStatePersistence();
initWebtopWebtops();
initUiModals();
initUiCommandPalette();
initWindowsWindowManager();
initUiAppPicker();
initServicesBookmarkImport();
initAppsCalculator();
initAppsNotes();
initAppsTodo();
initAppsClock();
initAppsCalendar();
initAppsGettingStarted();
initUiSearchBar();
initUiTouchLongPress();
initServicesCloudBackup();
initServicesFileBackup();
initMain();
