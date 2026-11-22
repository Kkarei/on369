"use strict";

/* ============ PASSPHRASE ENCRYPTION FOR BACKUPS ============
   Encrypts a backup with a passphrase before it leaves the page (AES-256-GCM, key from the passphrase with
   PBKDF2-SHA-256). The passphrase is never stored or sent anywhere: if it is forgotten, an encrypted backup
   cannot be opened by anyone, on369 included. Used by the Backup & Restore file export and, optionally, the
   Cloud Backup. */
const BC_ITER = 250000;
const BC_MIN_LENGTH = 8;

const bcSupported = ()=> !!(window.crypto && crypto.subtle);
function bcToB64(u8){ let s = ""; for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function bcFromB64(b){ const s = atob(b), u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function bcKey(pass, salt, iter){
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pass).normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", hash:"SHA-256", salt, iterations: iter }, base, { name:"AES-GCM", length:256 }, false, ["encrypt", "decrypt"]);
}
const bcIsBox = (o)=> !!(o && typeof o === "object" && o.enc === "aes-gcm-256" && typeof o.ct === "string" && typeof o.salt === "string" && typeof o.iv === "string");

// Encrypts any JSON-able value. Returns a plain object that is safe to store or upload.
async function bcEncrypt(value, pass){
  if(!bcSupported()) throw new Error("Encryption needs a secure (https) connection in this browser.");
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await bcKey(pass, salt, BC_ITER);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  return { enc:"aes-gcm-256", kdf:"pbkdf2-sha256", iter: BC_ITER, salt: bcToB64(salt), iv: bcToB64(iv), ct: bcToB64(ct) };
}
async function bcDecrypt(box, pass){
  if(!bcSupported()) throw new Error("Decryption needs a secure (https) connection in this browser.");
  try{
    const key = await bcKey(pass, bcFromB64(box.salt), Number(box.iter) || BC_ITER);
    const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv: bcFromB64(box.iv) }, key, bcFromB64(box.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }catch(e){ throw new Error("That passphrase doesn't open this backup, or the backup is damaged."); }
}

// A small passphrase dialog. fields: [{ key, label }]; check(values) may return an error message. Resolves { key: value } or null.
function passphraseDialog({ title, message, fields, okLabel, check }){
  return new Promise(resolve=>{
    const back = document.createElement("div"); back.className = "cloud-modal-back pin-back";
    const box = document.createElement("div"); box.className = "cloud-modal pin-dialog"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    const h = document.createElement("div"); h.className = "confirm-title"; h.textContent = title;
    const msg = document.createElement("div"); msg.className = "cloud-note"; msg.textContent = message || "";
    const rows = (fields || [{ key:"pass", label:"Passphrase" }]).map(f=>{
      const l = document.createElement("label"); l.className = "pin-field"; l.textContent = f.label;
      const i = document.createElement("input"); i.type = "password"; i.autocomplete = "off"; i.className = "note-input pass-input"; i.maxLength = 200;
      l.appendChild(i); return { f, i, l };
    });
    const err = document.createElement("div"); err.className = "pin-error"; err.setAttribute("role", "alert");
    const ok = document.createElement("button"); ok.className = "primary"; ok.type = "button"; ok.textContent = okLabel || "OK";
    const no = document.createElement("button"); no.type = "button"; no.textContent = "Cancel";
    const finish = (v)=>{ back.remove(); resolve(v); };
    const submit = async ()=>{
      const values = {}; rows.forEach(r=> values[r.f.key] = r.i.value);
      const problem = check ? await check(values) : "";
      if(problem){ err.textContent = problem; rows[0].i.select(); return; }
      finish(values);
    };
    ok.addEventListener("click", submit); no.addEventListener("click", ()=> finish(null));
    back.addEventListener("pointerdown", (e)=>{ if(e.target === back) finish(null); });
    box.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); submit(); } else if(e.key === "Escape"){ e.stopPropagation(); finish(null); } });
    box.append(h, msg, ...rows.map(r=> r.l), err, ok, no);
    back.appendChild(box); document.body.appendChild(back); rows[0].i.focus();
  });
}
// Choosing a new passphrase: at least 8 characters, typed twice.
const bcChoosePassphrase = (title, message)=> passphraseDialog({ title, message, okLabel:"Use this passphrase",
  fields:[{ key:"a", label:"New passphrase" }, { key:"b", label:"Repeat the passphrase" }],
  check: (v)=> v.a.length < BC_MIN_LENGTH ? "Use at least " + BC_MIN_LENGTH + " characters." : (v.a !== v.b ? "The two passphrases don't match." : "") }).then(r=> r ? r.a : null);
