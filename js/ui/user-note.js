"use strict";

/* ============ USER NOTE ============
   A short line of your own (a name, a favourite quote) shown in the top bar or as a
   footnote. Kept to 50 characters so it always fits. It is saved with the other
   settings, so it travels in cloud and file backups. */
const USER_NOTE_MAX = 50;
const userNoteTop = document.getElementById("userNoteTop"), userNoteFoot = document.getElementById("userNoteFoot");
const userNoteInput = document.getElementById("userNoteInput"), userNotePos = document.getElementById("userNotePos"), userNoteCount = document.getElementById("userNoteCount");

function applyUserNote(){
  const n = state.userNote || { text:"", position:"off" };
  const text = String(n.text || "").slice(0, USER_NOTE_MAX).trim();
  let pos = n.position;
  if(pos === "top" && window.innerWidth <= 520) pos = "bottom";      // no room in the top bar on a small phone
  userNoteTop.textContent = pos === "top" ? text : "";  userNoteTop.title = text;  userNoteTop.style.display = pos === "top" && text ? "" : "none";
  userNoteFoot.textContent = pos === "bottom" ? text : ""; userNoteFoot.style.display = pos === "bottom" && text ? "" : "none";
  if(document.activeElement !== userNoteInput) userNoteInput.value = n.text || "";
  userNotePos.value = n.position || "off";
  userNoteCount.textContent = `${(n.text || "").length}/${USER_NOTE_MAX}`;
}

/* Runs once at startup (see main.js). */
function initUiUserNote(){
  let timer = null;
  userNoteInput.addEventListener("input", ()=>{
    state.userNote.text = userNoteInput.value.slice(0, USER_NOTE_MAX);
    state.userNote.updatedAt = Date.now();
    if(state.userNote.text.trim() && state.userNote.position === "off") state.userNote.position = "bottom";   // typing a note shows it
    applyUserNote();
    clearTimeout(timer); timer = setTimeout(()=> save(), 400);
  });
  userNotePos.addEventListener("change", ()=>{ state.userNote.position = userNotePos.value; state.userNote.updatedAt = Date.now(); applyUserNote(); save(); });
  window.addEventListener("resize", applyUserNote);
}
