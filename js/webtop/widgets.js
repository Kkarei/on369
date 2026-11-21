"use strict";

/* ============ WIDGETS ============ */

// On a narrow screen, floating widgets (shelves, clocks, calendars — not
// board widgets, which already fill the width on their own) are stacked
// into one full-width column instead of keeping their desktop left/top.
// Without this, widgets placed side by side on a wide screen each clamp
// their own left independently and keep their original top, so several of
// them collapse onto the same spot on a phone. Recomputed fresh on every
// render (including the existing debounced resize handler in main.js), so
// rotating the device or resizing the window re-stacks live; nothing is
// written back to wx/wy, so each widget's desktop layout is untouched
// when the window widens again.
const WIDGET_NARROW_BREAKPOINT = 820;
const WIDGET_NARROW_GAP = 12;
const WIDGET_NARROW_COLLAPSED_H = 48;

function isNarrowWidgetLayout(){ return window.innerWidth <= WIDGET_NARROW_BREAKPOINT; }

// Widgets whose left edges are within this many px count as one column on the
// large-screen layout.
const WIDGET_COLUMN_TOLERANCE = 60;

// Reading order for the phone's single column, matching the large-screen
// layout: columns are taken left to right, and within a column top to bottom.
// So the widget at the top-left on a big screen is first on a phone, and the
// one to its right (or the next column over) follows after that column.
function orderWidgetsForStack(list){
  const byX = list.slice().sort((a, b)=> (a.wx - b.wx) || (a.wy - b.wy));
  const cols = [];
  byX.forEach(w=>{
    let best = null;
    cols.forEach(c=>{
      const d = Math.abs(w.wx - c.x);
      if(d <= WIDGET_COLUMN_TOLERANCE && (!best || d < Math.abs(w.wx - best.x))) best = c;
    });
    if(best) best.items.push(w);
    else cols.push({ x: w.wx, items: [w] });
  });
  cols.sort((a, b)=> a.x - b.x);
  const out = [];
  cols.forEach(c=> c.items.sort((a, b)=> (a.wy - b.wy) || (a.wx - b.wx)).forEach(w=> out.push(w)));
  return out;
}

// The widgets that take part in the phone column, already in reading order.
function stackedWidgetList(){
  return orderWidgetsForStack(state.icons.filter(i=> i.type === "widget" && inSpace(i) && i.kind !== "board" && !(i.kind === "group" && i.embedded)));
}
function stackedWidgetHeight(w){ return w.collapsed ? WIDGET_NARROW_COLLAPSED_H : (w.ph || 200); }

// How far the stacked widgets push the icon grid down (0 on wide screens or with no widgets).
function narrowWidgetsExtent(){
  if(!isNarrowWidgetLayout()) return 0;
  const list = stackedWidgetList();
  if(!list.length) return 0;
  return list.reduce((sum, w)=> sum + stackedWidgetHeight(w) + WIDGET_NARROW_GAP, 0);
}

function narrowWidgetStack(){
  const list = stackedWidgetList();
  const left = 8, width = Math.max(140, window.innerWidth - 16);
  // Start where the icon grid would start: clear of the top bar and the search bar.
  let top = baseGridTop();
  const layout = new Map();
  list.forEach(w=>{
    layout.set(w.id, { left, width, top });
    top += stackedWidgetHeight(w) + WIDGET_NARROW_GAP;
  });
  return layout;
}

function addWidget(wx, wy, ids){
  const w = createItem("widget", { label:"Shelf", color: COLORS[state.icons.filter(i=> i.type === "widget").length % COLORS.length], wx: Math.max(0, Math.round(wx)), wy: Math.max(0, Math.round(wy)), parentId:null });
  state.icons.push(w);
  (ids || []).forEach(id=>{
    const it = state.icons.find(i=> i.id === id);
    if(!it || it.type === "widget") return;
    const slot = nextFreeSlot(w.id);
    it.parentId = w.id; it.x = slot.x; it.y = slot.y;
  });
  selected.clear(); save(); render();
  return w;
}

function removeWidget(w, keepChildren){
  const gone = new Set([w.id]);
  if(keepChildren){
    childrenOf(w.id).forEach(it=>{ const s = nextFreeSlot(null); it.parentId = null; it.x = s.x; it.y = s.y; });
  }else{
    let grew = true;
    while(grew){ grew = false; state.icons.forEach(i=>{ if(!gone.has(i.id) && gone.has(i.parentId)){ gone.add(i.id); grew = true; } }); }
  }
  state.icons = state.icons.filter(i=> !gone.has(i.id));
  save(); render();
}

function closeWidgetPop(){ document.querySelectorAll(".widget-pop").forEach(n=> n.remove()); }

function openWidgetSettings(w, x, y){
  closeWidgetPop();
  const pop = document.createElement("div");
  pop.className = "widget-pop";
  pop.innerHTML = `<label>Name<input class="wp-name" maxlength="40"></label>
    <div class="wp-sw"></div>
    <label>Custom color<input type="color" class="wp-color"></label>
    <label>Transparency <b class="wp-opv"></b><input type="range" class="wp-op" min="0" max="95"></label>
    <label class="wp-row"><input type="checkbox" class="wp-blur"> Frosted blur</label>
    <div class="wp-row"><button class="wp-ungroup">Ungroup</button><button class="wp-del">Delete</button></div>`;
  const q = (c)=> pop.querySelector(c);
  const name = q(".wp-name"), color = q(".wp-color"), op = q(".wp-op"), opv = q(".wp-opv"), blur = q(".wp-blur");
  name.value = w.label;
  color.value = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : COLORS[0];
  op.value = Math.round((1 - w.opacity) * 100); opv.textContent = op.value + "%";
  blur.checked = w.blur;
  COLORS.forEach(c=>{
    const b = document.createElement("button"); b.className = "wp-dot"; b.style.background = c;
    b.addEventListener("click", ()=>{ w.color = c; color.value = c; save(); render(); });
    q(".wp-sw").appendChild(b);
  });
  name.addEventListener("input", ()=>{ w.label = name.value || "Shelf"; render(); });
  color.addEventListener("input", ()=>{ w.color = color.value; render(); });
  op.addEventListener("input", ()=>{ w.opacity = 1 - op.value / 100; opv.textContent = op.value + "%"; render(); });
  blur.addEventListener("change", ()=>{ w.blur = blur.checked; save(); render(); });
  [name, color, op].forEach(i=> i.addEventListener("change", ()=> save()));
  q(".wp-ungroup").addEventListener("click", ()=>{ closeWidgetPop(); removeWidget(w, true); });
  q(".wp-del").addEventListener("click", ()=>{
    const n = state.icons.filter(i=> i.parentId === w.id).length;
    if(confirm(n ? `Delete this shelf and the ${n} item(s) inside it?` : "Delete this shelf?")){ closeWidgetPop(); removeWidget(w, false); }
  });
  showWidgetPop(pop, w, "Shelf settings", x, y);
  name.focus(); name.select();
}

// Touch/pen move-drags (opts.holdToDrag) only start after a short hold, so a swipe
// that begins on a widget still scrolls the page. The corner resize handle skips
// this: touching it is already a deliberate drag.
function holdThenDragWidget(e, onMove, onDone, opts){
  const sx = e.clientX, sy = e.clientY, pid = e.pointerId, target = e.target, box = opts && opts.el;
  let armed = false, ended = false;
  const timer = setTimeout(()=>{
    if(ended) return;
    armed = true; touchDragActive = true; touchHaptic();
    if(box) box.classList.add("lifted");
    try{ if(target.setPointerCapture) target.setPointerCapture(pid); }catch(_){}
  }, TOUCH_DRAG_HOLD_MS);
  function end(commit){
    if(ended) return; ended = true;
    clearTimeout(timer);
    document.removeEventListener("pointermove", mv, true);
    document.removeEventListener("pointerup", up, true);
    document.removeEventListener("pointercancel", up, true);
    touchDragActive = false;
    if(box) box.classList.remove("lifted");
    if(commit) onDone();
  }
  function mv(ev){
    if(ev.pointerId !== pid) return;
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if(!armed){ if(Math.abs(dx) > 8 || Math.abs(dy) > 8) end(false); return; }   // moved early: it is a scroll
    onMove(dx, dy);
  }
  function up(ev){ if(ev.pointerId === pid) end(armed); }
  document.addEventListener("pointermove", mv, true);
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
}

function dragWidgetPart(e, onMove, onDone, opts){
  if(opts && opts.holdToDrag && e.pointerType && e.pointerType !== "mouse"){ holdThenDragWidget(e, onMove, onDone, opts); return; }
  e.preventDefault();
  const sx = e.clientX, sy = e.clientY;
  // Capture the pointer so a touch drag keeps reporting to this handle even when
  // the finger slides off it, and treat pointercancel like a release so the
  // listeners never leak and the new size/position is still saved.
  try{ if(e.target && e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId); }catch(_){}
  const mv = (ev)=> onMove(ev.clientX - sx, ev.clientY - sy);
  let done = false;
  const up = ()=>{
    if(done) return; done = true;
    document.removeEventListener("pointermove", mv);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", up);
    onDone();
  };
  document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
}

// While a stacked (phone-layout) widget is being resized, move the widgets
// below it live so the column stays tidy instead of overlapping until release.
function restackNarrowWidgetsLive(){
  narrowWidgetStack().forEach((pos, id)=>{
    const el = gridLayer.querySelector(`.widget[data-id="${id}"]`);
    if(el) el.style.top = pos.top + "px";
  });
}

function renderWidgets(){
  // Removing every widget momentarily shrinks the scrollable area; if layout runs
  // in that window the browser clamps scrollTop to 0 and the page jumps to the
  // top. Remember it and put it back once the widgets are drawn again.
  const keepScroll = webtop.scrollTop;
  try{ renderWidgetsInner(); }finally{ if(webtop.scrollTop !== keepScroll) webtop.scrollTop = keepScroll; }
}

function renderWidgetsInner(){
  gridLayer.querySelectorAll(".widget").forEach(n=> n.remove());
  clockUpdaters.clear(); recentsUpdaters.clear();
  const narrow = isNarrowWidgetLayout(), stack = narrow ? narrowWidgetStack() : null;
  // boards are drawn last so they sit at the very back; shelves, clocks and icons stay on top of them
  state.icons.filter(i=> i.type === "widget" && inSpace(i)).sort((a, b)=> (a.kind === "board") - (b.kind === "board")).forEach(w=>{
    if(w.kind === "group" && w.embedded) return;
    if(w.kind === "clock" || w.kind === "calendar"){ renderClockWidget(w, stack); return; }
    if(w.kind === "recents"){ renderRecentsWidget(w, stack); return; }
    if(w.kind === "board"){ renderBoardWidget(w); return; }
    const hex = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : COLORS[0];
    const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const el = document.createElement("div");
    el.className = "widget" + (w.collapsed ? " collapsed" : "");
    el.dataset.id = w.id; el.dataset.kind = "group";
    const pos = stack && stack.get(w.id);
    const leftEff = pos ? pos.left : w.wx, topEff = pos ? pos.top : w.wy, pwEff = pos ? pos.width : w.pw;
    el.style.cssText = `left:${leftEff}px;top:${topEff}px;width:${pwEff}px;height:${w.collapsed ? "auto" : w.ph + "px"};background:rgba(${r},${g},${b},${w.opacity});` + (w.blur ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
    if(w.opacity >= 0.6) el.style.color = (0.299*r + 0.587*g + 0.114*b) / 255 > 0.6 ? "#14161c" : "#fff";
    const head = document.createElement("div"); head.className = "widget-head";
    const title = document.createElement("span"); title.className = "widget-title"; title.textContent = w.label;
    const mk = (txt, tip)=>{ const x = document.createElement("span"); x.className = "widget-btn"; x.textContent = txt; x.title = tip; return x; };
    const fold = mk(w.collapsed ? "\u25B8" : "\u25BE", "Collapse / expand"), cog = mk("\u2699", "Widget settings");
    head.append(title, fold, cog);
    const body = document.createElement("div"); body.className = "widget-body";
    const grip = document.createElement("div"); grip.className = "widget-grip";
    el.append(head, body, grip);
    gridLayer.prepend(el);
    renderInto(body, w.id);
    const band = document.createElement("div"); band.className = "rubberband-box"; body.appendChild(band);
    wireRubberBandSelect(body, body, band, false);   // drag across icons inside a widget to select them

    fold.addEventListener("click", ()=>{ w.collapsed = !w.collapsed; save(); render(); });
    cog.addEventListener("click", (e)=>{ const r2 = cog.getBoundingClientRect(); openWidgetSettings(w, r2.left, r2.bottom + 6); });
    title.addEventListener("dblclick", ()=> startRename(title, w));
    head.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); openWidgetSettings(w, e.clientX, e.clientY); });
    body.addEventListener("contextmenu", (e)=>{
      if(e.target.closest(".icon")) return;
      e.preventDefault(); e.stopPropagation(); showCanvasContextMenu(e.clientX, e.clientY, w.id);
    });
    head.addEventListener("pointerdown", (e)=>{
      if(pos || e.target.closest(".widget-btn") || e.target.isContentEditable || e.button > 0) return;   // position is auto-arranged while stacked; dragging would fight it
      const x0 = w.wx, y0 = w.wy;
      dragWidgetPart(e, (dx, dy)=>{ w.wx = Math.max(0, x0 + dx); w.wy = Math.max(0, y0 + dy); el.style.left = w.wx + "px"; el.style.top = w.wy + "px"; }, ()=>{ w.wx = Math.round(w.wx); w.wy = Math.round(w.wy); save(); }, { holdToDrag:true, el });
    });
    grip.addEventListener("pointerdown", (e)=>{
      const w0 = w.pw, h0 = w.ph, stacked = !!pos;
      // Stacked on a phone: the width is always the full column, so only the height is resizable.
      dragWidgetPart(e, (dx, dy)=>{
        w.ph = Math.max(110, Math.round(h0 + dy)); el.style.height = w.ph + "px";
        if(stacked) restackNarrowWidgetsLive();
        else{ w.pw = Math.max(160, Math.round(w0 + dx)); el.style.width = w.pw + "px"; }
      }, ()=>{ save(); render(); });
    });
  });
}


function escapeHtml(s){
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

