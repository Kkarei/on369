"use strict";

/* ============ URL FROM THE CLIPBOARD ============
   When you add a bookmark or web app, a link you just copied is filled in for you.
   Browsers only allow this on https:// (or localhost) pages and may ask your permission
   the first time, so the form also has a Paste button that always works. */

// Returns a clean http(s) URL if the text is just a link (or looks like one), otherwise null.
function cleanClipboardUrl(text){
  const t = String(text || "").trim();
  if(!t || t.length > 2000 || /\s/.test(t)) return null;                 // a link is one unbroken piece of text
  let candidate = null;
  if(/^https?:\/\//i.test(t)) candidate = t;
  else if(/^(www\.)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(t)) candidate = "https://" + t;
  else if(/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]\S*)?$/i.test(t)) candidate = "http://" + t;
  if(!candidate) return null;
  try{ const u = new URL(candidate); return u.protocol === "http:" || u.protocol === "https:" ? candidate : null; }catch(_){ return null; }
}
async function readClipboardText(){
  if(!navigator.clipboard || !navigator.clipboard.readText) throw new Error("unsupported");
  return navigator.clipboard.readText();
}

const clipHint = document.getElementById("clipHint"), clipHintText = document.getElementById("clipHintText");
const clipFillToggle = document.getElementById("clipFillToggle");
function showClipHint(text){ clipHintText.textContent = text; clipHint.style.display = text ? "" : "none"; }

// Called when the add-bookmark / add-web-app form opens.
function autofillUrlFromClipboard(ctx){
  showClipHint("");
  if(state.clipboardUrlFill === false) return;
  readClipboardText().then(text=>{
    const url = cleanClipboardUrl(text);
    if(!url || modalCtx !== ctx || itemUrl.value.trim()) return;       // form closed, or you already typed something
    itemUrl.value = url; showClipHint("Filled in from your clipboard");
  }).catch(()=>{ /* no permission, unsupported, or nothing useful: leave the field alone */ });
}
function updateClipFillToggle(){
  const on = state.clipboardUrlFill !== false;
  clipFillToggle.classList.toggle("on", on); clipFillToggle.setAttribute("aria-checked", String(on));
}

/* Runs once at startup (see main.js). */
function initServicesClipboardUrl(){
  document.getElementById("urlPaste").addEventListener("click", async ()=>{
    try{
      const text = await readClipboardText(), url = cleanClipboardUrl(text);
      if(url){ itemUrl.value = url; showClipHint("Pasted from your clipboard"); } else showClipHint("No link found in your clipboard");
    }catch(_){ showClipHint("Couldn't read the clipboard. Paste with Ctrl+V instead."); }
    itemUrl.focus();
  });
  document.getElementById("clipClear").addEventListener("click", ()=>{ itemUrl.value = ""; showClipHint(""); itemUrl.focus(); });
  itemUrl.addEventListener("input", ()=> showClipHint(""));
  clipFillToggle.addEventListener("click", ()=>{ state.clipboardUrlFill = state.clipboardUrlFill === false; updateClipFillToggle(); save(); });
  updateClipFillToggle();
}
