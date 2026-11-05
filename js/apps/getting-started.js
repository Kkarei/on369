"use strict";

/* ============ GETTING STARTED APP ============
   A short, hands-on tour plus a Features tab — replaces the old default
   "Getting Started" folder (see ensureGettingStartedApp in bootstrap.js).
   Every guide step is a small sandboxed demo: nothing it does touches the
   user's real icons or data. Where it's safe, demos reuse the real UI's
   own pieces (buildMenu(), askConfirm(), the search-bar classes) so the
   muscle memory this teaches matches the real thing exactly. */


/* ---- illustrations: one hero icon per screen, 64x64 viewBox ---- */

function gsWelcomeSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="8" y="10" width="48" height="36" rx="6" stroke="${color}" stroke-width="2.4"></rect><rect x="15" y="18" width="10" height="10" rx="2.5" fill="${color}" opacity="0.85"></rect><rect x="29" y="18" width="10" height="10" rx="2.5" fill="${color}" opacity="0.6"></rect><rect x="15" y="32" width="10" height="10" rx="2.5" fill="${color}" opacity="0.6"></rect><rect x="29" y="32" width="10" height="10" rx="2.5" fill="${color}" opacity="0.4"></rect><path d="M50 7 L52.4 12.6 L58 15 L52.4 17.4 L50 23 L47.6 17.4 L42 15 L47.6 12.6 Z" fill="${color}"></path></svg>`;
}

function gsTapIconsSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><circle cx="33" cy="30" r="15" stroke="${color}" stroke-width="2" opacity="0.35"></circle><rect x="6" y="22" width="18" height="18" rx="5" fill="${color}" opacity="0.35"></rect><rect x="23" y="20" width="20" height="20" rx="5" fill="${color}"></rect><rect x="42" y="22" width="18" height="18" rx="5" fill="${color}" opacity="0.35"></rect></svg>`;
}

function gsSearchSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="38" width="36" height="14" rx="7" fill="${color}" opacity="0.14" stroke="${color}" stroke-width="1.6"></rect><rect x="8" y="40" width="15" height="10" rx="5" fill="${color}"></rect><circle cx="40" cy="22" r="13" stroke="${color}" stroke-width="3"></circle><line x1="49.5" y1="31.5" x2="58" y2="40" stroke="${color}" stroke-width="3.2" stroke-linecap="round"></line></svg>`;
}

function gsAddTwoWaysSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="4" y="10" width="26" height="22" rx="6" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.5"></rect><line x1="9" y1="17" x2="25" y2="17" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.6"></line><line x1="9" y1="23" x2="25" y2="23" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.6"></line><path d="M6 34 L6 50 L10.5 46.5 L13.5 52 L16.5 50.3 L13.5 44.8 L19 44.8 Z" fill="${color}"></path><circle cx="48" cy="40" r="15" fill="${color}"></circle><path d="M48 33v14M41 40h14" stroke="#fff" stroke-width="3" stroke-linecap="round"></path></svg>`;
}

function gsDragToFolderSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><path d="M8 27a4 4 0 0 1 4-4h12l5 5h21a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="${color}" opacity="0.85"></path><rect x="29" y="5" width="15" height="15" rx="4" fill="${color}" opacity="0.4" stroke="${color}" stroke-width="1.6"></rect><path d="M36.5 20 L36.5 31" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 4.5"></path><path d="M31.5 26.5 L36.5 33 L41.5 26.5" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>`;
}

function gsBoardSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="5" y="8" width="54" height="48" rx="8" fill="${color}" opacity="0.1" stroke="${color}" stroke-width="1.6"></rect><rect x="10" y="13" width="16" height="20" rx="4" fill="${color}" opacity="0.85"></rect><rect x="29" y="13" width="25" height="9" rx="4" fill="${color}" opacity="0.5"></rect><rect x="29" y="25" width="12" height="8" rx="4" fill="${color}" opacity="0.35"></rect><rect x="44" y="25" width="10" height="8" rx="4" fill="${color}" opacity="0.6"></rect><rect x="10" y="36" width="44" height="13" rx="4" fill="${color}" opacity="0.25"></rect></svg>`;
}

function gsWebtopsSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="4" y="22" width="16" height="12" rx="4" fill="${color}" opacity="0.3"></rect><rect x="22" y="18" width="18" height="16" rx="4" fill="${color}"></rect><rect x="42" y="22" width="16" height="12" rx="4" fill="${color}" opacity="0.3"></rect><rect x="4" y="36" width="54" height="20" rx="6" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.5"></rect><circle cx="56" cy="12" r="7" fill="${color}" opacity="0.85"></circle><path d="M56 8.5v7M52.5 12h7" stroke="#fff" stroke-width="2" stroke-linecap="round"></path></svg>`;
}

function gsBackgroundSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="10" width="52" height="38" rx="6" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.6"></rect><circle cx="19" cy="22" r="5" fill="${color}" opacity="0.85"></circle><path d="M6 42 L22 28 L32 38 L44 24 L58 40 L58 44a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z" fill="${color}" opacity="0.55"></path><circle cx="48" cy="40" r="11" fill="${color}"></circle><path d="M45 35 L53 40 L45 45 Z" fill="#fff"></path></svg>`;
}

function gsChromeSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="5" y="10" width="54" height="14" rx="5" fill="${color}" opacity="0.14" stroke="${color}" stroke-width="1.6"></rect><circle cx="14" cy="17" r="4" fill="${color}"></circle><rect x="24" y="14" width="24" height="6" rx="3" fill="${color}" opacity="0.5"></rect><path d="M16 38c5-6 12-9 16-9s11 3 16 9c-5 6-12 9-16 9s-11-3-16-9Z" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="32" cy="38" r="4.5" fill="${color}"></circle><line x1="14" y1="52" x2="50" y2="26" stroke="${color}" stroke-width="2.6" stroke-linecap="round"></line></svg>`;
}

function gsNoteSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="8" y="24" width="48" height="16" rx="8" fill="${color}" opacity="0.14" stroke="${color}" stroke-width="1.6"></rect><line x1="16" y1="32" x2="38" y2="32" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"></line><path d="M44 14 L50 20 L36 34 L29 36 L31 29 Z" fill="${color}"></path></svg>`;
}

function gsPersonalizeSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><path d="M32 8C18 8 8 18 8 30c0 9 7 14 14 14h4a4 4 0 0 1 4 4 4 4 0 0 0 4 4c12 0 22-10 22-24C56 16 46 8 32 8Z" fill="${color}" opacity="0.16" stroke="${color}" stroke-width="2"></path><circle cx="20" cy="27" r="4.2" fill="${color}"></circle><circle cx="32" cy="19" r="4.2" fill="${color}" opacity="0.6"></circle><circle cx="44" cy="27" r="4.2" fill="${color}" opacity="0.85"></circle><circle cx="23" cy="39" r="4.2" fill="${color}" opacity="0.4"></circle></svg>`;
}

function gsBackupSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><path d="M20 44a11 11 0 0 1-1.5-21.9A14 14 0 0 1 45 20a9.5 9.5 0 0 1-1 19Z" fill="${color}" opacity="0.18" stroke="${color}" stroke-width="2.2"></path><path d="M32 27v19M23.5 38.5l8.5 8.5 8.5-8.5" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>`;
}

function gsDoneSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="24" fill="${color}" opacity="0.16" stroke="${color}" stroke-width="2.2"></circle><path d="M21 33l7 7 15-16" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>`;
}


/* ---- small interaction helpers shared by the demos below ---- */

// click + Enter/Space, for custom (non-<button>) interactive elements.
function gsActivate(el, fn){
  el.addEventListener("click", fn);
  el.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){ e.preventDefault(); fn(e); }
  });
}

// Press-and-hold on touch synthesizes a real "contextmenu" event on el,
// exactly like initUiTouchLongPress() does for the real webtop — so one
// plain `el.addEventListener("contextmenu", ...)` on a demo surface
// handles mouse right-click AND touch long-press identically.
function gsWireLongPress(el){
  let timer = null, sx = 0, sy = 0, fired = false;
  const cancel = ()=>{ clearTimeout(timer); timer = null; };
  el.addEventListener("pointerdown", (e)=>{
    if(e.pointerType === "mouse" || !e.isPrimary) return;
    fired = false; sx = e.clientX; sy = e.clientY; cancel();
    timer = setTimeout(()=>{
      timer = null; fired = true;
      el.dispatchEvent(new MouseEvent("contextmenu", { bubbles:true, cancelable:true, clientX:sx, clientY:sy }));
    }, 600);
  }, true);
  el.addEventListener("pointermove", (e)=>{
    if(timer && (Math.abs(e.clientX-sx) > 8 || Math.abs(e.clientY-sy) > 8)) cancel();
  }, true);
  ["pointerup","pointercancel"].forEach(t=> el.addEventListener(t, cancel, true));
  el.addEventListener("click", (e)=>{ if(fired){ fired = false; e.preventDefault(); e.stopPropagation(); } }, true);
  el.addEventListener("contextmenu", cancel, true);
}


/* ---- Features tab content ---- */

const GS_FEATURES = [
  { icon: gsTapIconsSVG, title:"One home screen for everything", desc:"Bookmarks, installed web apps and native apps sit together as icons — not three separate tools." },
  { icon: (c)=> menuIcon("globe"), title:"Real cross-browser backup", desc:"Export bookmarks and apps as standard files any browser can read back in — you're never locked in." },
  { icon: calculatorSVG, title:"Built-in apps", desc:"Calculator, Todo and Notes live right on your webtop, with more planned." },
  { icon: gsSearchSVG, title:"Search, your way", desc:"Search your webtop or the web, with a choice of six search engines." },
  { icon: folderSVG, title:"Real folders", desc:"Nest folders, see item counts at a glance, and step back through where you've been." },
  { icon: (c)=> menuIcon("rename"), title:"Full right-click menus", desc:"Open, copy, move, cut, rename, sort and delete — always with a confirmation before anything is lost." },
  { icon: (c)=> menuIcon("check"), title:"Multi-select & rubber-band", desc:"Select many icons at once with a drag, keyboard shortcuts, or checkboxes." },
  { icon: gsPersonalizeSVG, title:"Make it yours", desc:"Themes, auto-rotating wallpapers, your own photos or a video, a custom logo — or hide the logo and search bar entirely." },
  { icon: (c)=> menuIcon("arrange"), title:"Widgets & boards", desc:"Group icons into a named shelf, or drop in a ready-made dashboard of clocks, to-dos and notes." },
  { icon: (c)=> menuIcon("calendar"), title:"Clock & calendar", desc:"A real calendar popup with time and date format and time zone control." },
  { icon: gsBackupSVG, title:"Two kinds of backup", desc:"A manual file backup, or automatic Cloud Backup tied to your email." },
  { icon: (c)=> menuIcon("webtop"), title:"Multiple webtops", desc:"Keep separate spaces for separate parts of your life." }
];


/* ---- Guide tab: the steps ----
   Each step's build(host, hintEl, markDone) wires up its own small demo
   inside `host`. It calls markDone() once the user has actually done the
   thing — that's what enables the Next button. Nothing here is the user's
   real webtop: every icon, folder and menu below is a throwaway stand-in. */

const GS_STEPS = [
  {
    key:"add", title:"Two ways to add things",
    blurb:"Right-click empty space, or tap the + in the bottom-right corner — either one opens the same menu, including bookmarks, apps and widgets. Try the + button below.",
    illustrate: gsAddTwoWaysSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-add-demo">
        <div class="gs-demo-surface" data-surface tabindex="0" role="button" aria-label="Empty area — right-click or press and hold"><span>Empty space — right-click here too</span></div>
        <div class="gs-fab-demo" data-fab tabindex="0" role="button" aria-label="The plus button, like the real one bottom-right of your webtop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
        </div>
      </div>`;
      const surface = host.querySelector("[data-surface]");
      const fab = host.querySelector("[data-fab]");
      const menuItems = ()=> [
        { label:"Bookmark", icon:"bookmark", action:()=>{ hintEl.textContent = "That's how you'd add a bookmark."; } },
        { label:"Folder", icon:"folder", action:()=>{ hintEl.textContent = "That's how you'd add a folder."; } },
        { label:"Web app", icon:"globe", action:()=>{ hintEl.textContent = "Turns a website into an app-style icon."; } },
        { label:"Native app\u2026", icon:"grid", action:()=>{ hintEl.textContent = "Calculator, Todo, Notes \u2014 even this guide."; } },
        { label:"Widget", icon:"grid", submenu:[
          { label:"Shelf (group icons)", icon:"grid", action:()=>{ hintEl.textContent = "More on shelves next."; } },
          { label:"Clock", icon:"clock", action:()=>{ hintEl.textContent = "A clock widget for your webtop."; } },
          { label:"Calendar", icon:"calendar", action:()=>{ hintEl.textContent = "A calendar popup widget."; } },
          { label:"Board (presets)\u2026", icon:"grid", action:()=>{ hintEl.textContent = "More on boards soon."; } }
        ] }
      ];
      surface.addEventListener("contextmenu", (e)=>{ e.preventDefault(); buildMenu(menuItems(), e.clientX, e.clientY); });
      gsWireLongPress(surface);
      let doneFab = false;
      const openFromFab = ()=>{
        const r = fab.getBoundingClientRect();
        buildMenu(menuItems(), Math.max(8, r.right - 190), Math.max(8, r.top - 190));
        if(!doneFab){ doneFab = true; hintEl.textContent = "That's the + button \u2014 same menu, same options."; markDone(); }
      };
      fab.addEventListener("click", openFromFab);
      fab.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openFromFab(); } });
    }
  },
  {
    key:"widgets", title:"Widgets: shelves for your icons",
    blurb:"A shelf is a named, colored panel you drag icons into \u2014 add one from the + menu, then give it a color and drag things in. Try dragging the icon into the shelf below.",
    illustrate: gsDragToFolderSVG,
    build(host, hintEl, markDone){
      const shelfColor = COLORS[4];
      host.innerHTML = `<div class="gs-dnd-zone">
        <div class="gs-mini-icon gs-draggable" data-drag tabindex="0" role="button" aria-label="Site bookmark \u2014 drag this into the shelf, or press Enter">
          <div class="gs-mini-glyph">${linkSVG(COLORS[3])}</div><div class="gs-mini-label">Site</div>
        </div>
        <div class="gs-shelf-demo gs-drop-target" data-drop style="background:${shelfColor}2e;border-color:${shelfColor}66">
          <div class="gs-shelf-demo-head" style="color:${shelfColor}">My Shelf</div>
          <div class="gs-shelf-demo-body" data-shelf-body></div>
        </div>
      </div>`;
      const drag = host.querySelector("[data-drag]");
      const drop = host.querySelector("[data-drop]");
      const shelfBody = host.querySelector("[data-shelf-body]");
      let done = false, dragging = false, startX = 0, startY = 0;
      const overlaps = ()=>{
        const dr = drop.getBoundingClientRect();
        const r = drag.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        return cx > dr.left && cx < dr.right && cy > dr.top && cy < dr.bottom;
      };
      const complete = ()=>{
        if(done) return;
        done = true;
        drag.style.transition = "transform .18s ease, opacity .18s ease";
        drag.style.transform = "translate(0,0) scale(.4)";
        drag.style.opacity = "0";
        const mini = document.createElement("div");
        mini.className = "gs-mini-glyph gs-shelf-item";
        mini.innerHTML = linkSVG(COLORS[3]);
        shelfBody.appendChild(mini);
        hintEl.textContent = "In the shelf \u2014 right-click the shelf itself for its name, color and transparency.";
        markDone();
        setTimeout(()=>{ drag.style.visibility = "hidden"; }, 200);
      };
      drag.addEventListener("pointerdown", (e)=>{
        if(done) return;
        dragging = true; drag.classList.add("dragging");
        startX = e.clientX; startY = e.clientY;
        try{ drag.setPointerCapture(e.pointerId); }catch(err){}
        e.preventDefault();
      });
      drag.addEventListener("pointermove", (e)=>{
        if(!dragging) return;
        drag.style.transform = `translate(${e.clientX-startX}px,${e.clientY-startY}px)`;
        drop.classList.toggle("drop-ready", overlaps());
      });
      const endDrag = ()=>{
        if(!dragging) return;
        dragging = false; drag.classList.remove("dragging");
        const over = overlaps();
        drop.classList.remove("drop-ready");
        if(over) complete();
        else{
          drag.style.transition = "transform .22s cubic-bezier(.2,.8,.3,1)";
          drag.style.transform = "translate(0,0)";
          setTimeout(()=>{ if(!done) drag.style.transition = ""; }, 220);
        }
      };
      drag.addEventListener("pointerup", endDrag);
      drag.addEventListener("pointercancel", endDrag);
      drag.addEventListener("keydown", (e)=>{
        if((e.key === "Enter" || e.key === " ") && !done){ e.preventDefault(); complete(); }
      });
    }
  },
  {
    key:"boards", title:"Boards: ready-made dashboards",
    blurb:"A board is a shelf's bigger sibling \u2014 a dashboard of tiles: to-do lists, clocks, calendars, notes, quick links, even a weather forecast. Pick a preset to see the idea.",
    illustrate: gsBoardSVG,
    build(host, hintEl, markDone){
      const COLOR_FOR = { todo:"#7c9cff", search:"#9aa5b1", clock:"#5fd3b3", calendar:"#c792ea", note:"#f6d365", shelf:"#ff8a65" };
      const PRESETS = [
        { key:"dashboard", name:"Dashboard", blurb:"Everything at a glance", tiles:["todo tall","search wide","clock short","calendar tall","note short"] },
        { key:"focus", name:"Focus", blurb:"A big clock, tasks and a note", tiles:["clock tall","todo short","note short"] },
        { key:"shelves", name:"Shelves", blurb:"Two shelves, plus tasks and a note", tiles:["shelf tall","shelf tall","todo short","note short"] }
      ];
      host.innerHTML = `<div class="gs-board-row">
        ${PRESETS.map(p=>`
          <div class="gs-board-card" data-board="${p.key}" tabindex="0" role="button" aria-label="${p.name} board preset">
            <div class="gs-board-preview">${p.tiles.map(t=>{ const [kind, size] = t.split(" "); return `<span class="gs-board-tile ${size}" style="background:${COLOR_FOR[kind]}"></span>`; }).join("")}</div>
            <div class="gs-board-name">${p.name}</div>
          </div>`).join("")}
      </div>`;
      let picked = false;
      host.querySelectorAll(".gs-board-card").forEach(card=>{
        gsActivate(card, ()=>{
          host.querySelectorAll(".gs-board-card").forEach(c=> c.classList.toggle("active", c === card));
          const p = PRESETS.find(x=> x.key === card.dataset.board);
          hintEl.textContent = `${p.name} \u2014 ${p.blurb}. Edit any tile afterward, or start from a blank board.`;
          if(!picked){ picked = true; markDone(); }
        });
      });
    }
  },
  {
    key:"webtops", title:"Multiple webtops",
    blurb:"Each tab along the top is its own webtop \u2014 its own icons, widgets and wallpaper, like worksheets in a spreadsheet. Add one below.",
    illustrate: gsWebtopsSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-webtop-tabs" data-tabs>
        <div class="gs-webtop-tab active" data-wt tabindex="0" role="button">\uD83C\uDFE0 Home</div>
        <div class="gs-webtop-tab" data-wt tabindex="0" role="button">\uD83D\uDCBC Work</div>
        <div class="gs-webtop-tab add" data-add-wt tabindex="0" role="button" aria-label="Add a webtop">+</div>
      </div>`;
      const tabsEl = host.querySelector("[data-tabs]");
      const addBtn = host.querySelector("[data-add-wt]");
      const selectTab = (el)=> tabsEl.querySelectorAll(".gs-webtop-tab[data-wt]").forEach(t=> t.classList.toggle("active", t === el));
      tabsEl.querySelectorAll(".gs-webtop-tab[data-wt]").forEach(t=> gsActivate(t, ()=> selectTab(t)));
      const ICONS = ["\uD83C\uDFAE","\uD83C\uDFB5","\u2708\uFE0F","\uD83C\uDF1F"];
      let added = false, addedCount = 0;
      const addTab = ()=>{
        const n = document.createElement("div");
        n.className = "gs-webtop-tab new";
        n.setAttribute("data-wt", ""); n.tabIndex = 0; n.setAttribute("role", "button");
        n.textContent = `${ICONS[addedCount % ICONS.length]} Webtop ${tabsEl.querySelectorAll(".gs-webtop-tab[data-wt]").length + 1}`;
        addedCount++;
        tabsEl.insertBefore(n, addBtn);
        gsActivate(n, ()=> selectTab(n));
        selectTab(n);
        if(!added){ added = true; hintEl.textContent = "A new webtop \u2014 its own icons and wallpaper, switch any time."; markDone(); }
      };
      addBtn.addEventListener("click", addTab);
      addBtn.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); addTab(); } });
    }
  },
  {
    key:"background", title:"Make the background yours",
    blurb:"Pick a generated wallpaper, upload your own photos (they can even auto-rotate), or use a short looping video instead. Try a couple below.",
    illustrate: gsBackgroundSVG,
    build(host, hintEl, markDone){
      const SWATCHES = [
        { key:"dots", label:"Dots", css:"background:#13222a; background-image:radial-gradient(#2c4c57 1.4px, transparent 1.4px); background-size:7px 7px;", caption:"Dots \u2014 the default" },
        { key:"aurora", label:"Aurora", css:"background:linear-gradient(135deg,#0f3b2e,#1f6f5c,#2fb88a,#8ee6c2);", caption:"One of four built-in pictures" },
        { key:"photo", label:"My photo", css:"background:linear-gradient(135deg,#2b2b2b,#4a4a4a);", caption:"Your own photos, kept with your webtop", icon:"+" },
        { key:"video", label:"Video", css:"background:linear-gradient(135deg,#1a0b3d,#5b2a86);", caption:"A short, looping video clip instead", icon:"\u25B6" }
      ];
      host.innerHTML = `<div class="gs-wp-preview" data-wp-preview style="${SWATCHES[0].css}"></div>
      <div class="gs-wp-row">
        ${SWATCHES.map((s,i)=>`<div class="gs-wp-swatch${i===0?" active":""}" data-wp="${s.key}" style="${s.css}" tabindex="0" role="button" aria-label="${s.label}">${s.icon ? `<span class="gs-wp-badge">${s.icon}</span>` : ""}</div>`).join("")}
      </div>
      <p class="gs-wp-caption" data-wp-caption>${SWATCHES[0].caption}</p>`;
      const preview = host.querySelector("[data-wp-preview]");
      const caption = host.querySelector("[data-wp-caption]");
      const swatches = Array.from(host.querySelectorAll(".gs-wp-swatch"));
      let picked = false;
      swatches.forEach((el, i)=>{
        gsActivate(el, ()=>{
          swatches.forEach(s=> s.classList.toggle("active", s === el));
          preview.style.cssText = SWATCHES[i].css;
          caption.textContent = SWATCHES[i].caption;
          if(i !== 0 && !picked){ picked = true; hintEl.textContent = "All in Settings \u2192 Wallpaper."; markDone(); }
        });
      });
    }
  },
  {
    key:"chrome", title:"Hide the logo or search bar",
    blurb:"Want a cleaner look? Switch the logo or search bar off from Settings, then lock them so they can't change by accident. Try the switches below.",
    illustrate: gsChromeSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-chrome-demo">
        <div class="gs-chrome-bar">
          <span class="gs-chrome-logo" data-logo>on369</span>
          <span class="gs-chrome-search" data-search></span>
        </div>
        <label class="gs-toggle-row"><button type="button" class="switch on" role="switch" aria-checked="true" data-toggle="logo"></button>Show logo</label>
        <label class="gs-toggle-row"><button type="button" class="switch on" role="switch" aria-checked="true" data-toggle="search"></button>Show search bar</label>
      </div>`;
      const logo = host.querySelector("[data-logo]"), search = host.querySelector("[data-search]");
      let toggledOnce = false;
      host.querySelectorAll("[data-toggle]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const on = !btn.classList.contains("on");
          btn.classList.toggle("on", on); btn.setAttribute("aria-checked", String(on));
          const target = btn.dataset.toggle === "logo" ? logo : search;
          target.style.visibility = on ? "" : "hidden";
          if(!toggledOnce){ toggledOnce = true; hintEl.textContent = "Settings \u2192 Layout \u2014 lock it there once you're happy."; markDone(); }
        });
      });
    }
  },
  {
    key:"usernote", title:"Add a personal note",
    blurb:"A short line of your own \u2014 a name, a quote \u2014 shown in the top bar or the footer. Type something below.",
    illustrate: gsNoteSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-note-demo">
        <div class="gs-note-preview muted" data-note-preview>Your note shows up here</div>
        <input type="text" class="gs-note-input" data-note-input maxlength="50" placeholder="Type something short\u2026">
      </div>`;
      const preview = host.querySelector("[data-note-preview]");
      const input = host.querySelector("[data-note-input]");
      let typed = false;
      input.addEventListener("input", ()=>{
        const v = input.value.trim();
        preview.textContent = v || "Your note shows up here";
        preview.classList.toggle("muted", !v);
        if(v && !typed){ typed = true; hintEl.textContent = "Settings \u2192 Usernote \u2014 pick top or footer, and an alignment."; markDone(); }
      });
    }
  },
  {
    key:"backup", title:"Two kinds of backup",
    blurb:"Back up any time from the top bar \u2014 JSON for everything, or a plain bookmarks file any browser accepts \u2014 or connect an email for automatic Cloud Backup. Try a preview below.",
    illustrate: gsBackupSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-demo-row">
        <button type="button" class="gs-demo-btn" data-export="json">Export everything (JSON)</button>
        <button type="button" class="gs-demo-btn" data-export="html">Export bookmarks (HTML)</button>
        <button type="button" class="gs-demo-btn" data-export="cloud">Connect Cloud Backup</button>
      </div>
      <p class="gs-fineprint">This is just a preview \u2014 the real buttons live in your top bar.</p>`;
      let done = false;
      host.querySelectorAll("[data-export]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          btn.classList.add("done");
          btn.textContent = "\u2713 " + (btn.dataset.export === "cloud" ? "Connected" : "Saved");
          if(!done){ done = true; hintEl.textContent = "File backup is instant and local; Cloud Backup keeps syncing by email."; markDone(); }
        });
      });
    }
  }
];


/* ---- welcome / done screens and the overall shell ---- */

function gsWelcomeScreenHTML(){
  const color = COLORS[1];
  return `<div class="gs-screen">
    <div class="gs-illustration" style="background:${color}1a;border-color:${color}55">${gsWelcomeSVG(color)}</div>
    <h3 class="gs-title">Welcome to on369</h3>
    <p class="gs-blurb">on369 is a webtop — a home screen for the web, right in your browser. If you've used a phone's home screen or a computer desktop before, you already know the basics: tap or click icons, open folders, right-click or press-and-hold for options. This guide skips past all that and shows you the handful of things that make on369 different.</p>
    <div class="gs-welcome-actions">
      <button type="button" class="gs-nav-btn primary" data-gs-start>Start the tour</button>
      <button type="button" class="gs-nav-btn" data-gs-skipfeat>Skip — show me the features</button>
    </div>
  </div>`;
}

function gsDoneScreenHTML(){
  const color = COLORS[2];
  return `<div class="gs-screen">
    <div class="gs-illustration" style="background:${color}1a;border-color:${color}55">${gsDoneSVG(color)}</div>
    <h3 class="gs-title">You're all set</h3>
    <p class="gs-blurb">That covers the less obvious parts — adding things from the + button, shelves and boards, multiple webtops, your own background, hiding chrome, your personal note, and backing up two ways. Come back to this guide any time from its icon, or from Settings → More if you ever remove it.</p>
    <div class="gs-done-actions">
      <button type="button" class="gs-nav-btn primary" data-gs-seefeat>See the features</button>
      <button type="button" class="gs-nav-btn" data-gs-done>Done</button>
    </div>
  </div>`;
}

function gsStepScreenHTML(step, idx){
  const color = COLORS[idx % COLORS.length];
  const dots = GS_STEPS.map((s,i)=> `<span class="gs-dot${i===idx?" on":""}"></span>`).join("");
  return `<div class="gs-screen">
    <div class="gs-progress">${dots}</div>
    <div class="gs-illustration" style="background:${color}1a;border-color:${color}55">${step.illustrate(color)}</div>
    <h3 class="gs-title">${step.title}</h3>
    <p class="gs-blurb">${step.blurb}</p>
    <div class="gs-demo"></div>
    <div class="gs-hint" aria-live="polite"></div>
    <div class="gs-nav">
      <button type="button" class="gs-nav-btn" data-gs-back>Back</button>
      <span class="gs-step-count">Step ${idx+1} of ${GS_STEPS.length}</span>
      <button type="button" class="gs-nav-btn primary" data-gs-next disabled>Next</button>
    </div>
    <div class="gs-skip" data-gs-skip tabindex="0" role="button">Skip to the end</div>
  </div>`;
}

function gsDismissRowHTML(){
  const on = !!state.gettingStartedDismissed;
  return `<label class="gs-dismiss-row"><button type="button" class="switch${on?" on":""}" role="switch" aria-checked="${on}" data-gs-dismiss></button><span>Don't show this automatically next time</span></label>`;
}


function renderGettingStartedApp(body, api){
  const doneSteps = new Set();
  let screenIdx = -1; // -1 = welcome, 0..N-1 = steps, N = done

  body.innerHTML = `<div class="gs-app">
    <div class="gs-tabs settings-tabs" role="tablist" aria-label="Getting started sections">
      <button type="button" class="stab active" data-gstab="guide" role="tab" aria-selected="true">Guide</button>
      <button type="button" class="stab" data-gstab="features" role="tab" aria-selected="false">Features</button>
    </div>
    <div class="gs-pane" data-pane="guide"></div>
    <div class="gs-pane" data-pane="features" hidden></div>
  </div>`;

  const guidePane = body.querySelector('[data-pane="guide"]');
  const featuresPane = body.querySelector('[data-pane="features"]');
  const tabs = Array.from(body.querySelectorAll(".gs-tabs .stab"));

  function switchTab(tab){
    tabs.forEach(t=>{
      const on = t.dataset.gstab === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    guidePane.hidden = tab !== "guide";
    featuresPane.hidden = tab !== "features";
    if(tab === "features" && !featuresPane.childElementCount) renderFeatures();
  }
  tabs.forEach(t=> t.addEventListener("click", ()=> switchTab(t.dataset.gstab)));

  function renderFeatures(){
    featuresPane.innerHTML = `<p class="gs-features-intro">What makes on369 different from a typical new-tab or start page:</p>
    <div class="gs-features-grid">
      ${GS_FEATURES.map((f,i)=>{
        const color = COLORS[i % COLORS.length];
        return `<div class="gs-feature-card">
          <div class="gs-feature-icon" style="background:${color}1a;border-color:${color}55;color:${color}">${f.icon(color)}</div>
          <div><p class="gs-feature-title">${f.title}</p><p class="gs-feature-desc">${f.desc}</p></div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function wireDismissRow(root){
    const btn = root.querySelector("[data-gs-dismiss]");
    if(!btn) return;
    btn.addEventListener("click", ()=>{
      const next = !btn.classList.contains("on");
      btn.classList.toggle("on", next);
      btn.setAttribute("aria-checked", next ? "true" : "false");
      state.gettingStartedDismissed = next;
      save();
    });
  }

  function goTo(idx){
    screenIdx = idx;
    renderGuide();
  }

  function renderGuide(){
    let html;
    if(screenIdx === -1) html = gsWelcomeScreenHTML();
    else if(screenIdx === GS_STEPS.length) html = gsDoneScreenHTML();
    else html = gsStepScreenHTML(GS_STEPS[screenIdx], screenIdx);
    guidePane.innerHTML = html + gsDismissRowHTML();
    wireDismissRow(guidePane);

    if(screenIdx === -1){
      guidePane.querySelector("[data-gs-start]").addEventListener("click", ()=> goTo(0));
      guidePane.querySelector("[data-gs-skipfeat]").addEventListener("click", ()=> switchTab("features"));
    }else if(screenIdx === GS_STEPS.length){
      guidePane.querySelector("[data-gs-seefeat]").addEventListener("click", ()=> switchTab("features"));
      guidePane.querySelector("[data-gs-done]").addEventListener("click", ()=>{
        state.gettingStartedDismissed = true; save();
        if(api && api.close) api.close();
      });
    }else{
      const step = GS_STEPS[screenIdx];
      const demoHost = guidePane.querySelector(".gs-demo");
      const hintEl = guidePane.querySelector(".gs-hint");
      const nextBtn = guidePane.querySelector("[data-gs-next]");
      const backBtn = guidePane.querySelector("[data-gs-back]");
      const skipEl = guidePane.querySelector("[data-gs-skip]");
      backBtn.addEventListener("click", ()=> goTo(screenIdx-1));
      gsActivate(skipEl, ()=> goTo(GS_STEPS.length));
      const markDone = ()=>{ doneSteps.add(step.key); nextBtn.disabled = false; };
      nextBtn.addEventListener("click", ()=> goTo(screenIdx+1));
      if(doneSteps.has(step.key)) nextBtn.disabled = false;
      step.build(demoHost, hintEl, markDone);
    }
  }

  goTo(-1);
}


/* Runs once at startup (see main.js), in the original order. */
function initAppsGettingStarted(){
  AppManager.register({
    id: "getting-started",
    name: "Getting Started",
    description: "A short, hands-on tour of on369, plus a look at what makes it different.",
    version: "1.0.0",
    developer: "on369",
    category: "utilities",
    icon: compassSVG,
    render: renderGettingStartedApp,
    permissions: [],
    fileAssociations: [],
    shortcuts: [],
    defaultWidth: 420, defaultHeight: 600,
    minWidth: 340, minHeight: 460,
    maxWidth: 620, maxHeight: 820,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });

  // Settings → More: lets the guide be reopened if its icon was ever deleted.
  const replayBtn = document.getElementById("replayGuideBtn");
  if(replayBtn){
    replayBtn.addEventListener("click", ()=>{
      document.getElementById("settingsPop").classList.remove("open");
      AppManager.launch("getting-started", { title:"Getting Started", color: COLORS[1] });
    });
  }
}
