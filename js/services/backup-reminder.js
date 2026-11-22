"use strict";

/* ============ BACKUP REMINDERS ============
   A gentle nudge when it has been a while since you saved a backup (a file, or the cloud). It stays quiet if
   automatic cloud backup is on, if there's little to lose, or if you've turned it off. */
const BR_MODE_KEY = "on369.backupRemind", BR_SNOOZE_KEY = "on369.backupSnooze", BR_SEEN_KEY = "on369.backupSeen";
const BR_DAYS = { weekly: 7, monthly: 30 };

function brMode(){ try{ const v = localStorage.getItem(BR_MODE_KEY); return v === "off" || v === "weekly" ? v : "monthly"; }catch(e){ return "monthly"; } }
function brSetMode(m){ try{ localStorage.setItem(BR_MODE_KEY, m); }catch(e){} if(m === "off") hideAppBanner("backupremind"); }

function brLastBackup(){        // newest of: last saved file, last cloud backup
  let t = 0;
  try{ t = Math.max(t, Date.parse(localStorage.getItem("on369.lastExport") || "") || 0); }catch(e){}
  if(typeof sess !== "undefined" && sess && sess.lastSync) t = Math.max(t, Date.parse(sess.lastSync) || 0);
  return t;
}
function brCheck(){
  const mode = brMode(); if(mode === "off") return;
  if(typeof sess !== "undefined" && sess && sess.synced && typeof cloudMode === "function" && cloudMode() === "auto") return;     // already backing up by itself
  if(state.icons.filter(i=> i.type !== "widget").length < 5) return;                                                               // little to lose yet
  let now = Date.now(), snooze = 0, seen = 0;
  try{ snooze = Number(localStorage.getItem(BR_SNOOZE_KEY)) || 0; seen = Number(localStorage.getItem(BR_SEEN_KEY)) || 0; if(!seen){ seen = now; localStorage.setItem(BR_SEEN_KEY, String(seen)); } }catch(e){}
  if(now < snooze) return;
  const base = brLastBackup() || seen;                         // someone new isn't nagged on day one
  const days = Math.floor((now - base) / 86400000);
  if(days < BR_DAYS[mode]) return;
  showAppBanner("backupremind", brLastBackup() ? `It's been ${days} days since your last backup.` : "You haven't saved a backup of your webtop yet.", [
    { label:"Back up now", fn: ()=>{ hideAppBanner("backupremind"); openBackup(); } },
    { label:"Remind me in a week", fn: ()=>{ try{ localStorage.setItem(BR_SNOOZE_KEY, String(Date.now() + 7 * 86400000)); }catch(e){} hideAppBanner("backupremind"); } },
    { label:"Don't remind me", fn: ()=> brSetMode("off") }
  ]);
}

/* Runs once at startup (see main.js). */
function initServicesBackupReminder(){
  setTimeout(brCheck, 15000);
  setInterval(brCheck, 6 * 3600 * 1000);
}
