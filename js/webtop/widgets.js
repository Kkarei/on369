"use strict";

/* ============ WIDGETS ============ */
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

function dragWidgetPart(e, onMove, onDone){
  e.preventDefault();
  const sx = e.clientX, sy = e.clientY;
  const mv = (ev)=> onMove(ev.clientX - sx, ev.clientY - sy);
  const up = ()=>{ document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); onDone(); };
  document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
}

function renderWidgets(){
  gridLayer.querySelectorAll(".widget").forEach(n=> n.remove());
  clockUpdaters.clear();
  state.icons.filter(i=> i.type === "widget").forEach(w=>{
    if(w.kind === "clock" || w.kind === "calendar"){ renderClockWidget(w); return; }
    const hex = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : COLORS[0];
    const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const el = document.createElement("div");
    el.className = "widget" + (w.collapsed ? " collapsed" : "");
    el.dataset.id = w.id;
    const narrow = window.innerWidth <= 820, pwEff = narrow ? Math.min(w.pw, window.innerWidth - 16) : w.pw, leftEff = narrow ? Math.max(0, Math.min(w.wx, window.innerWidth - pwEff - 8)) : w.wx;
    el.style.cssText = `left:${leftEff}px;top:${w.wy}px;width:${pwEff}px;height:${w.collapsed ? "auto" : w.ph + "px"};background:rgba(${r},${g},${b},${w.opacity});` + (w.blur ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
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
      if(e.target.closest(".widget-btn") || e.target.isContentEditable || e.button > 0) return;
      const x0 = w.wx, y0 = w.wy;
      dragWidgetPart(e, (dx, dy)=>{ w.wx = Math.max(0, x0 + dx); w.wy = Math.max(0, y0 + dy); el.style.left = w.wx + "px"; el.style.top = w.wy + "px"; }, ()=>{ w.wx = Math.round(w.wx); w.wy = Math.round(w.wy); save(); });
    });
    grip.addEventListener("pointerdown", (e)=>{
      const w0 = w.pw, h0 = w.ph;
      dragWidgetPart(e, (dx, dy)=>{ w.pw = Math.max(160, Math.round(w0 + dx)); w.ph = Math.max(110, Math.round(h0 + dy)); el.style.width = w.pw + "px"; el.style.height = w.ph + "px"; }, ()=>{ save(); render(); });
    });
  });
}


function escapeHtml(s){
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

