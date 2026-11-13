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

  const heading = wapEl("h4", "wap-heading");
  box.appendChild(heading);

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

  function cardFor(app, i){
    const card = wapEl("button", "preset-card wap-card");
    card.type = "button";
    const iconWrap = wapEl("div", "wap-icon");
    const domain = faviconDomain(app.url);
    iconWrap.innerHTML = domain
      ? pictorialGlyphHTML(COLORS[i % COLORS.length], [`https://icons.duckduckgo.com/ip3/${domain}.ico`, `https://www.google.com/s2/favicons?sz=128&domain=${domain}`])
      : pictorialGlyphHTML(COLORS[i % COLORS.length], []);
    card.appendChild(iconWrap);
    card.appendChild(wapEl("b", "", app.label));
    if(alreadyHas(app.url)) card.appendChild(wapEl("small", "wap-added", "Already added"));
    card.addEventListener("click", ()=> pick(app));
    return card;
  }

  function draw(){
    const q = query.trim().toLowerCase();
    let list;
    if(q){
      list = Object.keys(APP_CATALOG)
        .filter(id=> APP_CATALOG[id].label.toLowerCase().includes(q))
        .map(id=> ({ id, ...APP_CATALOG[id] }));
      heading.textContent = `Results for \u201C${query.trim()}\u201D`;
    }else{
      list = appsInCategory(activeCat);
      heading.textContent = CATEGORY_LABELS[activeCat] || "Web apps";
    }
    grid.innerHTML = "";
    statusEl.textContent = "";
    if(!list.length){ grid.appendChild(wapEl("p", "wap-empty", "No matches.")); return; }
    list.forEach((app, i)=> grid.appendChild(cardFor(app, i)));
  }

  const pillEls = {};
  CATEGORY_ORDER.forEach(catId=>{
    const p = wapEl("button", "wap-pill" + (catId === activeCat ? " active" : ""), CATEGORY_LABELS[catId]);
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
