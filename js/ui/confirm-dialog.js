"use strict";

/* A styled yes/no question. Resolves true if the user confirms, false otherwise
   (Cancel, Escape, or clicking outside). Used for moves that deserve a warning. */
function askConfirm(opts){
  return new Promise((resolve)=>{
    const back = document.createElement("div"); back.className = "cloud-modal-back";
    const box = document.createElement("div"); box.className = "cloud-modal confirm-modal"; box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
    const title = document.createElement("div"); title.className = "confirm-title";
    const icon = document.createElement("span"); icon.textContent = "\u26A0"; icon.setAttribute("aria-hidden", "true");
    title.append(icon, document.createTextNode(opts.title || "Are you sure?"));
    const msg = document.createElement("p"); msg.textContent = opts.message || "";
    const done = (v)=>{ document.removeEventListener("keydown", onKey, true); back.remove(); resolve(v); };
    const onKey = (e)=>{ if(e.key === "Escape"){ e.stopPropagation(); done(false); } };
    const ok = document.createElement("button"); ok.className = "primary"; ok.textContent = opts.confirmLabel || "Confirm"; ok.addEventListener("click", ()=> done(true));
    const no = document.createElement("button"); no.textContent = opts.cancelLabel || "Cancel"; no.addEventListener("click", ()=> done(false));
    box.append(title, msg, ok, no); back.appendChild(box);
    back.addEventListener("pointerdown", (e)=>{ if(e.target === back) done(false); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(back); ok.focus();
  });
}
