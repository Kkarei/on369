"use strict";

/* ============ APPLICATION MANAGER ============
   Sits above the Window Manager, which stays exactly as it was — the low-
   level mechanism for creating/destroying/moving/resizing/focusing windows.
   AppManager owns registration, metadata, lifecycle orchestration, and the
   mediated API apps actually call into (see buildAPI), instead of apps
   reaching into shared globals directly. */
const AppManager = (function(){
  const registry = new Map();  // appId -> full metadata record
  const running = new Map();   // appId -> { launchedAt }

  function register(meta){
    if(!meta || !meta.id || !meta.name || !meta.render){
      console.warn("on369: app registration requires at least id, name, render", meta);
      return null;
    }
    const record = {
      id: meta.id,
      name: meta.name,
      description: meta.description || "",
      version: meta.version || "1.0.0",
      developer: meta.developer || "on369",
      icon: meta.icon || (()=> ""),
      category: meta.category || "utilities",
      render: meta.render,
      permissions: meta.permissions || [],
      fileAssociations: meta.fileAssociations || [],
      shortcuts: meta.shortcuts || [],
      themeCompatible: meta.themeCompatible !== false,
      singleton: meta.singleton !== false,
      backgroundCapable: meta.backgroundCapable === true,
      defaultWidth: meta.defaultWidth || 320,
      defaultHeight: meta.defaultHeight || 420,
      minWidth: meta.minWidth || 260,
      minHeight: meta.minHeight || 320,
      maxWidth: meta.maxWidth || null,
      maxHeight: meta.maxHeight || null,
      resizable: meta.resizable !== false
    };
    registry.set(meta.id, record);
    return record;
  }

  function getMetadata(appId){ return registry.get(appId) || null; }
  function listApps(){ return Array.from(registry.values()); }
  function listByCategory(category){ return listApps().filter(a=>a.category===category); }
  function isRunning(appId){ return running.has(appId); }
  function listRunning(){ return Array.from(running.keys()); }

  // The controlled surface apps get instead of free access to shared
  // globals — storage is namespaced per app (via Store's appData store,
  // same IndexedDB-primary/localStorage-fallback engine as everything
  // else), not a raw shared localStorage key any app could collide with.
  function buildAPI(appId, windowId){
    return {
      appId, windowId,
      storage: {
        get: (key)=> Store.getAppData(appId, key),
        set: (key, value)=> Store.setAppData(appId, key, value)
      },
      close: ()=> AppManager.close(appId),
      minimize: ()=> minimizeWindow(windowId),
      notify: (message, kind)=>{
        // Architecture only, per the spec — no notification UI yet.
        console.info(`[on369 notification:${kind||"info"}] ${appId}: ${message}`);
        EventBus.emit("notification", { appId, message, kind: kind||"info", at: Date.now() });
      },
      on: (event, handler)=> EventBus.on(event, handler),
      emit: (event, payload)=> EventBus.emit(event, payload)
    };
  }

  function launch(appId, opts){
    opts = opts || {};
    const meta = registry.get(appId);
    if(!meta){ console.warn("on369: no app registered with id", appId); return; }
    if(meta.singleton && running.has(appId)){
      const win = windows.find(w=>w.id===appId);
      if(win) win.minimized = false;
      focusWindow(appId);
      EventBus.emit("app:focus", { appId });
      return;
    }
    openWindow(appId, opts.title || meta.name, opts.color || COLORS[0]);
    running.set(appId, { launchedAt: Date.now() });
    EventBus.emit("app:launch", { appId });
  }

  function close(appId){
    closeWindow(appId); // closeWindow itself calls notifyClosed — single source of truth regardless of entry point
  }

  function notifyClosed(appId){
    if(running.has(appId)){
      running.delete(appId);
      EventBus.emit("app:close", { appId });
    }
  }

  return { register, getMetadata, listApps, listByCategory, isRunning, listRunning, buildAPI, launch, close, notifyClosed };
})();

