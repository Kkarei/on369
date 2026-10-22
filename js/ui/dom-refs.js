"use strict";

/* ============ DOM REFS ============ */
const gridLayer = document.getElementById("gridLayer");

const desktop = document.getElementById("desktop");

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
function applyIconScale(){
  const cs = getComputedStyle(document.documentElement);
  const baseW = parseFloat(cs.getPropertyValue("--cell-w-base")) || 104;
  const baseH = parseFloat(cs.getPropertyValue("--cell-h-base")) || 118;
  const baseIcon = parseFloat(cs.getPropertyValue("--icon-size-base")) || 56;
  const scale = state.iconScale || 1;
  document.documentElement.style.setProperty("--cell-w", (baseW*scale)+"px");
  document.documentElement.style.setProperty("--cell-h", (baseH*scale)+"px");
  document.documentElement.style.setProperty("--icon-size", (baseIcon*scale)+"px");
}


function getCellSize(){
  const cs = getComputedStyle(document.documentElement);
  return {
    w: parseFloat(cs.getPropertyValue("--cell-w")) || 104,
    h: parseFloat(cs.getPropertyValue("--cell-h")) || 118
  };
}


// Absolutely-positioned children align to their relative parent's PADDING
// EDGE, which is the same point as the parent's top-left corner would be
// with zero padding — CSS padding never actually offsets them. So the gap
// below the fixed topbar/searchbar has to be a real pixel offset applied
// to each icon's left/top here, not padding on #gridLayer.
function getGridOffset(parentId){
  if(parentId !== null){
    if(widgetById(parentId)) return { top: 6, left: 8 };
    return { top: 20, left: 20 }; // matches folderBody's visual inset
  }
  const cs = getComputedStyle(document.documentElement);
  const topbarH = parseFloat(cs.getPropertyValue("--topbar-h")) || 44;
  const searchH = parseFloat(cs.getPropertyValue("--searchbar-h")) || 58;
  const safeTop = parseFloat(cs.getPropertyValue("--safe-top")) || 0;
  const safeLeft = parseFloat(cs.getPropertyValue("--safe-left")) || 0;
  const isMobile = window.innerWidth <= 640;
  return {
    top: topbarH + safeTop + searchH + 22,
    left: (isMobile ? 12 : 24) + safeLeft
  };
}


const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;


let selected = new Set();

let activeCtxMenu = null;

