"use strict";

/* ============ APP: CLOCK ============
   Reuses the clock widget builders (CLOCK_STYLES in webtop/clock-widgets.js)
   instead of re-implementing a clock. The window body gets a container-query
   box so the widget's cq* sizing scales with the window. */
function clockAppSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.2 2"></path></svg>`;
}

async function renderClockApp(body, api){
  let style = "poster";
  try{ const v = await api.storage.get("style"); if(CLOCK_STYLES[v]) style = v; }catch(e){ console.warn("on369: clock load failed", e); }

  body.innerHTML = `
    <div class="clockapp">
      <div class="clockapp-bar"><select class="clockapp-style" aria-label="Clock style"></select></div>
      <div class="clockapp-stage"><div class="clk-face"></div></div>
    </div>`;
  const sel = body.querySelector(".clockapp-style");
  const face = body.querySelector(".clk-face");
  Object.keys(CLOCK_STYLES).forEach(k=>{
    const o = document.createElement("option"); o.value = k; o.textContent = CLOCK_STYLES[k].name; sel.appendChild(o);
  });
  sel.value = style;

  let update = null, timer = null;
  const mount = ()=>{
    // A plain object shaped like a clock widget: only the fields the builders read.
    const fake = { id:"app-clock", kind:"clock", clockStyle:style, showSeconds:true, showDate:true };
    update = CLOCK_STYLES[style].build(face, fake);
    update(clockParts(new Date()));
  };
  mount();
  sel.addEventListener("change", ()=>{
    style = sel.value; mount();
    api.storage.set("style", style).catch(e=> console.warn("on369: clock save failed", e));
  });
  face.addEventListener("click", (e)=>{ if(e.target.closest(".clk-date")) AppManager.launch("calendar"); });

  timer = setInterval(()=>{
    if(!body.isConnected){ clearInterval(timer); return; }   // window closed
    if(!document.hidden && update) update(clockParts(new Date()));
  }, 1000);
}

/* Runs once at startup (see main.js). */
function initAppsClock(){
  AppManager.register({
    id: "clock",
    name: "Clock",
    description: "A live clock with several styles.",
    version: "1.0.0",
    developer: "on369",
    category: "utilities",
    icon: clockAppSVG,
    render: renderClockApp,
    permissions: ["storage"],
    fileAssociations: [],
    shortcuts: [],
    defaultWidth: 340, defaultHeight: 400,
    minWidth: 240, minHeight: 280,
    maxWidth: 800, maxHeight: 800,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });
}
