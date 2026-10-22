"use strict";

/* ============ BOOKMARK EXPORT ============
   The reverse of the importer above: walks the webtop tree and writes
   it back out as a standard Netscape bookmark file — the same format
   browsers themselves export, so the result can be re-imported into
   on369, Chrome, Firefox, Safari, etc. Only bookmarks, web apps, and
   folders are included; native apps (Calculator, Todo, ...) have no
   URL and aren't part of a bookmarks export, same as a browser would
   never export its installed extensions alongside its bookmarks. */
function escapeHtmlAttr(s){
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function serializeBookmarkTree(parentId, depth){
  const pad = "    ".repeat(depth);
  const items = childrenOf(parentId)
    .filter(i => i.type === "bookmark" || i.type === "webapp" || i.type === "folder")
    .sort((a,b)=> a.y - b.y || a.x - b.x);
  let html = `${pad}<DL><p>\n`;
  const widgetFolders = parentId === null ? state.icons.filter(i=> i.type === "widget" && i.kind !== "clock") : [];
  widgetFolders.forEach(w=>{
    html += `${pad}    <DT><H3>${escapeHtmlAttr(w.label)}</H3>\n`;
    html += serializeBookmarkTree(w.id, depth+1);
  });
  items.forEach(item=>{
    if(item.type === "folder"){
      html += `${pad}    <DT><H3>${escapeHtmlAttr(item.label)}</H3>\n`;
      html += serializeBookmarkTree(item.id, depth+1);
    }else{
      html += `${pad}    <DT><A HREF="${escapeHtmlAttr(item.url)}">${escapeHtmlAttr(item.label)}</A>\n`;
    }
  });
  html += `${pad}</DL><p>\n`;
  return html;
}


function exportBookmarks(){
  const doc = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
   It will be read and overwritten.
   DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
${serializeBookmarkTree(null, 0)}`;
  const blob = new Blob([doc], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `on369-bookmarks-${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

