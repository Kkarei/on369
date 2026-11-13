"use strict";

/* ============ APP CATALOG ============
   A centralized, curated list of external web apps — the single source
   board presets (js/webtop/boards.js) and the "Web app" add-menu
   (js/ui/webapp-picker.js) both read from, instead of each hardcoding its
   own list. Icons are never pre-fetched or hardcoded here: creating a
   webapp item from an entry just needs {label, url}; the existing
   favicon-chain + tryEnrichWebApp() in glyphs.js / web-app-enrichment.js
   resolve the real icon live, same as a user-added bookmark would.

   `categories` is an array because a handful of apps genuinely belong in
   more than one section (Canva is both an office tool and a business
   tool) — list every section an app should appear under.

   This is a curated set, not exhaustive. Add more by appending entries;
   nothing else needs to change. Keep ids stable once something references
   them (a board preset's `apps` list, by id).
*/

const CATEGORY_LABELS = {
  featured:      "Featured",
  productivity:  "Productivity & Office",
  education:     "Education & Study",
  development:   "Development & Technology",
  creative:      "Graphics & Creativity",
  documents:     "Documents & PDF Tools",
  communication: "Communication & Collaboration",
  ai:            "Artificial Intelligence",
  entertainment: "Entertainment & Gaming",
  finance:       "Finance & Trading",
  business:      "Business Tools",
  utilities:     "Everyday Utilities"
};

// Order the category picker shows them in (Featured first, then the rest
// in the same order as CATEGORY_LABELS).
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

// Hand-picked, broadly useful starting point for the "Featured" pill.
const FEATURED_IDS = ["google-docs", "chatgpt", "canva", "github", "notion", "youtube", "google-drive", "trello"];

const APP_CATALOG = {
  // Productivity & Office
  "google-docs":     { label:"Google Docs",     url:"https://docs.google.com",      categories:["productivity"] },
  "google-sheets":   { label:"Google Sheets",   url:"https://sheets.google.com",    categories:["productivity"] },
  "google-slides":   { label:"Google Slides",   url:"https://slides.google.com",    categories:["productivity"] },
  "canva":           { label:"Canva",           url:"https://www.canva.com",        categories:["productivity","business"] },
  "notion":          { label:"Notion",          url:"https://www.notion.so",        categories:["productivity","business"] },
  "trello":          { label:"Trello",          url:"https://trello.com",           categories:["productivity","business"] },
  "todoist":         { label:"Todoist",         url:"https://todoist.com",          categories:["productivity"] },
  "ticktick":        { label:"TickTick",        url:"https://ticktick.com",         categories:["productivity"] },
  "google-keep":     { label:"Google Keep",     url:"https://keep.google.com",      categories:["productivity"] },
  "excalidraw":      { label:"Excalidraw",      url:"https://excalidraw.com",       categories:["productivity"] },
  "diagrams-net":    { label:"diagrams.net",    url:"https://app.diagrams.net",     categories:["productivity"] },
  "onlyoffice":      { label:"ONLYOFFICE",      url:"https://www.onlyoffice.com",   categories:["productivity","business"] },

  // Education & Study
  "khan-academy":    { label:"Khan Academy",            url:"https://www.khanacademy.org", categories:["education"] },
  "coursera":        { label:"Coursera",                url:"https://www.coursera.org",    categories:["education"] },
  "edx":             { label:"edX",                     url:"https://www.edx.org",         categories:["education"] },
  "mit-ocw":         { label:"MIT OpenCourseWare",      url:"https://ocw.mit.edu",         categories:["education"] },
  "google-scholar":  { label:"Google Scholar",          url:"https://scholar.google.com",  categories:["education"] },
  "desmos":          { label:"Desmos",                  url:"https://www.desmos.com",      categories:["education"] },
  "geogebra":        { label:"GeoGebra",                url:"https://www.geogebra.org",    categories:["education"] },
  "quizlet":         { label:"Quizlet",                 url:"https://quizlet.com",         categories:["education"] },
  "phet":            { label:"PhET Interactive Simulations", url:"https://phet.colorado.edu", categories:["education"] },
  "wolframalpha":    { label:"WolframAlpha",            url:"https://www.wolframalpha.com", categories:["education","utilities"] },
  "ankiweb":         { label:"AnkiWeb",                 url:"https://ankiweb.net",         categories:["education"] },

  // Development & Technology
  "github":          { label:"GitHub",           url:"https://github.com",              categories:["development"] },
  "gitlab":          { label:"GitLab",           url:"https://gitlab.com",              categories:["development"] },
  "codepen":         { label:"CodePen",          url:"https://codepen.io",              categories:["development"] },
  "jsfiddle":        { label:"JSFiddle",         url:"https://jsfiddle.net",            categories:["development"] },
  "stackblitz":      { label:"StackBlitz",       url:"https://stackblitz.com",          categories:["development"] },
  "replit":          { label:"Replit",           url:"https://replit.com",              categories:["development"] },
  "mdn":             { label:"MDN Web Docs",     url:"https://developer.mozilla.org",   categories:["development"] },
  "w3schools":       { label:"W3Schools",        url:"https://www.w3schools.com",       categories:["development"] },
  "devto":           { label:"DEV Community",    url:"https://dev.to",                  categories:["development"] },

  // Graphics & Creativity
  "photopea":        { label:"Photopea",   url:"https://www.photopea.com",  categories:["creative"] },
  "pixlr":           { label:"Pixlr",      url:"https://pixlr.com",         categories:["creative"] },
  "figma":           { label:"Figma",      url:"https://www.figma.com",     categories:["creative"] },
  "unsplash":        { label:"Unsplash",   url:"https://unsplash.com",      categories:["creative"] },
  "removebg":        { label:"remove.bg",  url:"https://www.remove.bg",     categories:["creative","utilities"] },
  "squoosh":         { label:"Squoosh",    url:"https://squoosh.app",       categories:["creative","utilities"] },
  "vectr":           { label:"Vectr",      url:"https://www.vectr.com",     categories:["creative"] },

  // Documents & PDF Tools
  "ilovepdf":        { label:"iLovePDF",      url:"https://www.ilovepdf.com",   categories:["documents"] },
  "pdf24":           { label:"PDF24 Tools",   url:"https://tools.pdf24.org",    categories:["documents"] },
  "smallpdf":        { label:"Smallpdf",      url:"https://smallpdf.com",       categories:["documents"] },
  "tinywow":         { label:"TinyWow",       url:"https://tinywow.com",        categories:["documents"] },
  "google-drive":    { label:"Google Drive",  url:"https://drive.google.com",   categories:["documents"] },

  // Communication & Collaboration
  "gmail":           { label:"Gmail",          url:"https://mail.google.com",     categories:["communication"] },
  "outlook":         { label:"Outlook",        url:"https://outlook.live.com",    categories:["communication"] },
  "whatsapp-web":    { label:"WhatsApp Web",   url:"https://web.whatsapp.com",    categories:["communication"] },
  "telegram-web":    { label:"Telegram Web",   url:"https://web.telegram.org",    categories:["communication"] },
  "discord":         { label:"Discord",        url:"https://discord.com/app",     categories:["communication"] },
  "slack":           { label:"Slack",          url:"https://slack.com",           categories:["communication","business"] },
  "google-meet":     { label:"Google Meet",    url:"https://meet.google.com",     categories:["communication"] },
  "zoom":            { label:"Zoom",           url:"https://zoom.us",             categories:["communication","business"] },

  // Artificial Intelligence
  "chatgpt":         { label:"ChatGPT",            url:"https://chatgpt.com",             categories:["ai"] },
  "claude":          { label:"Claude",             url:"https://claude.ai",               categories:["ai"] },
  "gemini":          { label:"Google Gemini",      url:"https://gemini.google.com",       categories:["ai"] },
  "perplexity":      { label:"Perplexity AI",      url:"https://www.perplexity.ai",       categories:["ai"] },
  "notebooklm":      { label:"NotebookLM",         url:"https://notebooklm.google.com",   categories:["ai"] },
  "deepl":           { label:"DeepL Translator",   url:"https://www.deepl.com",           categories:["ai"] },
  "gamma":           { label:"Gamma",              url:"https://gamma.app",               categories:["ai","business"] },

  // Entertainment & Gaming
  "poki":            { label:"Poki",                url:"https://poki.com",             categories:["entertainment"] },
  "crazygames":      { label:"CrazyGames",          url:"https://www.crazygames.com",   categories:["entertainment"] },
  "itchio":          { label:"itch.io",             url:"https://itch.io",              categories:["entertainment"] },
  "lichess":         { label:"Lichess",             url:"https://lichess.org",          categories:["entertainment"] },
  "chesscom":        { label:"Chess.com",           url:"https://www.chess.com",        categories:["entertainment"] },
  "youtube":         { label:"YouTube",             url:"https://www.youtube.com",      categories:["entertainment"] },
  "spotify":         { label:"Spotify Web Player",  url:"https://open.spotify.com",     categories:["entertainment"] },
  "soundcloud":      { label:"SoundCloud",          url:"https://soundcloud.com",       categories:["entertainment"] },
  "twitch":          { label:"Twitch",              url:"https://www.twitch.tv",        categories:["entertainment"] },

  // Finance & Trading
  "tradingview":     { label:"TradingView",             url:"https://www.tradingview.com",    categories:["finance"] },
  "google-finance":  { label:"Google Finance",          url:"https://www.google.com/finance", categories:["finance"] },
  "xe":              { label:"XE Currency Converter",   url:"https://www.xe.com",             categories:["finance","utilities"] },
  "worldtimebuddy":  { label:"World Time Buddy",        url:"https://www.worldtimebuddy.com", categories:["finance","utilities"] },

  // Business Tools (entries unique to this section — the shared ones above are already tagged "business")
  "google-workspace":{ label:"Google Workspace", url:"https://workspace.google.com", categories:["business"] },

  // Everyday Utilities (entries unique to this section — shared ones above are already tagged "utilities")
  "google-translate":{ label:"Google Translate", url:"https://translate.google.com", categories:["utilities"] },
  "speedtest":       { label:"Speedtest",        url:"https://www.speedtest.net",    categories:["utilities"] },
  "google-maps":     { label:"Google Maps",      url:"https://maps.google.com",      categories:["utilities"] },
  "wikipedia":       { label:"Wikipedia",        url:"https://www.wikipedia.org",    categories:["education","utilities"] },
  "google-calendar": { label:"Google Calendar",  url:"https://calendar.google.com",  categories:["productivity","utilities"] },
  "google-photos":   { label:"Google Photos",    url:"https://photos.google.com",    categories:["utilities"] },

  // Kenya-specific (kept under Business — no dedicated section in the
  // current category list; move these if one is added later)
  "kra-itax":        { label:"KRA iTax",       url:"https://itax.kra.go.ke",     categories:["business"] },
  "kra-etims":       { label:"KRA eTIMS",      url:"https://etims.kra.go.ke",    categories:["business"] },
  "ecitizen-ke":     { label:"eCitizen Kenya", url:"https://www.ecitizen.go.ke", categories:["business"] }
};

// Looks up catalog ids; unknown ids are skipped (never throw) so a preset
// referencing a removed/renamed id degrades gracefully instead of breaking
// webtop creation.
function catalogApps(ids){
  return (ids || []).map(id=> APP_CATALOG[id] ? { id, ...APP_CATALOG[id] } : null).filter(Boolean);
}

// All catalog entries belonging to one category, each with its id attached.
// "featured" is special-cased to FEATURED_IDS (in that order) rather than
// a stored category, since "featured" is a curated pick, not a genre.
function appsInCategory(catId){
  if(catId === "featured") return catalogApps(FEATURED_IDS);
  return Object.keys(APP_CATALOG)
    .filter(id=> APP_CATALOG[id].categories.includes(catId))
    .map(id=> ({ id, ...APP_CATALOG[id] }));
}
