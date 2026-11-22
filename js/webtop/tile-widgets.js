"use strict";

/* ============ TILE WIDGETS ============
   Any board tile type can also be a free-floating widget: a to-do list, a note, a weather forecast,
   a countdown, a habit tracker or a news feed. They reuse the board tile code (TILE_RENDER in
   boards.js), so a tile and a widget of the same type look and behave the same. */
const TILE_WIDGET_TYPES = ["todo", "tasks", "note", "forecast", "countdown", "habits", "headlines"];
const TILE_WIDGET_SIZE = { todo:[280, 320], tasks:[300, 340], pinnote:[280, 240], note:[260, 220], forecast:[260, 360], countdown:[240, 150], habits:[340, 260], headlines:[340, 340] };

function addTileWidget(type, wx, wy, props, label){
  if(!TILE_RENDER[type]) return null;
  const size = TILE_WIDGET_SIZE[type] || [280, 240];
  const w = createItem("widget", { label: label || TILE_TYPES[type].name, kind:"tile", tileType:type, tileProps: Object.assign(tileDefaults(type), props || {}),
    color:"#0f172a", opacity:0.72, blur:false, pw:size[0], ph:size[1], wx: Math.max(0, Math.round(wx)), wy: Math.max(0, Math.round(wy)), parentId:null });
  state.icons.push(w); save(); render();
  return w;
}

// Menu items for "Add widget": one per tile type that works on its own.
function tileWidgetMenuItems(wx, wy, popX, popY){
  return TILE_WIDGET_TYPES.map(type=>{
    const d = TILE_TYPES[type];
    return { label: d.icon + "  " + d.name, hint: d.desc, action: ()=>{
      const w = addTileWidget(type, wx, wy);
      if(w && (type === "countdown" || type === "headlines")) openTileWidgetSettings(w, popX, popY);
    } };
  });
}

function openTileWidgetSettings(w, x, y){
  openTileSettings(w, tileOfWidget(w), x, y, { onRemove: ()=> removeWidget(w, false) });
}
function tileOfWidget(w){
  return { id: w.id, type: w.tileType, col:0, row:0, w:2, h: Math.max(1, Math.floor((w.ph - 56) / 60)), p: w.tileProps };
}

function renderTileWidget(w, stack){
  const type = w.tileType;
  if(!TILE_RENDER[type]) return;
  if(!w.tileProps || typeof w.tileProps !== "object") w.tileProps = tileDefaults(type);
  const [r, g, b] = rgbOf(/^#[0-9a-f]{6}$/i.test(w.color) ? w.color : "#0f172a");
  const pos = stack && stack.get(w.id);
  const left = pos ? pos.left : w.wx, top = pos ? pos.top : w.wy, pw = pos ? pos.width : w.pw;
  const el = document.createElement("div");
  el.className = "widget tile-widget"; el.dataset.id = w.id; el.dataset.kind = "tile";
  el.style.cssText = `left:${left}px;top:${top}px;width:${pw}px;height:${w.ph}px;background:rgba(${r},${g},${b},${w.opacity});` + (w.blur ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
  const txt = contrastText(/^#[0-9a-f]{6}$/i.test(w.color) ? w.color : "#0f172a", w.opacity); if(txt) el.style.color = txt;
  const head = document.createElement("div"); head.className = "widget-head";
  const title = document.createElement("span"); title.className = "widget-title"; title.textContent = TILE_TYPES[type].icon + "  " + (w.label || TILE_TYPES[type].name);
  const cog = document.createElement("span"); cog.className = "widget-btn"; cog.textContent = "\u2699"; cog.title = "Widget settings";
  head.append(title, cog);
  const holder = document.createElement("div"); holder.className = "tile tile-" + type + " tile-widget-body";
  const box = document.createElement("div"); box.className = "tile-body"; holder.appendChild(box);
  const grip = document.createElement("div"); grip.className = "widget-grip";
  el.append(head, holder, grip);
  gridLayer.prepend(el);
  try{ TILE_RENDER[type](w, tileOfWidget(w), box); }catch(e){ console.warn("on369: tile widget failed", e); box.textContent = "This widget couldn't be drawn."; }

  cog.addEventListener("click", ()=>{ const rc = cog.getBoundingClientRect(); openTileWidgetSettings(w, rc.left, rc.bottom + 6); });
  head.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); openTileWidgetSettings(w, e.clientX, e.clientY); });
  holder.addEventListener("contextmenu", (e)=>{ if(e.target.closest("textarea,input,a")) return; e.preventDefault(); e.stopPropagation(); showCanvasContextMenu(e.clientX, e.clientY, null); });
  holder.addEventListener("pointerdown", (e)=> e.stopPropagation());       // typing in a tile must not start a webtop selection
  holder.addEventListener("click", (e)=> e.stopPropagation());             // a click inside must not reach the webtop, which would redraw everything and swallow it
  head.addEventListener("pointerdown", (e)=>{
    if(pos || e.target.closest(".widget-btn") || e.button > 0) return;     // auto-arranged while stacked on a phone
    const x0 = w.wx, y0 = w.wy;
    dragWidgetPart(e, (dx, dy)=>{ w.wx = Math.max(0, x0 + dx); w.wy = Math.max(0, y0 + dy); el.style.left = w.wx + "px"; el.style.top = w.wy + "px"; }, ()=>{ w.wx = Math.round(w.wx); w.wy = Math.round(w.wy); save(); }, { holdToDrag:true, el });
  });
  grip.addEventListener("pointerdown", (e)=>{
    const w0 = w.pw, h0 = w.ph, stacked = !!pos;
    dragWidgetPart(e, (dx, dy)=>{
      w.ph = Math.max(110, Math.round(h0 + dy)); el.style.height = w.ph + "px";
      if(stacked) restackNarrowWidgetsLive();
      else{ w.pw = Math.max(160, Math.round(w0 + dx)); el.style.width = w.pw + "px"; }
    }, ()=>{ save(); render(); });
  });
}
