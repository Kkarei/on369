"use strict";

/* ============ RUBBER BAND SELECT (mouse only) ============ */
// True for the duration between a drag-select ending and its trailing
// "click" event, so that click's own clear-selection handler (below)
// doesn't immediately wipe out what the drag just selected.
let justRubberBanded = false;


function wireRubberBandSelect(scrollContainer, iconQueryRoot, bandEl, dragNeedsMultiSelect){
  scrollContainer.addEventListener("pointerdown", (e)=>{
    if(e.pointerType !== "mouse") return; // touch scrolls/taps naturally instead
    if(e.button !== 0) return;
    if(e.target.closest(".icon, .widget, .widget-pop")) return;
    closeCtxMenu();
    document.getElementById("settingsPop").classList.remove("open");

    // Multi-select mode is additive everywhere (matching tap-to-toggle on
    // icons) — a plain click there never wipes the selection, only Shift
    // does that outside the mode.
    const additive = multiSelectMode || e.shiftKey;
    if(!additive){ selected.clear(); updateSelectionClasses(); }

    // Outside multi-select mode, the folder view keeps its previous,
    // simpler behavior: click empty space to clear, no drag-rectangle.
    if(dragNeedsMultiSelect && !multiSelectMode) return;

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
      iconQueryRoot.querySelectorAll(".icon").forEach(el=>{
        const l = parseFloat(el.style.left), t = parseFloat(el.style.top);
        const r2 = { left:l, top:t, right:l+el.offsetWidth, bottom:t+el.offsetHeight };
        const hit = !(r2.right < bandRect.left || r2.left > bandRect.right || r2.bottom < bandRect.top || r2.top > bandRect.bottom);
        if(hit) next.add(el.dataset.id);
      });
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
