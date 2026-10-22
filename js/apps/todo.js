"use strict";

/* ============ APP: TODO ============ */
async function renderTodoApp(body, api){
  body.innerHTML = `
    <div class="todo-app">
      <div class="todo-input-row">
        <input type="text" class="todo-input" placeholder="Add a task…" autocomplete="off">
        <div class="todo-add-btn" title="Add">+</div>
      </div>
      <div class="todo-filters">
        <button class="todo-filter active" data-filter="all">All</button>
        <button class="todo-filter" data-filter="active">Active</button>
        <button class="todo-filter" data-filter="done">Done</button>
      </div>
      <div class="todo-list"><div class="todo-empty">Loading…</div></div>
      <div class="todo-footer">
        <span class="todo-count">…</span>
        <span class="todo-clear">Clear completed</span>
      </div>
    </div>
  `;

  const input = body.querySelector(".todo-input");
  const addBtn = body.querySelector(".todo-add-btn");
  const listEl = body.querySelector(".todo-list");
  const countEl = body.querySelector(".todo-count");
  const clearEl = body.querySelector(".todo-clear");
  const filterBtns = body.querySelectorAll(".todo-filter");

  let filter = "all";
  let todos = [];

  // Load through the mediated storage API (namespaced per app, same
  // IndexedDB/localStorage engine as everything else) rather than a raw
  // shared localStorage key any app could collide with. One-time
  // migration of pre-AppManager data, same pattern as the webtop's own
  // legacy-blob migration.
  let loaded = await api.storage.get("tasks");
  if(loaded === null){
    try{
      const legacyRaw = localStorage.getItem("on369.todos.v1");
      if(legacyRaw){
        loaded = JSON.parse(legacyRaw);
        await api.storage.set("tasks", loaded);
      }
    }catch(e){ /* no legacy data, or it was malformed — start empty */ }
  }
  todos = Array.isArray(loaded) ? loaded : [];

  function persist(){
    api.storage.set("tasks", todos).catch(e=> console.warn("on369: todo save failed", e));
  }
  function checkSVG(){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"></path></svg>`;
  }

  function renderList(){
    const visible = todos.filter(t=>{
      if(filter==="active") return !t.done;
      if(filter==="done") return t.done;
      return true;
    });
    if(visible.length===0){
      listEl.innerHTML = `<div class="todo-empty">${todos.length===0 ? "No tasks yet — add one above." : "Nothing here."}</div>`;
    }else{
      listEl.innerHTML = visible.map(t=>`
        <div class="todo-item${t.done?" done":""}" data-id="${t.id}">
          <div class="todo-check">${checkSVG()}</div>
          <span class="todo-text">${escapeHtml(t.text)}</span>
          <div class="todo-del" title="Delete">&#10005;</div>
        </div>
      `).join("");
    }
    const remaining = todos.filter(t=>!t.done).length;
    countEl.textContent = `${remaining} item${remaining===1?"":"s"} left`;

    listEl.querySelectorAll(".todo-check, .todo-text").forEach(el=>{
      el.addEventListener("click", ()=>{
        const id = el.closest(".todo-item").dataset.id;
        const t = todos.find(x=>x.id===id);
        if(t){ t.done = !t.done; persist(); renderList(); }
      });
    });
    listEl.querySelectorAll(".todo-del").forEach(el=>{
      el.addEventListener("click", (e)=>{
        e.stopPropagation();
        const id = el.closest(".todo-item").dataset.id;
        todos = todos.filter(x=>x.id!==id);
        persist(); renderList();
      });
    });
  }

  function addTodo(){
    const text = input.value.trim();
    if(!text) return;
    todos.push({ id: uid(), text, done:false, createdAt: Date.now() });
    input.value = "";
    persist();
    renderList();
    input.focus();
  }

  addBtn.addEventListener("click", addTodo);
  input.addEventListener("keydown", (e)=>{
    if(e.key==="Enter") addTodo();
  });
  filterBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      filter = btn.dataset.filter;
      filterBtns.forEach(b=> b.classList.toggle("active", b===btn));
      renderList();
    });
  });
  clearEl.addEventListener("click", ()=>{
    todos = todos.filter(t=>!t.done);
    persist();
    renderList();
  });

  renderList();
}


/* Runs once at startup (see main.js), in the original order. */
function initAppsTodo(){
  AppManager.register({
    id: "todo",
    name: "Todo",
    description: "A simple task list with filtering and completion tracking.",
    version: "1.0.0",
    developer: "on369",
    category: "productivity",
    icon: todoSVG,
    render: renderTodoApp,
    permissions: ["storage"],
    fileAssociations: [".todo"],
    shortcuts: [],
    defaultWidth: 320, defaultHeight: 460,
    minWidth: 260, minHeight: 320,
    maxWidth: 520, maxHeight: 720,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });



}
