"use strict";

/* ============ BOOKMARK IMPORT ============
   Reads a standard Netscape Bookmark File (the HTML every major browser
   produces via "Export bookmarks") and rebuilds the same folder structure
   as real FolderItem/BookmarkItem records. There's no browser API for a
   page to read bookmarks directly — export-then-upload is the only path
   available to a regular web page, and it's what every bookmark-import
   tool actually does under the hood. */

// Walks a <dl> exactly as browsers actually nest it (confirmed empirically,
// not assumed): each <dt> either directly contains an <a> (a bookmark) or
// an <h3> plus a following <dl> sibling, BOTH as direct children of that
// same <dt> (a folder). Stray empty <p> siblings are simply skipped.
function parseBookmarksDL(dlEl){
  const items = [];
  Array.from(dlEl.children).forEach(dt=>{
    if(dt.tagName !== "DT") return;
    const a = dt.querySelector(":scope > a");
    if(a){
      const href = a.getAttribute("href") || "";
      if(!/^https?:\/\//i.test(href)) return; // skip javascript:, data:, file:, etc.
      items.push({ kind:"bookmark", label: (a.textContent||"").trim() || href, url: href });
      return;
    }
    const h3 = dt.querySelector(":scope > h3");
    if(h3){
      const nestedDL = dt.querySelector(":scope > dl");
      items.push({
        kind:"folder",
        label: (h3.textContent||"").trim() || "Folder",
        children: nestedDL ? parseBookmarksDL(nestedDL) : []
      });
    }
  });
  return items;
}


function parseBookmarksHTML(text){
  const doc = new DOMParser().parseFromString(text, "text/html");
  const rootDL = doc.querySelector("dl");
  if(!rootDL) return [];
  return parseBookmarksDL(rootDL);
}


function countBookmarkTree(tree){
  let bookmarks = 0, folders = 0;
  tree.forEach(node=>{
    if(node.kind === "bookmark") bookmarks++;
    else{
      folders++;
      const sub = countBookmarkTree(node.children);
      bookmarks += sub.bookmarks;
      folders += sub.folders;
    }
  });
  return { bookmarks, folders };
}


// Lays out a freshly-created set of siblings in simple row-major order.
// Safe because these are all brand-new items with no existing occupants
// to collide with — nextFreeSlot's incremental scan isn't needed here and
// would be far slower across a large import.
function layoutRowMajor(count, cols){
  const positions = [];
  for(let i=0;i<count;i++) positions.push({ x: i % cols, y: Math.floor(i/cols) });
  return positions;
}


// Converts the parsed tree into real Item instances, appending them to
// newItems (batched — one Store write at the end, not one per item).
function materializeBookmarkTree(tree, parentId, newItems){
  const positions = layoutRowMajor(tree.length, 5);
  tree.forEach((node, i)=>{
    const pos = positions[i];
    if(node.kind === "bookmark"){
      newItems.push(createItem("bookmark", {
        label: node.label, url: node.url,
        color: COLORS[newItems.length % COLORS.length],
        x: pos.x, y: pos.y, parentId
      }));
    }else{
      const folder = createItem("folder", {
        label: node.label,
        color: COLORS[newItems.length % COLORS.length],
        x: pos.x, y: pos.y, parentId
      });
      newItems.push(folder);
      materializeBookmarkTree(node.children, folder.id, newItems);
    }
  });
}


let pendingImportTree = null;

let pendingImportParentId = null;

const bookmarkImportInput = document.getElementById("bookmarkImportInput");

const importOverlay = document.getElementById("importOverlay");

const importSummary = document.getElementById("importSummary");

const importFolderName = document.getElementById("importFolderName");


function triggerBookmarkImport(parentId){
  pendingImportParentId = parentId;
  bookmarkImportInput.value = "";
  bookmarkImportInput.click();
}


function closeImportModal(){ importOverlay.classList.remove("open"); pendingImportTree = null; }

/* Runs once at startup (see main.js), in the original order. */
function initServicesBookmarkImport(){
  bookmarkImportInput.addEventListener("change", ()=>{
    const file = bookmarkImportInput.files && bookmarkImportInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      let tree;
      try{
        tree = parseBookmarksHTML(String(reader.result || ""));
      }catch(e){
        console.warn("on369: bookmark import parse failed", e);
        tree = [];
      }
      const { bookmarks, folders } = countBookmarkTree(tree);
      if(bookmarks === 0 && folders === 0){
        importSummary.innerHTML = `Couldn't find any bookmarks in that file. Make sure it's an exported bookmarks HTML file (browsers export this from their bookmark manager's "Export bookmarks" option).`;
        document.getElementById("importConfirm").style.display = "none";
      }else{
        importSummary.innerHTML = `Found <b>${bookmarks}</b> bookmark${bookmarks===1?"":"s"} in <b>${folders}</b> folder${folders===1?"":"s"}.`;
        document.getElementById("importConfirm").style.display = "";
      }
      pendingImportTree = tree;
      importFolderName.value = `Imported ${new Date().toLocaleDateString()}`;
      importOverlay.classList.add("open");
      setTimeout(()=> importFolderName.focus(), 30);
    };
    reader.onerror = ()=>{
      console.warn("on369: bookmark import file read failed", reader.error);
    };
    reader.readAsText(file);
  });

  document.getElementById("importCancel").addEventListener("click", closeImportModal);
  importOverlay.addEventListener("mousedown", (e)=>{ if(e.target===importOverlay) closeImportModal(); });

  document.getElementById("importConfirm").addEventListener("click", async ()=>{
    if(!pendingImportTree || pendingImportTree.length===0) return;
    const folderName = importFolderName.value.trim() || "Imported Bookmarks";
    const slot = nextFreeSlot(pendingImportParentId);
    const rootFolder = createItem("folder", {
      label: folderName, color: COLORS[3], x: slot.x, y: slot.y, parentId: pendingImportParentId
    });
    const newItems = [rootFolder];
    materializeBookmarkTree(pendingImportTree, rootFolder.id, newItems);

    state.icons.push(...newItems);
    closeImportModal();
    render();
    await save();
  });

}
