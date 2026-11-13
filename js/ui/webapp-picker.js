"use strict";

/* ============ WEB APP PICKER ============
   Opened from the "Web app" row of the add menu (openAddMenu, modals.js)
   and the empty-space right-click menu (context-menus.js) — replaces the
   old "type a URL, guess at a name" flow for that entry point specifically.
   Bookmark still covers "I have a specific URL" (a link at the bottom of
   this picker goes straight there for anything not in the catalog), so the
   two no longer do the same thing: Bookmark is for a URL you provide,
   Web app is for picking a known one, by name and real icon.

   Local DOM helper, deliberately NOT named like boards.js's `bx` — both
   files share one global scope via plain <script> tags, so reusing that
   exact name here would be a duplicate top-level `const` and a parse error
   in whichever file loads second. */
const wapEl = (tag, cls, text)=>{ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };

// Remembered for the rest of the session (not persisted to state/disk) —
// each reopening of the picker starts in whichever view you used last.
let wapViewMode = "grid";

const WAP_GRID_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"></rect><rect x="13" y="3" width="8" height="8" rx="1.5"></rect><rect x="3" y="13" width="8" height="8" rx="1.5"></rect><rect x="13" y="13" width="8" height="8" rx="1.5"></rect></svg>`;
const WAP_LIST_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;

function openWebAppPicker(opts){
  opts = opts || {};
  const parentId = opts.parentId != null ? opts.parentId : null;
  let activeCat = "featured";
  let query = "";

  const back = wapEl("div", "cloud-modal-back");
  const box = wapEl("div", "cloud-modal preset-modal webapp-picker");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");

  const close = ()=>{ document.removeEventListener("keydown", onKey, true); back.remove(); };
  const onKey = (e)=>{ if(e.key === "Escape"){ e.stopPropagation(); close(); } };

  box.appendChild(wapEl("div", "confirm-title", "Add a web app"));
  box.appendChild(wapEl("p", "cloud-note", "Pick a known app below, or add any other site as a bookmark."));

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "wap-search";
  searchInput.placeholder = "Search web apps\u2026";
  box.appendChild(searchInput);

  const pills = wapEl("div", "wap-pills");
  box.appendChild(pills);

  const headingRow = wapEl("div", "wap-heading-row");
  const heading = wapEl("h4", "wap-heading");
  const viewToggle = wapEl("div", "wap-view-toggle");
  viewToggle.setAttribute("role", "group");
  viewToggle.setAttribute("aria-label", "View as");
  const gridBtn = wapEl("button", "wap-view-btn", "");
  gridBtn.type = "button"; gridBtn.title = "Grid view"; gridBtn.setAttribute("aria-label", "Grid view"); gridBtn.innerHTML = WAP_GRID_SVG;
  const listBtn = wapEl("button", "wap-view-btn", "");
  listBtn.type = "button"; listBtn.title = "List view"; listBtn.setAttribute("aria-label", "List view"); listBtn.innerHTML = WAP_LIST_SVG;
  const syncViewBtns = ()=>{
    gridBtn.classList.toggle("active", wapViewMode === "grid");
    listBtn.classList.toggle("active", wapViewMode === "list");
    gridBtn.setAttribute("aria-pressed", String(wapViewMode === "grid"));
    listBtn.setAttribute("aria-pressed", String(wapViewMode === "list"));
  };
  gridBtn.addEventListener("click", ()=>{ wapViewMode = "grid"; syncViewBtns(); draw(); });
  listBtn.addEventListener("click", ()=>{ wapViewMode = "list"; syncViewBtns(); draw(); });
  syncViewBtns();
  viewToggle.append(gridBtn, listBtn);
  headingRow.append(heading, viewToggle);
  box.appendChild(headingRow);

  const grid = wapEl("div", "preset-grid wap-grid");
  box.appendChild(grid);

  const statusEl = wapEl("div", "wap-status");
  box.appendChild(statusEl);

  function alreadyHas(url){
    return state.icons.some(i=> i.type === "webapp" && i.url === url && i.parentId === parentId &&
      (parentId !== null || i.space === state.activeWebtop));
  }

  function pick(app){
    if(alreadyHas(app.url)){
      statusEl.textContent = `${app.label} is already on this webtop.`;
      return;
    }
    const slot = nextFreeSlot(parentId);
    const item = createItem("webapp", {
      label: app.label, url: app.url, color: COLORS[state.icons.length % COLORS.length],
      x: slot.x, y: slot.y, parentId
    });
    if(!item) return;
    if(parentId === null) item.space = state.activeWebtop;
    state.icons.push(item);
    tryEnrichWebApp(item);
    save();
    render();
    close();
  }

  function iconHTML(app, i){
    const domain = faviconDomain(app.url);
    return domain
      ? pictorialGlyphHTML(COLORS[i % COLORS.length], [`https://icons.duckduckgo.com/ip3/${domain}.ico`, `https://www.google.com/s2/favicons?sz=128&domain=${domain}`])
      : pictorialGlyphHTML(COLORS[i % COLORS.length], []);
  }

  function cardFor(app, i){
    const card = wapEl("button", "preset-card wap-card");
    card.type = "button";
    const iconWrap = wapEl("div", "wap-icon");
    iconWrap.innerHTML = iconHTML(app, i);
    card.appendChild(iconWrap);
    card.appendChild(wapEl("b", "", app.label));
    if(alreadyHas(app.url)) card.appendChild(wapEl("small", "wap-added", "Already added"));
    card.addEventListener("click", ()=> pick(app));
    return card;
  }

  function rowFor(app, i){
    const row = wapEl("button", "wap-row");
    row.type = "button";
    const iconWrap = wapEl("div", "wap-icon wap-icon-sm");
    iconWrap.innerHTML = iconHTML(app, i);
    row.appendChild(iconWrap);
    row.appendChild(wapEl("span", "wap-row-label", app.label));
    if(alreadyHas(app.url)) row.appendChild(wapEl("small", "wap-added", "Already added"));
    row.addEventListener("click", ()=> pick(app));
    return row;
  }

  // "all" isn't a stored category (app-catalog.js is untouched) — it's
  // handled here as a full, alphabetical listing of the whole catalog.
  function allApps(){
    return Object.keys(APP_CATALOG)
      .map(id=> ({ id, ...APP_CATALOG[id] }))
      .sort((a, b)=> a.label.localeCompare(b.label));
  }

  function draw(){
    const q = query.trim().toLowerCase();
    let list;
    if(q){
      list = Object.keys(APP_CATALOG)
        .filter(id=> APP_CATALOG[id].label.toLowerCase().includes(q))
        .map(id=> ({ id, ...APP_CATALOG[id] }));
      heading.textContent = `Results for \u201C${query.trim()}\u201D`;
    }else if(activeCat === "all"){
      list = allApps();
      heading.textContent = "All web apps";
    }else{
      list = appsInCategory(activeCat);
      heading.textContent = CATEGORY_LABELS[activeCat] || "Web apps";
    }
    grid.className = wapViewMode === "list" ? "wap-list" : "preset-grid wap-grid";
    grid.innerHTML = "";
    statusEl.textContent = "";
    if(!list.length){ grid.appendChild(wapEl("p", "wap-empty", "No matches.")); return; }
    const build = wapViewMode === "list" ? rowFor : cardFor;
    list.forEach((app, i)=> grid.appendChild(build(app, i)));
  }

  const pillEls = {};
  ["featured", "all", ...CATEGORY_ORDER.filter(c=> c !== "featured")].forEach(catId=>{
    const label = catId === "all" ? "All Apps" : CATEGORY_LABELS[catId];
    const p = wapEl("button", "wap-pill" + (catId === activeCat ? " active" : ""), label);
    p.type = "button";
    p.addEventListener("click", ()=>{
      activeCat = catId;
      query = "";
      searchInput.value = "";
      Object.values(pillEls).forEach(el=> el.classList.remove("active"));
      p.classList.add("active");
      draw();
    });
    pillEls[catId] = p;
    pills.appendChild(p);
  });

  searchInput.addEventListener("input", ()=>{
    query = searchInput.value;
    const searching = !!query.trim();
    Object.keys(pillEls).forEach(catId=> pillEls[catId].classList.toggle("active", !searching && catId === activeCat));
    draw();
  });
  draw();

  const footer = wapEl("div", "wap-footer");
  const bmLink = wapEl("button", "wap-link", "Don't see it? Add a bookmark instead");
  bmLink.type = "button";
  bmLink.addEventListener("click", ()=>{ close(); openItemModal({ mode:"create", type:"bookmark", parentId }); });
  const cancel = wapEl("button", "", "Cancel");
  cancel.type = "button";
  cancel.addEventListener("click", close);
  footer.append(bmLink, cancel);
  box.appendChild(footer);

  back.addEventListener("pointerdown", (e)=>{ if(e.target === back) close(); });
  document.addEventListener("keydown", onKey, true);
  back.appendChild(box);
  document.body.appendChild(back);
}
