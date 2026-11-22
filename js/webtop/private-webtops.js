"use strict";

/* ============ PRIVATE WEBTOPS (PIN) ============
   Put a PIN on a webtop. Opening it asks for the PIN, once per browser session; "Lock now" asks again.
   Only a salted hash of the PIN is stored (PBKDF2-SHA-256), never the PIN itself.

   Be clear-eyed about what this is: a privacy screen against someone glancing at your device, not encryption.
   The webtop's contents are still stored on this device in the ordinary way, so it does not protect against
   someone who can open the browser's developer tools or storage. */
const PIN_ITER = 150000;
const PIN_SESSION_KEY = "on369.unlocked.v1";
const pinFails = {};            // webtop id -> { n, until }, kept only in memory

const pinSupported = ()=> !!(window.crypto && crypto.subtle);
const pinB64 = (u8)=> btoa(String.fromCharCode(...u8));
const pinUnB64 = (s)=> Uint8Array.from(atob(s), c=> c.charCodeAt(0));
async function pinDerive(pin, salt, iter){
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations: iter }, key, 256));
}

const webtopById = (id)=> state.webtops.find(w=> w.id === id) || null;
const webtopIsLocked = (id)=> !!(webtopById(id) && webtopById(id).lock);
function pinUnlockedSet(){ try{ return new Set(JSON.parse(sessionStorage.getItem(PIN_SESSION_KEY) || "[]")); }catch(e){ return new Set(); } }
function pinMarkUnlocked(id, on){
  const s = pinUnlockedSet(); if(on) s.add(id); else s.delete(id);
  try{ sessionStorage.setItem(PIN_SESSION_KEY, JSON.stringify([...s])); }catch(e){}
}
// True when this webtop has a PIN and hasn't been opened with it in this browser session.
const webtopNeedsUnlock = (id)=> webtopIsLocked(id) && !pinUnlockedSet().has(id);

// Which webtop an icon lives on (top-level icons carry it; nested ones follow their parent).
function itemSpace(item){
  let cur = item, guard = 0;
  while(cur && cur.parentId && guard++ < 20) cur = state.icons.find(i=> i.id === cur.parentId);
  return cur ? (cur.space || state.activeWebtop) : state.activeWebtop;
}

async function verifyWebtopPin(id, pin){
  const lk = webtopById(id) && webtopById(id).lock; if(!lk) return true;
  const got = await pinDerive(pin, pinUnB64(lk.salt), lk.iter || PIN_ITER), want = pinUnB64(lk.hash);
  let diff = got.length ^ want.length;
  for(let i = 0; i < got.length && i < want.length; i++) diff |= got[i] ^ want[i];     // compares every byte, no early exit
  return diff === 0;
}
async function setWebtopPin(id, pin){
  const w = webtopById(id); if(!w) return;
  const salt = crypto.getRandomValues(new Uint8Array(16)), hash = await pinDerive(pin, salt, PIN_ITER);
  w.lock = { salt: pinB64(salt), hash: pinB64(hash), iter: PIN_ITER };
  pinMarkUnlocked(id, true); save(); renderWebtopTabs();
}
function removeWebtopPin(id){
  const w = webtopById(id); if(!w) return;
  delete w.lock; pinMarkUnlocked(id, false); save(); renderWebtopTabs();
}

/* ---------- the small PIN dialog ---------- */
// fields: [{ label, key }]. Resolves with { key: value } or null if cancelled. `check(values)` may return an error string.
function pinDialog({ title, message, fields, okLabel, check }){
  return new Promise(resolve=>{
    const back = document.createElement("div"); back.className = "cloud-modal-back pin-back";
    const box = document.createElement("div"); box.className = "cloud-modal pin-dialog"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    const h = document.createElement("div"); h.className = "confirm-title"; h.textContent = title;
    const msg = document.createElement("div"); msg.className = "cloud-note"; msg.textContent = message || "";
    const inputs = fields.map(f=>{
      const l = document.createElement("label"); l.className = "pin-field"; l.textContent = f.label;
      const i = document.createElement("input"); i.type = "password"; i.inputMode = "numeric"; i.autocomplete = "off"; i.maxLength = 16; i.className = "note-input"; i.placeholder = "••••";
      l.appendChild(i); return { f, i, l };
    });
    const err = document.createElement("div"); err.className = "pin-error"; err.setAttribute("role", "alert");
    const ok = document.createElement("button"); ok.className = "primary"; ok.type = "button"; ok.textContent = okLabel || "OK";
    const no = document.createElement("button"); no.type = "button"; no.textContent = "Cancel";
    const finish = (v)=>{ back.remove(); resolve(v); };
    const submit = async ()=>{
      const values = {}; inputs.forEach(x=> values[x.f.key] = x.i.value);
      const problem = check ? await check(values) : "";
      if(problem){ err.textContent = problem; inputs[0].i.select(); return; }
      finish(values);
    };
    ok.addEventListener("click", submit); no.addEventListener("click", ()=> finish(null));
    back.addEventListener("pointerdown", (e)=>{ if(e.target === back) finish(null); });
    box.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); submit(); } else if(e.key === "Escape"){ e.stopPropagation(); finish(null); } });
    box.append(h, msg, ...inputs.map(x=> x.l), err, ok, no);
    back.appendChild(box); document.body.appendChild(back); inputs[0].i.focus();
  });
}
const pinValid = (p)=> /^\d{4,16}$/.test(p) ? "" : "Use 4 to 16 digits.";

// Asks for the webtop's PIN; true if it was entered correctly. Wrong guesses slow down after five.
async function promptUnlock(id){
  const w = webtopById(id); if(!w || !w.lock) return true;
  const r = await pinDialog({ title: "Unlock \u201C" + w.name + "\u201D", message: "This webtop is private. Enter its PIN to open it.", fields:[{ label:"PIN", key:"pin" }], okLabel:"Unlock",
    check: async (v)=>{
      const f = pinFails[id] || (pinFails[id] = { n:0, until:0 });
      if(Date.now() < f.until) return "Too many tries. Wait " + Math.ceil((f.until - Date.now()) / 1000) + " seconds.";
      if(await verifyWebtopPin(id, v.pin)){ f.n = 0; return ""; }
      f.n++; if(f.n >= 5){ f.n = 0; f.until = Date.now() + 30000; return "Wrong PIN. Wait 30 seconds before trying again."; }
      return "That PIN isn't right.";
    } });
  if(!r) return false;
  pinMarkUnlocked(id, true); return true;
}

async function promptSetPin(id){
  if(!pinSupported()){ showAppBanner("pin", "PINs need a secure (https) connection in this browser.", [{ label:"OK", fn: ()=>{} }], 6000); return; }
  const r = await pinDialog({ title: webtopIsLocked(id) ? "Change PIN" : "Set a PIN", message: "4 to 16 digits. You'll enter it when opening this webtop in a new browser session. If you forget it, it can't be recovered here.",
    fields:[{ label:"New PIN", key:"a" }, { label:"Repeat the PIN", key:"b" }], okLabel:"Save PIN",
    check: (v)=> pinValid(v.a) || (v.a !== v.b ? "The two PINs don't match." : "") });
  if(r) await setWebtopPin(id, r.a);
}
async function promptRemovePin(id){
  const w = webtopById(id); if(!w || !w.lock) return;
  const r = await pinDialog({ title: "Remove the PIN", message: "Enter the current PIN to make \u201C" + w.name + "\u201D open to anyone using this device.", fields:[{ label:"Current PIN", key:"pin" }], okLabel:"Remove PIN",
    check: async (v)=> (await verifyWebtopPin(id, v.pin)) ? "" : "That PIN isn't right." });
  if(r) removeWebtopPin(id);
}
async function promptChangePin(id){
  const r = await pinDialog({ title: "Current PIN", message: "Enter the current PIN first.", fields:[{ label:"Current PIN", key:"pin" }], okLabel:"Next",
    check: async (v)=> (await verifyWebtopPin(id, v.pin)) ? "" : "That PIN isn't right." });
  if(r) await promptSetPin(id);
}

/* ---------- lock now, and the lock screen ---------- */
function lockWebtopNow(id){
  if(!webtopIsLocked(id)) return;
  pinMarkUnlocked(id, false);
  if(id === state.activeWebtop){
    const other = state.webtops.find(w=> w.id !== id && !webtopNeedsUnlock(w.id));
    if(other) switchWebtop(other.id); else showLockScreen();
  }
}
function showLockScreen(){
  hideLockScreen();
  const id = state.activeWebtop, w = webtopById(id); if(!w || !webtopNeedsUnlock(id)) return;
  const el = document.createElement("div"); el.className = "lock-screen"; el.id = "lockScreen"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Private webtop");
  const card = document.createElement("div"); card.className = "lock-card";
  card.innerHTML = '<div class="lock-icon"></div><div class="lock-name"></div><div class="cloud-note">This webtop is private. Enter its PIN to open it.</div>';
  card.querySelector(".lock-icon").textContent = w.icon; card.querySelector(".lock-name").textContent = w.name;
  const input = document.createElement("input"); input.type = "password"; input.inputMode = "numeric"; input.autocomplete = "off"; input.maxLength = 16; input.className = "note-input"; input.placeholder = "PIN"; input.setAttribute("aria-label", "PIN");
  const err = document.createElement("div"); err.className = "pin-error"; err.setAttribute("role", "alert");
  const go = document.createElement("button"); go.type = "button"; go.className = "primary"; go.textContent = "Unlock";
  const attempt = async ()=>{
    const f = pinFails[id] || (pinFails[id] = { n:0, until:0 });
    if(Date.now() < f.until){ err.textContent = "Too many tries. Wait " + Math.ceil((f.until - Date.now()) / 1000) + " seconds."; return; }
    if(await verifyWebtopPin(id, input.value)){ f.n = 0; pinMarkUnlocked(id, true); hideLockScreen(); render(); return; }
    f.n++; err.textContent = f.n >= 5 ? (f.n = 0, f.until = Date.now() + 30000, "Wrong PIN. Wait 30 seconds before trying again.") : "That PIN isn't right.";
    input.value = ""; input.focus();
  };
  go.addEventListener("click", attempt); input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") attempt(); });
  card.append(input, err, go);
  state.webtops.filter(o=> o.id !== id && !webtopNeedsUnlock(o.id)).slice(0, 4).forEach(o=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "lock-other"; b.textContent = o.icon + "  Open " + o.name;
    b.addEventListener("click", ()=>{ hideLockScreen(); switchWebtop(o.id); }); card.appendChild(b);
  });
  el.appendChild(card); document.body.appendChild(el); input.focus();
}
function hideLockScreen(){ const e = document.getElementById("lockScreen"); if(e) e.remove(); }
// Called once the app has drawn at startup: if the webtop you were last on is private, cover it until it's unlocked.
function enforceActiveWebtopLock(){ if(webtopNeedsUnlock(state.activeWebtop)) showLockScreen(); }
