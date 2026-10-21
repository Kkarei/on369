"use strict";

/* ============ RENDER ============ */
function renderInto(container, parentId, opts){
  opts = opts || {};
  // clear icons but keep rubberband if root
  Array.from(container.querySelectorAll(".icon")).forEach(n=>n.remove());
  const items = childrenOf(parentId).sort((a,b)=> a.y-b.y || a.x-b.x);
  const cell = getCellSize();
  const offset = getGridOffset(parentId);
  const rovingId = getRovingId(items);

  items.forEach(item=>{
    const el = document.createElement("div");
    el.className = "icon" + (selected.has(item.id) ? " selected" : "");
    el.dataset.id = item.id;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", ariaLabelFor(item));
    el.tabIndex = (item.id === rovingId) ? 0 : -1;
    el.style.left = (item.x*cell.w + offset.left) + "px";
    el.style.top = (item.y*cell.h + offset.top) + "px";
    const checkHTML = multiSelectMode
      ? `<div class="select-check${selected.has(item.id) ? " checked" : ""}">${menuIcon("check")}</div>`
      : "";
    el.innerHTML = `${checkHTML}${glyphFor(item)}<div class="icon-label" data-id="${item.id}">${escapeHtml(item.label)}</div>`;
    container.appendChild(el);
    wireIconEvents(el, item, parentId);
  });
  if(typeof updateCutVisualState === "function") updateCutVisualState();

  if(parentId === null){
    const maxY = items.reduce((m,i)=> Math.max(m,i.y), -1);
    const neededHeight = offset.top + (maxY+1)*cell.h + 100;
    gridLayer.style.minHeight = Math.max(neededHeight, window.innerHeight) + "px";
    emptyHint.style.display = items.length === 0 ? "block" : "none";
    updateStatusBar();
    if(typeof applyAppSearch === "function" && searchMode === "app" && searchInput && searchInput.value){
      applyAppSearch(searchInput.value);
    }
  }else{
    if(multiSelectMode) updateStatusBar();
    const maxYf = items.reduce((m,i)=> Math.max(m,i.y), -1);
    const neededHf = offset.top + (maxYf+1)*cell.h + 40;
    // folderBody sits inside folderPanel, which has a FIXED height and
    // overflow:hidden — growing folderBody's own min-height past that
    // just gets clipped by the panel, it does not create an internally
    // scrollable area. A normal-flow spacer (unlike the absolutely
    // positioned icons, which never contribute to scrollHeight) signals
    // the true content extent so folderBody's own overflow:auto can
    // actually scroll to it, without folderBody growing past its
    // flex-allotted space in the first place.
    let spacer = container.querySelector(".scroll-spacer");
    if(!spacer){
      spacer = document.createElement("div");
      spacer.className = "scroll-spacer";
      spacer.style.cssText = "position:relative; width:1px; pointer-events:none;";
      container.appendChild(spacer);
    }
    spacer.style.height = Math.max(0, neededHf) + "px";
    const hint = container.querySelector(".empty-hint");
    if(items.length === 0){
      if(!hint){
        const h = document.createElement("div");
        h.className = "empty-hint";
        h.textContent = container === folderBody ? "This folder is empty. Right-click to add something." : "Empty — drag icons here.";
        container.appendChild(h);
      }
    }else if(hint){ hint.remove(); }
  }
}


function reflowForNarrowScreen(){
  if(window.innerWidth > 820) return;
  const cols = maxColsFor(null), items = childrenOf(null);
  if(!items.some(i=> i.x >= cols)) return;
  items.sort((a,b)=> a.y - b.y || a.x - b.x);
  let x = 0, y = 0;
  items.forEach(it=>{ it.x = x; it.y = y; if(++x >= cols){ x = 0; y++; } });
  save();
}


function render(){
  reflowForNarrowScreen();
  renderInto(gridLayer, null);
  renderWidgets();
  if(currentFolderId !== null){
    renderInto(folderBody, currentFolderId);
  }
}

