"use strict";

/* ============ APP CATALOG ============
   A centralized, curated list of external web apps on369 can hand to a
   board preset (or, later, a browsable App Library) as real webapp icons —
   not a per-preset hardcoded list. Each preset references entries here by
   id; nothing about a preset needs to change if a URL or label is fixed
   here later. Icons are never pre-fetched or hardcoded: creating a webapp
   item from one of these just needs {label, url}, and the existing
   favicon-chain + tryEnrichWebApp() in glyphs.js / web-app-enrichment.js
   resolves the real icon live, the same as a user-added bookmark would.

   This is an initial, hand-picked set across the categories on369 cares
   about — not exhaustive. Add more by appending entries; nothing else
   needs to change. Keep ids stable once a preset references them. */
const APP_CATALOG = {
  // Productivity & Office
  "google-docs":      { label:"Google Docs",     url:"https://docs.google.com",     category:"productivity" },
  "google-sheets":     { label:"Google Sheets",    url:"https://sheets.google.com",   category:"productivity" },
  "google-slides":     { label:"Google Slides",    url:"https://slides.google.com",   category:"productivity" },
  "google-drive":      { label:"Google Drive",     url:"https://drive.google.com",    category:"productivity" },
  "google-keep":       { label:"Google Keep",      url:"https://keep.google.com",     category:"productivity" },
  "notion":            { label:"Notion",           url:"https://www.notion.so",       category:"productivity" },
  "trello":            { label:"Trello",           url:"https://trello.com",          category:"productivity" },
  "todoist":           { label:"Todoist",          url:"https://todoist.com",         category:"productivity" },
  "excalidraw":        { label:"Excalidraw",       url:"https://excalidraw.com",      category:"productivity" },
  "diagrams-net":      { label:"diagrams.net",     url:"https://app.diagrams.net",    category:"productivity" },

  // Education & Study
  "khan-academy":      { label:"Khan Academy",     url:"https://www.khanacademy.org", category:"education" },
  "coursera":          { label:"Coursera",         url:"https://www.coursera.org",    category:"education" },
  "google-scholar":    { label:"Google Scholar",   url:"https://scholar.google.com",  category:"education" },
  "desmos":            { label:"Desmos",           url:"https://www.desmos.com",      category:"education" },
  "geogebra":          { label:"GeoGebra",         url:"https://www.geogebra.org",    category:"education" },
  "quizlet":           { label:"Quizlet",          url:"https://quizlet.com",         category:"education" },
  "wolframalpha":      { label:"WolframAlpha",     url:"https://www.wolframalpha.com", category:"education" },

  // Development & Technology
  "github":            { label:"GitHub",           url:"https://github.com",          category:"development" },
  "codepen":           { label:"CodePen",          url:"https://codepen.io",          category:"development" },
  "stackblitz":        { label:"StackBlitz",       url:"https://stackblitz.com",      category:"development" },
  "replit":            { label:"Replit",           url:"https://replit.com",          category:"development" },
  "mdn":               { label:"MDN Web Docs",     url:"https://developer.mozilla.org", category:"development" },
  "w3schools":         { label:"W3Schools",        url:"https://www.w3schools.com",   category:"development" },

  // Graphics & Creativity
  "canva":             { label:"Canva",            url:"https://www.canva.com",       category:"creative" },
  "photopea":          { label:"Photopea",         url:"https://www.photopea.com",    category:"creative" },
  "figma":             { label:"Figma",            url:"https://www.figma.com",       category:"creative" },
  "pixlr":             { label:"Pixlr",            url:"https://pixlr.com",           category:"creative" },
  "unsplash":          { label:"Unsplash",         url:"https://unsplash.com",        category:"creative" },
  "removebg":          { label:"remove.bg",        url:"https://www.remove.bg",       category:"creative" },

  // Documents & PDF Tools
  "ilovepdf":          { label:"iLovePDF",         url:"https://www.ilovepdf.com",    category:"documents" },
  "smallpdf":          { label:"Smallpdf",         url:"https://smallpdf.com",        category:"documents" },
  "pdf24":             { label:"PDF24 Tools",      url:"https://tools.pdf24.org",     category:"documents" },

  // Communication & Collaboration
  "gmail":             { label:"Gmail",            url:"https://mail.google.com",     category:"communication" },
  "outlook":           { label:"Outlook",          url:"https://outlook.live.com",    category:"communication" },
  "whatsapp-web":      { label:"WhatsApp Web",     url:"https://web.whatsapp.com",    category:"communication" },
  "telegram-web":      { label:"Telegram Web",     url:"https://web.telegram.org",    category:"communication" },
  "discord":           { label:"Discord",          url:"https://discord.com/app",     category:"communication" },
  "slack":             { label:"Slack",            url:"https://slack.com",           category:"communication" },
  "google-meet":       { label:"Google Meet",      url:"https://meet.google.com",     category:"communication" },
  "zoom":              { label:"Zoom",             url:"https://zoom.us",             category:"communication" },

  // Artificial Intelligence
  "chatgpt":           { label:"ChatGPT",          url:"https://chatgpt.com",         category:"ai" },
  "claude":            { label:"Claude",           url:"https://claude.ai",           category:"ai" },
  "gemini":            { label:"Google Gemini",    url:"https://gemini.google.com",   category:"ai" },
  "perplexity":        { label:"Perplexity",       url:"https://www.perplexity.ai",   category:"ai" },
  "notebooklm":        { label:"NotebookLM",       url:"https://notebooklm.google.com", category:"ai" },
  "deepl":             { label:"DeepL",            url:"https://www.deepl.com",       category:"ai" },

  // Entertainment & Gaming
  "poki":              { label:"Poki",             url:"https://poki.com",            category:"entertainment" },
  "crazygames":        { label:"CrazyGames",       url:"https://www.crazygames.com",  category:"entertainment" },
  "itchio":            { label:"itch.io",          url:"https://itch.io",             category:"entertainment" },
  "lichess":           { label:"Lichess",          url:"https://lichess.org",         category:"entertainment" },
  "chesscom":          { label:"Chess.com",        url:"https://www.chess.com",       category:"entertainment" },
  "youtube":           { label:"YouTube",          url:"https://www.youtube.com",     category:"entertainment" },
  "spotify":           { label:"Spotify",          url:"https://open.spotify.com",    category:"entertainment" },
  "twitch":            { label:"Twitch",           url:"https://www.twitch.tv",       category:"entertainment" },

  // Finance & Trading
  "tradingview":       { label:"TradingView",      url:"https://www.tradingview.com", category:"finance" },
  "google-finance":    { label:"Google Finance",   url:"https://www.google.com/finance", category:"finance" },
  "xe":                { label:"XE",               url:"https://www.xe.com",          category:"finance" },

  // Business & Kenya-specific
  "kra-itax":          { label:"KRA iTax",         url:"https://itax.kra.go.ke",      category:"business" },
  "kra-etims":         { label:"KRA eTIMS",        url:"https://etims.kra.go.ke",     category:"business" },
  "ecitizen-ke":       { label:"eCitizen Kenya",   url:"https://www.ecitizen.go.ke",  category:"business" },

  // Everyday Utilities
  "google-translate":  { label:"Google Translate", url:"https://translate.google.com", category:"utilities" },
  "speedtest":         { label:"Speedtest",        url:"https://www.speedtest.net",   category:"utilities" },
  "google-maps":       { label:"Google Maps",      url:"https://maps.google.com",     category:"utilities" },
  "wikipedia":         { label:"Wikipedia",        url:"https://www.wikipedia.org",   category:"utilities" },
  "google-calendar":   { label:"Google Calendar",  url:"https://calendar.google.com", category:"utilities" },
  "google-photos":     { label:"Google Photos",    url:"https://photos.google.com",   category:"utilities" }
};

// Looks up catalog ids; unknown ids are skipped (never throw) so a preset
// referencing a removed/renamed id degrades gracefully instead of breaking
// webtop creation.
function catalogApps(ids){
  return (ids || []).map(id=> APP_CATALOG[id] ? { id, ...APP_CATALOG[id] } : null).filter(Boolean);
}
