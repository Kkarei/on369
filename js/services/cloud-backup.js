"use strict";

/* ============ CLOUD BACKUP (Supabase) ============
   Fill these two in from Supabase > Project Settings > API. The anon key is
   meant to be public; Row Level Security on the backups table is what protects data. */
const SUPABASE_URL = "https://zvtbcyzeiypoelqxfpke.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dGJjeXplaXlwb2VscXhmcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjY4NDYsImV4cCI6MjEwODA0Mjg0Nn0.LT1GU1wSkvk8bmRf7NW0iPDXlbN6-NdN5TIwRnCc0tA";

const CLOUD_KEY = "on369.cloud";

const CLOUD_APPDATA = [["notes","notes"],["todo","tasks"]];

const cloudConfigured = ()=> !/YOUR-/.test(SUPABASE_URL + SUPABASE_ANON_KEY);

let sess = null, cloudTimer = null;

function saveSess(){ try{ sess ? localStorage.setItem(CLOUD_KEY, JSON.stringify(sess)) : localStorage.removeItem(CLOUD_KEY); }catch(_){} }


async function sb(path, opt){
  opt = opt || {};
  const headers = { apikey: SUPABASE_ANON_KEY, "Content-Type":"application/json", ...(opt.token ? { Authorization:"Bearer " + opt.token } : {}), ...(opt.headers || {}) };
  const r = await fetch(SUPABASE_URL + path, { method: opt.method || "GET", headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const t = await r.text(); let j = null;
  try{ j = t ? JSON.parse(t) : null; }catch(_){}
  if(!r.ok) throw new Error((j && (j.msg || j.message || j.error_description || j.error)) || ("Request failed (" + r.status + ")"));
  return j;
}

async function cloudToken(){
  if(!sess) throw new Error("Not connected");
  if(sess.expires_at - Date.now()/1000 < 60){
    const j = await sb("/auth/v1/token?grant_type=refresh_token", { method:"POST", body:{ refresh_token: sess.refresh_token } });
    sess = { ...sess, access_token:j.access_token, refresh_token:j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now()/1000) + j.expires_in };
    saveSess();
  }
  return sess.access_token;
}

function cloudSignInGoogle(){
  const back = location.origin + location.pathname;
  location.href = SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(back);
}

// Returning from Google: Supabase puts the session in the URL hash. Read it
// (the access token is a JWT that already carries the user's id and email).
let cloudAuthError = "";

async function cloudFetch(){
  const rows = await sb(`/rest/v1/backups?select=data,updated_at&user_id=eq.${sess.user_id}`, { token: await cloudToken() });
  return rows && rows[0] || null;
}

async function cloudSnapshot(full){
  await save();
  const [items, prefs] = await Promise.all([Store.getAllItems(), Store.getAllPrefs()]);
  const appData = {};
  for(const [a,k] of CLOUD_APPDATA){ const v = await Store.getAppData(a,k); if(v != null) (appData[a] = appData[a] || {})[k] = v; }
  let data = { v:1, items, prefs, appData };
  if(!full && JSON.stringify(data).length > 3e6){ // keep the upload small: drop big images, keep everything else
    data = { ...data, prefs: prefs.filter(p=> p.key !== "customLogo" && p.key !== "customWallpaperImage" && p.key !== "myWallpapers"), imagesSkipped:true };
  }
  return data;
}

async function cloudPush(force){
  if(Store.isBlocked()) throw new Error("Your data isn't ready yet, so nothing was backed up.");
  const data = await cloudSnapshot(), now = new Date().toISOString(), count = data.items.length;
  // Automatic backups refuse to replace a much bigger cloud copy with a much smaller local one: that is what a lost-data bug looks like.
  if(!force && sess.lastCount >= 6 && count < sess.lastCount * 0.5){
    showAppBanner("cloudwarn", `Automatic backup is paused: this device has ${count} items, but your last cloud backup had ${sess.lastCount}. Open Cloud Backup to choose what to do.`, [{ label:"Open Cloud Backup", keep:true, fn: ()=> AppManager.launch("cloud", { title:"Cloud Backup", color: COLORS[1] }) }]);
    throw new Error("Automatic backup is paused because your data here is much smaller than your last backup.");
  }
  await sb("/rest/v1/backups?on_conflict=user_id", { method:"POST", token: await cloudToken(), headers:{ Prefer:"resolution=merge-duplicates,return=minimal" }, body:{ user_id: sess.user_id, data, updated_at: now } });
  sess.synced = true; sess.needsResolve = false; sess.lastSync = now; sess.lastSig = sigOf(data); sess.lastCount = count; hideAppBanner("cloudwarn"); saveSess();
  return data.imagesSkipped;
}

const cloudMode = ()=>{ try{ return localStorage.getItem("on369.cloudMode") === "manual" ? "manual" : "auto"; }catch(_){ return "auto"; } };

function setCloudMode(m){ try{ localStorage.setItem("on369.cloudMode", m); }catch(_){} }

function sigOf(d){
  const t = JSON.stringify(d); let h = 2166136261;
  for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return t.length + ":" + (h >>> 0);
}

// Remember what "already backed up" looks like, so closing can tell if anything changed since.
function cloudBaseline(){
  if(!sess || sess.lastSig != null || sess.needsResolve) return;
  cloudSnapshot().then(d=>{ if(sess && sess.lastSig == null){ sess.lastSig = sigOf(d); saveSess(); } }).catch(()=>{});
}

function cloudSchedule(){
  if(!sess || !sess.synced || window.__on369Wiping || Store.isBlocked() || cloudMode() === "manual") return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(()=> cloudPush().catch(e=> console.warn("on369: cloud backup failed", e)), 8000);
}

// Replaces everything on this device with the given backup, then reloads.
async function applyBackup(d, beforeReload){
  if(!d || !Array.isArray(d.items) || !Array.isArray(d.prefs)) throw new Error("That backup looks damaged.");
  Store.unblock(); Store.clearMarkers();      // you asked for this: lift any write block, and drop the old emergency copy so it can't bring back pre-restore data
  window.__on369Wiping = true;
  try{
    const cur = await Store.getAllItems();
    if(cur.length) await Store.deleteItems(cur.map(i=> i.id));
    await Store.putItems(d.items); await Store.putPrefs(d.prefs);
    for(const a in (d.appData || {})) for(const k in d.appData[a]) await Store.setAppData(a, k, d.appData[a][k]);
  }catch(e){ window.__on369Wiping = false; throw e; }
  if(beforeReload) beforeReload();
  location.reload();
}

const cloudRestore = (d)=> applyBackup(d, ()=>{ sess.synced = true; sess.needsResolve = false; sess.lastSig = null; saveSess(); });


async function cloudDisconnect(clearDevice){
  const tok = sess ? sess.access_token : null;
  clearTimeout(cloudTimer); sess = null; saveSess();
  if(tok) sb("/auth/v1/logout", { method:"POST", token: tok }).catch(()=>{});
  if(!clearDevice) return;
  window.__on369Wiping = true; Store.clearMarkers();
  ["on369.idbFallback.items.v1","on369.idbFallback.prefs.v1","on369.idbFallback.appData.v1"].forEach(k=> localStorage.removeItem(k));
  const go = ()=> location.reload();
  try{ const r = indexedDB.deleteDatabase("on369-db"); r.onsuccess = r.onerror = r.onblocked = go; }catch(_){ go(); }
  setTimeout(go, 1500);
}

// Earlier copies of your cloud backup, kept by a small database trigger (see README). They are what lets you undo a bad automatic backup.
async function cloudRestoreEarlier(){
  let rows;
  try{ rows = await sb(`/rest/v1/backup_history?select=id,created_at&user_id=eq.${sess.user_id}&order=created_at.desc&limit=8`, { token: await cloudToken() }); }
  catch(e){ throw new Error("Earlier copies aren't switched on for your Supabase project yet. The README has a one-time step to add them."); }
  if(!rows || !rows.length) throw new Error("There are no earlier copies yet. One is kept each time a backup replaces an older one.");
  const id = await askChoice({ title:"Restore an earlier cloud copy", message:"Pick a version. It replaces the webtop on this device.",
    choices: rows.map(r=>({ label: new Date(r.created_at).toLocaleString(), value: r.id })).concat([{ label:"Cancel", value:null }]) });
  if(id == null) return;
  const got = await sb(`/rest/v1/backup_history?select=data&id=eq.${id}`, { token: await cloudToken() });
  if(!got || !got[0]) throw new Error("That copy couldn't be loaded.");
  await cloudRestore(got[0].data);
}
async function cloudDeleteData(){
  await sb(`/rest/v1/backups?user_id=eq.${sess.user_id}`, { method:"DELETE", token: await cloudToken() });
  sess.synced = false; sess.lastSync = null; saveSess();
}


function cloudSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"></path><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"></path></svg>`;
}

function showCloudCloseDialog(proceed){
  const back = document.createElement("div"); back.className = "cloud-modal-back";
  const box = document.createElement("div"); box.className = "cloud-modal";
  const t = document.createElement("p"); t.textContent = "You have changes that aren't backed up to " + sess.email + ". Back them up before closing?";
  const note = document.createElement("p"); note.className = "cloud-note";
  const mk = (label, cls, fn)=>{ const b = document.createElement("button"); b.textContent = label; if(cls) b.className = cls; b.addEventListener("click", fn); return b; };
  const yes = mk("Back up and close", "primary", async ()=>{
    yes.disabled = true; note.textContent = "Backing up\u2026";
    try{ await cloudPush(true); back.remove(); proceed(); }
    catch(e){ yes.disabled = false; note.textContent = e.message || "Backup failed. Try again."; }
  });
  box.append(t, yes, mk("Close without backing up", "", ()=>{ back.remove(); proceed(); }), mk("Cancel", "", ()=> back.remove()), note);
  back.appendChild(box); document.body.appendChild(back);
}


const cloudBtn = document.getElementById("cloudBtn");

const openCloud = ()=> AppManager.launch("cloud", { title:"Cloud Backup", color: COLORS[1] });

function updateCloudBtn(){ cloudBtn.classList.toggle("cloud-on", !!(sess && sess.synced)); }

function renderCloudApp(body){
  const root = document.createElement("div"); root.className = "cloud-app";
  body.innerHTML = ""; body.appendChild(root);
  let msg = "", err = false, busy = false, conflict = null;
  const el = (tag, cls, text)=>{ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };
  const btn = (label, fn, cls)=>{ const b = el("button", cls || "", label); b.addEventListener("click", async ()=>{ if(busy) return; busy = true; msg = ""; err = false; draw(); try{ await fn(); }catch(e){ msg = e.message || "Something went wrong."; err = true; } busy = false; draw(); }); return b; };
  const when = (iso)=> iso ? new Date(iso).toLocaleString() : "never";

  function draw(){
    root.innerHTML = "";
    const head = el("div", "cloud-head");
    const auto = cloudMode() === "auto";
    const modeBtn = el("button", "cloud-mode" + (auto ? " on" : ""), auto ? "\u25CF Auto backup" : "\u25CB Manual backup");
    modeBtn.title = auto ? "Backing up automatically. Click to switch to manual." : "Backing up only when you press Back up now. Click to switch to automatic.";
    modeBtn.addEventListener("click", ()=>{
      setCloudMode(auto ? "manual" : "auto");
      msg = auto ? "Manual mode: your cloud copy only changes when you press Back up now." : "Automatic backup is on. Changes will back up shortly after you stop editing.";
      err = false;
      if(!auto) cloudSchedule();
      draw();
    });
    head.append(el("h3", "", "Cloud backup"), modeBtn);
    root.appendChild(head);
    if(!cloudConfigured()){
      root.appendChild(el("p", "", "Cloud backup isn't set up yet. Add your Supabase project URL and public key at the top of the Cloud Backup section in the code."));
    }else if(conflict){
      root.appendChild(el("p", "", "A backup from " + when(conflict.updated_at) + " already exists for " + sess.email + ". Which copy do you want to use?"));
      root.appendChild(btn("Restore cloud copy", ()=> cloudRestore(conflict.data), "primary"));
      root.appendChild(btn("Keep this device's copy", async ()=>{ await cloudPush(true); conflict = null; msg = "This device's copy is now your cloud backup."; }));
      root.appendChild(el("p", "cloud-note", "Restoring replaces the webtop on this device. Keeping this device's copy overwrites the cloud backup."));
    }else if(sess && sess.needsResolve && !conflict){
      root.appendChild(el("p", "", "Checking for your backup\u2026"));
    }else if(!sess){
      root.append(el("p", "", "Sign in with Google to back up your webtop and restore it on any device. Your Google email is used only to find your backup."),
        btn("Continue with Google", async ()=> cloudSignInGoogle(), "primary"));
      if(cloudAuthError){ msg = cloudAuthError; err = true; cloudAuthError = ""; }
    }else{
      root.append(el("p", "", "Connected as " + sess.email), el("p", "cloud-note", "Last backup: " + when(sess.lastSync) + (cloudMode() === "auto" ? ". Changes back up automatically." : ". Manual mode: press Back up now to save changes.")),
        btn("Back up now", async ()=>{ const skipped = await cloudPush(true); msg = skipped ? "Backed up (large images were left out)." : "Backed up."; }, "primary"),
        btn("Restore an earlier cloud copy\u2026", async ()=>{ await cloudRestoreEarlier(); }),
        btn("Restore cloud copy", async ()=>{
          const row = await cloudFetch();
          if(!row) throw new Error("No cloud backup found.");
          if(confirm("Replace the webtop on this device with the cloud copy from " + when(row.updated_at) + "?")) await cloudRestore(row.data);
        }),
        btn("Disconnect", async ()=>{ await cloudDisconnect(false); msg = "Disconnected. Your data stays on this device and in the cloud."; }),
        btn("Disconnect and clear this device", async ()=>{
          if(confirm("Disconnect and erase the webtop on this device? Your cloud backup is kept, and you can restore it by reconnecting.")) await cloudDisconnect(true);
        }, "danger"),
        btn("Delete my cloud data", async ()=>{
          if(confirm("Permanently delete your cloud backup? This can't be undone.")){ await cloudDeleteData(); msg = "Your cloud backup was deleted."; }
        }, "danger"));
    }
    if(msg) root.appendChild(el("p", err ? "cloud-msg err" : "cloud-msg", msg));
    updateCloudBtn();
  }
  if(sess && sess.needsResolve){
    busy = true; draw();
    cloudFetch().then(async row=>{
      if(row) conflict = row;
      else { await cloudPush(true); msg = "Connected. Your webtop is backed up."; }
    }).catch(e=>{ msg = e.message || "Could not reach your backup."; err = true; }).finally(()=>{ busy = false; draw(); });
  }else draw();
}


/* Runs once at startup (see main.js), in the original order. */
function initServicesCloudBackup(){
  try{ sess = JSON.parse(localStorage.getItem(CLOUD_KEY) || "null"); }catch(_){}
  (function readOAuthReturn(){
    const h = new URLSearchParams(location.hash.slice(1));
    const clean = ()=> history.replaceState(null, "", location.pathname + location.search);
    if(h.get("error_description")){ cloudAuthError = h.get("error_description").replace(/\+/g, " "); clean(); return; }
    const at = h.get("access_token");
    if(!at) return;
    try{
      const p = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      sess = { email: p.email, user_id: p.sub, access_token: at, refresh_token: h.get("refresh_token"),
        expires_at: Number(h.get("expires_at")) || Math.floor(Date.now()/1000) + (Number(h.get("expires_in")) || 3600),
        synced:false, lastSync:null, needsResolve:true };
      saveSess();
    }catch(e){ cloudAuthError = "Sign-in failed. Please try again."; }
    clean();
  })();
  AppManager.register({
    id: "cloud", name: "Cloud Backup", description: "Back up and restore your webtop with your email.",
    version: "1.0.0", developer: "on369", category: "utilities", icon: cloudSVG, render: renderCloudApp,
    permissions: ["storage","network"], fileAssociations: [], shortcuts: [],
    defaultWidth: 400, defaultHeight: 440, minWidth: 320, minHeight: 320, maxWidth: 700, maxHeight: 760,
    resizable: true, singleton: true, backgroundCapable: false
  });

  // In manual mode, closing the window with un-backed-up changes asks first.
  // Disconnected or automatic mode: just close (data stays in this browser's storage).
  windowCloseGuards.cloud = (proceed)=>{
    if(!sess || !sess.synced || cloudMode() !== "manual") return false;
    cloudSnapshot().then(d=>{
      if(sigOf(d) === sess.lastSig) proceed(); else showCloudCloseDialog(proceed);
    }).catch(()=> proceed());
    return true;
  };
  cloudBtn.addEventListener("click", openCloud);
  cloudBtn.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openCloud(); } });
  updateCloudBtn();

}
