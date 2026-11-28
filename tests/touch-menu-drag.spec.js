// Holding an item opens its menu (like the Android long-press popup). A small wobble keeps the menu; a real move closes it and drags the item
// and drags the item, and the drop is saved. Moving before the menu appears just drags, with no menu.
const { test, expect, finger, addBookmarks, iconCentre } = require("./fixtures");

const menuOpen = (page) => page.evaluate(() => !!activeCtxMenu || !!document.querySelector(".widget-pop"));
const pos = (page, label) => page.evaluate((l) => { const i = state.icons.find((i) => i.label === l); return [i.x, i.y]; }, label);
const emptyCell = (page) => page.evaluate(() => {
  const s = nextFreeSlot(null), o = getGridOffset(null), c = getCellSize(), g = gridLayer.getBoundingClientRect();
  return { x: g.left + o.left + (s.x + 0.5) * c.w, y: g.top + o.top + (s.y + 0.5) * c.h, slot: [s.x, s.y] };
});
async function setup(openApp) {
  const page = await openApp("phone390"), f = await finger(page);
  await addBookmarks(page, ["B0", "B1", "B2"]);
  await page.evaluate(() => { window.__opened = []; openItem = function (it) { window.__opened.push(it.label); }; });
  return { page, f, c: await iconCentre(page, "B0"), target: null };
}
async function glide(page, f, x0, y0, x1, y1, steps = 14) {
  for (let i = 1; i <= steps; i++) { await f.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps); await page.waitForTimeout(20); }
}

test("holding opens the menu, and lifting the finger leaves it open without moving or opening anything", async ({ openApp }) => {
  const { page, f, c } = await setup(openApp);
  const before = await pos(page, "B0");
  await f.start(c.x, c.y);
  await expect.poll(() => menuOpen(page)).toBe(true);
  await f.end(); await page.waitForTimeout(300);
  expect(await menuOpen(page)).toBe(true);
  expect(await pos(page, "B0")).toEqual(before);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
});

test("a small wobble after the menu opens keeps the menu and does not drag", async ({ openApp }) => {
  const { page, f, c } = await setup(openApp);
  const before = await pos(page, "B0");
  await f.start(c.x, c.y);
  await expect.poll(() => menuOpen(page)).toBe(true);
  await glide(page, f, c.x, c.y, c.x + 7, c.y + 7, 4);     // about 10px diagonally: well under 16px
  await page.waitForTimeout(200);
  expect(await menuOpen(page)).toBe(true);
  await f.end(); await page.waitForTimeout(300);
  expect(await menuOpen(page)).toBe(true);
  expect(await pos(page, "B0")).toEqual(before);
});

test("a real move after the menu opened closes it and drags the icon, and the drop is saved", async ({ openApp }) => {
  const { page, f, c } = await setup(openApp);
  const target = await emptyCell(page);
  await f.start(c.x, c.y);
  await expect.poll(() => menuOpen(page)).toBe(true);
  await glide(page, f, c.x, c.y, target.x, target.y);
  expect(await menuOpen(page)).toBe(false);
  await f.end();
  await expect.poll(() => pos(page, "B0")).toEqual(target.slot);
  expect(await menuOpen(page)).toBe(false);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
});

test("moving before the menu appears just drags, and no menu pops up afterwards", async ({ openApp }) => {
  const { page, f, c } = await setup(openApp);
  const target = await emptyCell(page);
  await f.start(c.x, c.y);
  await expect(page.locator(".icon.lifted")).toHaveCount(1);          // picked up (about 350ms), menu not due until about 600ms
  await glide(page, f, c.x, c.y, target.x, target.y);
  await page.waitForTimeout(800);                                      // longer than the menu delay, still holding
  expect(await menuOpen(page)).toBe(false);
  await f.end();
  await expect.poll(() => pos(page, "B0")).toEqual(target.slot);
});

test("a 5px jitter during the hold does not start a drag, and the menu still opens", async ({ openApp }) => {
  const { page, f, c } = await setup(openApp);
  const before = await pos(page, "B0");
  await f.start(c.x, c.y);
  await expect(page.locator(".icon.lifted")).toHaveCount(1);
  await f.move(c.x + 5, c.y);
  await expect.poll(() => menuOpen(page)).toBe(true);
  await f.end(); await page.waitForTimeout(200);
  expect(await pos(page, "B0")).toEqual(before);
});
