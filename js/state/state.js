"use strict";

function seedState(){
  return {
    theme: "verdant",
    wallpaper: "dots",
    searchEngine: "google",
    iconScale: 1,
    builtinAppsSeeded: true,
    defaultThemeMigrated: true,
    verdantDefaultMigrated: true,
    chromeLocked: true,
    showLogo: true,
    showSearchBar: true,
    customLogo: null,
    customWallpaperImage: null,
    wallpaperFit: "fill",
    myWallpapers: [],
    userNote: { text:"", position:"off", updatedAt:0 },
    wallpaperShow: { on:false, minutes:15, source:"all", shuffle:false, last:0 },
    timeFormat: "auto",
    dateFormat: "weekday-short",
    timeZone: null,
    icons: [
      { id: uid(), type:"app", appId:"calculator", label:"Calculator", color: COLORS[5], x:0, y:0, parentId:null },
      { id: uid(), type:"app", appId:"todo", label:"Todo", color: COLORS[2], x:1, y:0, parentId:null },
      { id: uid(), type:"folder", label:"Getting Started", color: COLORS[1], x:2, y:0, parentId:null },
      { id: uid(), type:"webapp", label:"Pencraft Notes", url:"https://pencraft.on369.top", color: COLORS[4], x:3, y:0, parentId:null },
      { id: uid(), type:"webapp", label:"Beartly UI Builder", url:"https://beartly.on369.top", color: COLORS[0], x:0, y:1, parentId:null },
      { id: uid(), type:"folder", label:"Read Later", color: COLORS[3], x:1, y:1, parentId:null }
    ]
  };
}


// In-memory state is the single source of truth for rendering — every
// existing read (childrenOf, glyphFor, render, search, drag/drop, etc.)
// keeps working completely unchanged against this synchronous object.
// Only persistence became async; reads did not.
let state = { theme:"verdant", wallpaper:"dots", searchEngine:"google", iconScale:1, builtinAppsSeeded:false, notesAppSeeded:false, cloudAppSeeded:false, defaultThemeMigrated:false, verdantDefaultMigrated:false, chromeLocked:true, showLogo:true, showSearchBar:true, customLogo:null, customWallpaperImage:null, wallpaperFit:"fill", myWallpapers:[], userNote:{ text:"", position:"off", updatedAt:0 }, wallpaperShow:{ on:false, minutes:15, source:"all", shuffle:false, last:0 }, timeFormat:"auto", dateFormat:"weekday-short", timeZone:null, icons: [] };

let currentFolderId = null; // null = root webtop

let folderStack = []; // ids of ancestor folders visited to reach currentFolderId, for the Back button

let multiSelectMode = false; // when true, tapping/clicking an icon toggles its selection instead of opening/replacing it


// What's currently believed to be persisted, keyed by item id, so save()
// can diff and write only what actually changed instead of the whole
// webtop every time.
let persistedSnapshot = new Map();

function snapshotBody(item){
  const { modifiedAt, ...rest } = item;
  return JSON.stringify(rest);
}

