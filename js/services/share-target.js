"use strict";

/* ============ SHARE TO on369 ============
   Lets a link arrive from outside the app and become a bookmark:
     - installed on a phone: "Share" in any app or browser -> on369 (the manifest's share_target)
     - any browser: open  <your on369 address>/?url=<link>&title=<name>  (a bookmarklet can do this)
   The app opens the "Add bookmark" form with the link and title filled in, so nothing is added
   until you press Save. Only http(s) links are accepted. */

// Reads and clears the share parameters from the address bar. Returns { url, title } or null.
function takeSharedLink(){
  let params;
  try{ params = new URLSearchParams(location.search); }catch(e){ return null; }
  if(!["url", "text", "title"].some(k=> params.has(k))) return null;
  try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}   // so a reload doesn't add it again

  const firstLink = (t)=>{ const m = /https?:\/\/[^\s<>"']+/i.exec(t || ""); return m ? m[0] : ""; };
  const candidates = [params.get("url"), firstLink(params.get("url")), firstLink(params.get("text"))];
  let url = "";
  for(const c of candidates){
    if(!c) continue;
    try{ const u = new URL(c.trim()); if(u.protocol === "http:" || u.protocol === "https:"){ url = u.href; break; } }catch(e){}
  }
  if(!url) return null;

  let title = (params.get("title") || "").trim();
  if(!title){   // some apps put "Page title https://..." into the text field only
    title = (params.get("text") || "").replace(/https?:\/\/[^\s<>"']+/ig, "").replace(/\s+/g, " ").trim();
  }
  return { url, title: title.slice(0, 80) };
}

// Opens the Add bookmark form with the shared link filled in (the current webtop's top level).
function openSharedLink(shared){
  openItemModal({ mode:"create", type:"bookmark", parentId:null, prefill:{ label: shared.title, url: shared.url } });
}
