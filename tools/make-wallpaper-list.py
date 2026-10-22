#!/usr/bin/env python3
"""Rebuilds wallpapers/wallpapers.json from the pictures in the wallpapers folder.
Run from the project folder after adding or removing pictures:
    python3 tools/make-wallpaper-list.py
Existing names and ids are kept; new pictures get a name made from the file name."""
import json, os, re
folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "wallpapers")
path = os.path.join(folder, "wallpapers.json")
OK = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _.()\-]{0,100}\.(jpe?g|png|webp|avif)$", re.I)
try: old = {e["file"]: e for e in json.load(open(path))["images"]}
except Exception: old = {}
images = []
for f in sorted(os.listdir(folder)):
    if not OK.match(f): continue
    size = os.path.getsize(os.path.join(folder, f))
    if size > 1_500_000: print(f"warning: {f} is {size/1e6:.1f} MB - large pictures load slowly; aim for under 1 MB (about 1920 px wide)")
    e, base = old.get(f, {}), os.path.splitext(f)[0]
    images.append({"file": f, "id": e.get("id") or re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-"),
                   "name": e.get("name") or re.sub(r"[-_]+", " ", base).title()})
json.dump({"images": images}, open(path, "w"), indent=2); open(path, "a").write("\n")
print(f"wallpapers.json updated: {len(images)} pictures")
