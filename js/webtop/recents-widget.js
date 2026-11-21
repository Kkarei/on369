"use strict";

/* ============ "MOST USED" SHELF ============
   A widget that fills itself with the icons you open most (or most recently). Nothing to arrange:
   it follows what you actually use. Tapping an icon opens it like any other icon. */
const recentsUpdaters = new Map();    // widget id -> function that redraws that widget's icons

function addRecentsWidget(wx, wy){
  const w = createItem("widget", { label:"Most used", kind:"recents", recentsMode:"frequent", recentsCount:8, pw:340, ph:210,
    wx: Math.max(0, Math.round(wx)), wy: Math.max(0, Math.round(wy)), parentId:null });
  state.icons.push(w); save(); render();
  return w;
}

function refreshRecentsWidgets(){ recentsUpdaters.forEach(fn=> fn()); }

function renderRecentsWidget(w, stack){
  const hex = /^#[0-9a-f]{6}$/i.test(w.color) ? w.color : COLORS[2];
  const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const pos = stack && stack.get(w.id);
  const left = pos ? pos.left : w.wx, top = pos ? pos.top : w.wy, pw = pos ? pos.width : w.pw;
  const el = document.createElement("div");
  el.className = "widget recents-widget"; el.dataset.id = w.id; el.dataset.kind = "recents";
  el.style.cssText = `left:${left}px;top:${top}px;width:${pw}px;height:${w.ph}px;background:rgba(${r},${g},${b},${w.opacity});` + (w.blur ? "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" : "");
  if(w.opacity >= 0.6) el.style.color = (0.299*r + 0.587*g + 0.114*b) / 255 > 0.6 ? "#14161c" : "#fff";
  const head = document.createElement("div"); head.className = "widget-head";
  const title = document.createElement("span"); title.className = "widget-title"; title.textContent = w.label || "Most used";
  const cog = document.createElement("span"); cog.className = "widget-btn"; cog.textContent = "\u2699"; cog.title = "Widget settings";
  head.append(title, cog);
  const body = document.createElement("div"); body.className = "widget-body rw-body";
  const grip = document.createElement("div"); grip.className = "widget-grip";
  el.append(head, body, grip);
  gridLayer.prepend(el);

  const draw = ()=>{
    const list = usageRanked(w.recentsMode === "recent" ? "recent" : "frequent", Math.max(1, w.recentsCount || 8), false);
    body.innerHTML = "";
    if(!list.length){
      const hint = document.createElement("div"); hint.className = "rw-empty";
      hint.textContent = "Icons you open will show up here.";
      body.appendChild(hint); return;
    }
    list.forEach(({ item })=>{
      const b = document.createElement("button"); b.type = "button"; b.className = "rw-item"; b.title = item.label;
      b.innerHTML = glyphFor(item);
      const lab = document.createElement("span"); lab.className = "rw-label"; lab.textContent = item.label;
      b.appendChild(lab);
      b.addEventListener("click", (e)=>{ e.stopPropagation(); openItem(item); });
      b.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); });
      body.appendChild(b);
    });
  };
  draw(); recentsUpdaters.set(w.id, draw);

  cog.addEventListener("click", ()=>{ const rc = cog.getBoundingClientRect(); openRecentsSettings(w, rc.left, rc.bottom + 6); });
  head.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); openRecentsSettings(w, e.clientX, e.clientY); });
  body.addEventListener("contextmenu", (e)=>{ if(e.target.closest(".rw-item")) return; e.preventDefault(); e.stopPropagation(); showCanvasContextMenu(e.clientX, e.clientY, null); });
  head.addEventListener("pointerdown", (e)=>{
    if(pos || e.target.closest(".widget-btn") || e.button > 0) return;   // auto-arranged while stacked on a phone
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

function openRecentsSettings(w, x, y){
  closeWidgetPop();
  const pop = document.createElement("div"); pop.className = "widget-pop";
  pop.innerHTML = `<label>Name<input class="wp-name" maxlength="40"></label>
    <label>Show<select class="rw-mode"><option value="frequent">Most used</option><option value="recent">Recently opened</option></select></label>
    <label>How many<select class="rw-count"><option>4</option><option>6</option><option>8</option><option>12</option><option>16</option></select></label>
    <div class="wp-sw"></div>
    <label>Transparency <b class="wp-opv"></b><input type="range" class="wp-op" min="0" max="95"></label>
    <label class="wp-row"><input type="checkbox" class="wp-blur"> Frosted blur</label>
    <div class="wp-row"><button class="rw-clear">Clear history</button><button class="wp-del">Delete</button></div>`;
  const q = (c)=> pop.querySelector(c);
  const name = q(".wp-name"), mode = q(".rw-mode"), count = q(".rw-count"), op = q(".wp-op"), opv = q(".wp-opv");
  name.value = w.label || "Most used"; mode.value = w.recentsMode === "recent" ? "recent" : "frequent"; count.value = String(w.recentsCount || 8);
  op.value = Math.round((1 - w.opacity) * 100); opv.textContent = op.value + "%"; q(".wp-blur").checked = w.blur;
  COLORS.forEach(c=>{
    const b = document.createElement("button"); b.className = "wp-dot"; b.style.background = c; b.title = c;
    b.addEventListener("click", ()=>{ w.color = c; save(); render(); }); q(".wp-sw").appendChild(b);
  });
  name.addEventListener("input", ()=>{ w.label = name.value; render(); });
  name.addEventListener("change", ()=> save());
  mode.addEventListener("change", ()=>{ w.recentsMode = mode.value; if(!name.value || name.value === "Most used" || name.value === "Recently opened"){ w.label = mode.value === "recent" ? "Recently opened" : "Most used"; name.value = w.label; } save(); render(); });
  count.addEventListener("change", ()=>{ w.recentsCount = +count.value; save(); render(); });
  op.addEventListener("input", ()=>{ w.opacity = 1 - op.value / 100; opv.textContent = op.value + "%"; render(); });
  op.addEventListener("change", ()=> save());
  q(".wp-blur").addEventListener("change", (e)=>{ w.blur = e.target.checked; save(); render(); });
  q(".rw-clear").addEventListener("click", ()=>{ if(confirm("Clear the list of icons you have opened on this device?")){ usageMap = {}; usageSave(); refreshRecentsWidgets(); } });
  q(".wp-del").addEventListener("click", ()=>{ if(confirm("Delete this widget?")){ closeWidgetPop(); removeWidget(w, false); } });
  showWidgetPop(pop, w, "Most used settings", x, y);
}
