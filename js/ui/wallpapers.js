"use strict";

/* ============ WALLPAPER GALLERY + SLIDESHOW ============
   Built-in pictures live in /wallpapers. "My photos" are compressed copies
   stored with the other images. state.wallpaper holds "builtin:<id>" or
   "mine:<id>" for these (patterns and the single custom photo keep their old values). */
const BUILTIN_WALLPAPERS = [
  { id:"aurora",          name:"Aurora",          src:"wallpapers/on369-aurora.jpg" },
  { id:"dunes",           name:"Dunes at dusk",   src:"wallpapers/on369-dunes.jpg" },
  { id:"nebula",          name:"Nebula",          src:"wallpapers/on369-nebula.jpg" },
  { id:"misty-mountains", name:"Misty mountains", src:"wallpapers/on369-misty-mountains.jpg" }
];
const MAX_MY_WALLPAPERS = 12;
const wpGallery = document.getElementById("wpGallery");
const wpPhotosInput = document.getElementById("wpPhotosInput");
const wpShowToggle = document.getElementById("wpShowToggle");
const wpShowOptions = document.getElementById("wpShowOptions");
const wpShowInterval = document.getElementById("wpShowInterval");
const wpShowSource = document.getElementById("wpShowSource");
const wpShowShuffle = document.getElementById("wpShowShuffle");
const wpGalleryNote = document.getElementById("wpGalleryNote");

function wallpaperSrc(value){
  if(typeof value !== "string") return null;
  if(value.startsWith("builtin:")){ const w = BUILTIN_WALLPAPERS.find(b=> "builtin:" + b.id === value); return w ? w.src : null; }
  if(value.startsWith("mine:")){ const m = (state.myWallpapers || []).find(p=> "mine:" + p.id === value); return m ? m.data : null; }
  return null;
}
function wallpaperPool(){
  const src = state.wallpaperShow.source;
  const builtin = BUILTIN_WALLPAPERS.map(b=> "builtin:" + b.id), mine = (state.myWallpapers || []).map(p=> "mine:" + p.id);
  return src === "builtin" ? builtin : src === "mine" ? mine : builtin.concat(mine);
}
function setWallpaper(value){
  const src = wallpaperSrc(value), go = ()=>{ state.wallpaper = value; applyAppearance(); save(); };
  if(!src){ go(); return; }
  const im = new Image(); im.onload = im.onerror = go; im.src = src;   // load first so the desktop never flashes blank
}
function advanceWallpaper(){
  const pool = wallpaperPool();
  state.wallpaperShow.last = Date.now();
  if(pool.length < 2){ save(); return; }
  const i = pool.indexOf(state.wallpaper);
  let next;
  if(state.wallpaperShow.shuffle){ do{ next = pool[Math.floor(Math.random() * pool.length)]; }while(next === state.wallpaper); }
  else next = pool[(i + 1) % pool.length];
  setWallpaper(next);
}
function tickWallpaperShow(){
  const s = state.wallpaperShow;
  if(!s.on || document.hidden) return;
  if(Date.now() - (s.last || 0) >= s.minutes * 60000) advanceWallpaper();
}

function renderWallpaperGallery(){
  wpGallery.innerHTML = "";
  const addThumb = (value, name, src, removable)=>{
    const t = document.createElement("div"); t.className = "wp-thumb"; t.dataset.value = value; t.title = name;
    t.style.backgroundImage = `url("${src}")`;
    t.addEventListener("click", ()=> setWallpaper(value));
    if(removable){
      const x = document.createElement("span"); x.className = "wp-x"; x.textContent = "\u00d7"; x.title = "Remove photo";
      x.addEventListener("click", (e)=>{
        e.stopPropagation();
        state.myWallpapers = state.myWallpapers.filter(p=> "mine:" + p.id !== value);
        if(state.wallpaper === value) state.wallpaper = "dots";
        applyAppearance(); renderWallpaperGallery(); save(); saveImagePrefs();
      });
      t.appendChild(x);
    }
    wpGallery.appendChild(t);
  };
  BUILTIN_WALLPAPERS.forEach(b=> addThumb("builtin:" + b.id, b.name, b.src, false));
  (state.myWallpapers || []).forEach(p=> addThumb("mine:" + p.id, "My photo", p.data, true));
  const add = document.createElement("div"); add.className = "wp-thumb add"; add.title = "Add your photos"; add.textContent = "+";
  add.addEventListener("click", ()=>{ wpPhotosInput.value = ""; wpPhotosInput.click(); });
  wpGallery.appendChild(add);
  updateWallpaperUI();
}
function updateWallpaperUI(){
  if(!wpGallery) return;
  wpGallery.querySelectorAll(".wp-thumb[data-value]").forEach(t=> t.classList.toggle("active", t.dataset.value === state.wallpaper));
  const s = state.wallpaperShow;
  wpShowToggle.classList.toggle("on", s.on); wpShowToggle.setAttribute("aria-checked", String(s.on));
  wpShowOptions.style.display = s.on ? "" : "none";
  wpShowInterval.value = String(s.minutes); wpShowSource.value = s.source;
  wpShowShuffle.classList.toggle("on", s.shuffle); wpShowShuffle.setAttribute("aria-checked", String(s.shuffle));
}

/* Runs once at startup (see main.js). */
function initUiWallpapers(){
  renderWallpaperGallery();
  wpPhotosInput.addEventListener("change", async ()=>{
    const files = Array.from(wpPhotosInput.files || []).filter(f=> f.type.startsWith("image/"));
    const room = MAX_MY_WALLPAPERS - state.myWallpapers.length;
    wpGalleryNote.textContent = "";
    if(!files.length) return;
    if(room <= 0){ wpGalleryNote.textContent = `You can keep up to ${MAX_MY_WALLPAPERS} photos. Remove one to add another.`; return; }
    let added = 0, firstId = null;
    for(const f of files.slice(0, room)){
      try{
        const data = await readAndCompressImage(f, 1920, 0.8, true);
        const id = Math.random().toString(36).slice(2, 10);
        state.myWallpapers.push({ id, data }); firstId = firstId || id; added++;
      }catch(e){ console.warn("on369: could not add photo", e); }
    }
    if(files.length > room) wpGalleryNote.textContent = `Added ${added}. The limit is ${MAX_MY_WALLPAPERS} photos.`;
    else if(added < files.length) wpGalleryNote.textContent = "Some files couldn't be read as pictures.";
    renderWallpaperGallery(); saveImagePrefs();
    if(firstId) setWallpaper("mine:" + firstId);
  });
  wpShowToggle.addEventListener("click", ()=>{ const s = state.wallpaperShow; s.on = !s.on; s.last = Date.now(); updateWallpaperUI(); save(); });
  wpShowShuffle.addEventListener("click", ()=>{ state.wallpaperShow.shuffle = !state.wallpaperShow.shuffle; updateWallpaperUI(); save(); });
  wpShowInterval.addEventListener("change", ()=>{ state.wallpaperShow.minutes = Number(wpShowInterval.value) || 15; state.wallpaperShow.last = Date.now(); save(); });
  wpShowSource.addEventListener("change", ()=>{ state.wallpaperShow.source = wpShowSource.value; save(); });
  setInterval(tickWallpaperShow, 20000);
  document.addEventListener("visibilitychange", tickWallpaperShow);
  setTimeout(tickWallpaperShow, 1500);
}
