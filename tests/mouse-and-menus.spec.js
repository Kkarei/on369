const { test, expect, iconCentre } = require("./fixtures");

test("mouse: drag moves an icon, a click only selects, a double-click opens", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => { window.__opened = []; openItem = function (it) { window.__opened.push(it.label); }; });
  const start = await iconCentre(page, "Todo"), pos0 = await page.evaluate(() => { const i = state.icons.find((i) => i.label === "Todo"); return [i.x, i.y]; });
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 110, start.y + 120, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => { const i = state.icons.find((i) => i.label === "Todo"); return [i.x, i.y]; })).not.toEqual(pos0);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
  const calc = await iconCentre(page, "Calculator");
  await page.mouse.click(calc.x, calc.y);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
  expect(await page.evaluate(() => selected.size)).toBe(1);
  await page.mouse.dblclick(calc.x, calc.y); await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__opened)).toEqual(["Calculator"]);
});

test("with icons hidden, right-clicking the background brings back the on369 menu", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => { state.hideIcons = true; applyHideIcons(); });
  await page.mouse.click(1000, 600, { button: "right" });
  await expect(page.locator(".ctx-menu")).toHaveCount(1);
});

test("the right-click menu never runs off the screen, even on a short landscape phone", async ({ openApp }) => {
  const page = await openApp("phoneLandscape");
  await page.evaluate(() => showCanvasContextMenu(innerWidth - 8, innerHeight - 20, null));
  const r = await page.evaluate(() => { const b = document.querySelector(".ctx-menu").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, vh: innerHeight, vw: innerWidth }; });
  expect(r.top).toBeGreaterThanOrEqual(0); expect(r.bottom).toBeLessThanOrEqual(r.vh + 1); expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(r.vw + 1);
});

test("Escape closes a dialog even while a text field has focus", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => openItemModal({ mode: "create", type: "bookmark" }));
  await expect(page.locator("#itemLabel")).toBeFocused();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => itemOverlay.classList.contains("open"))).toBe(false);
});

test("'Next background' appears only when the wallpaper changes automatically, and steps through them", async ({ openApp }) => {
  const page = await openApp("laptop");
  const items = async () => { await page.evaluate(() => { closeCtxMenu(); showCanvasContextMenu(900, 500, null); }); return page.locator(".ctx-menu .ctx-item").allTextContents(); };
  expect((await items()).join("|")).not.toContain("Next background");
  await page.evaluate(() => { state.wallpaperShow.on = true; state.wallpaper = "dots"; });
  expect((await items()).join("|")).toContain("Next background");
  const pool = await page.evaluate(() => wallpaperPool().slice(0, 3));
  for (const expected of pool) {
    await items();
    await page.evaluate(() => [...document.querySelectorAll(".ctx-menu .ctx-item")].find((e) => e.textContent.includes("Next background")).click());
    await expect.poll(() => page.evaluate(() => state.wallpaper)).toBe(expected);     // waits as long as it needs, no fixed delay
  }
  await page.evaluate(() => { state.wallpaper = "video"; });
  expect((await items()).join("|")).not.toContain("Next background");
});
