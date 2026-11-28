"use strict";

/* Runs once at startup (see main.js), in the original order. */
function initUiTouchLongPress(){
  // Diagnostic hook for the browser console / devtools — NOT the API apps
  // use (that's AppAPI, mediated per-app via buildAPI). This just exposes
  // the internal managers for inspection, same idea as tools that expose a
  // devtools hook without it being part of the real public surface.
  /* ============ TOUCH LONG-PRESS ============
     Touch/pen long-press opens the same context menu as right-click. Fires at
     600ms so browsers that send a native contextmenu (Android) win and cancel this.
     Listens on webtop, not gridLayer: gridLayer is display:none while icons are
     hidden, so a press there would never register and there would be no way
     to reach "Show icons" on touch. */
  (function(){
    let timer = null, sx = 0, sy = 0, fired = false;
    const cancel = ()=>{ clearTimeout(timer); timer = null; };
    [webtop, folderBody].forEach(layer=>{
      layer.addEventListener("pointerdown", (e)=>{
        if(e.pointerType === "mouse" || !e.isPrimary) return;
        fired = false; sx = e.clientX; sy = e.clientY;
        const target = e.target;
        cancel();
        timer = setTimeout(()=>{
          timer = null; fired = true;
          target.dispatchEvent(new MouseEvent("contextmenu", { bubbles:true, cancelable:true, clientX:sx, clientY:sy }));
        }, 600);
      }, true);
      layer.addEventListener("pointermove", (e)=>{
        if(timer && (Math.abs(e.clientX-sx) > TOUCH_MOVE_SLOP_PX || Math.abs(e.clientY-sy) > TOUCH_MOVE_SLOP_PX)) cancel();
        // The menu is already open and the same finger now travels a real distance: that is a drag, not a wobble.
        // Close the menu, and stop treating this press as a long press so the drop is saved when the finger lifts.
        else if(fired && e.isPrimary && Math.hypot(e.clientX-sx, e.clientY-sy) > TOUCH_MENU_DRAG_PX){ fired = false; closeCtxMenu(); closeWidgetPop(); }
      }, true);
      ["pointerup","pointercancel"].forEach(t=> layer.addEventListener(t, (e)=>{
        cancel();
        if(fired && t === "pointerup") e.stopPropagation();
      }, true));
      layer.addEventListener("click", (e)=>{
        if(fired){ fired = false; e.stopPropagation(); e.preventDefault(); }
      }, true);
      layer.addEventListener("contextmenu", cancel, true);
    });
  })();

}
