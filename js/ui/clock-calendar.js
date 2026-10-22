"use strict";

/* ============ CLOCK & CALENDAR ============ */
const DATE_FORMAT_PRESETS = {
  "weekday-short": { label:"Fri, Jul 31", sample:true },
  "month-day-year": { label:"Jul 31, 2026" },
  "mdy": { label:"07/31/2026", numeric:"mdy" },
  "dmy": { label:"31/07/2026", numeric:"dmy" },
  "iso": { label:"2026-07-31", numeric:"iso" }
};


// Extracts year/month/day as they fall in a given IANA time zone,
// independent of the browser's own local zone — needed because Date's
// plain getters (getMonth(), getDate(), ...) always read in the
// browser's local zone, which would silently ignore a chosen time zone.
function getDatePartsInZone(date, timeZone){
  const opts = { year:"numeric", month:"2-digit", day:"2-digit" };
  if(timeZone) opts.timeZone = timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(date);
  const map = {};
  parts.forEach(p=> map[p.type] = p.value);
  return { y: map.year, m: map.month, d: map.day };
}


function formatDateWithPreset(date, formatKey, timeZone){
  const preset = DATE_FORMAT_PRESETS[formatKey] || DATE_FORMAT_PRESETS["weekday-short"];
  if(preset.numeric){
    const { y, m, d } = getDatePartsInZone(date, timeZone);
    if(preset.numeric === "mdy") return `${m}/${d}/${y}`;
    if(preset.numeric === "dmy") return `${d}/${m}/${y}`;
    return `${y}-${m}-${d}`; // iso
  }
  const opts = formatKey === "month-day-year"
    ? { month:"short", day:"numeric", year:"numeric" }
    : { weekday:"short", month:"short", day:"numeric" };
  if(timeZone) opts.timeZone = timeZone;
  return date.toLocaleDateString([], opts);
}


function formatTimeWithSetting(date, timeFormat, timeZone){
  const opts = { hour:"2-digit", minute:"2-digit" };
  if(timeZone) opts.timeZone = timeZone;
  if(timeFormat === "12h") opts.hour12 = true;
  else if(timeFormat === "24h") opts.hour12 = false;
  return date.toLocaleTimeString([], opts);
}


function tickClock(){
  const now = new Date();
  const tz = state.timeZone || undefined;
  document.querySelector("#clock .time").textContent = formatTimeWithSetting(now, state.timeFormat, tz);
  document.querySelector("#clock .date").textContent = formatDateWithPreset(now, state.dateFormat, tz);
  const todayLabel = document.getElementById("calTodayLabel");
  if(todayLabel) todayLabel.textContent = `Today: ${formatDateWithPreset(now, state.dateFormat, tz)}`;
}

/* ============ CALENDAR POPUP ============ */
const calendarPop = document.getElementById("calendarPop");

const calMainView = document.getElementById("calMainView");

const calSettingsView = document.getElementById("calSettingsView");

let calViewDate = new Date(); // which month the mini-calendar is currently showing


function appendDayCell(grid, day, muted, isToday){
  const el = document.createElement("div");
  el.className = "cal-day" + (muted ? " muted" : "") + (isToday ? " today" : "");
  el.textContent = day;
  grid.appendChild(el);
}


function renderCalendarGrid(){
  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();
  document.getElementById("calMonthLabel").textContent = calViewDate.toLocaleDateString([], {month:"long", year:"numeric"});

  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // "Today" is read in the chosen time zone (if any), so the highlighted
  // day always matches what the clock itself is currently showing.
  const tz = state.timeZone || undefined;
  const todayParts = getDatePartsInZone(new Date(), tz);
  const isCurrentMonth = Number(todayParts.y) === year && Number(todayParts.m) === (month+1);
  const todayDay = Number(todayParts.d);

  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";
  for(let i=startOffset-1; i>=0; i--) appendDayCell(grid, daysInPrevMonth - i, true, false);
  for(let d=1; d<=daysInMonth; d++) appendDayCell(grid, d, false, isCurrentMonth && d === todayDay);
  const trailing = (7 - ((startOffset + daysInMonth) % 7)) % 7;
  for(let d=1; d<=trailing; d++) appendDayCell(grid, d, true, false);
}


function showCalendarMain(){
  calMainView.style.display = "";
  calSettingsView.style.display = "none";
}

function showCalendarSettings(){
  calMainView.style.display = "none";
  calSettingsView.style.display = "";
  syncDateTimeSettingsUI();
}

function openCalendar(){
  document.getElementById("settingsPop").classList.remove("open");
  calViewDate = new Date();
  showCalendarMain();
  renderCalendarGrid();
  calendarPop.classList.add("open");
}

function closeCalendar(){ calendarPop.classList.remove("open"); }

function toggleCalendar(){
  if(calendarPop.classList.contains("open")) closeCalendar();
  else openCalendar();
}


const clockEl = document.getElementById("clock");

/* ---- Date & time settings (inside the calendar popup) ---- */
const timeFormatSeg = document.getElementById("timeFormatSeg");

const dateFormatSelect = document.getElementById("dateFormatSelect");

const timeZoneSelect = document.getElementById("timeZoneSelect");

function syncDateTimeSettingsUI(){
  timeFormatSeg.querySelectorAll(".seg-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.val === state.timeFormat);
  });
  dateFormatSelect.value = state.dateFormat;
  timeZoneSelect.value = state.timeZone || "";
}

/* Runs once at startup (see main.js), in the original order. */
function initUiClockCalendar(){
  tickClock();
  setInterval(tickClock, 15000);

  clockEl.addEventListener("click", (e)=>{ e.stopPropagation(); toggleCalendar(); });
  clockEl.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggleCalendar(); }
  });
  document.getElementById("calPrevMonth").addEventListener("click", ()=>{
    calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1);
    renderCalendarGrid();
  });
  document.getElementById("calNextMonth").addEventListener("click", ()=>{
    calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1);
    renderCalendarGrid();
  });
  document.getElementById("calSettingsBtn").addEventListener("click", showCalendarSettings);
  document.getElementById("calSettingsBack").addEventListener("click", showCalendarMain);
  document.addEventListener("click", (e)=>{
    if(calendarPop.classList.contains("open") && !calendarPop.contains(e.target) && !clockEl.contains(e.target)){
      closeCalendar();
    }
  });

  timeFormatSeg.querySelectorAll(".seg-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.timeFormat = btn.dataset.val;
      tickClock();
      syncDateTimeSettingsUI();
      save();
    });
  });

  Object.keys(DATE_FORMAT_PRESETS).forEach(key=>{
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = DATE_FORMAT_PRESETS[key].label;
    dateFormatSelect.appendChild(opt);
  });
  dateFormatSelect.addEventListener("change", ()=>{
    state.dateFormat = dateFormatSelect.value;
    tickClock();
    save();
  });

  (function populateTimeZoneOptions(){
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Automatic (device)";
    timeZoneSelect.appendChild(auto);
    let zones = [];
    try{ if(typeof Intl.supportedValuesOf === "function") zones = Intl.supportedValuesOf("timeZone"); }catch(e){}
    if(!zones.length){
      // Fallback for browsers without Intl.supportedValuesOf — one common
      // zone per region so the picker is still useful everywhere.
      zones = ["UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
        "America/Sao_Paulo","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow",
        "Africa/Cairo","Africa/Lagos","Africa/Nairobi","Africa/Johannesburg","Asia/Dubai",
        "Asia/Kolkata","Asia/Shanghai","Asia/Tokyo","Asia/Singapore","Australia/Sydney","Pacific/Auckland"];
    }
    zones.forEach(z=>{
      const opt = document.createElement("option");
      opt.value = z;
      opt.textContent = z.replace(/_/g, " ");
      timeZoneSelect.appendChild(opt);
    });
  })();
  timeZoneSelect.addEventListener("change", ()=>{
    state.timeZone = timeZoneSelect.value || null;
    tickClock();
    renderCalendarGrid();
    save();
  });

  syncDateTimeSettingsUI();

}
