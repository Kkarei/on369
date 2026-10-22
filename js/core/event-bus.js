"use strict";

/* ============ EVENT BUS ============
   Inter-application messaging without apps knowing about each other's
   internals. A handler that throws is caught and logged, not allowed to
   break emit() for every other listener — the same "one app's failure
   shouldn't take down the rest" principle applied to messaging. */
const EventBus = (function(){
  const listeners = new Map();
  function on(event, handler){
    if(!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return ()=>{ const set = listeners.get(event); if(set) set.delete(handler); };
  }
  function off(event, handler){
    const set = listeners.get(event);
    if(set) set.delete(handler);
  }
  function emit(event, payload){
    const set = listeners.get(event);
    if(!set) return;
    set.forEach(handler=>{
      try{ handler(payload); }
      catch(e){ console.warn(`on369: EventBus handler for "${event}" threw`, e); }
    });
  }
  return { on, off, emit };
})();

