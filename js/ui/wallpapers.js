"use strict";

/* ============ WALLPAPER GALLERY + SLIDESHOW ============
   Built-in pictures live in /wallpapers. "My photos" are compressed copies
   stored with the other images. state.wallpaper holds "builtin:<id>" or
   "mine:<id>" for these (patterns and the single custom photo keep their old values). */
let BUILTIN_WALLPAPERS = [
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
  const im = new Image(); im.onload = im.onerror = go; im.src = src;   // load first so the webtop never flashes blank
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
  if(!s.on || document.hidden || state.wallpaper === "video") return;
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
  updateVideoRow();
}

/* ---- pictures the administrator drops into /wallpapers (listed in wallpapers.json) ---- */
const WP_FILE_OK = /^[A-Za-z0-9][A-Za-z0-9 _.()\-]{0,100}\.(jpe?g|png|webp|avif)$/i;
function cleanManifest(data){
  const out = [], seen = new Set(), list = data && Array.isArray(data.images) ? data.images : [];
  for(const e of list.slice(0, 60)){
    const file = e && typeof e.file === "string" ? e.file : "";
    if(!WP_FILE_OK.test(file) || file.includes("..")) continue;       // plain file names only, never paths or odd characters
    const base = file.replace(/\.[^.]+$/, "");
    let id = String(e.id || base).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "wp";
    while(seen.has(id)) id += "-2";
    seen.add(id);
    const name = (typeof e.name === "string" && e.name.trim() ? e.name.trim() : base.replace(/[-_]+/g, " ")).slice(0, 40);
    out.push({ id, name, src: "wallpapers/" + encodeURIComponent(file) });
  }
  return out;
}
function useCachedManifest(){   // last list we saw, so a chosen wallpaper shows instantly on startup
  try{ const l = cleanManifest(JSON.parse(localStorage.getItem("on369.wpManifest") || "null")); if(l.length) BUILTIN_WALLPAPERS = l; }catch(_){}
}
async function loadManifest(){
  try{
    const r = await fetch("wallpapers/wallpapers.json", { cache:"no-cache" });
    if(!r.ok) return;
    const d = await r.json(), l = cleanManifest(d);
    if(!l.length) return;
    try{ localStorage.setItem("on369.wpManifest", JSON.stringify(d)); }catch(_){}
    if(JSON.stringify(l) !== JSON.stringify(BUILTIN_WALLPAPERS)){ BUILTIN_WALLPAPERS = l; renderWallpaperGallery(); applyAppearance(); }
  }catch(_){ /* offline or opened from a file: keep the built-in list */ }
}

/* ---- crossfade: the old picture is laid over the new one and fades away ---- */
function crossfadeFrom(prev){
  if(!prev || !prev.img || prev.img === webtop.style.backgroundImage) return;
  if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const old = document.createElement("div"); old.className = "wp-fadeout";
  old.style.backgroundImage = prev.img; old.style.backgroundSize = prev.size; old.style.backgroundPosition = prev.pos; old.style.backgroundRepeat = prev.rep;
  webtop.prepend(old);
  requestAnimationFrame(()=> requestAnimationFrame(()=>{ old.style.opacity = "0"; }));
  setTimeout(()=> old.remove(), 1500);
}

/* ---- the user's own video background (one clip, kept on this device only) ---- */
const MAX_VIDEO_BYTES = 60 * 1048576;
const wpVideoEl = document.createElement("video");
const wpVideoInput = document.getElementById("wpVideoInput"), wpVideoBtn = document.getElementById("wpVideoBtn");
const wpVideoUse = document.getElementById("wpVideoUse"), wpVideoRemove = document.getElementById("wpVideoRemove"), wpVideoSub = document.getElementById("wpVideoSub");
let wpVideoUrl = null, wpVideoMeta = null;
const wpNote = (t)=>{ wpGalleryNote.textContent = t; };
function videoWallpaperReady(){ return !!wpVideoUrl; }
function playVideoIfAllowed(){
  if(!wpVideoEl.classList.contains("on")) return;
  const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(calm || document.hidden) wpVideoEl.pause(); else wpVideoEl.play().catch(()=>{});
}
function showVideoWallpaper(on){
  if(on){
    if(wpVideoEl.dataset.src !== wpVideoUrl){ wpVideoEl.src = wpVideoUrl; wpVideoEl.dataset.src = wpVideoUrl; }
    wpVideoEl.style.objectFit = ({ fill:"cover", fit:"contain", stretch:"fill", center:"none" })[state.wallpaperFit] || "cover";
    wpVideoEl.classList.add("on"); playVideoIfAllowed();
  }else{ wpVideoEl.classList.remove("on"); wpVideoEl.pause(); }
}
function updateVideoRow(){
  if(!wpVideoBtn) return;
  const has = !!wpVideoMeta;
  wpVideoBtn.textContent = has ? "Replace\u2026" : "Add\u2026";
  wpVideoUse.style.display = wpVideoRemove.style.display = has ? "" : "none";
  wpVideoSub.textContent = has ? `${wpVideoMeta.name} \u00b7 ${(wpVideoMeta.size / 1048576).toFixed(1)} MB` + (state.wallpaper === "video" ? " \u00b7 in use" : "") : "A short, looping clip works best";
}
async function loadVideoWallpaper(){
  try{
    const rec = await MediaStore.get("wallpaper-video");
    if(rec && rec.blob){ if(wpVideoUrl) URL.revokeObjectURL(wpVideoUrl); wpVideoUrl = URL.createObjectURL(rec.blob); wpVideoMeta = { name: rec.name || "video", size: rec.blob.size }; }
  }catch(_){}
  updateVideoRow(); applyAppearance();
}

/* Runs once at startup (see main.js). */
function initUiWallpapers(){
  wpVideoEl.className = "wp-video"; wpVideoEl.muted = true; wpVideoEl.loop = true; wpVideoEl.autoplay = true; wpVideoEl.playsInline = true;
  wpVideoEl.setAttribute("aria-hidden", "true"); document.body.appendChild(wpVideoEl);
  useCachedManifest(); loadManifest(); loadVideoWallpaper();
  wpVideoBtn.addEventListener("click", ()=>{ wpVideoInput.value = ""; wpVideoInput.click(); });
  wpVideoUse.addEventListener("click", ()=> setWallpaper("video"));
  wpVideoRemove.addEventListener("click", async ()=>{
    try{ await MediaStore.del("wallpaper-video"); }catch(_){}
    if(wpVideoUrl) URL.revokeObjectURL(wpVideoUrl);
    wpVideoUrl = null; wpVideoMeta = null;
    if(state.wallpaper === "video") state.wallpaper = "dots";
    applyAppearance(); save();
  });
  wpVideoInput.addEventListener("change", async ()=>{
    const f = wpVideoInput.files && wpVideoInput.files[0]; wpNote("");
    if(!f) return;
    if(!f.type.startsWith("video/")){ wpNote("That isn't a video file."); return; }
    if(f.size > MAX_VIDEO_BYTES){ wpNote(`That video is ${Math.round(f.size / 1048576)} MB. Please choose one under ${MAX_VIDEO_BYTES / 1048576} MB.`); return; }
    if(!document.createElement("video").canPlayType(f.type)){ wpNote("Your browser can't play this kind of video. MP4 (H.264) or WebM works best."); return; }
    try{ await MediaStore.put("wallpaper-video", { name: f.name, blob: f }); }
    catch(e){ wpNote("Couldn't save the video. Your browser may be out of storage space."); return; }
    await loadVideoWallpaper(); setWallpaper("video");
  });
  document.addEventListener("visibilitychange", playVideoIfAllowed);
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
