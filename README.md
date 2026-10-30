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
css/                9 stylesheets, loaded in order (cascade order matters)
js/                 loaded in the order listed in index.html
  core/             config, event bus, app manager
  models/           item classes (bookmark, folder, app, web app, widget)
  data/             IndexedDB store (+ localStorage fallback)
  state/            app state, saving, first-run setup and loading
  ui/               DOM refs, draggable popups, your note (top bar / footnote), themes/settings, wallpaper gallery + slideshow, clock/calendar, glyphs, modals, search, app picker
  webtop/          webtops (workspaces + tabs), boards (tile dashboards), grid, render, widgets (Shelf to group icons, Clock in 6 styles, Calendar in 2 styles), selection, clipboard, drag/click, delete, menus
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

## Cloud backup: keeping earlier copies (one-time, optional but recommended)
Automatic backups replace the cloud copy. To be able to go back, run this once in the Supabase SQL editor. It keeps up to 5 earlier copies, saving one whenever a backup replaces a copy older than 10 minutes, or whenever the new copy is much smaller than the old one:
```sql
create table public.backup_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.backup_history enable row level security;
create policy "read own history" on public.backup_history for select using (auth.uid() = user_id);
create policy "delete own history" on public.backup_history for delete using (auth.uid() = user_id);
create or replace function public.keep_backup_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.updated_at < now() - interval '10 minutes'
     or length(new.data::text) < length(old.data::text) * 0.6 then
    insert into public.backup_history (user_id, data) values (old.user_id, old.data);
    delete from public.backup_history where user_id = old.user_id
      and id not in (select id from public.backup_history where user_id = old.user_id order by created_at desc limit 5);
  end if;
  return new;
end $$;
create trigger backups_keep_history before update on public.backups
  for each row execute function public.keep_backup_history();
```
Then use **Cloud Backup > Restore an earlier cloud copy...**.

## How your data is protected
- **IndexedDB is the one real store.** If the browser closes an idle connection it is reopened and the write retried. The app never quietly switches to another storage mid-session.
- **A failed save is never silent.** You see a banner and the same changes are retried (3 s, 10 s, 30 s, then every minute).
- **Emergency copy.** Every change is also written synchronously to localStorage. If the database missed a change (tab closed, database busy), the newer copy is restored at the next start.
- **Never start over by mistake.** If this device had saved data but nothing can be read, the app switches saving off and asks; it does not reset to defaults, and nothing is backed up to the cloud.
- **One tab at a time writes.** If another tab saved newer data, this tab stops saving until it is reloaded.
- **Cloud backups are guarded.** Automatic backup pauses if your data suddenly shrinks a lot, and earlier cloud copies can be kept (see the SQL above).
