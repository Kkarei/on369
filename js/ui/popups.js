"use strict";

/* ============ DRAGGABLE POPUPS ============
   Settings panels can be dragged by their header, so you can move one out of the way
   and watch your changes happen on the clock, widget or webtop underneath. */
function clampPop(pop){
  if(!pop.style.left) return;
  const r = pop.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)) + "px";
  pop.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 48)) + "px";
}
function makePopDraggable(pop, handle){
  handle.addEventListener("pointerdown", (e)=>{
    if(e.target.closest(".pop-close") || e.button > 0) return;
    e.preventDefault();
    const r = pop.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    pop.style.left = r.left + "px"; pop.style.top = r.top + "px"; pop.style.right = "auto"; pop.style.bottom = "auto";
    pop.classList.add("moving");
    const mv = (ev)=>{
      pop.style.left = Math.max(8, Math.min(ev.clientX - ox, window.innerWidth - pop.offsetWidth - 8)) + "px";
      pop.style.top = Math.max(8, Math.min(ev.clientY - oy, window.innerHeight - 48)) + "px";
    };
    const up = ()=>{ pop.classList.remove("moving"); document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  });
}

// Shows a widget's settings panel next to the widget (not on top of it), with a title bar
// to drag it by and a close button. It stays open while you work on that widget.
function showWidgetPop(pop, w, title, x, y){
  const head = document.createElement("div"); head.className = "pop-head"; head.title = "Drag to move";
  const t = document.createElement("span"); t.textContent = title;
  const close = document.createElement("span"); close.className = "pop-close"; close.textContent = "\u00d7"; close.title = "Close";
  close.addEventListener("click", closeWidgetPop);
  head.append(t, close); pop.prepend(head);
  document.body.appendChild(pop);
  const el = gridLayer.querySelector(`.widget[data-id="${w.id}"]`);
  const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let left = x, top = y;
  if(el){
    const r = el.getBoundingClientRect();
    top = Math.min(Math.max(8, r.top), vh - ph - 8);
    if(r.right + 12 + pw <= vw - 8) left = r.right + 12;
    else if(r.left - 12 - pw >= 8) left = r.left - 12 - pw;
    else{ left = Math.min(Math.max(8, r.left), vw - pw - 8); top = r.bottom + 12 + ph <= vh - 8 ? r.bottom + 12 : Math.max(8, r.top - 12 - ph); }
  }
  pop.style.left = Math.max(8, Math.min(left, vw - pw - 8)) + "px";
  pop.style.top = Math.max(8, Math.min(top, vh - ph - 8)) + "px";
  makePopDraggable(pop, head);
  setTimeout(()=> document.addEventListener("pointerdown", function away(e){
    if(pop.contains(e.target) || (e.target.closest && e.target.closest(`.widget[data-id="${w.id}"]`))) return;   // working on the widget itself keeps the panel open
    pop.remove(); document.removeEventListener("pointerdown", away);
  }), 0);
}

/* Runs once at startup (see main.js). */
function initUiPopups(){
  const sp = document.getElementById("settingsPop");
  makePopDraggable(sp, document.getElementById("settingsHead"));
  window.addEventListener("resize", ()=> clampPop(sp));
}
