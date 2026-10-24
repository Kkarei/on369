"use strict";

/* ============ USERNOTE ============
   A short line of your own (a name, a favourite quote) shown in the top bar or the
   footer, aligned left, center or right. Kept to 50 characters so it always fits.
   Saved with the other settings, so it travels in cloud and file backups. */
const USER_NOTE_MAX = 50;
const userNoteTop = document.getElementById("userNoteTop"), userNoteFoot = document.getElementById("userNoteFoot");
const userNoteInput = document.getElementById("userNoteInput"), userNoteCount = document.getElementById("userNoteCount");
const noteShowToggle = document.getElementById("noteShowToggle"), notePlace = document.getElementById("notePlace"), notePlaceHint = document.getElementById("notePlaceHint");

// Accepts anything we ever saved (including the older single "position" format) and returns a complete, valid note.
function normalizeUserNote(u){
  const n = { text:"", position:"top", align:"center", visible:false, updatedAt:0, ...(u || {}) };
  if(n.position === "off"){ n.visible = false; n.position = "top"; }
  else if(!u || u.visible === undefined) n.visible = !!String(n.text || "").trim();   // older saves: shown whenever there was text
  if(n.position !== "top" && n.position !== "bottom") n.position = "top";
  if(n.align !== "left" && n.align !== "center" && n.align !== "right") n.align = "center";
  n.text = String(n.text || "").slice(0, USER_NOTE_MAX);
  n.visible = !!n.visible;
  return n;
}

function applyUserNote(){
  const n = state.userNote = normalizeUserNote(state.userNote);
  const text = n.text.trim(), show = n.visible && !!text;
  const narrow = window.innerWidth <= 520;                    // a small phone has no room in the top bar
  const where = n.position === "top" && narrow ? "bottom" : n.position;
  userNoteTop.textContent = show && where === "top" ? text : "";
  userNoteTop.title = text; userNoteTop.style.textAlign = n.align; userNoteTop.style.display = show && where === "top" ? "" : "none";
  userNoteFoot.textContent = show && where === "bottom" ? text : "";
  userNoteFoot.className = "user-note-foot a-" + n.align; userNoteFoot.style.display = show && where === "bottom" ? "" : "none";
  if(document.activeElement !== userNoteInput) userNoteInput.value = n.text;
  userNoteCount.textContent = `${n.text.length}/${USER_NOTE_MAX}`;
  noteShowToggle.classList.toggle("on", n.visible); noteShowToggle.setAttribute("aria-checked", String(n.visible));
  notePlace.querySelectorAll("button").forEach(b=> b.classList.toggle("on", n.visible && b.dataset.pos === n.position && b.dataset.align === n.align));
  notePlaceHint.textContent = n.position === "top" && narrow
    ? "This screen is too narrow for the top bar, so your usernote is shown in the footer."
    : n.position === "top" ? "Left starts right after the logo, or at the edge if the logo is hidden." : "The footer sits between the item count and the + button.";
}

/* Runs once at startup (see main.js). */
function initUiUserNote(){
  let timer = null;
  const changed = ()=>{ state.userNote.updatedAt = Date.now(); applyUserNote(); clearTimeout(timer); timer = setTimeout(()=> save(), 400); };
  userNoteInput.addEventListener("input", ()=>{
    state.userNote.text = userNoteInput.value.slice(0, USER_NOTE_MAX);
    if(state.userNote.text.trim()) state.userNote.visible = true;           // typing a usernote shows it
    changed();
  });
  noteShowToggle.addEventListener("click", ()=>{
    state.userNote.visible = !state.userNote.visible; changed();
    if(state.userNote.visible && !state.userNote.text.trim()) userNoteInput.focus();
  });
  notePlace.querySelectorAll("button").forEach(b=> b.addEventListener("click", ()=>{
    state.userNote.position = b.dataset.pos; state.userNote.align = b.dataset.align; state.userNote.visible = true; changed();
  }));
  window.addEventListener("resize", applyUserNote);
}
