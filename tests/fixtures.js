// Shared test setup: opens on369 in a fresh browser profile on a chosen "device", fails the test on any uncaught
// JavaScript error, and keeps the network offline except for your own files (so tests are repeatable).
const base = require("@playwright/test");
const { expect } = base;

// Screen sizes the app is designed for. `touch: true` behaves like a phone/tablet (finger, no mouse).
const DEVICES = {
  phone320:       { width: 320,  height: 568,  touch: true },
  phone390:       { width: 390,  height: 780,  touch: true },
  phoneLandscape: { width: 844,  height: 390,  touch: true },
  tablet:         { width: 768,  height: 1024, touch: true },
  laptop:         { width: 1280, height: 800 },
  desktop1920:    { width: 1920, height: 1080 },
};

const test = base.test.extend({
  /**
   * const page = await openApp("phone390");
   * Options: { keepWindows: true } keeps the Getting Started window that opens on a first visit;
   *          { url: "/?x=y" } opens a different address; { context: {...} } extra browser-context options.
   */
  openApp: async ({ browser }, use) => {
    const contexts = [];
    const errors = [];
    const open = async (device = "laptop", opts = {}) => {
      const d = typeof device === "string" ? DEVICES[device] : device;
      if (!d) throw new Error("Unknown device: " + device);
      const context = await browser.newContext({
        baseURL: "http://localhost:4173",
        viewport: { width: d.width, height: d.height },
        hasTouch: !!d.touch, isMobile: !!d.touch, deviceScaleFactor: d.touch ? 2 : 1,
        acceptDownloads: true,
        ...(opts.context || {}),
      });
      contexts.push(context);
      // Only your own files may load; anything else (favicons, feeds, APIs) is blocked unless a test mocks it.
      await context.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort("failed"));
      const page = await context.newPage();
      page.isTouch = !!d.touch;
      page.device = d;
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push("console.error: " + m.text()); });
      await page.goto(opts.url || "/index.html");
      await page.waitForFunction(() => typeof state !== "undefined" && state.icons && document.querySelector("#gridLayer .icon, #gridLayer .widget, #webtop .board-widget, #lockScreen"));
      if (!opts.keepWindows) await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); });
      return page;
    };
    await use(open);
    for (const c of contexts) await c.close().catch(() => {});
    expect(errors, "the app threw JavaScript errors").toEqual([]);
  },
});

// Click with a mouse, or tap with a finger on touch devices.
const press = (page, locator) => (page.isTouch ? locator.tap() : locator.click());

// Real finger input (Chrome DevTools protocol), so scrolling and long-presses behave like on a phone.
async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x = 0, y = 0) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  return {
    start: (x, y) => send("touchStart", x, y),
    move: (x, y) => send("touchMove", x, y),
    end: () => send("touchEnd"),
    async swipe(x, y, dy, steps = 12) {
      await send("touchStart", x, y);
      for (let i = 1; i <= steps; i++) { await send("touchMove", x, y + (dy * i) / steps); await page.waitForTimeout(16); }
      await send("touchEnd");
      await page.waitForTimeout(350);
    },
  };
}

// Adds plain bookmarks to the current webtop. labels: ["A", "B"] or [["A", "https://a.example.com"], ...]
const addBookmarks = (page, labels) => page.evaluate((list) => {
  list.forEach((entry) => {
    const [label, url] = Array.isArray(entry) ? entry : [entry, "https://" + String(entry).replace(/\W+/g, "").toLowerCase() + ".example.com"];
    const s = nextFreeSlot(null);
    state.icons.push(createItem("bookmark", { label, url, x: s.x, y: s.y, parentId: null }));
  });
  save(); render();
}, labels);

// Centre of an icon on the current webtop, by (part of) its label.
const iconCentre = (page, label, scope = "#gridLayer > .icon") => page.evaluate(({ label, scope }) => {
  const el = [...document.querySelectorAll(scope)].find((e) => e.textContent.includes(label));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, { label, scope });

// What a person would see wrong with the layout right now (empty list = fine).
const AUDIT = () => {
  const vw = innerWidth, vh = innerHeight, out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push("page scrolls sideways (" + document.documentElement.scrollWidth + " > " + vw + ")");
  const visible = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.05; };
  document.querySelectorAll("body *").forEach((e) => {
    if (getComputedStyle(e).position !== "fixed" || !visible(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width >= vw - 1 && r.height >= vh - 1) return;                       // full-screen backdrops are fine
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.push("cut off by the screen edge: " + (e.id || e.className || e.tagName));
  });
  const bar = [...document.querySelectorAll("#topbar .brand, #topbar #webtopTabs, #topbar #userNoteTop, #topbar #clock, #topbar .iconbtn")].filter(visible);
  for (let i = 0; i < bar.length; i++) for (let j = i + 1; j < bar.length; j++) {
    const a = bar[i].getBoundingClientRect(), b = bar[j].getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push("top bar overlap: " + (bar[i].id || bar[i].className) + " / " + (bar[j].id || bar[j].className));
  }
  return out;
};
const audit = (page) => page.evaluate(AUDIT);

module.exports = { test, expect, DEVICES, press, finger, addBookmarks, iconCentre, audit };
