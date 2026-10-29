"use strict";

/* ============ APP BANNERS ============
   Short messages with buttons at the bottom of the screen, for things you should know:
   changes that could not be saved yet, data changed in another tab, a recovery. */
const appBannersEl = (()=>{ const d = document.createElement("div"); d.id = "appBanners"; d.setAttribute("aria-live", "polite"); document.body.appendChild(d); return d; })();
function showAppBanner(id, text, actions, autoHideMs){
  let b = appBannersEl.querySelector(`[data-id="${id}"]`);
  if(!b){ b = document.createElement("div"); b.className = "app-banner"; b.dataset.id = id; appBannersEl.appendChild(b); }
  b.innerHTML = "";
  const t = document.createElement("span"); t.textContent = text; b.appendChild(t);
  (actions || []).forEach(a=>{
    const btn = document.createElement("button"); btn.type = "button"; btn.textContent = a.label;
    btn.addEventListener("click", ()=>{ if(!a.keep) hideAppBanner(id); a.fn(); });
    b.appendChild(btn);
  });
  clearTimeout(b._t); if(autoHideMs) b._t = setTimeout(()=> hideAppBanner(id), autoHideMs);
}
function hideAppBanner(id){ const b = appBannersEl.querySelector(`[data-id="${id}"]`); if(b) b.remove(); }
