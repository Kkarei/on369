"use strict";

/* ---------- STORE ----------
   Unified async persistence. IndexedDB is the intended engine — each
   webtop item is its own record, so a single edit writes one row instead
   of rewriting the whole webtop as one JSON blob. But IndexedDB can throw
   on open() for file:// pages (opaque-origin SecurityError per spec, and
   this file is designed to be opened directly, not hosted), so every
   operation transparently falls back to a localStorage-backed equivalent
   with the exact same per-record shape if IndexedDB is unavailable OR
   fails partway through a session. Callers never need to know which
   engine is actually active. */
const Store = (function(){
  const DB_NAME = "on369-db", DB_VERSION = 1;
  const ITEMS_STORE = "items", PREFS_STORE = "preferences", APPDATA_STORE = "appData";
  const FALLBACK_ITEMS_KEY = "on369.idbFallback.items.v1";
  const FALLBACK_PREFS_KEY = "on369.idbFallback.prefs.v1";
  const FALLBACK_APPDATA_KEY = "on369.idbFallback.appData.v1";

  let engine = null; // 'idb' | 'local'
  let dbPromise = null;

  function openDB(){
    if(dbPromise) return dbPromise;
    const attempt = new Promise((resolve, reject)=>{
      let req;
      try{ req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch(err){ reject(err); return; }
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(ITEMS_STORE)){
          db.createObjectStore(ITEMS_STORE, { keyPath:"id" }).createIndex("parentId", "parentId", { unique:false });
        }
        if(!db.objectStoreNames.contains(PREFS_STORE)){
          db.createObjectStore(PREFS_STORE, { keyPath:"key" });
        }
        if(!db.objectStoreNames.contains(APPDATA_STORE)){
          // key = "<appId>:<dataKey>" — namespaced so apps can't collide
          // with each other's data by using the same key name.
          db.createObjectStore(APPDATA_STORE, { keyPath:"key" });
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error || new Error("IndexedDB open failed"));
      req.onblocked = ()=> reject(new Error("IndexedDB open blocked"));
    });
    // Defensive timeout: some browsers (Safari has documented cases) can
    // leave an open() request never firing any callback at all. Without
    // this, that would hang the whole app forever waiting on a promise
    // that never settles, instead of falling back to localStorage.
    const timeout = new Promise((_, reject)=>{
      setTimeout(()=> reject(new Error("IndexedDB open timed out")), 3000);
    });
    dbPromise = Promise.race([attempt, timeout]);
    return dbPromise;
  }

  async function detectEngine(){
    if(engine) return engine;
    if(typeof indexedDB === "undefined"){ engine = "local"; return engine; }
    try{ await openDB(); engine = "idb"; }
    catch(err){
      console.warn("on369: IndexedDB unavailable, using localStorage fallback:", err && err.message);
      engine = "local";
    }
    return engine;
  }

  function idbRun(storeName, mode, fn){
    return openDB().then(db=> new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store);
      tx.oncomplete = ()=> resolve(result && result.__req ? result.__req.result : undefined);
      tx.onerror = ()=> reject(tx.error);
    }));
  }
  function idbGetAll(storeName){
    return openDB().then(db=> new Promise((resolve,reject)=>{
      const req = db.transaction(storeName,"readonly").objectStore(storeName).getAll();
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    }));
  }
  function idbGetOne(storeName, key){
    return openDB().then(db=> new Promise((resolve,reject)=>{
      const req = db.transaction(storeName,"readonly").objectStore(storeName).get(key);
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    }));
  }
  function idbPutMany(storeName, records){
    if(records.length===0) return Promise.resolve();
    return idbRun(storeName, "readwrite", store=>{ records.forEach(r=>store.put(r)); });
  }
  function idbDeleteMany(storeName, ids){
    if(ids.length===0) return Promise.resolve();
    return idbRun(storeName, "readwrite", store=>{ ids.forEach(id=>store.delete(id)); });
  }

  function localGetAll(key){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
    catch(e){ return []; }
  }
  function localPutMany(key, keyPath, records){
    const all = localGetAll(key);
    const map = new Map(all.map(r=>[r[keyPath], r]));
    records.forEach(r=> map.set(r[keyPath], r));
    try{ localStorage.setItem(key, JSON.stringify(Array.from(map.values()))); }
    catch(e){ console.warn("on369: fallback store write failed", e); }
  }
  function localDeleteMany(key, keyPath, ids){
    const idSet = new Set(ids);
    const all = localGetAll(key).filter(r=> !idSet.has(r[keyPath]));
    try{ localStorage.setItem(key, JSON.stringify(all)); }
    catch(e){ console.warn("on369: fallback store write failed", e); }
  }

  async function withFallback(idbFn, localFn){
    await detectEngine();
    if(engine === "idb"){
      try{ return await idbFn(); }
      catch(err){
        console.warn("on369: IndexedDB operation failed mid-session, switching to localStorage fallback:", err);
        engine = "local";
        return localFn();
      }
    }
    return localFn();
  }

  return {
    init: detectEngine,
    currentEngine: ()=> engine,
    getAllItems: ()=> withFallback(()=>idbGetAll(ITEMS_STORE), ()=>localGetAll(FALLBACK_ITEMS_KEY)),
    putItems: (items)=> withFallback(()=>idbPutMany(ITEMS_STORE, items), ()=>localPutMany(FALLBACK_ITEMS_KEY,"id",items)),
    deleteItems: (ids)=> withFallback(()=>idbDeleteMany(ITEMS_STORE, ids), ()=>localDeleteMany(FALLBACK_ITEMS_KEY,"id",ids)),
    getAllPrefs: ()=> withFallback(()=>idbGetAll(PREFS_STORE), ()=>localGetAll(FALLBACK_PREFS_KEY)),
    putPrefs: (entries)=> withFallback(()=>idbPutMany(PREFS_STORE, entries), ()=>localPutMany(FALLBACK_PREFS_KEY,"key",entries)),
    // Namespaced per-app data — value can be anything JSON-serializable
    // (a single setting or a whole array like Todo's task list).
    getAppData: (appId, key)=> withFallback(
      async ()=>{ const rec = await idbGetOne(APPDATA_STORE, `${appId}:${key}`); return rec ? rec.value : null; },
      ()=>{ const rec = localGetAll(FALLBACK_APPDATA_KEY).find(r=>r.key===`${appId}:${key}`); return rec ? rec.value : null; }
    ),
    setAppData: (appId, key, value)=> withFallback(
      ()=> idbPutMany(APPDATA_STORE, [{ key:`${appId}:${key}`, value }]),
      ()=> localPutMany(FALLBACK_APPDATA_KEY, "key", [{ key:`${appId}:${key}`, value }])
    )
  };
})();

