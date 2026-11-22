"use strict";

/* ============ TASKS: SHARED STORE, DUE DATES AND REMINDERS ============
   The To-do app, the To-do widget and the reminder checker all read and write the same list
   (app data "todo" / "tasks"). A task may have a due time (task.due, "YYYY-MM-DDTHH:mm"; a date alone means 9:00).

   Reminders fire while on369 is open in any tab, or the next time you open it (a banner, a sound and, if you allowed
   notifications, a system notification). A web page can't wake itself when it is closed, so there is no alert for a
   task that comes due while on369 is not open anywhere. */
const REM_LS_KEY = "on369.reminders.v1";
let remTimer = null;

async function todoLoad(){
  try{ const v = await Store.getAppData("todo", "tasks"); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
// Always read, change and write back (never from a copy kept in memory) so the app and the widget can't overwrite each other.
async function todoMutate(fn, from){
  const list = await todoLoad();
  const out = fn(list);
  const next = Array.isArray(out) ? out : list;
  await Store.setAppData("todo", "tasks", next);
  EventBus.emit("todo-changed", { from: from || "other" });
  return next;
}

function todoDueDate(t){
  if(!t || !t.due || typeof t.due !== "string") return null;
  const d = new Date(t.due.length === 10 ? t.due + "T09:00" : t.due);
  return isNaN(d.getTime()) ? null : d;
}
// { text, cls } for a due badge: overdue / today / soon (next 7 days) / later
function todoDueInfo(t, now){
  const d = todoDueDate(t); if(!d) return null;
  now = now || new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startToday) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if(!t.done && d.getTime() < now.getTime()) return { text: dayDiff === 0 ? "Due " + time : dayDiff === -1 ? "Overdue · yesterday" : "Overdue · " + d.toLocaleDateString([], { month: "short", day: "numeric" }), cls: "overdue" };
  if(dayDiff === 0) return { text: "Today " + time, cls: "today" };
  if(dayDiff === 1) return { text: "Tomorrow " + time, cls: "soon" };
  if(dayDiff > 1 && dayDiff < 7) return { text: d.toLocaleDateString([], { weekday: "short" }) + " " + time, cls: "soon" };
  return { text: d.toLocaleDateString([], { month: "short", day: "numeric" }), cls: "later" };
}
// "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">
function todoDueInputValue(t){
  const d = todoDueDate(t); if(!d) return "";
  const p = (n)=> String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function remLoadFired(){ try{ const v = JSON.parse(localStorage.getItem(REM_LS_KEY) || "{}"); return v && typeof v === "object" ? v : {}; }catch(e){ return {}; } }
function remSaveFired(f){ try{ localStorage.setItem(REM_LS_KEY, JSON.stringify(f)); }catch(e){} }
function remAskPermission(){ try{ if("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }catch(e){} }

async function remCheck(){
  if(typeof Store !== "undefined" && Store.isBlocked && Store.isBlocked()) return;
  const list = await todoLoad(), now = Date.now(), fired = remLoadFired();
  const due = [];
  let changed = false;
  const live = new Set();
  list.forEach(t=>{
    if(t.done || !t.due) return;
    live.add(t.id);
    const d = todoDueDate(t); if(!d) return;
    if(d.getTime() <= now && fired[t.id] !== t.due){ fired[t.id] = t.due; changed = true; due.push(t); }
  });
  Object.keys(fired).forEach(id=>{ if(!live.has(id)){ delete fired[id]; changed = true; } });   // forget finished or deleted tasks
  if(changed) remSaveFired(fired);
  if(due.length) remNotify(due);
}

function remNotify(tasks){
  const msg = tasks.length === 1 ? "Reminder: " + tasks[0].text : tasks.length + " tasks are due: " + tasks.slice(0, 2).map(t=> t.text).join(", ") + (tasks.length > 2 ? "…" : "");
  showAppBanner("reminder", msg, [
    { label: "Open To-do", fn: ()=> AppManager.launch("todo", { title:"Todo", color: COLORS[2] }) },
    { label: "Dismiss", fn: ()=>{} }
  ], 60000);
  try{ if(typeof clkPrimeAudio === "function"){ clkPrimeAudio(); if(typeof clkBeep === "function") clkBeep(); } }catch(e){}
  try{ if(navigator.vibrate) navigator.vibrate([150, 80, 150]); }catch(e){}
  try{
    if("Notification" in window && Notification.permission === "granted" && document.hidden){
      new Notification(tasks.length === 1 ? "Task due" : tasks.length + " tasks due", { body: msg.replace(/^Reminder: /, ""), icon: "icons/icon-192.png", tag: "on369-reminder" });
    }
  }catch(e){}
}

/* Runs once at startup (see main.js). */
function initServicesReminders(){
  setTimeout(()=> remCheck().catch(()=>{}), 3000);
  remTimer = setInterval(()=> remCheck().catch(()=>{}), 20000);
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) remCheck().catch(()=>{}); });
  EventBus.on("todo-changed", ()=> remCheck().catch(()=>{}));
}
