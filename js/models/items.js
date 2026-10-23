"use strict";

function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }


/* ---------- ITEM MODEL ----------
   Every webtop object shares one base shape; type-specific subclasses add
   only what's unique to them. Adding a future type (Note, Widget, File)
   means one new small class + one registry entry — nothing else in the
   app needs to change to accommodate it.

   Field note: the base model's "Name" concept is implemented as `label`
   here (matching every existing call site — rename, search, ARIA labels,
   the .icon-label DOM node) rather than renamed to `name`, to avoid a
   pure-cosmetic rename across ~20 locations on top of an already
   substantial storage-layer change. "Icon" isn't a stored field — glyphs
   are derived from type+color+url/appId (see glyphFor) rather than
   uploaded, so there's nothing to persist there yet. */
class WebtopItem{
  constructor(opts){
    opts = opts || {};
    this.id = opts.id || uid();
    this.label = opts.label || "Untitled";
    this.color = opts.color || COLORS[0];
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.parentId = opts.parentId ?? null;
    this.createdAt = opts.createdAt || Date.now();
    this.modifiedAt = opts.modifiedAt || this.createdAt;
    this.metadata = opts.metadata || {};
    this.tags = opts.tags || [];
    this.visible = opts.visible !== false;
  }
}

class BookmarkItem extends WebtopItem{
  constructor(opts){ super(opts); this.type = "bookmark"; this.url = opts.url || ""; }
}

class FolderItem extends WebtopItem{
  constructor(opts){ super(opts); this.type = "folder"; }
}

class AppItem extends WebtopItem{
  constructor(opts){ super(opts); this.type = "app"; this.appId = opts.appId; }
}

// A URL-based "app" — distinct from AppItem (which points at a built-in
// APP_REGISTRY entry like Calculator). This is what "Add web app" creates:
// a site the person points at directly, upgraded with its real manifest
// icon/name/color when that's fetchable. New type, zero changes to any
// existing class — exactly what the base model was built to allow.
class WebAppItem extends WebtopItem{
  constructor(opts){
    super(opts);
    this.type = "webapp";
    this.url = opts.url || "";
    this.manifestIcon = opts.manifestIcon || null;   // resolved absolute URL of the app's real icon, once found
    this.themeColor = opts.themeColor || null;        // from the manifest, if present
  }
}

// A free-floating, named, colored, translucent panel that holds other items
// (children point at it via parentId). Not part of the root icon grid.
class WidgetItem extends WebtopItem{
  constructor(o){
    super(o); this.type = "widget"; o = o || {};
    this.wx = o.wx ?? 40; this.wy = o.wy ?? 140;
    this.pw = o.pw || 340; this.ph = o.ph || 260;
    this.opacity = o.opacity ?? 0.35; this.blur = o.blur !== false; this.collapsed = !!o.collapsed;
    this.kind = o.kind === "clock" || o.kind === "calendar" ? o.kind : "group";   // "group" (a Shelf) holds icons; "clock" and "calendar" show their own content
    this.calStyle = o.calStyle || "month"; this.weekStartMon = !!o.weekStartMon;
    this.clockStyle = o.clockStyle || "poster"; this.accent = o.accent || "";
    this.showSeconds = !!o.showSeconds; this.showDate = o.showDate !== false;
  }
}

const ITEM_CLASSES = { bookmark: BookmarkItem, folder: FolderItem, app: AppItem, webapp: WebAppItem, widget: WidgetItem };

function createItem(type, opts){
  const Ctor = ITEM_CLASSES[type];
  if(!Ctor){ console.warn("on369: unknown item type, skipping:", type); return null; }
  return new Ctor(opts || {});
}

