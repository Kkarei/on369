"use strict";

/* ============ SEARCH BAR ============ */
const ENGINES = {
  google:     { url: "https://www.google.com/search?q=",   domain: "google.com",      letter: "G", color: "#4A8DF0" },
  bing:       { url: "https://www.bing.com/search?q=",     domain: "bing.com",        letter: "B", color: "#008373" },
  duckduckgo: { url: "https://duckduckgo.com/?q=",         domain: "duckduckgo.com",  letter: "D", color: "#DE5833" },
  yahoo:      { url: "https://search.yahoo.com/search?p=", domain: "search.yahoo.com",letter: "Y", color: "#7B2FF7" },
  brave:      { url: "https://search.brave.com/search?q=",  domain: "search.brave.com",letter: "B", color: "#FB542B" },
  ecosia:     { url: "https://www.ecosia.org/search?q=",    domain: "ecosia.org",      letter: "E", color: "#36ACB0" }
};

let searchMode = "app";

const searchInput = document.getElementById("searchInput");

const enginePicker = document.getElementById("enginePicker");

const searchModeWrap = document.getElementById("searchMode");


function doWebSearch(){
  const q = searchInput.value.trim();
  if(!q) return;
  const engine = ENGINES[state.searchEngine] || ENGINES.google;
  window.open(engine.url + encodeURIComponent(q), "_blank", "noopener");
}


function applyAppSearch(raw){
  const query = (raw || "").trim().toLowerCase();
  const rootItems = state.icons.filter(i=>i.parentId===null);
  let anyMatch = !query;
  const selfMatch = (it)=> it.label.toLowerCase().includes(query) || (it.url || "").toLowerCase().includes(query);
  const hasMatch = (it)=> selfMatch(it) || (it.type === "folder" && state.icons.some(c=> c.parentId === it.id && hasMatch(c)));
  gridLayer.querySelectorAll(".icon").forEach(el=>{
    const item = rootItems.find(i=>i.id===el.dataset.id);
    const match = !query || (item && hasMatch(item));
    el.style.display = match ? "" : "none";
    if(match) anyMatch = true;
  });
  if(query && !anyMatch){
    emptyHint.innerHTML = `No matches for "<b>${escapeHtml(raw.trim())}</b>"`;
    emptyHint.style.display = "block";
  }else if(!query){
    emptyHint.innerHTML = "Empty webtop.<br><b>Right-click</b> to add a bookmark or folder.";
    emptyHint.style.display = rootItems.length === 0 ? "block" : "none";
  }else{
    emptyHint.style.display = "none";
  }
}

function clearAppSearch(){
  gridLayer.querySelectorAll(".icon").forEach(el=> el.style.display = "");
  emptyHint.innerHTML = "Empty webtop.<br><b>Right-click</b> to add a bookmark or folder.";
  emptyHint.style.display = state.icons.filter(i=>i.parentId===null).length === 0 ? "block" : "none";
}


/* Runs once at startup (see main.js), in the original order. */
function initUiSearchBar(){
  if(!ENGINES[state.searchEngine]) state.searchEngine = "google";
  Object.keys(ENGINES).forEach(key=>{
    const eng = ENGINES[key];
    const btn = document.createElement("div");
    btn.className = "engine-btn" + (key === state.searchEngine ? " active" : "");
    btn.dataset.engine = key;
    btn.title = key.charAt(0).toUpperCase() + key.slice(1);

    // Real logo, fetched live: DuckDuckGo's icon service first (it 404s cleanly
    // on a miss), Google's favicon service second, colored letter as the final
    // offline-safe fallback. Built via DOM methods (not innerHTML/inline
    // onerror) so there's no HTML-attribute string-escaping to get wrong.
    const img = document.createElement("img");
    img.alt = eng.letter;
    img.src = `https://icons.duckduckgo.com/ip3/${eng.domain}.ico`;
    img.onerror = function(){
      img.onerror = function(){
        btn.innerHTML = "";
        btn.style.background = eng.color;
        btn.textContent = eng.letter;
      };
      img.src = `https://www.google.com/s2/favicons?sz=64&domain=${eng.domain}`;
    };
    btn.appendChild(img);

    btn.addEventListener("click", ()=>{
      state.searchEngine = key;
      enginePicker.querySelectorAll(".engine-btn").forEach(b=> b.classList.toggle("active", b.dataset.engine===key));
      save();
      searchInput.focus();
    });
    enginePicker.appendChild(btn);
  });

  searchModeWrap.querySelectorAll(".mode-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      searchMode = btn.dataset.mode;
      searchModeWrap.querySelectorAll(".mode-btn").forEach(b=> b.classList.toggle("active", b===btn));
      enginePicker.classList.toggle("visible", searchMode === "web");
      searchInput.placeholder = searchMode === "web" ? "Search the web…" : "Search your webtop…";
      if(searchMode === "app") applyAppSearch(searchInput.value);
      else clearAppSearch();
      searchInput.focus();
    });
  });

  searchInput.addEventListener("input", ()=>{
    if(searchMode === "app") applyAppSearch(searchInput.value);
  });
  searchInput.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && searchMode === "web") doWebSearch();
    if(e.key === "Enter" && searchMode === "app" && searchInput.value.trim()){
      const el = Array.from(gridLayer.querySelectorAll(".icon")).find(n=> n.style.display !== "none");
      const it = el && state.icons.find(i=> i.id === el.dataset.id);
      if(it) openItem(it);
    }
    if(e.key === "Escape"){ searchInput.value = ""; applyAppSearch(""); searchInput.blur(); }
  });
  document.getElementById("searchGo").addEventListener("click", ()=>{
    if(searchMode === "web") doWebSearch(); else searchInput.focus();
  });

}
