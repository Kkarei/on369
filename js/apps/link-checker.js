"use strict";

/* ============ APP: LINK CHECKER ============
   Finds bookmarks and web apps whose websites no longer answer, so you can tidy them up.

   What a browser can and can't tell: for a site on another address it will not reveal the page's status code,
   so a working site with a missing page ("404") looks fine here. What it can detect is a site that doesn't
   exist any more, refuses connections, has a broken certificate, or doesn't answer in time. The window says so. */
const LC_CONCURRENCY = 6, LC_TIMEOUT_MS = 8000;

function linkCheckerSVG(color){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"></path><path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1"></path><path d="m16 16 2 2 4-4" stroke-width="2.2"></path></svg>`;
}

// "ok" = something answered, "down" = nothing there, "slow" = no answer in time, "insecure" = can't be tested from a secure page.
async function lcProbe(url){
  if(/^http:/i.test(url) && location.protocol === "https:") return "insecure";
  if(!/^https?:/i.test(url)) return "insecure";
  const ctrl = new AbortController(), timer = setTimeout(()=> ctrl.abort(), LC_TIMEOUT_MS);
  try{
    await fetch(url, { mode:"no-cors", cache:"no-store", redirect:"follow", referrerPolicy:"no-referrer", credentials:"omit", signal: ctrl.signal });
    return "ok";
  }catch(e){ return ctrl.signal.aborted ? "slow" : "down"; }
  finally{ clearTimeout(timer); }
}
function lcCandidates(){       // bookmarks and web apps, skipping anything on a webtop that is still locked
  return state.icons.filter(i=> (i.type === "bookmark" || i.type === "webapp") && i.url && !webtopNeedsUnlock(itemSpace(i)));
}

const LC_STATUS = {
  ok:       { label:"Reachable", mark:"\u2713" },
  down:     { label:"Not reachable", mark:"\u2717" },
  slow:     { label:"No answer in time", mark:"\u23F1" },
  insecure: { label:"Can't be checked (not https)", mark:"?" },
  pending:  { label:"Waiting\u2026", mark:"\u2026" },
  "":       { label:"Not checked yet", mark:"\u2022" }
};

function renderLinkChecker(body){
  const root = document.createElement("div"); root.className = "lc-app";
  body.innerHTML = ""; body.appendChild(root);
  const results = new Map();          // item id -> status
  let running = false, filter = "all", done = 0, total = 0;
  const el = (tag, cls, text)=>{ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };
  const count = (st)=> [...results.entries()].filter(([id, v])=> v === st && state.icons.some(i=> i.id === id)).length;

  async function runChecks(ids){
    const list = lcCandidates().filter(i=> !ids || ids.includes(i.id));
    running = true; done = 0; total = list.length;
    list.forEach(i=> results.set(i.id, "pending")); draw();
    let next = 0;
    const worker = async ()=>{
      while(next < list.length && body.isConnected){
        const it = list[next++];
        results.set(it.id, await lcProbe(it.url)); done++;
        if(done % 3 === 0 || done === total) draw();
      }
    };
    await Promise.all(Array.from({ length: Math.min(LC_CONCURRENCY, list.length) }, worker));
    running = false; draw();
  }

  function draw(){
    const items = lcCandidates();
    root.innerHTML = "";
    root.appendChild(el("h3", "", "Link checker"));
    root.appendChild(el("p", "cloud-note", "Checks whether the websites behind your bookmarks and web apps still answer. A browser can't see a page's \u201Cnot found\u201D error on a working site, so this finds sites that are gone, down or unreachable, not individual missing pages."));
    const bar = el("div", "lc-bar");
    const go = el("button", "btn primary", running ? `Checking\u2026 ${done} of ${total}` : (results.size ? "Check again" : `Check ${items.length} link${items.length === 1 ? "" : "s"}`));
    go.type = "button"; go.disabled = running || !items.length;
    go.addEventListener("click", ()=> runChecks());
    bar.appendChild(go);
    if(running){ const pr = el("div", "lc-progress"), fill = el("i"); fill.style.width = Math.round(done / Math.max(1, total) * 100) + "%"; pr.appendChild(fill); bar.appendChild(pr); }
    root.appendChild(bar);
    if(!items.length){ root.appendChild(el("p", "clk-empty", "You don't have any bookmarks or web apps to check yet.")); return; }

    const nDown = count("down"), nSlow = count("slow"), nOk = count("ok");
    if(results.size){
      const chips = el("div", "lc-chips");
      [["all", "All " + items.length], ["down", "Not reachable " + nDown], ["slow", "No answer " + nSlow], ["ok", "Reachable " + nOk]].forEach(([k, t])=>{
        const c = el("button", "clk-chip" + (filter === k ? " active" : ""), t); c.type = "button"; c.addEventListener("click", ()=>{ filter = k; draw(); }); chips.appendChild(c);
      });
      root.appendChild(chips);
      if(nDown){
        const del = el("button", "btn danger", `Delete the ${nDown} not reachable\u2026`); del.type = "button";
        del.addEventListener("click", ()=> requestDeleteConfirm([...results.entries()].filter(([id, v])=> v === "down" && state.icons.some(i=> i.id === id)).map(([id])=> id)));
        root.appendChild(del);
      }
    }
    const list = el("div", "lc-list"); list.setAttribute("role", "list");
    const multi = state.webtops.length > 1;
    items.filter(i=> filter === "all" || (results.get(i.id) || "") === filter).forEach(it=>{
      const st = results.get(it.id) || "", row = el("div", "lc-row lc-" + (st || "none")); row.setAttribute("role", "listitem");
      const mark = el("span", "lc-mark", LC_STATUS[st].mark); mark.title = LC_STATUS[st].label; mark.setAttribute("aria-label", LC_STATUS[st].label);
      const txt = el("span", "lc-text"), t = el("b", "", it.label), u = el("span", "", (domainLabel(it.url) || it.url) + (multi ? " \u00b7 " + cmdkWebtopName(itemSpace(it)) : "")); txt.append(t, u);
      const acts = el("span", "lc-acts");
      const a = el("a", "", "Open"); a.href = it.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      const ed = el("button", "", "Edit"); ed.type = "button"; ed.addEventListener("click", ()=> openItemModal({ mode:"edit", item: it }));
      const rm = el("button", "", "Delete"); rm.type = "button"; rm.addEventListener("click", ()=> requestDeleteConfirm([it.id]));
      acts.append(a, ed, rm);
      if(st === "down" || st === "slow"){ const re = el("button", "", "Recheck"); re.type = "button"; re.addEventListener("click", ()=> runChecks([it.id])); acts.appendChild(re); }
      row.append(mark, txt, acts); list.appendChild(row);
    });
    root.appendChild(list);
  }
  draw();
  // Keep the list honest when something is deleted or edited elsewhere (e.g. through the confirmation box).
  let sig = lcCandidates().map(i=> i.id + i.url + i.label).join("|");
  const watch = setInterval(()=>{
    if(!body.isConnected){ clearInterval(watch); return; }
    const now = lcCandidates().map(i=> i.id + i.url + i.label).join("|");
    if(now !== sig){ sig = now; if(!running) draw(); }
  }, 800);
}

/* Runs once at startup (see main.js). */
function initAppsLinkChecker(){
  AppManager.register({
    id: "linkcheck", name: "Link checker", description: "Find bookmarks whose websites no longer answer.",
    version: "1.0.0", developer: "on369", category: "utilities", icon: linkCheckerSVG, render: renderLinkChecker,
    permissions: ["network"], fileAssociations: [], shortcuts: [],
    defaultWidth: 460, defaultHeight: 520, minWidth: 320, minHeight: 360, maxWidth: 800, maxHeight: 820,
    resizable: true, singleton: true, backgroundCapable: false
  });
}
