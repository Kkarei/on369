"use strict";

/* ============ APP: CALENDAR ============
   Reuses buildMonthCalendar from webtop/clock-widgets.js. */
function calendarAppSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path><circle cx="12" cy="15" r="1.2" fill="${color}" stroke="none"></circle></svg>`;
}

async function renderCalendarApp(body, api){
  let weekStartMon = false;
  try{ const v = await api.storage.get("weekStartMon"); weekStartMon = v === true; }catch(e){ console.warn("on369: calendar load failed", e); }

  body.innerHTML = `
    <div class="clockapp">
      <div class="clockapp-bar"><label class="clockapp-check"><input type="checkbox" class="calapp-mon"> Week starts on Monday</label></div>
      <div class="clockapp-stage"><div class="clk-face"></div></div>
    </div>`;
  const face = body.querySelector(".clk-face");
  const chk = body.querySelector(".calapp-mon");
  chk.checked = weekStartMon;

  const fake = { id:"app-calendar", kind:"calendar", weekStartMon };
  let draw = buildMonthCalendar(face, fake);
  draw();
  chk.addEventListener("change", ()=>{
    fake.weekStartMon = chk.checked;
    draw = buildMonthCalendar(face, fake); draw();
    api.storage.set("weekStartMon", chk.checked).catch(e=> console.warn("on369: calendar save failed", e));
  });

  // Roll over at midnight while the window stays open.
  const timer = setInterval(()=>{
    if(!body.isConnected){ clearInterval(timer); calViews.delete(fake.id); return; }
    if(!document.hidden) draw();
  }, 30000);
}

/* Runs once at startup (see main.js). */
function initAppsCalendar(){
  AppManager.register({
    id: "calendar",
    name: "Calendar",
    description: "A month calendar.",
    version: "1.0.0",
    developer: "on369",
    category: "utilities",
    icon: calendarAppSVG,
    render: renderCalendarApp,
    permissions: ["storage"],
    fileAssociations: [],
    shortcuts: [],
    defaultWidth: 340, defaultHeight: 420,
    minWidth: 260, minHeight: 300,
    maxWidth: 800, maxHeight: 800,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });
}
