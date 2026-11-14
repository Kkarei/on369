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
   tool) — list every section an app should appear under. Where an app's
   `desc` reads slightly differently depending on which section it's
   listed under, the more general-purpose wording was kept, since there's
   one entry (and one tooltip) per app, not one per section.

   `pricing` is one of "free" | "freemium" | "paid" | "unknown" — this is
   on369's own best-effort classification of each service's general
   pricing model, not a guarantee; a service can change its pricing at any
   time. "freemium" means a usable free tier plus paid upgrades; "paid"
   means it's fundamentally a paid product (even with a free trial).

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
  "google-docs":     { label:"Google Docs",     url:"https://docs.google.com",      categories:["productivity"], pricing:"free",
    desc:"Create, edit and collaborate on online documents." },
  "google-sheets":   { label:"Google Sheets",   url:"https://sheets.google.com",    categories:["productivity"], pricing:"free",
    desc:"Create spreadsheets, manage data and perform calculations." },
  "google-slides":   { label:"Google Slides",   url:"https://slides.google.com",    categories:["productivity"], pricing:"free",
    desc:"Create and present professional slide presentations." },
  "canva":           { label:"Canva",           url:"https://www.canva.com",        categories:["productivity","business"], pricing:"freemium",
    desc:"Design graphics, presentations, posters, social media content and other visual materials." },
  "notion":          { label:"Notion",          url:"https://www.notion.so",        categories:["productivity","business"], pricing:"freemium",
    desc:"Organize notes, documents, projects, databases and personal workspaces." },
  "trello":          { label:"Trello",          url:"https://trello.com",           categories:["productivity","business"], pricing:"freemium",
    desc:"Manage projects and tasks using visual boards, lists and cards." },
  "todoist":         { label:"Todoist",         url:"https://todoist.com",          categories:["productivity"], pricing:"freemium",
    desc:"Organize personal and professional tasks, projects and reminders." },
  "ticktick":        { label:"TickTick",        url:"https://ticktick.com",         categories:["productivity"], pricing:"freemium",
    desc:"Manage tasks, schedules, habits and productivity routines." },
  "google-keep":     { label:"Google Keep",     url:"https://keep.google.com",      categories:["productivity"], pricing:"free",
    desc:"Quickly capture notes, checklists, ideas and reminders." },
  "excalidraw":      { label:"Excalidraw",      url:"https://excalidraw.com",       categories:["productivity"], pricing:"free",
    desc:"Draw diagrams, sketches, mind maps and visual explanations using a virtual whiteboard." },
  "diagrams-net":    { label:"diagrams.net",    url:"https://app.diagrams.net",     categories:["productivity"], pricing:"free",
    desc:"Create flowcharts, network diagrams, organizational charts and technical diagrams." },
  "onlyoffice":      { label:"ONLYOFFICE",      url:"https://www.onlyoffice.com",   categories:["productivity","business"], pricing:"freemium",
    desc:"Create and edit documents, spreadsheets and presentations online." },

  // Education & Study
  "khan-academy":    { label:"Khan Academy",            url:"https://www.khanacademy.org", categories:["education"], pricing:"free",
    desc:"Provides free lessons and exercises in mathematics, science, computing and other subjects." },
  "coursera":        { label:"Coursera",                url:"https://www.coursera.org",    categories:["education"], pricing:"freemium",
    desc:"Offers online courses, professional certificates and degrees from universities and organisations." },
  "edx":             { label:"edX",                     url:"https://www.edx.org",         categories:["education"], pricing:"freemium",
    desc:"Provides online courses and professional learning programmes from universities and institutions." },
  "mit-ocw":         { label:"MIT OpenCourseWare",      url:"https://ocw.mit.edu",         categories:["education"], pricing:"free",
    desc:"Provides free access to MIT course materials, lecture notes and study resources." },
  "google-scholar":  { label:"Google Scholar",          url:"https://scholar.google.com",  categories:["education"], pricing:"free",
    desc:"Search for academic papers, research articles, theses and scholarly publications." },
  "desmos":          { label:"Desmos",                  url:"https://www.desmos.com",      categories:["education"], pricing:"free",
    desc:"Explore mathematics using interactive graphing calculators and other mathematical tools." },
  "geogebra":        { label:"GeoGebra",                url:"https://www.geogebra.org",    categories:["education"], pricing:"free",
    desc:"Learn and explore mathematics through interactive geometry, algebra, graphing and 3D tools." },
  "quizlet":         { label:"Quizlet",                 url:"https://quizlet.com",         categories:["education"], pricing:"freemium",
    desc:"Create and study flashcards, practice questions and learning sets." },
  "phet":            { label:"PhET Interactive Simulations", url:"https://phet.colorado.edu", categories:["education"], pricing:"free",
    desc:"Explore science and mathematics through interactive educational simulations." },
  "wolframalpha":    { label:"WolframAlpha",            url:"https://www.wolframalpha.com", categories:["education","utilities"], pricing:"freemium",
    desc:"Find computational answers to mathematical, scientific and technical questions." },
  "ankiweb":         { label:"AnkiWeb",                 url:"https://ankiweb.net",         categories:["education"], pricing:"free",
    desc:"Study using digital flashcards and spaced-repetition learning." },

  // Development & Technology
  "github":          { label:"GitHub",           url:"https://github.com",              categories:["development"], pricing:"freemium",
    desc:"Host code repositories, collaborate on software projects and manage development workflows." },
  "gitlab":          { label:"GitLab",           url:"https://gitlab.com",              categories:["development"], pricing:"freemium",
    desc:"Manage source code, collaborate on projects and automate software development and deployment." },
  "codepen":         { label:"CodePen",          url:"https://codepen.io",              categories:["development"], pricing:"freemium",
    desc:"Write, test and share HTML, CSS and JavaScript code snippets in a live editor." },
  "jsfiddle":        { label:"JSFiddle",         url:"https://jsfiddle.net",            categories:["development"], pricing:"free",
    desc:"Experiment with HTML, CSS and JavaScript in an online coding playground." },
  "stackblitz":      { label:"StackBlitz",       url:"https://stackblitz.com",          categories:["development"], pricing:"freemium",
    desc:"Build and run web development projects directly in the browser." },
  "replit":          { label:"Replit",           url:"https://replit.com",              categories:["development"], pricing:"freemium",
    desc:"Write, run, collaborate on and deploy software projects using an online development environment." },
  "mdn":             { label:"MDN Web Docs",     url:"https://developer.mozilla.org",   categories:["development"], pricing:"free",
    desc:"Learn web technologies and access technical documentation for HTML, CSS, JavaScript and web APIs." },
  "w3schools":       { label:"W3Schools",        url:"https://www.w3schools.com",       categories:["development"], pricing:"free",
    desc:"Learn programming and web development through tutorials, examples and interactive exercises." },
  "devto":           { label:"DEV Community",    url:"https://dev.to",                  categories:["development"], pricing:"free",
    desc:"Read and share articles, tutorials and discussions about software development." },

  // Graphics & Creativity
  "photopea":        { label:"Photopea",   url:"https://www.photopea.com",  categories:["creative"], pricing:"freemium",
    desc:"Edit photos and graphics using a browser-based image editor that supports PSD and other formats." },
  "pixlr":           { label:"Pixlr",      url:"https://pixlr.com",         categories:["creative"], pricing:"freemium",
    desc:"Edit photos, remove backgrounds and create visual designs using online editing tools." },
  "figma":           { label:"Figma",      url:"https://www.figma.com",     categories:["creative"], pricing:"freemium",
    desc:"Design user interfaces, prototypes and collaborative digital products." },
  "unsplash":        { label:"Unsplash",   url:"https://unsplash.com",      categories:["creative"], pricing:"free",
    desc:"Discover and download high-quality photographs for creative and design projects." },
  "removebg":        { label:"remove.bg",  url:"https://www.remove.bg",     categories:["creative","utilities"], pricing:"freemium",
    desc:"Automatically remove backgrounds from photographs and images." },
  "squoosh":         { label:"Squoosh",    url:"https://squoosh.app",       categories:["creative","utilities"], pricing:"free",
    desc:"Compress and optimize images into smaller file sizes while controlling image quality." },
  "vectr":           { label:"Vectr",      url:"https://www.vectr.com",     categories:["creative"], pricing:"free",
    desc:"Create and edit vector graphics, illustrations, icons and other scalable designs." },

  // Documents & PDF Tools
  "ilovepdf":        { label:"iLovePDF",      url:"https://www.ilovepdf.com",   categories:["documents"], pricing:"freemium",
    desc:"Merge, split, compress, convert, edit and organize PDF documents." },
  "pdf24":           { label:"PDF24 Tools",   url:"https://tools.pdf24.org",    categories:["documents"], pricing:"free",
    desc:"Provides online PDF tools for converting, editing, compressing and managing PDF files." },
  "smallpdf":        { label:"Smallpdf",      url:"https://smallpdf.com",       categories:["documents"], pricing:"freemium",
    desc:"Compress, convert, merge, sign and edit PDF documents online." },
  "tinywow":         { label:"TinyWow",       url:"https://tinywow.com",        categories:["documents"], pricing:"freemium",
    desc:"Offers free and freemium online tools for working with PDFs, images, videos and documents." },
  "google-drive":    { label:"Google Drive",  url:"https://drive.google.com",   categories:["documents"], pricing:"freemium",
    desc:"Store, organize, share and access files online, including documents and other media." },

  // Communication & Collaboration
  "gmail":           { label:"Gmail",          url:"https://mail.google.com",     categories:["communication"], pricing:"free",
    desc:"Send, receive and organize email messages." },
  "outlook":         { label:"Outlook",        url:"https://outlook.live.com",    categories:["communication"], pricing:"freemium",
    desc:"Manage email, calendars, contacts and Microsoft communication services." },
  "whatsapp-web":    { label:"WhatsApp Web",   url:"https://web.whatsapp.com",    categories:["communication"], pricing:"free",
    desc:"Send messages, share files and communicate through WhatsApp using a web browser." },
  "telegram-web":    { label:"Telegram Web",   url:"https://web.telegram.org",    categories:["communication"], pricing:"freemium",
    desc:"Access Telegram messages, groups, channels and file-sharing features through a browser." },
  "discord":         { label:"Discord",        url:"https://discord.com/app",     categories:["communication"], pricing:"freemium",
    desc:"Communicate through text channels, voice calls, video calls and online communities." },
  "slack":           { label:"Slack",          url:"https://slack.com",           categories:["communication","business"], pricing:"freemium",
    desc:"Collaborate with teams through organized messaging channels, file sharing and integrations." },
  "google-meet":     { label:"Google Meet",    url:"https://meet.google.com",     categories:["communication"], pricing:"freemium",
    desc:"Hold online meetings and video conferences." },
  "zoom":            { label:"Zoom",           url:"https://zoom.us",             categories:["communication","business"], pricing:"freemium",
    desc:"Conduct video meetings, webinars and online collaboration sessions." },

  // Artificial Intelligence
  "chatgpt":         { label:"ChatGPT",            url:"https://chatgpt.com",             categories:["ai"], pricing:"freemium",
    desc:"AI assistant for answering questions, writing, research, coding, analysis and creative tasks." },
  "claude":          { label:"Claude",             url:"https://claude.ai",               categories:["ai"], pricing:"freemium",
    desc:"AI assistant for writing, reasoning, document analysis, research and software development." },
  "gemini":          { label:"Google Gemini",      url:"https://gemini.google.com",       categories:["ai"], pricing:"freemium",
    desc:"Google's AI assistant for research, writing, reasoning, content generation and productivity." },
  "perplexity":      { label:"Perplexity AI",      url:"https://www.perplexity.ai",       categories:["ai"], pricing:"freemium",
    desc:"AI-powered search and research tool that provides answers supported by web sources." },
  "notebooklm":      { label:"NotebookLM",         url:"https://notebooklm.google.com",   categories:["ai"], pricing:"freemium",
    desc:"AI research assistant that analyses your uploaded sources and helps generate summaries and insights." },
  "deepl":           { label:"DeepL Translator",   url:"https://www.deepl.com",           categories:["ai"], pricing:"freemium",
    desc:"Translate text and documents between different languages using AI." },
  "gamma":           { label:"Gamma",              url:"https://gamma.app",               categories:["ai","business"], pricing:"freemium",
    desc:"Create presentations, documents and visual content using AI." },

  // Entertainment & Gaming
  "poki":            { label:"Poki",                url:"https://poki.com",             categories:["entertainment"], pricing:"free",
    desc:"Play a large collection of free browser-based games." },
  "crazygames":      { label:"CrazyGames",          url:"https://www.crazygames.com",   categories:["entertainment"], pricing:"free",
    desc:"Discover and play online games across different genres without traditional installations." },
  "itchio":          { label:"itch.io",             url:"https://itch.io",              categories:["entertainment"], pricing:"freemium",
    desc:"Discover, download and play independent games created by indie developers." },
  "lichess":         { label:"Lichess",             url:"https://lichess.org",          categories:["entertainment"], pricing:"free",
    desc:"Play chess online, practise tactics and analyse chess games for free." },
  "chesscom":        { label:"Chess.com",           url:"https://www.chess.com",        categories:["entertainment"], pricing:"freemium",
    desc:"Play chess, solve puzzles, take lessons and compete against other players." },
  "youtube":         { label:"YouTube",             url:"https://www.youtube.com",      categories:["entertainment"], pricing:"freemium",
    desc:"Watch, upload and share videos covering entertainment, education, tutorials and more." },
  "spotify":         { label:"Spotify Web Player",  url:"https://open.spotify.com",     categories:["entertainment"], pricing:"freemium",
    desc:"Stream music, podcasts and other audio content online." },
  "soundcloud":      { label:"SoundCloud",          url:"https://soundcloud.com",       categories:["entertainment"], pricing:"freemium",
    desc:"Discover, stream and share music, audio recordings and independent artist content." },
  "twitch":          { label:"Twitch",              url:"https://www.twitch.tv",        categories:["entertainment"], pricing:"freemium",
    desc:"Watch and broadcast live streams, especially gaming, entertainment and creative content." },

  // Finance & Trading
  "tradingview":     { label:"TradingView",             url:"https://www.tradingview.com",    categories:["finance"], pricing:"freemium",
    desc:"Analyse financial markets using interactive charts, technical indicators and trading tools." },
  "google-finance":  { label:"Google Finance",          url:"https://www.google.com/finance", categories:["finance"], pricing:"free",
    desc:"Track stocks, market information, financial news and investment performance." },
  "xe":              { label:"XE Currency Converter",   url:"https://www.xe.com",             categories:["finance","utilities"], pricing:"free",
    desc:"Convert currencies and check exchange rates." },
  "worldtimebuddy":  { label:"World Time Buddy",        url:"https://www.worldtimebuddy.com", categories:["finance","utilities"], pricing:"free",
    desc:"Compare time zones and plan meetings across different locations." },

  // Business Tools (entries unique to this section — the shared ones above are already tagged "business")
  "google-workspace":{ label:"Google Workspace", url:"https://workspace.google.com", categories:["business"], pricing:"paid",
    desc:"Access Google's business productivity suite, including Gmail, Drive, Docs, Sheets and Meet." },

  // Everyday Utilities (entries unique to this section — shared ones above are already tagged "utilities")
  "google-translate":{ label:"Google Translate", url:"https://translate.google.com", categories:["utilities"], pricing:"free",
    desc:"Translate text, websites and documents between different languages." },
  "speedtest":       { label:"Speedtest",        url:"https://www.speedtest.net",    categories:["utilities"], pricing:"free",
    desc:"Test your internet connection's download speed, upload speed and latency." },
  "google-maps":     { label:"Google Maps",      url:"https://maps.google.com",      categories:["utilities"], pricing:"free",
    desc:"Find directions, explore places and view maps for locations around the world." },
  "wikipedia":       { label:"Wikipedia",        url:"https://www.wikipedia.org",    categories:["education","utilities"], pricing:"free",
    desc:"Look up free encyclopedia articles on millions of topics." },
  "google-calendar": { label:"Google Calendar",  url:"https://calendar.google.com",  categories:["productivity","utilities"], pricing:"free",
    desc:"Schedule events, set reminders and manage your calendar online." },
  "google-photos":   { label:"Google Photos",    url:"https://photos.google.com",    categories:["utilities"], pricing:"free",
    desc:"Store, organize, search and share your photos and videos online." },

  // Kenya-specific (kept under Business — no dedicated section in the
  // current category list; move these if one is added later)
  "kra-itax":        { label:"KRA iTax",       url:"https://itax.kra.go.ke",     categories:["business"], pricing:"free",
    desc:"Access Kenya Revenue Authority tax services, including tax returns, PIN services and tax-related transactions." },
  "kra-etims":       { label:"KRA eTIMS",      url:"https://etims.kra.go.ke",    categories:["business"], pricing:"free",
    desc:"Manage electronic tax invoicing and related tax compliance services in Kenya." },
  "ecitizen-ke":     { label:"eCitizen Kenya", url:"https://www.ecitizen.go.ke", categories:["business"], pricing:"free",
    desc:"Access Kenyan government services, applications, payments and official documents online." }
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
