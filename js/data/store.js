"use strict";

/* ---------- STORE ----------
   Unified async persistence. IndexedDB is the engine: each webtop item is its own record,
   so one edit writes one row. If IndexedDB is not available at all (for example a file://
   page, or a locked-down private window) a localStorage-backed equivalent with the same
   shape is used for the whole session.

   Hard rules, learned from lost-data reports:
   - A closed or idle connection is REOPENED and the operation retried. We never quietly
     switch to localStorage in the middle of a session: the next page load would read
     IndexedDB again and every change made after the switch would look lost.
   - A failed write is reported to the caller (so it can retry and warn), never swallowed.
   - A transaction that aborts (for example out of space) rejects instead of hanging.
   - While the store is "blocked" (still loading, unreadable, or another tab changed the
     data) every write is skipped, so a half-loaded app can never overwrite real data.
   - A synchronous "shadow copy" in localStorage covers changes that IndexedDB could not
     finish writing before the tab closed. */
const Store = (function(){
  const DB_NAME = "on369-db", DB_VERSION = 1;
  const ITEMS_STORE = "items", PREFS_STORE = "preferences", APPDATA_STORE = "appData";
  const FALLBACK_ITEMS_KEY = "on369.idbFallback.items.v1";
  const FALLBACK_PREFS_KEY = "on369.idbFallback.prefs.v1";
  const FALLBACK_APPDATA_KEY = "on369.idbFallback.appData.v1";
  const SHADOW_KEY = "on369.shadow.v1", HAS_DATA_KEY = "on369.hasData.v1";
  const cfg = { openTimeouts: [6000, 12000, 20000], retryPause: 300 };

  let engine = null;       // 'idb' | 'local'
  let dbPromise = null, dbConn = null;
  let blockedReason = null;

  const sleep = (ms)=> new Promise(r=> setTimeout(r, ms));
  function resetDB(){ try{ if(dbConn) dbConn.close(); }catch(_){} dbConn = null; dbPromise = null; }

  function openOnce(timeoutMs){
    return new Promise((resolve, reject)=>{
      let done = false, req;
      const timer = setTimeout(()=>{ if(!done){ done = true; reject(new Error("IndexedDB open timed out")); } }, timeoutMs);
      try{ req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch(err){ clearTimeout(timer); reject(err); return; }
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(ITEMS_STORE)) db.createObjectStore(ITEMS_STORE, { keyPath:"id" }).createIndex("parentId", "parentId", { unique:false });
        if(!db.objectStoreNames.contains(PREFS_STORE)) db.createObjectStore(PREFS_STORE, { keyPath:"key" });
        if(!db.objectStoreNames.contains(APPDATA_STORE)) db.createObjectStore(APPDATA_STORE, { keyPath:"key" });   // key = "<appId>:<dataKey>"
      };
      req.onsuccess = ()=>{
        const db = req.result;
        if(done){ try{ db.close(); }catch(_){} return; }                    // we already gave up on this attempt
        done = true; clearTimeout(timer);
        // Browsers close idle connections (and tabs upgrading the database ask us to). Forget the dead handle so the next call reopens.
        db.onclose = ()=>{ if(dbConn === db) resetDB(); };
        db.onversionchange = ()=>{ try{ db.close(); }catch(_){} if(dbConn === db) resetDB(); };
        dbConn = db; resolve(db);
      };
      req.onerror = ()=>{ if(!done){ done = true; clearTimeout(timer); reject(req.error || new Error("IndexedDB open failed")); } };
      // onblocked: another tab still holds an older connection. Keep waiting, it clears by itself.
    });
  }
  function openDB(){
    if(dbPromise) return dbPromise;
    const p = (async ()=>{
      let last;
      for(let i = 0; i < cfg.openTimeouts.length; i++){
        try{ return await openOnce(cfg.openTimeouts[i]); }catch(e){ last = e; if(e && e.name === "SecurityError") break; await sleep(cfg.retryPause * (i + 1)); }
      }
      throw last;
    })();
    dbPromise = p; p.catch(()=>{ if(dbPromise === p) dbPromise = null; });
    return p;
  }
  async function detectEngine(){
    if(engine) return engine;
    if(typeof indexedDB === "undefined"){ engine = "local"; return engine; }
    try{ await openDB(); engine = "idb"; }
    catch(err){ console.warn("on369: IndexedDB unavailable, using localStorage:", err && err.message); engine = "local"; }
    return engine;
  }

  const isConnError = (e)=> !!e && (e.name === "InvalidStateError" || e.name === "TransactionInactiveError" || e.name === "UnknownError" || /clos|timed out/i.test(e.message || ""));
  // Runs fn(db); if the connection turns out to be dead, reopens it and tries once more.
  async function withDb(fn){
    for(let attempt = 0; ; attempt++){
      try{ return await fn(await openDB()); }
      catch(e){ if(attempt >= 1 || !isConnError(e)) throw e; resetDB(); await sleep(cfg.retryPause); }
    }
  }
  function idbTx(storeName, mode, run){
    return withDb(db=> new Promise((resolve, reject)=>{
      let tx, result;
      try{ tx = db.transaction(storeName, mode); result = run(tx.objectStore(storeName)); }catch(e){ reject(e); return; }
      tx.oncomplete = ()=> resolve(result && result.__req ? result.__req.result : result);
      tx.onerror = ()=> reject(tx.error || new Error("IndexedDB request failed"));
      tx.onabort = ()=> reject(tx.error || new Error("IndexedDB transaction aborted"));   // without this a full disk leaves the promise pending forever
    }));
  }
  function idbRead(storeName, make){
    return withDb(db=> new Promise((resolve, reject)=>{
      let req; try{ req = make(db.transaction(storeName, "readonly").objectStore(storeName)); }catch(e){ reject(e); return; }
      req.onsuccess = ()=> resolve(req.result); req.onerror = ()=> reject(req.error || new Error("IndexedDB read failed"));
    }));
  }
  const idbGetAll = (s)=> idbRead(s, st=> st.getAll());
  const idbGetOne = (s, key)=> idbRead(s, st=> st.get(key));
  const idbPutMany = (s, recs)=> recs.length ? idbTx(s, "readwrite", st=>{ recs.forEach(r=> st.put(r)); }) : Promise.resolve();
  const idbDeleteMany = (s, ids)=> ids.length ? idbTx(s, "readwrite", st=>{ ids.forEach(id=> st.delete(id)); }) : Promise.resolve();

  function localGetAll(key){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }catch(e){ return []; } }
  function localPutMany(key, keyPath, records){
    const map = new Map(localGetAll(key).map(r=> [r[keyPath], r]));
    records.forEach(r=> map.set(r[keyPath], r));
    try{ localStorage.setItem(key, JSON.stringify(Array.from(map.values()))); }catch(e){ console.warn("on369: localStorage write failed", e); throw e; }
  }
  function localDeleteMany(key, keyPath, ids){
    const set = new Set(ids), all = localGetAll(key).filter(r=> !set.has(r[keyPath]));
    try{ localStorage.setItem(key, JSON.stringify(all)); }catch(e){ console.warn("on369: localStorage write failed", e); throw e; }
  }

  const pick = async (idbFn, localFn)=>{ await detectEngine(); return engine === "idb" ? idbFn() : localFn(); };
  // Writes are skipped (quietly) while blocked; reads always work.
  const guarded = (fn)=> (...args)=> blockedReason ? Promise.resolve() : fn(...args);

  /* Small apps' data (Notes, Todo...) is also mirrored into localStorage, newest copy wins on read. */
  function mirrorAppData(rec){ try{ localPutMany(FALLBACK_APPDATA_KEY, "key", [rec]); }catch(_){} }
  async function getAppData(appId, key){
    const k = `${appId}:${key}`;
    const local = localGetAll(FALLBACK_APPDATA_KEY).find(r=> r.key === k);
    let rec = null;
    if((await detectEngine()) === "idb"){ try{ rec = await idbGetOne(APPDATA_STORE, k); }catch(e){ console.warn("on369: app data read failed", e); } }
    const best = !rec ? local : !local ? rec : ((local.t || 0) > (rec.t || 0) ? local : rec);
    return best ? best.value : null;
  }
  async function setAppData(appId, key, value){
    if(blockedReason) return;
    const rec = { key: `${appId}:${key}`, value, t: Date.now() };
    mirrorAppData(rec);                                                     // always keep the emergency copy
    if((await detectEngine()) === "idb") await idbPutMany(APPDATA_STORE, [rec]);
  }

  function writeShadow(obj){ try{ localStorage.setItem(SHADOW_KEY, JSON.stringify(obj)); return true; }catch(e){ try{ localStorage.removeItem(SHADOW_KEY); }catch(_){} return false; } }
  function readShadow(){ try{ const raw = localStorage.getItem(SHADOW_KEY); const s = raw ? JSON.parse(raw) : null; return s && Array.isArray(s.items) && Array.isArray(s.prefs) ? s : null; }catch(_){ return null; } }

  return {
    init: detectEngine,
    currentEngine: ()=> engine,
    configure: (o)=> Object.assign(cfg, o),
    reconnect: resetDB,
    block: (reason)=>{ blockedReason = reason || "blocked"; },
    unblock: ()=>{ blockedReason = null; },
    isBlocked: ()=> blockedReason,
    markHasData: ()=>{ try{ localStorage.setItem(HAS_DATA_KEY, "1"); }catch(_){} },
    hadData: ()=>{ try{ return localStorage.getItem(HAS_DATA_KEY) === "1"; }catch(_){ return false; } },
    clearMarkers: ()=>{ try{ localStorage.removeItem(HAS_DATA_KEY); localStorage.removeItem(SHADOW_KEY); }catch(_){} },
    writeShadow, readShadow,
    getAllItems: ()=> pick(()=> idbGetAll(ITEMS_STORE), ()=> localGetAll(FALLBACK_ITEMS_KEY)),
    putItems: guarded((items)=> pick(()=> idbPutMany(ITEMS_STORE, items), ()=> localPutMany(FALLBACK_ITEMS_KEY, "id", items))),
    deleteItems: guarded((ids)=> pick(()=> idbDeleteMany(ITEMS_STORE, ids), ()=> localDeleteMany(FALLBACK_ITEMS_KEY, "id", ids))),
    getAllPrefs: ()=> pick(()=> idbGetAll(PREFS_STORE), ()=> localGetAll(FALLBACK_PREFS_KEY)),
    putPrefs: guarded((entries)=> pick(()=> idbPutMany(PREFS_STORE, entries), ()=> localPutMany(FALLBACK_PREFS_KEY, "key", entries))),
    getAppData, setAppData
  };
})();
