# on369

A browser-based personal webtop: bookmarks, web apps, native apps (Calculator, Todo, Notes), widgets, search, themes, file backup and Supabase cloud backup.

## Run it
Serve this folder over http (for example `npx serve .` or `python3 -m http.server`) and open `index.html`.
Google sign-in for Cloud Backup needs an http(s) address; everything else also works from `file://`.
`legacy/on369-single-file.html` is the last single-file version, kept as a fallback.

## Structure
```
index.html          markup only (modals, top bar, containers)
wallpapers/         built-in wallpaper pictures + wallpapers.json (the list the app reads)
tools/              make-wallpaper-list.py rebuilds that list from the folder
css/                8 stylesheets, loaded in order (cascade order matters)
js/                 loaded in the order listed in index.html
  core/             config, event bus, app manager
  models/           item classes (bookmark, folder, app, web app, widget)
  data/             IndexedDB store (+ localStorage fallback)
  state/            app state, saving, first-run setup and loading
  ui/               DOM refs, draggable popups, themes/settings, wallpaper gallery + slideshow, clock/calendar, glyphs, modals, search, app picker
  webtop/          grid, render, widgets, widgets (Shelf to group icons, Clock in 6 styles, Calendar in 2 styles), selection, clipboard, drag/click, delete, menus
  windows/          floating window manager
  services/         bookmark import/export, web-app enrichment, cloud backup, file backup
  apps/             calculator, notes, todo
  main.js           boot: runs each file's init function in order
```
Each file keeps its declarations at the top level and puts anything that must run at startup inside one `initXxx()` function. `main.js` calls them in the original order, so adding a file means: add its `<script>` tag before `main.js`, and add its `init` call to the boot list if it has one.

## Path to TypeScript and React
Files currently share one global scope (classic scripts), because several variables (`state`, `windows`, `selected`, `sess`, `searchMode`, ...) are reassigned from different files. That has to be untangled before real ES modules. Suggested order:
1. **Leaf files first** (no shared state): `core/config`, `core/event-bus`, `models/items`, `data/store`, `services/bookmark-*`, `services/web-app-enrichment`. Convert to `.ts` ES modules with types (`WebtopItem` union, `Prefs`, `BackupFile`).
2. **State**: replace the reassigned globals with one typed store (for example Zustand) that `state/` exposes; React reads it with hooks.
3. **UI to components**: `ui/*` become React components (settings, calendar, modals, search bar); `webtop/*` becomes `<Webtop>`, `<Icon>`, `<Widget>` with drag hooks; `windows/*` becomes `<WindowManager>`; each file in `apps/` becomes one component.
4. **Services stay plain TS**: cloud backup and file backup need only the store and the data layer.

## Adding wallpapers (administrator)
1. Copy the pictures (JPG, PNG, WebP or AVIF; about 1920 px wide and under 1 MB each) into `wallpapers/`.
2. Run `python3 tools/make-wallpaper-list.py` (or add a line to `wallpapers/wallpapers.json` by hand). Browsers cannot list a folder, so this list is how the app finds new pictures.
3. Reload the app: they appear in Settings > Wallpapers and join the automatic switching. No code changes.
Keep a picture's `id` stable: users' choices are saved by id, so renaming it makes their selection fall back to the default pattern.
