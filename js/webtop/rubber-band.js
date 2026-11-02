"use strict";

/* ============ RUBBER BAND SELECT (mouse only) ============ */
// True for the duration between a drag-select ending and its trailing
// "click" event, so that click's own clear-selection handler (below)
// doesn't immediately wipe out what the drag just selected.
let justRubberBanded = false;


// Which of this container's own icons does the selection box touch?
// Only icons that are direct children count: an icon inside a shelf, a board tile or a widget is
// positioned relative to THAT container, so comparing its coordinates with this box would
// highlight icons that are nowhere near it. Hidden icons (for example filtered out by search) are skipped too.
function iconsUnderBand(root, band){
  const hits = [];
  Array.prototype.forEach.call(root.children, el=>{
    if(!el.classList || !el.classList.contains("icon")) return;
    if(!el.offsetWidth && !el.offsetHeight) return;
    const l = parseFloat(el.style.left), t = parseFloat(el.style.top);
    const r = { left:l, top:t, right:l + el.offsetWidth, bottom:t + el.offsetHeight };
    if(!(r.right < band.left || r.left > band.right || r.bottom < band.top || r.top > band.bottom)) hits.push(el.dataset.id);
  });
  return hits;
}

function wireRubberBandSelect(scrollContainer, iconQueryRoot, bandEl, dragNeedsMultiSelect){
  scrollContainer.addEventListener("pointerdown", (e)=>{
    if(e.pointerType !== "mouse") return; // touch scrolls/taps naturally instead
    if(e.button !== 0) return;
    if(e.target.closest(".icon, .widget-pop")) return;
    if(e.target.closest(".widget") && !scrollContainer.closest(".widget")) return;   // a widget's own area belongs to the widget
    closeCtxMenu();
    document.getElementById("settingsPop").classList.remove("open");

    // Multi-select mode is additive everywhere (matching tap-to-toggle on
    // icons) — a plain click there never wipes the selection, only Shift
    // does that outside the mode.
    const additive = multiSelectMode || e.shiftKey || e.ctrlKey || e.metaKey;
    if(!additive){ selected.clear(); updateSelectionClasses(); }

    const pointerId = e.pointerId;
    const rect = scrollContainer.getBoundingClientRect();
    const start = { x: e.clientX - rect.left + scrollContainer.scrollLeft, y: e.clientY - rect.top + scrollContainer.scrollTop };
    const baseSelection = new Set(selected);
    let dragged = false;

    function onMove(ev){
      if(ev.pointerId !== pointerId) return;
      dragged = true;
      bandEl.style.display = "block";
      const r = scrollContainer.getBoundingClientRect();
      const cx = ev.clientX - r.left + scrollContainer.scrollLeft;
      const cy = ev.clientY - r.top + scrollContainer.scrollTop;
      const x = Math.min(cx, start.x), y = Math.min(cy, start.y);
      const w = Math.abs(cx - start.x), h = Math.abs(cy - start.y);
      bandEl.style.left = x+"px"; bandEl.style.top = y+"px";
      bandEl.style.width = w+"px"; bandEl.style.height = h+"px";

      // Live hit-test against each icon's real rendered size — selection
      // always reflects what's currently under the band (plus whatever
      // was already selected before this drag started), not a one-way
      // accumulation of everything the band has ever touched.
      const bandRect = { left:x, top:y, right:x+w, bottom:y+h };
      const next = new Set(baseSelection);
      iconsUnderBand(iconQueryRoot, bandRect).forEach(id=> next.add(id));
      selected = next;
      updateSelectionClasses();
    }
    function onUp(ev){
      if(ev.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      bandEl.style.display = "none";
      if(dragged){
        justRubberBanded = true;
        setTimeout(()=>{ justRubberBanded = false; }, 0); // safety net if the trailing click never fires
      }
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}


/* Runs once at startup (see main.js), in the original order. */
function initWebtopRubberBand(){
  wireRubberBandSelect(webtop, gridLayer, rubberband, false);
  wireRubberBandSelect(folderBody, folderBody, document.getElementById("rubberbandFolder"), true);

  webtop.addEventListener("click", (e)=>{
    if(justRubberBanded){ justRubberBanded = false; return; }
    if(!e.target.closest(".icon")){ clearSelection(); focusedWindowId = null; }
  });

}
