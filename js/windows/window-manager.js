"use strict";

/* ============ WINDOW MANAGER ============ */
let windows = [];        // { id, appId, title, color, x,y,w,h, z, minimized, maximized, prevBounds }

let topZ = 100;

let focusedWindowId = null;

const windowKeyHandlers = {}; // winId -> function(e)


function maxBounds(){
  const cs = getComputedStyle(document.documentElement);
  const topbarH = parseFloat(cs.getPropertyValue("--topbar-h")) || 44;
  const searchH = parseFloat(cs.getPropertyValue("--searchbar-h")) || 58;
  const safeTop = parseFloat(cs.getPropertyValue("--safe-top")) || 0;
  const safeLeft = parseFloat(cs.getPropertyValue("--safe-left")) || 0;
  const safeRight = parseFloat(cs.getPropertyValue("--safe-right")) || 0;
  const safeBottom = parseFloat(cs.getPropertyValue("--safe-bottom")) || 0;
  const top = topbarH + safeTop + searchH + 10;
  const taskbarH = document.body.classList.contains("has-taskbar") ? 62 + safeBottom : 0;
  return {
    x: 8 + safeLeft,
    y: top,
    w: window.innerWidth - 16 - safeLeft - safeRight,
    h: window.innerHeight - top - taskbarH - 8 - safeBottom
  };
}


function openWindow(appId, title, color){
  const app = AppManager.getMetadata(appId);
  if(!app) return;
  let win = windows.find(w=>w.id===appId);
  if(win){
    win.minimized = false;
    focusWindow(win.id);
    renderWindows();
    return;
  }
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(app.defaultWidth, vw-32);
  const h = Math.min(app.defaultHeight, vh-160);
  const stack = windows.length % 6;
  win = {
    id: appId, appId, title, color,
    x: Math.round((vw-w)/2 + stack*20),
    y: Math.round((vh-h)/2 - 30 + stack*18),
    w, h,
    z: ++topZ,
    minimized: false,
    maximized: false,
    prevBounds: null
  };
  windows.push(win);
  focusedWindowId = win.id;
  renderWindows();
}


function focusWindow(id){
  const win = windows.find(w=>w.id===id);
  if(!win) return;
  win.z = ++topZ;
  focusedWindowId = id;
  renderWindows();
}


const windowCloseGuards = {};

function closeWindow(id){
  const guard = windowCloseGuards[id];
  if(guard && guard(()=> closeWindowNow(id))) return; // guard took over and will call closeWindowNow itself
  closeWindowNow(id);
}

function closeWindowNow(id){
  windows = windows.filter(w=>w.id!==id);
  delete windowKeyHandlers[id];
  const el = document.getElementById("win-"+id);
  if(el) el.remove();
  if(focusedWindowId === id){
    const top = windows.slice().sort((a,b)=>b.z-a.z)[0];
    focusedWindowId = top ? top.id : null;
  }
  updateTaskbar();
  AppManager.notifyClosed(id);
}


function minimizeWindow(id){
  const win = windows.find(w=>w.id===id);
  if(!win) return;
  win.minimized = true;
  if(focusedWindowId === id){
    const top = windows.filter(w=>!w.minimized && w.id!==id).sort((a,b)=>b.z-a.z)[0];
    focusedWindowId = top ? top.id : null;
  }
  renderWindows();
}


function toggleMaximize(id){
  const win = windows.find(w=>w.id===id);
  if(!win) return;
  if(win.maximized){
    Object.assign(win, win.prevBounds);
    win.maximized = false;
  }else{
    win.prevBounds = { x: win.x, y: win.y, w: win.w, h: win.h };
    const b = maxBounds();
    win.x = b.x; win.y = b.y; win.w = b.w; win.h = b.h;
    win.maximized = true;
  }
  focusWindow(id);
}


function buildWindowEl(win){
  const app = AppManager.getMetadata(win.appId);
  const el = document.createElement("div");
  el.className = "oswindow";
  el.id = "win-"+win.id;
  el.innerHTML = `
    <div class="oswindow-titlebar">
      <div class="oswindow-title">
        <span class="oswindow-icon" style="color:${win.color}">${app.icon(win.color)}</span>
        <span>${escapeHtml(win.title)}</span>
      </div>
      <div class="oswindow-controls">
        <div class="win-btn win-min" title="Minimize">&#8211;</div>
        <div class="win-btn win-max" title="Maximize">&#9633;</div>
        <div class="win-btn win-close" title="Close">&#10005;</div>
      </div>
    </div>
    <div class="oswindow-body"></div>
    <div class="oswindow-resize"></div>
  `;
  el.addEventListener("pointerdown", ()=>{ if(focusedWindowId!==win.id) focusWindow(win.id); });

  const titlebar = el.querySelector(".oswindow-titlebar");
  wireWindowDrag(titlebar, win, el);
  titlebar.addEventListener("dblclick", (e)=>{ if(!e.target.closest(".win-btn")) toggleMaximize(win.id); });

  const resizeHandle = el.querySelector(".oswindow-resize");
  if(app.resizable === false){
    resizeHandle.style.display = "none";
  }else{
    wireWindowResize(resizeHandle, win, el);
  }

  el.querySelector(".win-min").addEventListener("click", (e)=>{ e.stopPropagation(); minimizeWindow(win.id); });
  el.querySelector(".win-max").addEventListener("click", (e)=>{ e.stopPropagation(); toggleMaximize(win.id); });
  el.querySelector(".win-close").addEventListener("click", (e)=>{ e.stopPropagation(); closeWindow(win.id); });

  // Containment boundary: a thrown exception during an app's render
  // shouldn't take down the desktop or any other window. This is NOT true
  // process isolation (an infinite loop would still hang the tab) — real
  // isolation needs iframes or workers, a bigger commitment not yet
  // justified for two first-party apps. This catches the common case —
  // both a synchronous throw AND a rejection from an async render
  // function (a plain try/catch alone only covers the synchronous part
  // of an async function, not what happens after its first await).
  try{
    const api = AppManager.buildAPI(win.appId, win.id);
    const result = app.render(el.querySelector(".oswindow-body"), api);
    if(result && typeof result.catch === "function"){
      result.catch(err=>{
        console.error(`on369: app "${win.appId}" threw during async render`, err);
      });
    }
  }catch(err){
    console.error(`on369: app "${win.appId}" threw during render`, err);
    el.querySelector(".oswindow-body").innerHTML =
      `<div style="padding:20px;font-size:13px;color:var(--text-secondary);">This app hit an error and couldn't load.</div>`;
  }
  return el;
}


function wireWindowDrag(handle, win, el){
  handle.addEventListener("pointerdown", (e)=>{
    if(e.target.closest(".win-btn")) return;
    if(e.pointerType==="mouse" && e.button!==0) return;
    focusWindow(win.id);
    const startX = e.clientX, startY = e.clientY;
    const originX = win.x, originY = win.y;
    const pointerId = e.pointerId;
    try{ handle.setPointerCapture(pointerId); }catch(err){}
    function onMove(ev){
      if(ev.pointerId!==pointerId) return;
      win.x = originX + (ev.clientX-startX);
      win.y = Math.max(4, originY + (ev.clientY-startY));
      el.style.left = win.x+"px"; el.style.top = win.y+"px";
    }
    function onUp(ev){
      if(ev.pointerId!==pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      try{ handle.releasePointerCapture(pointerId); }catch(err){}
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}


function wireWindowResize(handle, win, el){
  handle.addEventListener("pointerdown", (e)=>{
    e.stopPropagation();
    focusWindow(win.id);
    const app = AppManager.getMetadata(win.appId);
    const startX = e.clientX, startY = e.clientY;
    const originW = win.w, originH = win.h;
    const pointerId = e.pointerId;
    try{ handle.setPointerCapture(pointerId); }catch(err){}
    function onMove(ev){
      if(ev.pointerId!==pointerId) return;
      let w = Math.max(app.minWidth, originW + (ev.clientX-startX));
      let h = Math.max(app.minHeight, originH + (ev.clientY-startY));
      if(app.maxWidth) w = Math.min(w, app.maxWidth);
      if(app.maxHeight) h = Math.min(h, app.maxHeight);
      win.w = w; win.h = h;
      el.style.width = win.w+"px"; el.style.height = win.h+"px";
    }
    function onUp(ev){
      if(ev.pointerId!==pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      try{ handle.releasePointerCapture(pointerId); }catch(err){}
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}


function renderWindows(){
  windows.forEach(win=>{
    let el = document.getElementById("win-"+win.id);
    if(!el){
      el = buildWindowEl(win);
      windowLayer.appendChild(el);
    }
    el.style.display = win.minimized ? "none" : "flex";
    el.style.left = win.x+"px";
    el.style.top = win.y+"px";
    el.style.width = win.w+"px";
    el.style.height = win.h+"px";
    el.style.zIndex = win.z;
  });
  updateTaskbar();
}


function updateTaskbar(){
  taskbar.innerHTML = "";
  if(windows.length === 0){
    document.body.classList.remove("has-taskbar");
    return;
  }
  document.body.classList.add("has-taskbar");
  const maxZ = Math.max.apply(null, windows.map(w=>w.z));
  windows.slice().sort((a,b)=>a.z-b.z).forEach(win=>{
    const app = AppManager.getMetadata(win.appId);
    const pill = document.createElement("div");
    pill.className = "taskbar-pill" + (!win.minimized ? " active" : "");
    pill.innerHTML = `<span class="tb-icon" style="color:${win.color}">${app.icon(win.color)}</span><span class="tb-label">${escapeHtml(win.title)}</span><span class="tb-close" title="Close">&#10005;</span>`;
    pill.addEventListener("click", (e)=>{
      if(e.target.classList.contains("tb-close")){ closeWindow(win.id); return; }
      if(win.minimized){ win.minimized = false; focusWindow(win.id); }
      else if(win.z === maxZ){ minimizeWindow(win.id); }
      else{ focusWindow(win.id); }
    });
    taskbar.appendChild(pill);
  });
}


/* Runs once at startup (see main.js), in the original order. */
function initWindowsWindowManager(){
  // Route keyboard input to whichever window is currently focused, but never
  // hijack typing into a text field (search box, rename label, modal inputs).
  document.addEventListener("keydown", (e)=>{
    if(!focusedWindowId) return;
    const ae = document.activeElement;
    if(ae && (ae.tagName==="INPUT" || ae.tagName==="TEXTAREA" || ae.isContentEditable)) return;
    const handler = windowKeyHandlers[focusedWindowId];
    if(handler) handler(e);
  });

}
