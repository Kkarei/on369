// Touch should feel like a phone: a swipe scrolls, a tap opens, holding picks an item up, holding longer opens the menu.
const { test, expect, finger, addBookmarks, iconCentre } = require("./fixtures");

// These use real finger timing (hold 0.35s to pick up, 0.6s for the menu), so a very busy computer can occasionally make one slip: allow retries.
test.describe.configure({ retries: 2 });

async function manyIcons(page) {
  await addBookmarks(page, Array.from({ length: 20 }, (_, i) => "B" + i));
  await page.evaluate(() => { window.__opened = []; openItem = function (it) { window.__opened.push(it.label); }; });
}

test("swiping from an icon scrolls the page and opens nothing", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await manyIcons(page);
  const { x, y } = await iconCentre(page, "B0");
  const before = await page.evaluate(() => webtop.scrollTop);
  await f.swipe(x, Math.min(y, 700), -250);
  expect(await page.evaluate(() => webtop.scrollTop)).toBeGreaterThan(before + 50);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
  expect(await page.evaluate(() => selected.size)).toBe(0);
});

test("tapping an icon opens it", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await manyIcons(page);
  const { x, y } = await iconCentre(page, "B0");
  await f.start(x, y); await page.waitForTimeout(60); await f.end(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__opened)).toEqual(["B0"]);
});

test("swiping from a widget scrolls the page and leaves the widget where it is", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await manyIcons(page);
  await page.evaluate(() => { addClockWidget(20, 140); render(); }); await page.waitForTimeout(300);
  const c = await page.evaluate(() => { const r = document.querySelector(".clock-widget").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const before = await page.evaluate(() => webtop.scrollTop);
  await f.swipe(c.x, Math.min(c.y, 600), -300);
  expect(await page.evaluate(() => webtop.scrollTop)).toBeGreaterThan(before + 50);
  expect(await page.evaluate(() => state.icons.filter((i) => i.type === "widget").map((w) => [w.wx, w.wy]))).toEqual([[20, 140]]);
});

test("holding an icon picks it up and drags it without scrolling the page", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await addBookmarks(page, Array.from({ length: 6 }, (_, i) => "B" + i));
  await page.evaluate(() => { window.__opened = []; openItem = function (it) { window.__opened.push(it.label); }; });
  const { x, y } = await iconCentre(page, "B0");
  // An empty cell to drop into (the next free slot), in screen coordinates.
  const target = await page.evaluate(() => {
    const s = nextFreeSlot(null), o = getGridOffset(null), c = getCellSize(), g = gridLayer.getBoundingClientRect();
    return { x: g.left + o.left + (s.x + 0.5) * c.w, y: g.top + o.top + (s.y + 0.5) * c.h, slot: [s.x, s.y] };
  });
  const before = await page.evaluate(() => { const i = state.icons.find((i) => i.label === "B0"); return { pos: [i.x, i.y], scroll: webtop.scrollTop }; });
  await f.start(x, y);
  await expect(page.locator(".icon.lifted")).toHaveCount(1);     // wait for the pick-up (about 350ms) instead of guessing; holding still for 600ms would open the menu instead
  for (let i = 1; i <= 14; i++) { await f.move(x + ((target.x - x) * i) / 14, y + ((target.y - y) * i) / 14); await page.waitForTimeout(20); }
  await f.end();
  await expect.poll(() => page.evaluate(() => { const i = state.icons.find((i) => i.label === "B0"); return [i.x, i.y]; })).toEqual(target.slot);
  expect(await page.evaluate(() => webtop.scrollTop)).toBe(before.scroll);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
});

test("a long hold opens the context menu and opens nothing", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await manyIcons(page);
  const { x, y } = await iconCentre(page, "B1");
  await f.start(x, y); await page.waitForTimeout(800);
  expect(await page.locator(".ctx-menu").count()).toBe(1);
  await f.end(); await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
});

test("the page keeps its scroll position when you tap after scrolling", async ({ openApp }) => {
  const page = await openApp("phone390");
  await addBookmarks(page, Array.from({ length: 12 }, (_, i) => "B" + i));
  await page.evaluate(() => { addClockWidget(20, 140); addCalendarWidget(20, 460); render(); webtop.scrollTop = 600; });
  const before = await page.evaluate(() => webtop.scrollTop);
  expect(before).toBeGreaterThan(100);
  await page.touchscreen.tap(300, 700); await page.waitForTimeout(300);
  expect(await page.evaluate(() => webtop.scrollTop)).toBe(before);
});

test("resizing a widget on a phone changes its height only and keeps it in the column", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await page.evaluate(() => { addClockWidget(20, 140); addCalendarWidget(20, 460); render(); webtop.scrollTop = 0; }); await page.waitForTimeout(300);
  const rect = () => page.evaluate(() => [...document.querySelectorAll(".widget")].map((w) => { const r = w.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + webtop.scrollTop), Math.round(r.width), Math.round(r.height)]; }));
  const before = await rect();
  const grip = await page.evaluate(() => { const w = [...document.querySelectorAll(".widget")].sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))[0]; const r = w.querySelector(".widget-grip").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await f.start(grip.x, grip.y); await page.waitForTimeout(80);
  for (let i = 1; i <= 10; i++) { await f.move(grip.x - i * 3, grip.y + i * 8); await page.waitForTimeout(25); }
  await f.end(); await page.waitForTimeout(400);
  const after = await rect();
  const first = (list) => [...list].sort((a, b) => a[1] - b[1])[0];
  expect(first(after)[2], "width stays full").toBe(first(before)[2]);
  expect(first(after)[3], "height grew").toBeGreaterThan(first(before)[3] + 40);
  expect(first(after)[0], "left edge unchanged").toBe(first(before)[0]);
});

test("with icons hidden, a long press on the background still opens the menu", async ({ openApp }) => {
  const page = await openApp("phone390"); const f = await finger(page);
  await page.evaluate(() => { state.hideIcons = true; applyHideIcons(); });
  await f.start(200, 600); await page.waitForTimeout(800);
  expect(await page.locator(".ctx-menu").count()).toBe(1);
  await f.end();
});
