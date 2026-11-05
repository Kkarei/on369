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

function gsCursorMenuSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="22" y="12" width="34" height="30" rx="7" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.6"></rect><line x1="28" y1="21" x2="50" y2="21" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="0.65"></line><line x1="28" y1="28" x2="50" y2="28" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="0.65"></line><line x1="28" y1="35" x2="44" y2="35" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="0.65"></line><path d="M10 34 L10 55 L15.5 50.3 L19.5 57.5 L23.5 55.3 L19.5 48.3 L26 48.3 Z" fill="${color}" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"></path></svg>`;
}

function gsDragToFolderSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><path d="M8 27a4 4 0 0 1 4-4h12l5 5h21a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="${color}" opacity="0.85"></path><rect x="29" y="5" width="15" height="15" rx="4" fill="${color}" opacity="0.4" stroke="${color}" stroke-width="1.6"></rect><path d="M36.5 20 L36.5 31" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 4.5"></path><path d="M31.5 26.5 L36.5 33 L41.5 26.5" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>`;
}

function gsIconMenuSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="18" width="26" height="26" rx="7" fill="${color}"></rect><rect x="36" y="10" width="22" height="36" rx="6" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.6"></rect><line x1="41" y1="19" x2="53" y2="19" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="0.65"></line><line x1="41" y1="27" x2="53" y2="27" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="0.65"></line><line x1="41" y1="35" x2="49" y2="35" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="0.65"></line></svg>`;
}

function gsSearchSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="38" width="36" height="14" rx="7" fill="${color}" opacity="0.14" stroke="${color}" stroke-width="1.6"></rect><rect x="8" y="40" width="15" height="10" rx="5" fill="${color}"></rect><circle cx="40" cy="22" r="13" stroke="${color}" stroke-width="3"></circle><line x1="49.5" y1="31.5" x2="58" y2="40" stroke="${color}" stroke-width="3.2" stroke-linecap="round"></line></svg>`;
}

function gsAppsSVG(color){
  return `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="20" width="26" height="26" rx="6" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="1.6"></rect><rect x="18" y="14" width="26" height="26" rx="6" fill="${color}" opacity="0.55" stroke="${color}" stroke-width="1.6"></rect><rect x="30" y="8" width="26" height="26" rx="6" fill="${color}" stroke="${color}" stroke-width="1.6"></rect><line x1="37" y1="16" x2="49" y2="16" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.85"></line><circle cx="40" cy="25" r="2" fill="#fff" opacity="0.85"></circle><circle cx="47" cy="25" r="2" fill="#fff" opacity="0.85"></circle></svg>`;
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
  { icon: gsPersonalizeSVG, title:"Make it yours", desc:"Themes, auto-rotating wallpapers, your own photos, and a custom logo." },
  { icon: (c)=> menuIcon("arrange"), title:"Widgets", desc:"Group icons into named, color-tinted panels you can arrange like a shelf." },
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
    key:"icons", title:"Icons are your home screen",
    blurb:"Everything you save — bookmarks, folders, apps — shows up as an icon right here, like the home screen of a phone. Give one a tap.",
    illustrate: gsTapIconsSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-mini-row">
        ${[["Folder",folderSVG,0],["Site",linkSVG,1],["App",calculatorSVG,2]].map(([label,fn,i])=>`
          <div class="gs-mini-icon" data-i="${i}" tabindex="0" role="button" aria-label="${label} icon">
            <div class="gs-mini-glyph">${fn(COLORS[i])}</div>
            <div class="gs-mini-label">${label}</div>
          </div>`).join("")}
      </div>`;
      let tapped = false;
      host.querySelectorAll(".gs-mini-icon").forEach(el=>{
        gsActivate(el, ()=>{
          if(tapped) return;
          tapped = true;
          el.classList.add("pulse");
          setTimeout(()=> el.classList.remove("pulse"), 260);
          hintEl.textContent = "Nice — that's exactly how it works.";
          markDone();
        });
      });
    }
  },
  {
    key:"create", title:"Right-click to create",
    blurb:"Right-click — or press and hold on a touchscreen — any empty spot to add a bookmark, folder or app. Try it below.",
    illustrate: gsCursorMenuSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-demo-surface" data-surface tabindex="0" role="button" aria-label="Empty area — right-click or press and hold to open the menu"><span>Empty space — right-click or press &amp; hold</span></div>`;
      const surface = host.querySelector("[data-surface]");
      let created = false;
      const openMenu = (x, y)=>{
        buildMenu([
          { label:"New folder", icon:"folder", action:()=>{ hintEl.textContent = "That's how you'd start a new folder."; } },
          { label:"New bookmark", icon:"bookmark", action:()=>{
              if(created) return;
              created = true;
              surface.classList.add("done");
              surface.innerHTML = `<div class="gs-mini-icon"><div class="gs-mini-glyph">${linkSVG(COLORS[1])}</div><div class="gs-mini-label">New bookmark</div></div>`;
              hintEl.textContent = "Added — that's really all it takes.";
              markDone();
            } },
          { label:"New app", icon:"grid", action:()=>{ hintEl.textContent = "That's how you'd add an app to your webtop."; } }
        ], x, y);
      };
      surface.addEventListener("contextmenu", (e)=>{ e.preventDefault(); openMenu(e.clientX, e.clientY); });
      gsWireLongPress(surface);
    }
  },
  {
    key:"organize", title:"Drag to organize",
    blurb:"Drag any icon onto a folder to file it away. Try dragging the bookmark into the folder below.",
    illustrate: gsDragToFolderSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-dnd-zone">
        <div class="gs-mini-icon gs-draggable" data-drag tabindex="0" role="button" aria-label="Site bookmark — drag this into the folder, or press Enter">
          <div class="gs-mini-glyph">${linkSVG(COLORS[3])}</div><div class="gs-mini-label">Site</div>
        </div>
        <div class="gs-mini-icon gs-mini-folder gs-drop-target" data-drop>
          <div class="gs-mini-glyph">${folderSVG(COLORS[1])}<span class="gs-count-badge" data-count hidden>1</span></div>
          <div class="gs-mini-label">Folder</div>
        </div>
      </div>`;
      const drag = host.querySelector("[data-drag]");
      const drop = host.querySelector("[data-drop]");
      let done = false, dragging = false, startX = 0, startY = 0;
      const overlaps = ()=>{
        const dr = drop.querySelector(".gs-mini-glyph").getBoundingClientRect();
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
        drop.querySelector("[data-count]").hidden = false;
        hintEl.textContent = "Filed away — just like that.";
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
    key:"iconmenu", title:"Right-click an icon for more",
    blurb:"Right-click (or press and hold) any icon to open, rename or delete it — deleting always asks first. Try renaming this one.",
    illustrate: gsIconMenuSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-mini-row">
        <div class="gs-mini-icon" data-icon tabindex="0" role="button" aria-label="My Bookmark — right-click or press and hold for options">
          <div class="gs-mini-glyph">${linkSVG(COLORS[5])}</div>
          <div class="gs-mini-label" data-label>My Bookmark</div>
        </div>
      </div>`;
      const iconEl = host.querySelector("[data-icon]");
      const label = host.querySelector("[data-label]");
      let renamed = false;
      const startRenameDemo = ()=>{
        if(label.contentEditable === "true"){ label.focus(); return; } // already editing — don't double-wire
        label.contentEditable = "true";
        label.spellcheck = false;
        const range = document.createRange(); range.selectNodeContents(label);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        label.focus();
        let cancelled = false;
        const onKeydown = (e)=>{
          e.stopPropagation();
          if(e.key === "Enter"){ e.preventDefault(); label.blur(); }
          else if(e.key === "Escape"){ cancelled = true; label.blur(); }
        };
        label.addEventListener("keydown", onKeydown);
        label.addEventListener("blur", ()=>{
          label.removeEventListener("keydown", onKeydown);
          label.contentEditable = "false";
          if(cancelled){ label.textContent = "My Bookmark"; return; } // cancelled — no credit, try again
          const text = label.textContent.trim() || "My Bookmark";
          label.textContent = text;
          if(!renamed){ renamed = true; hintEl.textContent = "Renamed — exactly how it works for real."; markDone(); }
        }, { once:true });
      };
      const openMenu = (x, y)=>{
        buildMenu([
          { label:"Open link", icon:"openLink", action:()=>{ hintEl.textContent = "That would open the real link."; } },
          { label:"Rename", icon:"rename", hint:"dbl-click", action: startRenameDemo },
          { label:"Delete", icon:"delete", danger:true, action: async ()=>{
              const ok = await askConfirm({ title:`Delete "${label.textContent.trim() || "My Bookmark"}"?`, message:"This can't be undone.", confirmLabel:"Delete", cancelLabel:"Cancel" });
              if(ok) hintEl.textContent = "That's the same confirmation you'd see for real — nothing here was actually deleted.";
            } }
        ], x, y);
      };
      iconEl.addEventListener("contextmenu", (e)=>{ e.preventDefault(); openMenu(e.clientX, e.clientY); });
      gsWireLongPress(iconEl);
      label.addEventListener("dblclick", (e)=>{ e.stopPropagation(); startRenameDemo(); });
    }
  },
  {
    key:"search", title:"Search, your way",
    blurb:"The search bar works two ways: find things already on your webtop, or flip to Web and pick a search engine. Type something and flip the mode.",
    illustrate: gsSearchSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="search-shell gs-search-shell">
        <div class="search-mode" data-mode-wrap>
          <button type="button" class="mode-btn active" data-mode="app">App</button>
          <button type="button" class="mode-btn" data-mode="web">Web</button>
        </div>
        <div class="engine-picker" data-engines></div>
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
          <input type="text" data-gs-search placeholder="Search your webtop…" autocomplete="off">
        </div>
      </div>`;
      const picker = host.querySelector("[data-engines]");
      Object.keys(ENGINES).forEach((key, i)=>{
        const eng = ENGINES[key];
        const btn = document.createElement("div");
        btn.className = "engine-btn" + (i === 0 ? " active" : "");
        btn.style.background = eng.color;
        btn.textContent = eng.letter;
        btn.title = key.charAt(0).toUpperCase() + key.slice(1);
        btn.addEventListener("click", ()=> picker.querySelectorAll(".engine-btn").forEach(b=> b.classList.toggle("active", b === btn)));
        picker.appendChild(btn);
      });
      const input = host.querySelector("[data-gs-search]");
      const modeWrap = host.querySelector("[data-mode-wrap]");
      let typed = false, toggled = false;
      const checkDone = ()=>{ if(typed && toggled){ hintEl.textContent = "That's the whole search bar."; markDone(); } };
      input.addEventListener("input", ()=>{ if(input.value.trim()) typed = true; checkDone(); });
      modeWrap.querySelectorAll(".mode-btn").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          modeWrap.querySelectorAll(".mode-btn").forEach(b=> b.classList.toggle("active", b === btn));
          const web = btn.dataset.mode === "web";
          picker.classList.toggle("visible", web);
          input.placeholder = web ? "Search the web…" : "Search your webtop…";
          toggled = true;
          checkDone();
        });
      });
    }
  },
  {
    key:"apps", title:"Apps, not just bookmarks",
    blurb:"Calculator, Todo and Notes live right on your webtop as real little apps — they open in their own window, just like this guide did. Click one.",
    illustrate: gsAppsSVG,
    build(host, hintEl, markDone){
      const APPS = {
        calculator: { icon: calculatorSVG, title:"Calculator",
          body:`<div class="gs-app-preview-calc"><div class="gs-app-preview-display">0</div><div class="gs-app-preview-pad">${Array.from({length:9}).map(()=>"<span></span>").join("")}</div></div>` },
        todo: { icon: todoSVG, title:"Todo",
          body:`<div class="gs-app-preview-row done"><span class="gs-app-preview-check"></span>Plan the week</div><div class="gs-app-preview-row"><span class="gs-app-preview-check"></span>Clear the inbox</div>` },
        notes: { icon: notesSVG, title:"Notes",
          body:`<div class="gs-app-preview-line" style="width:80%"></div><div class="gs-app-preview-line" style="width:95%"></div><div class="gs-app-preview-line" style="width:55%"></div>` }
      };
      host.innerHTML = `<div class="gs-mini-row">
        ${Object.keys(APPS).map((key,i)=>`
          <div class="gs-mini-icon" data-app="${key}" tabindex="0" role="button" aria-label="Preview ${APPS[key].title}">
            <div class="gs-mini-glyph">${APPS[key].icon(COLORS[i+1])}</div>
            <div class="gs-mini-label">${APPS[key].title}</div>
          </div>`).join("")}
      </div>
      <div class="gs-app-preview" data-preview hidden>
        <div class="gs-app-preview-bar"><span data-preview-icon></span><span data-preview-title></span></div>
        <div class="gs-app-preview-body" data-preview-body></div>
      </div>`;
      const preview = host.querySelector("[data-preview]");
      let opened = false;
      host.querySelectorAll(".gs-mini-icon").forEach(el=>{
        gsActivate(el, ()=>{
          const app = APPS[el.dataset.app];
          preview.hidden = false;
          preview.querySelector("[data-preview-icon]").innerHTML = app.icon(COLORS[0]);
          preview.querySelector("[data-preview-title]").textContent = app.title;
          preview.querySelector("[data-preview-body]").innerHTML = app.body;
          if(!opened){ opened = true; hintEl.textContent = "That's a real app, opened in a window of its own."; markDone(); }
        });
      });
    }
  },
  {
    key:"personalize", title:"Make it yours",
    blurb:"Pick a theme, choose a wallpaper or upload your own photo, replace the logo, or group icons into colored widgets. Try a couple of these.",
    illustrate: gsPersonalizeSVG,
    build(host, hintEl, markDone){
      const SWATCHES = [
        { key:"dots", label:"Dots", css:"background:#13222a; background-image:radial-gradient(#2c4c57 1.4px, transparent 1.4px); background-size:7px 7px;" },
        { key:"aurora", label:"Aurora", css:"background:linear-gradient(135deg,#0f3b2e,#1f6f5c,#2fb88a,#8ee6c2);" },
        { key:"dunes", label:"Dunes", css:"background:linear-gradient(135deg,#5c3d21,#c9893f,#e8b870,#f6d9a4);" },
        { key:"nebula", label:"Nebula", css:"background:linear-gradient(135deg,#1a0b3d,#5b2a86,#a23fa8,#e86bc4);" }
      ];
      host.innerHTML = `<div class="gs-wp-preview" data-wp-preview style="${SWATCHES[0].css}"></div>
      <div class="gs-wp-row">
        ${SWATCHES.map((s,i)=>`<div class="gs-wp-swatch${i===0?" active":""}" data-wp="${s.key}" style="${s.css}" tabindex="0" role="button" aria-label="${s.label} wallpaper"></div>`).join("")}
      </div>`;
      const preview = host.querySelector("[data-wp-preview]");
      const swatches = Array.from(host.querySelectorAll(".gs-wp-swatch"));
      let picked = false;
      swatches.forEach((el, i)=>{
        gsActivate(el, ()=>{
          swatches.forEach(s=> s.classList.toggle("active", s === el));
          preview.style.cssText = SWATCHES[i].css;
          if(i !== 0 && !picked){ picked = true; hintEl.textContent = "That's the idea — pick whatever feels like yours."; markDone(); }
        });
      });
    }
  },
  {
    key:"backup", title:"Never lose your webtop",
    blurb:"Back up any time from the top bar — JSON for everything, or a plain bookmarks file any browser accepts. Try a preview below.",
    illustrate: gsBackupSVG,
    build(host, hintEl, markDone){
      host.innerHTML = `<div class="gs-demo-row">
        <button type="button" class="gs-demo-btn" data-export="json">Export everything (JSON)</button>
        <button type="button" class="gs-demo-btn" data-export="html">Export bookmarks (HTML)</button>
      </div>
      <p class="gs-fineprint">This is just a preview — your real backup buttons live in the top bar.</p>`;
      let done = false;
      host.querySelectorAll("[data-export]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          btn.classList.add("done");
          btn.textContent = "✓ Saved";
          if(!done){ done = true; hintEl.textContent = "That's exactly the button in your top bar."; markDone(); }
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
    <p class="gs-blurb">This is your webtop — one home screen for your bookmarks, apps and more. This short, hands-on guide walks you through it in about a minute.</p>
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
    <p class="gs-blurb">That's the essentials — right-click to create, drag to organize, search either place, and back up whenever you like. Come back to this guide any time from its icon.</p>
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
}
