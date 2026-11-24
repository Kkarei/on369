const { test, expect, addBookmarks } = require("./fixtures");

for (const device of ["laptop", "phone390"]) {
  test(`"Most used" shelf ranks by use, can switch to recent, limits its count and ignores nothing else (${device})`, async ({ openApp }) => {
    const page = await openApp(device);
    await page.evaluate(() => { window.__o = []; window.open = (u) => { window.__o.push(u); return null; }; });
    await addBookmarks(page, [["Alpha", "https://a.com"], ["Beta", "https://b.com"], ["Gamma", "https://g.com"]]);
    await page.evaluate(() => { addRecentsWidget(40, 330); render(); });
    await expect(page.locator(".recents-widget .rw-empty")).toBeVisible();
    await page.evaluate(() => { const f = (l) => state.icons.find((i) => i.label === l); ["Alpha", "Alpha", "Alpha", "Beta", "Gamma", "Gamma"].forEach((l) => openItem(f(l))); });
    const labels = () => page.locator(".recents-widget .rw-item .rw-label").allTextContents();
    await expect.poll(labels).toEqual(["Alpha", "Gamma", "Beta"]);
    await page.evaluate(() => { state.icons.find((i) => i.kind === "recents").recentsMode = "recent"; render(); });
    await expect.poll(labels).toEqual(["Gamma", "Beta", "Alpha"]);
    await page.evaluate(() => { state.icons.find((i) => i.kind === "recents").recentsCount = 2; render(); });
    await expect(page.locator(".recents-widget .rw-item")).toHaveCount(2);
    await page.locator(".recents-widget .rw-item").first().dispatchEvent("click");
    await expect.poll(() => page.evaluate(() => window.__o.length)).toBeGreaterThan(0);
    await page.evaluate(() => openRecentsSettings(state.icons.find((i) => i.kind === "recents"), 300, 200));
    await expect(page.locator(".widget-pop .rw-mode")).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(state.icons).includes('"n":')), "usage history stays out of your saved webtop").toBe(false);
    await page.waitForTimeout(700); await page.reload();
    await expect(page.locator(".recents-widget .rw-item").first()).toBeVisible();
  });
}

test("the Add widget menu offers Most used", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => { showCanvasContextMenu(500, 500, null); });
  await page.evaluate(() => [...document.querySelectorAll(".ctx-item")].find((e) => /Add widget/.test(e.textContent)).click());
  await expect(page.locator("body")).toContainText("Most used");
});
