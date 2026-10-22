"use strict";

/* ============ THEME / WALLPAPER ============ */
const THEMES = [
  { id:"noctis",   name:"Noctis",   bg:"#0c0e13", bg2:"#1b2033", accent:"#7c9fff" },
  { id:"daylight", name:"Daylight", bg:"#eef0f4", bg2:"#cfd6e8", accent:"#4f6fe0" },
  { id:"dune",     name:"Dune",     bg:"#201a14", bg2:"#3a2c1c", accent:"#d4a054" },
  { id:"graphite", name:"Graphite", bg:"#1b1e23", bg2:"#2c3038", accent:"#8fa0b8" },
  { id:"verdant",  name:"Verdant",  bg:"#0f1a14", bg2:"#1c3226", accent:"#6cc499" }
];


const themeGrid = document.getElementById("themeGrid");

// Resizes an uploaded image to at most maxDim on its longest side before
// storing it. Without this, a full-resolution phone photo used as a
// wallpaper (or logo) would sit in local storage at several MB — this
// keeps things reasonable regardless of what the person picked. PNG/WebP
// sources keep transparency (logos are often transparent-background);
// everything else is flattened onto white and re-encoded as JPEG, which
// compresses far smaller for photos.
function readAndCompressImage(file, maxDim, quality, forceJpeg){
  return new Promise((resolve, reject)=>{
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if(width <= 0 || height <= 0){ reject(new Error("Image has no visible size")); return; }
      if(width > maxDim || height > maxDim){
        if(width >= height){ height = Math.round(height * (maxDim / width)); width = maxDim; }
        else{ width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      const keepAlpha = !forceJpeg && (file.type === "image/png" || file.type === "image/webp" || file.type === "image/svg+xml");
      if(!keepAlpha){ ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(objectUrl); reject(new Error("Could not read image file")); };
    img.src = objectUrl;
  });
}


// Maps each fit mode to the CSS that produces it. "Span" is the one
// classic webtop-wallpaper option without a literal equivalent here
// (it normally means "stretch one image across every monitor") — the
// closest honest match in a single scrollable browser viewport is
// sizing the image to cover the *whole* virtual webtop (not just what's
// currently visible) and letting it scroll with the content, so one
// continuous image spans your whole layout rather than being re-fit to
// whatever's on screen at a given moment. That's the "scroll" attachment
// below; every other mode uses "fixed" so the photo stays put like a
// real wallpaper while icons scroll over it.
const WALLPAPER_FIT_CSS = {
  fill:    { size:"cover",     position:"center",   repeat:"no-repeat", attachment:"fixed"  },
  fit:     { size:"contain",   position:"center",   repeat:"no-repeat", attachment:"fixed"  },
  stretch: { size:"100% 100%", position:"center",   repeat:"no-repeat", attachment:"fixed"  },
  tile:    { size:"auto",      position:"top left", repeat:"repeat",    attachment:"fixed"  },
  center:  { size:"auto",      position:"center",   repeat:"no-repeat", attachment:"fixed"  },
  span:    { size:"cover",     position:"center",   repeat:"no-repeat", attachment:"scroll" }
};


function applyAppearance(){
  const prevBg = { img: webtop.style.backgroundImage, size: webtop.style.backgroundSize, pos: webtop.style.backgroundPosition, rep: webtop.style.backgroundRepeat };
  document.documentElement.setAttribute("data-theme", state.theme);
  // "custom" isn't one of the CSS pattern attribute-selectors — if it's
  // selected but the image somehow went missing, fall back to the
  // app default rather than showing a blank background.
  const gallerySrc = wallpaperSrc(state.wallpaper);   // built-in or "my photos" wallpaper, if one is selected
  const wantVideo = state.wallpaper === "video" && typeof videoWallpaperReady === "function" && videoWallpaperReady();
  const effectiveWallpaper = (gallerySrc || wantVideo) ? "custom"
    : ((state.wallpaper === "custom" && !state.customWallpaperImage) || state.wallpaper === "video" || String(state.wallpaper).includes(":")) ? "dots" : state.wallpaper;
  document.documentElement.setAttribute("data-wallpaper", effectiveWallpaper);
  if(effectiveWallpaper === "custom"){
    const fit = WALLPAPER_FIT_CSS[state.wallpaperFit] || WALLPAPER_FIT_CSS.fill;
    webtop.style.backgroundImage = wantVideo ? "" : `url("${gallerySrc || state.customWallpaperImage}")`;
    webtop.style.backgroundSize = fit.size;
    webtop.style.backgroundPosition = fit.position;
    webtop.style.backgroundRepeat = fit.repeat;
    webtop.style.backgroundAttachment = fit.attachment;
  }else{
    webtop.style.backgroundImage = "";
    webtop.style.backgroundSize = "";
    webtop.style.backgroundPosition = "";
    webtop.style.backgroundRepeat = "";
    webtop.style.backgroundAttachment = "";
  }
  webtop.style.backgroundColor = wantVideo ? "transparent" : "";
  if(typeof showVideoWallpaper === "function") showVideoWallpaper(wantVideo);
  if(typeof crossfadeFrom === "function") crossfadeFrom(prevBg);   // old picture fades out over the new one
  document.getElementById("wallpaperFitRow").style.display = effectiveWallpaper === "custom" ? "" : "none";
  document.getElementById("wallpaperFitSelect").value = state.wallpaperFit;
  document.querySelectorAll(".theme-card").forEach(s=>{
    s.classList.toggle("active", s.dataset.theme === state.theme);
  });
  document.querySelectorAll(".wp-swatch").forEach(s=>{
    s.classList.toggle("active", s.dataset.wp === effectiveWallpaper && !gallerySrc);
  });
  if(typeof updateWallpaperUI === "function") updateWallpaperUI();
  const customSwatch = document.getElementById("wpCustomSwatch");
  if(state.customWallpaperImage){
    customSwatch.style.backgroundImage = `url("${state.customWallpaperImage}")`;
    customSwatch.innerHTML = `<span class="wp-custom-edit" title="Change photo">${menuIcon("rename")}</span>`;
  }else{
    customSwatch.style.backgroundImage = "";
    customSwatch.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>`;
  }
}


const wallpaperFileInput = document.getElementById("wallpaperFileInput");

/* ============ LOGO & SEARCH BAR: LOCK, SHOW/HIDE, CUSTOM LOGO ============ */
const brandEl = document.querySelector(".brand");

const searchBarEl = document.getElementById("searchBar");

const chromeLockToggle = document.getElementById("chromeLockToggle");

const showLogoToggle = document.getElementById("showLogoToggle");

const showSearchToggle = document.getElementById("showSearchToggle");

const changeLogoBtn = document.getElementById("changeLogoBtn");

const resetLogoBtn = document.getElementById("resetLogoBtn");

const logoFileInput = document.getElementById("logoFileInput");

const defaultLogoSvg = document.getElementById("defaultLogoSvg");

const customLogoImg = document.getElementById("customLogoImg");


function applyChromeVisibility(){
  brandEl.style.display = state.showLogo ? "" : "none";
  searchBarEl.style.display = state.showSearchBar ? "" : "none";

  defaultLogoSvg.style.display = state.customLogo ? "none" : "";
  if(state.customLogo){ customLogoImg.src = state.customLogo; customLogoImg.style.display = ""; }
  else{ customLogoImg.style.display = "none"; customLogoImg.removeAttribute("src"); }

  chromeLockToggle.classList.toggle("on", state.chromeLocked);
  chromeLockToggle.setAttribute("aria-checked", String(state.chromeLocked));
  showLogoToggle.classList.toggle("on", state.showLogo);
  showLogoToggle.setAttribute("aria-checked", String(state.showLogo));
  showSearchToggle.classList.toggle("on", state.showSearchBar);
  showSearchToggle.setAttribute("aria-checked", String(state.showSearchBar));

  [showLogoToggle, showSearchToggle, changeLogoBtn].forEach(el=> el.disabled = state.chromeLocked);
  resetLogoBtn.disabled = state.chromeLocked;
  resetLogoBtn.style.display = state.customLogo ? "" : "none";
}


/* ============ RESET TO DEFAULTS ============
   Deliberately scoped to appearance/settings only — theme, wallpaper,
   icon size, search engine, logo/search-bar setup. state.icons (the
   person's actual bookmarks, folders, and apps) is never touched here;
   "reset settings" and "erase my webtop" are very different asks, and
   only the former was requested. */
function resetSettingsToDefaults(){
  const defaults = seedState();
  state.theme = defaults.theme;
  state.wallpaper = defaults.wallpaper;
  state.wallpaperFit = defaults.wallpaperFit;
  state.searchEngine = defaults.searchEngine;
  state.chromeLocked = defaults.chromeLocked;
  state.showLogo = defaults.showLogo;
  state.showSearchBar = defaults.showSearchBar;
  state.customLogo = null;
  state.customWallpaperImage = null;
  state.myWallpapers = [];
  state.wallpaperShow = { ...defaults.wallpaperShow };
  state.timeFormat = defaults.timeFormat;
  state.dateFormat = defaults.dateFormat;
  state.timeZone = defaults.timeZone;

  applyAppearance();
  applyChromeVisibility();
  setIconScale(defaults.iconScale); // also updates the readout, re-renders, and saves
  document.querySelectorAll(".engine-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.engine === state.searchEngine);
  });
  tickClock();
  syncDateTimeSettingsUI();
  if(calendarPop.classList.contains("open")) renderCalendarGrid();
  save();
  saveImagePrefs();
}


const resetConfirmOverlay = document.getElementById("resetConfirmOverlay");

function closeResetConfirm(){ resetConfirmOverlay.classList.remove("open"); }

/* ============ ICON SIZE ============ */
const ICON_SCALE_MIN = 0.7, ICON_SCALE_MAX = 1.6;

function setIconScale(newScale){
  state.iconScale = Math.round(Math.min(ICON_SCALE_MAX, Math.max(ICON_SCALE_MIN, newScale)) * 100) / 100;
  applyIconScale();
  updateIconSizeReadout();
  render();
  save();
}

function updateIconSizeReadout(){
  const el = document.getElementById("iconSizeReadout");
  if(el) el.textContent = Math.round(state.iconScale * 100) + "%";
}

/* Runs once at startup (see main.js), in the original order. */
function initUiAppearance(){
  THEMES.forEach(t=>{
    const card = document.createElement("div");
    card.className = "theme-card";
    card.dataset.theme = t.id;
    card.innerHTML = `<div class="theme-swatch" style="background:linear-gradient(135deg, ${t.bg}, ${t.bg2})"><span class="dot" style="background:${t.accent}"></span></div><span class="theme-name">${t.name}</span>`;
    card.addEventListener("click", ()=>{ state.theme = t.id; applyAppearance(); save(); });
    themeGrid.appendChild(card);
  });

  document.getElementById("settingsBtn").addEventListener("click", (e)=>{
    e.stopPropagation();
    document.getElementById("calendarPop").classList.remove("open");
    document.getElementById("settingsPop").classList.toggle("open");
  });
  document.querySelectorAll(".wp-swatch").forEach(s=>{
    s.addEventListener("click", (e)=>{
      if(s.dataset.wp === "custom"){
        if(e.target.closest(".wp-custom-edit") || !state.customWallpaperImage){
          wallpaperFileInput.value = "";
          wallpaperFileInput.click();
          return;
        }
      }
      state.wallpaper = s.dataset.wp;
      applyAppearance();
      save();
    });
  });
  wallpaperFileInput.addEventListener("change", async ()=>{
    const file = wallpaperFileInput.files && wallpaperFileInput.files[0];
    if(!file) return;
    try{
      state.customWallpaperImage = await readAndCompressImage(file, 1920, 0.82);
      state.wallpaper = "custom";
      applyAppearance();
      save();
      await saveImagePrefs();
    }catch(e){
      console.warn("on369: background photo processing failed", e);
    }
  });
  document.getElementById("wallpaperFitSelect").addEventListener("change", (e)=>{
    state.wallpaperFit = e.target.value;
    applyAppearance();
    save();
  });
  document.addEventListener("click", (e)=>{
    const pop = document.getElementById("settingsPop");
    if(pop.classList.contains("open") && !pop.contains(e.target) && e.target.id !== "settingsBtn" && !document.getElementById("resetConfirmOverlay").contains(e.target)){
      pop.classList.remove("open");
    }
  });

  chromeLockToggle.addEventListener("click", ()=>{
    state.chromeLocked = !state.chromeLocked;
    applyChromeVisibility();
    save();
  });
  showLogoToggle.addEventListener("click", ()=>{
    if(state.chromeLocked) return;
    state.showLogo = !state.showLogo;
    applyChromeVisibility();
    save();
  });
  showSearchToggle.addEventListener("click", ()=>{
    if(state.chromeLocked) return;
    state.showSearchBar = !state.showSearchBar;
    applyChromeVisibility();
    save();
  });
  changeLogoBtn.addEventListener("click", ()=>{
    if(state.chromeLocked) return;
    logoFileInput.value = "";
    logoFileInput.click();
  });
  logoFileInput.addEventListener("change", async ()=>{
    const file = logoFileInput.files && logoFileInput.files[0];
    if(!file) return;
    try{
      state.customLogo = await readAndCompressImage(file, 240, 0.9);
      applyChromeVisibility();
      save();
      await saveImagePrefs();
    }catch(e){
      console.warn("on369: logo image processing failed", e);
    }
  });
  resetLogoBtn.addEventListener("click", ()=>{
    if(state.chromeLocked) return;
    state.customLogo = null;
    applyChromeVisibility();
    save();
    saveImagePrefs();
  });

  document.getElementById("resetDefaultsBtn").addEventListener("click", ()=>{
    resetConfirmOverlay.classList.add("open");
  });
  document.getElementById("resetConfirmCancel").addEventListener("click", closeResetConfirm);
  resetConfirmOverlay.addEventListener("mousedown", (e)=>{ if(e.target===resetConfirmOverlay) closeResetConfirm(); });
  document.getElementById("resetConfirmConfirm").addEventListener("click", ()=>{
    closeResetConfirm();
    resetSettingsToDefaults();
    document.getElementById("settingsPop").classList.remove("open");
  });

  document.getElementById("iconSizeDown").addEventListener("click", ()=> setIconScale(state.iconScale - 0.1));
  document.getElementById("iconSizeUp").addEventListener("click", ()=> setIconScale(state.iconScale + 0.1));

  // Ctrl/Cmd + scroll-wheel zoom on the webtop, matching the resize
  // convention most webtop OSes already use for this exact gesture.
  webtop.addEventListener("wheel", (e)=>{
    if(!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setIconScale(state.iconScale + (e.deltaY < 0 ? 0.05 : -0.05));
  }, { passive:false });
  folderBody.addEventListener("wheel", (e)=>{
    if(!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setIconScale(state.iconScale + (e.deltaY < 0 ? 0.05 : -0.05));
  }, { passive:false });

}
