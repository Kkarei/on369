"use strict";

/* ============ APP: NOTES ============ */
async function renderNotesApp(body, api){
  body.innerHTML = `
    <div class="notes-app">
      <div class="notes-side">
        <div class="notes-top"><input type="text" class="notes-search" placeholder="Search notes…" autocomplete="off"><div class="notes-new" title="New note">+</div></div>
        <div class="notes-list"></div>
      </div>
      <div class="notes-main"></div>
    </div>`;
  const listEl = body.querySelector(".notes-list");
  const mainEl = body.querySelector(".notes-main");
  const searchEl = body.querySelector(".notes-search");
  let notes = [], activeId = null, saveTimer = null;

  try{ const v = await api.storage.get("notes"); if(Array.isArray(v)) notes = v; }catch(e){ console.warn("on369: notes load failed", e); }
  notes.sort((a,b)=> b.updated - a.updated);
  activeId = notes.length ? notes[0].id : null;

  const persist = ()=> api.storage.set("notes", notes).catch(e=> console.warn("on369: notes save failed", e));
  const active = ()=> notes.find(n=> n.id === activeId);

  function renderList(){
    const q = searchEl.value.trim().toLowerCase();
    const shown = notes.filter(n=> !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q));
    listEl.innerHTML = "";
    if(!shown.length){
      const d = document.createElement("div"); d.className = "notes-empty";
      d.textContent = notes.length ? "No matching notes" : "No notes yet"; listEl.appendChild(d); return;
    }
    shown.forEach(n=>{
      const row = document.createElement("div");
      row.className = "notes-item" + (n.id === activeId ? " active" : "");
      const t = document.createElement("div"); t.className = "notes-item-title"; t.textContent = n.title || "Untitled";
      const sub = document.createElement("div"); sub.className = "notes-item-sub";
      sub.textContent = new Date(n.updated).toLocaleDateString() + " · " + (n.text.replace(/\s+/g," ").slice(0,40) || "Empty");
      row.append(t, sub);
      row.addEventListener("click", ()=>{ flush(); activeId = n.id; renderList(); renderEditor(); });
      listEl.appendChild(row);
    });
  }

  function flush(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer = null; persist(); } }

  function renderEditor(){
    const n = active();
    mainEl.innerHTML = "";
    if(!n){ const h = document.createElement("div"); h.className = "notes-hint"; h.textContent = "Create a note with +"; mainEl.appendChild(h); return; }
    const bar = document.createElement("div"); bar.className = "notes-bar";
    const title = document.createElement("input"); title.className = "notes-title"; title.placeholder = "Title"; title.value = n.title;
    const del = document.createElement("div"); del.className = "notes-del"; del.textContent = "Delete";
    bar.append(title, del);
    const text = document.createElement("textarea"); text.className = "notes-text"; text.placeholder = "Start writing…"; text.value = n.text;
    mainEl.append(bar, text);
    const changed = ()=>{
      n.title = title.value; n.text = text.value; n.updated = Date.now();
      clearTimeout(saveTimer); saveTimer = setTimeout(()=>{ saveTimer = null; persist(); }, 400);
      const row = listEl.querySelector(".notes-item.active");
      if(row){ row.firstChild.textContent = n.title || "Untitled"; row.lastChild.textContent = new Date(n.updated).toLocaleDateString() + " · " + (n.text.replace(/\s+/g," ").slice(0,40) || "Empty"); }
    };
    title.addEventListener("input", changed); text.addEventListener("input", changed);
    del.addEventListener("click", ()=>{
      if(!confirm("Delete this note?")) return;
      notes = notes.filter(x=> x.id !== n.id);
      activeId = notes.length ? notes[0].id : null;
      clearTimeout(saveTimer); saveTimer = null; persist(); renderList(); renderEditor();
    });
  }

  body.querySelector(".notes-new").addEventListener("click", ()=>{
    flush();
    const n = { id: uid(), title:"", text:"", updated: Date.now() };
    notes.unshift(n); activeId = n.id; searchEl.value = "";
    persist(); renderList(); renderEditor();
    const t = mainEl.querySelector(".notes-title"); if(t) t.focus();
  });
  searchEl.addEventListener("input", renderList);
  renderList(); renderEditor();
}


/* Runs once at startup (see main.js), in the original order. */
function initAppsNotes(){
  AppManager.register({
    id: "notes",
    name: "Notes",
    description: "Simple notes that save automatically.",
    version: "1.0.0",
    developer: "on369",
    category: "productivity",
    icon: notesSVG,
    render: renderNotesApp,
    permissions: ["storage"],
    fileAssociations: [".txt"],
    shortcuts: [],
    defaultWidth: 520, defaultHeight: 420,
    minWidth: 300, minHeight: 300,
    maxWidth: 900, maxHeight: 760,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });

}
