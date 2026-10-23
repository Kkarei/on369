"use strict";

/* ============ ICON GLYPHS ============ */
function folderSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" fill="${color}" opacity="0.9"/><path d="M3 9h18" stroke="rgba(0,0,0,0.15)" stroke-width="1"/></svg>`;
}

function linkSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"></path><path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1"></path></svg>`;
}

function calculatorSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2.5"></rect><line x1="8" y1="6.5" x2="16" y2="6.5"></line><circle cx="8" cy="11.5" r="1" fill="${color}" stroke="none"></circle><circle cx="12" cy="11.5" r="1" fill="${color}" stroke="none"></circle><circle cx="16" cy="11.5" r="1" fill="${color}" stroke="none"></circle><circle cx="8" cy="15.5" r="1" fill="${color}" stroke="none"></circle><circle cx="12" cy="15.5" r="1" fill="${color}" stroke="none"></circle><circle cx="16" cy="15.5" r="1" fill="${color}" stroke="none"></circle><circle cx="8" cy="19" r="1" fill="${color}" stroke="none"></circle><circle cx="12" cy="19" r="1" fill="${color}" stroke="none"></circle><circle cx="16" cy="19" r="1" fill="${color}" stroke="none"></circle></svg>`;
}

function todoSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="7" height="7" rx="1.5"></rect><path d="M5 7l1.3 1.3L8.5 5.8"></path><rect x="3" y="13.5" width="7" height="7" rx="1.5"></rect><path d="M5 17l1.3 1.3 2.2-2.5"></path><line x1="13" y1="7" x2="21" y2="7"></line><line x1="13" y1="17" x2="21" y2="17"></line></svg>`;
}


function notesSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v5h5M8.5 12.5h7M8.5 16h5"></path></svg>`;
}


function faviconDomain(url){
  try{ return new URL(url).hostname; }
  catch(e){ return null; }
}


function domainLabel(url){
  const host = faviconDomain(url);
  if(!host) return "Untitled";
  const bare = host.replace(/^www\./, "");
  const core = bare.split(".")[0];
  return core.charAt(0).toUpperCase() + core.slice(1);
}


// Builds a chained onerror fallback across N image URLs, ending in the
// generated SVG glyph if all of them fail. Generalizes what was previously
// hand-written twice (bookmarks, and now webapps) into one place.
function pictorialGlyphHTML(color, tierUrls){
  const fallback = linkSVG(color);
  if(tierUrls.length === 0){
    return `<div class="glyph-wrap"><div class="icon-glyph" style="border-color:${color}55">${fallback}</div></div>`;
  }
  // No inline JS: remaining tiers ride along as an escaped data attribute and the
  // delegated error handler below walks them, so URLs are never parsed as code.
  return `<div class="glyph-wrap"><div class="icon-glyph" style="border-color:${color}55"><img src="${escapeHtmlAttr(tierUrls[0])}" alt="" data-tiers="${escapeHtmlAttr(JSON.stringify(tierUrls.slice(1)))}" data-fb-color="${escapeHtmlAttr(color)}"></div></div>`;
}

function glyphFor(item){
  if(item.type === "folder"){
    const count = childrenOf(item.id).length;
    const badge = count > 0 ? `<span class="count-badge">${count > 99 ? "99+" : count}</span>` : "";
    return `<div class="glyph-wrap"><div class="icon-glyph" style="background:${item.color}22;border-color:${item.color}55">${folderSVG(item.color)}</div>${badge}</div>`;
  }
  if(item.type === "app"){
    const app = AppManager.getMetadata(item.appId);
    const svg = app ? app.icon(item.color) : linkSVG(item.color);
    return `<div class="glyph-wrap"><div class="icon-glyph" style="background:${item.color}1a;border-color:${item.color}55">${svg}</div></div>`;
  }
  if(item.type === "webapp"){
    const domain = faviconDomain(item.url);
    const tiers = [];
    if(item.manifestIcon) tiers.push(item.manifestIcon); // the real app icon, when we found one
    if(domain){
      tiers.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      tiers.push(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
    }
    return pictorialGlyphHTML(item.color, tiers);
  }
  const domain = faviconDomain(item.url);
  if(domain){
    // Three-tier pictorial fallback: DuckDuckGo's icon service errors cleanly on a
    // real miss (so onerror actually fires), Google's s2 service has broad coverage
    // but silently returns a generic placeholder instead of erroring, and our own
    // colored glyph is the guaranteed-to-render last resort.
    return pictorialGlyphHTML(item.color, [
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
    ]);
  }
  return pictorialGlyphHTML(item.color, []);
}


/* ============ CONTEXT MENU ICONS ============
   Plain outline glyphs for menu chrome (as opposed to glyphFor() above,
   which renders each item's own colored webtop icon). Single shared
   stroke style (currentColor, so they inherit each row's text/danger
   color automatically) matching the search bar and icon-size buttons. */
const MENU_ICON_PATHS = {
  view: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>`,
  zoomIn: `<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path><path d="M11 8v6M8 11h6"></path>`,
  zoomOut: `<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path><path d="M8 11h6"></path>`,
  reset: `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>`,
  paste: `<rect x="4" y="5" width="16" height="16" rx="2"></rect><rect x="8" y="2.5" width="8" height="4" rx="1.2"></rect>`,
  folder: `<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"></path>`,
  bookmark: `<path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z"></path>`,
  grid: `<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>`,
  globe: `<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"></path>`,
  import: `<path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="M7 9l5 5 5-5"></path><path d="M12 14V3"></path>`,
  export: `<path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="M7 8l5-5 5 5"></path><path d="M12 3v11"></path>`,
  sort: `<path d="M4 6h16"></path><path d="M7 12h10"></path><path d="M10 18h4"></path>`,
  arrange: `<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path>`,
  back: `<path d="M19 12H5"></path><path d="m11 18-6-6 6-6"></path>`,
  openLink: `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path>`,
  rename: `<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>`,
  editUrl: `<path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><path d="M8 12h8"></path>`,
  copy: `<rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`,
  move: `<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"></path><path d="M8 13l3 3 3-3"></path><path d="M11 16v-5"></path>`,
  cut: `<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M8.5 8.5 19 19"></path><path d="M8.5 15.5 19 5"></path>`,
  delete: `<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>`,
  chevron: `<path d="m9 6 6 6-6 6"></path>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>`,
  undo: `<path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path>`,
  checkEmpty: `<rect x="3" y="3" width="18" height="18" rx="4"></rect>`,
  invert: `<rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" stroke="none"></rect><rect x="13" y="13" width="8" height="8" rx="2"></rect>`,
  webtop: `<rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path>`,
  clock: `<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path>`,
  tag: `<path d="M20.6 12.6 12 21.2a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8L11.4 3.4A2 2 0 0 1 12.8 3H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.4 1.4Z"></path><circle cx="15" cy="9" r="1.5"></circle>`,
  refresh: `<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M3 16v5h5"></path><path d="M16 3h5v5"></path>`,
  check: `<rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="m8 12 3 3 6-6"></path>`
};

function menuIcon(name){
  const d = MENU_ICON_PATHS[name];
  if(!d) return "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}


/* Runs once at startup (see main.js), in the original order. */
function initUiGlyphs(){
  document.addEventListener("error", (e)=>{
    const img = e.target;
    if(!(img instanceof HTMLImageElement) || !img.hasAttribute("data-tiers")) return;
    let rest = [];
    try{ rest = JSON.parse(img.dataset.tiers) || []; }catch(_){}
    if(rest.length){
      const next = rest.shift();
      img.dataset.tiers = JSON.stringify(rest);
      img.src = next;
    }else{
      const tmp = document.createElement("span");
      tmp.innerHTML = linkSVG(img.dataset.fbColor || COLORS[0]);
      img.replaceWith(tmp.firstChild);
    }
  }, true);

}
