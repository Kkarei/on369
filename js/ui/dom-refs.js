"use strict";

/* ============ DOM REFS ============ */
const gridLayer = document.getElementById("gridLayer");

const webtop = document.getElementById("webtop");

const rubberband = document.getElementById("rubberband");

const emptyHint = document.getElementById("emptyHint");

const statusEl = document.getElementById("status");

const folderOverlay = document.getElementById("folderOverlay");

const folderBody = document.getElementById("folderBody");

const folderTitle = document.getElementById("folderTitle");

const windowLayer = document.getElementById("windowLayer");

const taskbar = document.getElementById("taskbar");


// Combines the responsive breakpoint's base icon size with the user's
// zoom preference, writing fully-resolved pixel values. Deliberately NOT
// done via CSS calc(--base * var(--icon-scale)) on the --cell-w custom
// property itself: unlike calc() on a standard property (which always
// resolves to a computed pixel value), calc() chains through nested
// custom properties aren't guaranteed to resolve when queried directly
// via getComputedStyle — the safer, already-proven pattern here is JS
// reading the plain (non-calc) -base values and doing the multiplication
// itself, same as how --topbar-h/--safe-top are already handled.
// Phone-sized screens: icons are sized from the screen width, like a phone home screen, so
// they fill the row evenly (4 across on a phone, 5 on a large one) and grow or shrink with the
// screen instead of staying at the small fixed desktop size. Returns null on wider screens.
function phoneIconMetrics(){
  const vw = window.innerWidth;
  if(vw > 640) return null;
  const cs = getComputedStyle(document.documentElement);
  const safe = (parseFloat(cs.getPropertyValue("--safe-left")) || 0) + (parseFloat(cs.getPropertyValue("--safe-right")) || 0);
  const cols = vw <= 480 ? 4 : 5;
  const cellW = Math.floor((vw - 24 - safe) / cols);          // 12px margin each side, matching getGridOffset
  const icon = Math.max(44, Math.min(76, Math.round(cellW * 0.66)));
  return { cellW, icon, cellH: icon + 50, avail: vw - 24 - safe };   // cellH leaves room for a two-line label under the icon
}

function applyIconScale(){
  const cs = getComputedStyle(document.documentElement);
  const m = phoneIconMetrics();
  const baseW = m ? m.cellW : (parseFloat(cs.getPropertyValue("--cell-w-base")) || 104);
  const baseH = m ? m.cellH : (parseFloat(cs.getPropertyValue("--cell-h-base")) || 118);
  const baseIcon = m ? m.icon : (parseFloat(cs.getPropertyValue("--icon-size-base")) || 56);
  let scale = state.iconScale || 1;
  // On a phone never let "Larger icons" grow cells past what lets 3 fit across (they would run off the screen).
  if(m) scale = Math.min(scale, m.avail / (3 * m.cellW));
  document.documentElement.style.setProperty("--cell-w", (baseW*scale)+"px");
  document.documentElement.style.setProperty("--cell-h", (baseH*scale)+"px");
  document.documentElement.style.setProperty("--icon-size", (baseIcon*scale)+"px");
}


function getCellSize(parentId){
  const cs = getComputedStyle(document.documentElement);
  const base = {
    w: parseFloat(cs.getPropertyValue("--cell-w")) || 104,
    h: parseFloat(cs.getPropertyValue("--cell-h")) || 118
  };
  return (parentId && embeddedShelfCell(parentId, base)) || base;
}

// A shelf that lives inside a board gets its own icon spacing: the icons are spread evenly across the shelf's real
// width, never a big empty strip on one side and never crowded, and a shelf that needs two or more rows splits its
// icons into equal rows (4 + 4, not 7 + 1). Returns null for everything else (the webtop, folders and free-floating
// shelves keep the normal size).
function embeddedShelfLayout(parentId, base){
  const wdg = typeof widgetById === "function" ? widgetById(parentId) : null;
  if(!wdg || !wdg.embedded || typeof containerFor !== "function") return null;
  const c = containerFor(parentId);
  const W = c && c.clientWidth ? c.clientWidth - 16 : 0;
  if(W < 60) return null;                                   // not laid out yet: use the normal size
  base = base || { w: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-w")) || 104 };
  const phone = window.innerWidth <= 640, scale = state.iconScale || 1;
  const target = phone ? base.w : Math.round(base.w * 0.88);          // about 92px between icon centres on a desktop
  const maxCols = Math.max(1, Math.floor(W / target));
  const n = wdg.autoFlow ? childrenOf(parentId).length : 0;
  let cols = maxCols, w = Math.floor(W / maxCols);
  if(n > 0){
    const rows = Math.ceil(n / maxCols);
    cols = Math.min(maxCols, Math.ceil(n / rows));                    // equal rows
    w = Math.min(Math.floor(W / cols), Math.round(target * 1.3));     // open the spacing up a little, but keep icons comfortably close
  }
  const icon = Math.max(40, Math.min(Math.round(w * 0.56), phone ? 76 : Math.round(60 * scale)));
  return { cols, w, h: icon + 52, icon, W };       // h = icon + room for a two-line label
}
function embeddedShelfCell(parentId, base){
  const L = embeddedShelfLayout(parentId, base);
  return L ? { w: L.w, h: L.h, icon: L.icon } : null;
}



// Absolutely-positioned children align to their relative parent's PADDING
// EDGE, which is the same point as the parent's top-left corner would be
// with zero padding — CSS padding never actually offsets them. So the gap
// below the fixed topbar/searchbar has to be a real pixel offset applied
// to each icon's left/top here, not padding on #gridLayer.
// Where the icon grid begins when nothing else is above it: clear of the top bar and search bar.
function baseGridTop(){
  const cs = getComputedStyle(document.documentElement);
  const topbarH = parseFloat(cs.getPropertyValue("--topbar-h")) || 44;
  const searchH = parseFloat(cs.getPropertyValue("--searchbar-h")) || 58;
  const safeTop = parseFloat(cs.getPropertyValue("--safe-top")) || 0;
  return topbarH + safeTop + searchH + 22;
}

function getGridOffset(parentId){
  if(parentId !== null){
    const wdg = widgetById(parentId);
    if(wdg && wdg.embedded && wdg.autoFlow){
      // An auto-arranged shelf centres its block of icons, so a short row doesn't hug one corner.
      const c = containerFor(parentId), L = embeddedShelfLayout(parentId);
      if(c && L){
        const n = childrenOf(parentId).length, used = Math.min(L.cols, Math.max(1, n)), rows = Math.max(1, Math.ceil(n / L.cols));
        return { top: Math.max(6, Math.floor((c.clientHeight - rows * L.h) / 2)), left: 8 + Math.max(0, Math.floor((L.W - used * L.w) / 2)) };
      }
    }
    if(wdg) return { top: 6, left: 8 };
    return { top: 20, left: 20 }; // matches folderBody's visual inset
  }
  const cs = getComputedStyle(document.documentElement);
  const safeLeft = parseFloat(cs.getPropertyValue("--safe-left")) || 0;
  const isMobile = window.innerWidth <= 640;
  return {
    // On a narrow screen the widgets are stacked in a column at the top, so the icon
    // grid starts underneath them instead of sitting on top of the first widget.
    top: baseGridTop() + (typeof narrowWidgetsExtent === "function" ? narrowWidgetsExtent() : 0),
    left: (isMobile ? 12 : 24) + safeLeft
  };
}


const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;


// Touch gestures: a swipe scrolls, a tap opens, and holding still for this long
// "picks up" an icon/widget so the next drag moves it (like a phone home screen).
const TOUCH_DRAG_HOLD_MS = 350;
let touchDragActive = false;   // true only while a picked-up item is being dragged; blocks page scrolling then
function touchHaptic(){ try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){} }

let selected = new Set();

let activeCtxMenu = null;

