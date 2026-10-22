"use strict";

/* ============ FILE BACKUP (export / import) ============ */
function backupSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>`;
}

const backupBtn = document.getElementById("backupBtn");

const openBackup = ()=> AppManager.launch("backup", { title:"Backup & Restore", color: COLORS[4] });

function downloadText(name, text, mime){
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

async function exportEverything(prefix){
  const data = await cloudSnapshot(true);
  data.app = "on369"; data.exportedAt = new Date().toISOString();
  downloadText(`${prefix || "on369-backup"}-${data.exportedAt.slice(0,10)}.json`, JSON.stringify(data), "application/json");
  if(!prefix){ try{ localStorage.setItem("on369.lastExport", data.exportedAt); }catch(_){} }
  return data;
}

function parseBackupText(text){
  let d;
  try{ d = JSON.parse(text); }catch(_){ throw new Error("That file isn't a valid on369 backup. Choose a .json file made with \u201cExport everything\u201d."); }
  if(!d || !Array.isArray(d.items) || !Array.isArray(d.prefs) || d.items.some(i=> !i || typeof i.id !== "string" || typeof i.type !== "string"))
    throw new Error("That file doesn't look like an on369 backup.");
  if(d.v > 1) throw new Error("This backup was made by a newer version of on369. Update the app and try again.");
  return d;
}


function renderBackupApp(body){
  const root = document.createElement("div"); root.className = "cloud-app backup-app";
  body.innerHTML = ""; body.appendChild(root);
  const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json"; input.style.display = "none";
  let msg = "", err = false, pending = null, keepCopy = true, busy = false;
  const el = (tag, cls, text)=>{ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };
  const act = (label, desc, fn, cls)=>{
    const wrap = el("div", "bk-item"), b = el("button", cls || "", label);
    b.addEventListener("click", async ()=>{ if(busy) return; busy = true; msg = ""; err = false; try{ await fn(); }catch(e){ msg = e.message || "Something went wrong."; err = true; } busy = false; draw(); });
    wrap.append(b, el("p", "cloud-note", desc)); return wrap;
  };
  input.addEventListener("change", async ()=>{
    const f = input.files && input.files[0]; input.value = "";
    if(!f) return;
    try{ pending = { d: parseBackupText(await f.text()), name: f.name }; msg = ""; err = false; }
    catch(e){ pending = null; msg = e.message; err = true; }
    draw();
  });

  function draw(){
    root.innerHTML = ""; root.appendChild(input);
    root.appendChild(el("h3", "", "Backup & restore"));
    if(pending){
      const it = pending.d.items, count = (t)=> it.filter(i=> i.type === t).length;
      root.append(el("p", "", `Ready to import \u201c${pending.name}\u201d`),
        el("p", "cloud-note", `${it.length} items (${count("bookmark") + count("webapp")} bookmarks and web apps, ${count("folder")} folders, ${count("widget")} widgets)` + (pending.d.exportedAt ? `, saved ${new Date(pending.d.exportedAt).toLocaleString()}.` : ".")),
        el("p", "", "This replaces everything on this webtop with the contents of the file."));
      const lab = el("label", "bk-check"), cb = el("input"); cb.type = "checkbox"; cb.checked = keepCopy;
      cb.addEventListener("change", ()=>{ keepCopy = cb.checked; });
      lab.append(cb, document.createTextNode(" Save a copy of my current webtop first"));
      root.appendChild(lab);
      root.appendChild(act("Replace my webtop with this file", "The page will reload when it's done.", async ()=>{
        if(keepCopy) await exportEverything("on369-before-import");
        await applyBackup(pending.d);
      }, "primary"));
      root.appendChild(act("Cancel", "Nothing has been changed.", async ()=>{ pending = null; }));
    }else{
      root.appendChild(el("h4", "", "Save to your computer"));
      root.appendChild(act("Export everything (JSON)", "Icons, folders, widgets, themes, settings, Notes and Todo, all in one file. Keep it somewhere safe.", async ()=>{ await exportEverything(); msg = "Backup file saved to your downloads."; }, "primary"));
      root.appendChild(act("Export bookmarks only (HTML)", "A standard bookmarks file you can import into Chrome, Firefox, Edge or Safari.", async ()=>{ exportBookmarks(); msg = "Bookmarks file saved to your downloads."; }));
      root.appendChild(el("h4", "", "Load from your computer"));
      root.appendChild(act("Import everything (JSON)", "Pick a backup file you saved earlier. You'll see what's in it before anything changes.", async ()=>{ input.click(); }));
      root.appendChild(act("Import bookmarks (HTML)", "Bring in bookmarks from a browser's bookmarks file.", async ()=>{ triggerBookmarkImport(null); }));
      let last = null; try{ last = localStorage.getItem("on369.lastExport"); }catch(_){}
      root.appendChild(el("p", "cloud-note", last ? "Last full backup file: " + new Date(last).toLocaleString() : "You haven't saved a full backup file yet."));
    }
    if(msg) root.appendChild(el("p", err ? "cloud-msg err" : "cloud-msg", msg));
  }
  draw();
}


/* Runs once at startup (see main.js), in the original order. */
function initServicesFileBackup(){
  AppManager.register({
    id: "backup", name: "Backup & Restore", description: "Save your webtop to a file, or load one back.",
    version: "1.0.0", developer: "on369", category: "utilities", icon: backupSVG, render: renderBackupApp,
    permissions: ["storage"], fileAssociations: [".json", ".html"], shortcuts: [],
    defaultWidth: 420, defaultHeight: 520, minWidth: 320, minHeight: 360, maxWidth: 700, maxHeight: 800,
    resizable: true, singleton: true, backgroundCapable: false
  });
  backupBtn.addEventListener("click", openBackup);
  backupBtn.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openBackup(); } });

  window.__on369 = { AppManager, EventBus, Store };

}
