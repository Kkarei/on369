"use strict";

/* ============ APP PICKER ============ */
let appPickerParentId = null;

const appPickerOverlay = document.getElementById("appPickerOverlay");

function openAppPicker(parentId){
  appPickerParentId = parentId;
  const list = document.getElementById("appPickerList");
  list.innerHTML = "";
  // Getting Started, Cloud Backup and Backup & Restore already have their
  // own dedicated entry points (the guide's own icon or Settings → More,
  // and the cloud/backup buttons in the top bar) — listing them here too
  // would just be a second, more confusing way to reach the same thing.
  const EXCLUDED_UTILITY_APPS = ["getting-started", "cloud", "backup"];
  AppManager.listApps().filter(app=> !EXCLUDED_UTILITY_APPS.includes(app.id)).forEach((app, i)=>{
    const appId = app.id;
    const color = COLORS[i % COLORS.length];
    const row = document.createElement("div");
    row.className = "app-pick-row";
    row.innerHTML = `<div class="app-pick-icon" style="background:${color}1a;border-color:${color}55">${app.icon(color)}</div><span>${app.name}</span>`;
    row.addEventListener("click", ()=>{
      const slot = nextFreeSlot(appPickerParentId);
      state.icons.push(createItem("app", { appId, label: app.name, color, x: slot.x, y: slot.y, parentId: appPickerParentId }));
      save();
      render();
      closeAppPicker();
    });
    list.appendChild(row);
  });
  appPickerOverlay.classList.add("open");
}

function closeAppPicker(){ appPickerOverlay.classList.remove("open"); }

/* Runs once at startup (see main.js), in the original order. */
function initUiAppPicker(){
  document.getElementById("appPickerCancel").addEventListener("click", closeAppPicker);
  appPickerOverlay.addEventListener("mousedown", (e)=>{ if(e.target===appPickerOverlay) closeAppPicker(); });

}
