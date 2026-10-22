"use strict";

/* Large files (the video wallpaper) are kept as Blobs in their own IndexedDB,
   separate from the main store, so they never bloat settings or backups. */
const MediaStore = (function(){
  const DB = "on369-media", ST = "blobs";
  let dbp = null;
  function open(){
    if(!dbp) dbp = new Promise((res, rej)=>{
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = ()=> r.result.createObjectStore(ST);
      r.onsuccess = ()=> res(r.result);
      r.onerror = ()=> rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn){
    const db = await open();
    return new Promise((res, rej)=>{
      const t = db.transaction(ST, mode), q = fn(t.objectStore(ST));
      t.oncomplete = ()=> res(q && q.result);
      t.onerror = t.onabort = ()=> rej(t.error);
    });
  }
  return { put:(k, v)=> tx("readwrite", s=> s.put(v, k)), get:(k)=> tx("readonly", s=> s.get(k)), del:(k)=> tx("readwrite", s=> s.delete(k)) };
})();
