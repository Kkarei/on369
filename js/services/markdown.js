"use strict";

/* ============ MARKDOWN (small and safe) ============
   renderMarkdown(text) -> HTML. Everything the person typed is escaped first, so nothing they write (or paste)
   can become a script or a tag; only the formatting below is turned into HTML.
   Supported: # ## ### headings, **bold**, *italic*, ~~strike~~, `code`, ``` code blocks ```, > quotes,
   - and 1. lists (nested by indent), - [ ] / - [x] checklists, --- rules, [text](https://link) and bare links. */

function mdEscape(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// Only web and mail links become links; javascript:, data: and the like are left as plain text.
function mdSafeUrl(u){
  u = String(u).trim();
  return /^(https?:\/\/|mailto:)[^\s<>"']+$/i.test(u) ? u : null;
}
function mdInline(raw){
  const codes = [];
  let t = String(raw).replace(/`([^`\n]+)`/g, (m, c)=>{ codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
  t = mdEscape(t);
  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, url)=>{
    const safe = mdSafeUrl(url.replace(/&amp;/g, "&"));
    return safe ? `<a href="${mdEscape(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : m;
  });
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, (m, pre, url)=>{
    const safe = mdSafeUrl(url.replace(/&amp;/g, "&"));
    return safe ? `${pre}<a href="${mdEscape(safe)}" target="_blank" rel="noopener noreferrer">${url}</a>` : m;
  });
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>").replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, "$1<em>$2</em>");
  t = t.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  return t.replace(/\u0000(\d+)\u0000/g, (m, i)=> "<code>" + mdEscape(codes[+i]) + "</code>");
}

function renderMarkdown(text){
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0, para = [], listStack = [];            // listStack: [{ type:"ul"|"ol", indent }]
  const flushPara = ()=>{ if(para.length){ out.push("<p>" + para.map(mdInline).join("<br>") + "</p>"); para = []; } };
  const closeLists = (toIndent)=>{ while(listStack.length && (toIndent === undefined || listStack[listStack.length - 1].indent > toIndent)){ out.push("</li></" + listStack.pop().type + ">"); } };
  while(i < lines.length){
    const line = lines[i];
    const fence = /^\s*```/.exec(line);
    if(fence){
      flushPara(); closeLists();
      const code = []; i++;
      while(i < lines.length && !/^\s*```/.test(lines[i])){ code.push(lines[i]); i++; }
      i++; out.push("<pre><code>" + mdEscape(code.join("\n")) + "</code></pre>"); continue;
    }
    if(/^\s*$/.test(line)){ flushPara(); closeLists(); i++; continue; }
    let m;
    if((m = /^(#{1,3})\s+(.*)$/.exec(line))){ flushPara(); closeLists(); out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); i++; continue; }
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)){ flushPara(); closeLists(); out.push("<hr>"); i++; continue; }
    if((m = /^>\s?(.*)$/.exec(line))){
      flushPara(); closeLists();
      const q = [m[1]]; i++;
      while(i < lines.length && (m = /^>\s?(.*)$/.exec(lines[i]))){ q.push(m[1]); i++; }
      out.push("<blockquote>" + q.map(mdInline).join("<br>") + "</blockquote>"); continue;
    }
    if((m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line))){
      flushPara();
      const indent = m[1].replace(/\t/g, "  ").length, type = /\d/.test(m[2]) ? "ol" : "ul";
      let body = m[3], cls = "";
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(body);
      if(task){ cls = ' class="md-task"'; body = `<input type="checkbox" disabled${task[1] === " " ? "" : " checked"}> ` + mdInline(task[2]); }
      else body = mdInline(body);
      const top = listStack[listStack.length - 1];
      if(!top || indent > top.indent){ out.push(`<${type}><li${cls}>`); listStack.push({ type, indent }); }
      else{
        closeLists(indent);
        const cur = listStack[listStack.length - 1];
        if(cur && cur.indent === indent && cur.type === type) out.push(`</li><li${cls}>`);
        else{ if(cur){ out.push("</li></" + listStack.pop().type + ">"); } out.push(`<${type}><li${cls}>`); listStack.push({ type, indent }); }
      }
      out.push(body); i++; continue;
    }
    closeLists(); para.push(line); i++;
  }
  flushPara(); closeLists();
  return out.join("");
}
