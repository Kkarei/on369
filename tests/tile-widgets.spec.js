// Countdown, habit tracker, headlines and friends, as free-floating widgets. Network feeds are mocked.
const { test, expect } = require("./fixtures");

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title>First story &amp; more</title><link>https://example.com/1</link></item>
<item><title>Second story</title><link>https://example.com/2</link></item>
<item><title>Unsafe</title><link>javascript:alert(1)</link></item>
<item><title>Third</title><link>https://example.com/3</link></item></channel></rss>`;
const iso = (offsetDays) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

async function widgetsPage(openApp, device) {
  const page = await openApp(device);
  const ctx = page.context(), cors = { "access-control-allow-origin": "*" };
  await ctx.route("https://hnrss.org/**", (r) => r.fulfill({ status: 200, contentType: "application/rss+xml", body: RSS, headers: cors }));
  await ctx.route("https://feeds.bbci.co.uk/**", (r) => r.abort());
  await ctx.route("https://api.rss2json.com/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ok","items":[{"title":"Proxy headline","link":"https://example.org/p"}]}', headers: cors }));
  return page;
}

for (const device of ["laptop", "phone390"]) {
  test.describe(device, () => {
    test("countdown shows days to go, today, and days ago", async ({ openApp }) => {
      const page = await widgetsPage(openApp, device);
      await page.evaluate(() => addTileWidget("countdown", 40, 150));
      const set = async (d) => { await page.evaluate((d) => { state.icons.find((i) => i.tileType === "countdown").tileProps.date = d; render(); }, d); };
      await set(iso(10)); await expect(page.locator(".t-cd-big")).toHaveText("10"); await expect(page.locator(".t-cd-sub")).toContainText("days to go");
      await set(iso(0)); await expect(page.locator(".t-cd-big")).toHaveText("Today!");
      await set(iso(-3)); await expect(page.locator(".t-cd-big")).toHaveText("3"); await expect(page.locator(".t-cd-sub")).toContainText("ago");
    });

    test("habit tracker: add, tick days, streaks, remove", async ({ openApp }) => {
      const page = await widgetsPage(openApp, device);
      await page.evaluate(() => addTileWidget("habits", 40, 150));
      await page.locator(".t-habits .t-input").fill("Read"); await page.locator(".t-habits .t-input").press("Enter");
      await expect(page.locator(".t-hb-row .t-hb-dot")).toHaveCount(7);
      await page.locator(".t-hb-dot.today").first().dispatchEvent("click");
      await expect(page.locator(".t-hb-streak")).toContainText("1");
      await page.locator(".t-hb-dot").nth(5).dispatchEvent("click");                          // yesterday
      await expect(page.locator(".t-hb-streak")).toContainText("2");
      await page.locator(".t-hb-dot.today").first().dispatchEvent("click");                   // untick today: streak counts from yesterday
      await expect(page.locator(".t-hb-streak")).toContainText("1");
      await page.locator(".t-hb-row .t-x").dispatchEvent("click");
      await expect(page.locator(".t-hb-row")).toHaveCount(0);
    });

    test("headlines: loads a feed, drops unsafe links, and falls back to a proxy when the feed blocks direct access", async ({ openApp }) => {
      const page = await widgetsPage(openApp, device);
      await page.evaluate(() => addTileWidget("headlines", 40, 150));
      await expect(page.locator(".t-hl")).toHaveCount(3);
      const links = await page.locator(".t-hl").evaluateAll((a) => a.map((x) => [x.textContent, x.getAttribute("href")]));
      expect(links[0][0]).toBe("First story & more");
      expect(links.some(([, h]) => /javascript/.test(h))).toBe(false);
      await page.evaluate(() => { state.icons.find((i) => i.tileType === "headlines").tileProps.feed = "https://feeds.bbci.co.uk/news/rss.xml"; render(); });
      await expect(page.locator(".t-hl").first()).toHaveText("Proxy headline");
    });

    test("every tile widget can be added, edited in settings, removed, and survives a reload", async ({ openApp }) => {
      const page = await widgetsPage(openApp, device);
      await page.evaluate(() => ["todo", "tasks", "note", "countdown", "habits", "headlines"].forEach((t, i) => addTileWidget(t, 40 + i * 20, 150 + i * 20)));
      await expect(page.locator(".tile-widget")).toHaveCount(6);
      await page.evaluate(() => openTileWidgetSettings(state.icons.find((i) => i.tileType === "countdown"), 300, 200));
      await expect(page.locator(".widget-pop input[type=date]")).toBeVisible();
      await page.evaluate(() => [...document.querySelectorAll(".widget-pop .wp-del")].at(-1).click());
      await expect(page.locator(".tile-widget")).toHaveCount(5);
      await page.evaluate(() => { state.icons.find((i) => i.tileType === "habits").tileProps.list.push({ name: "Kept", done: {} }); save(); });
      await page.waitForTimeout(800); await page.reload();
      await expect(page.locator(".tile-widget")).toHaveCount(5);
      expect(await page.evaluate(() => state.icons.some((i) => i.tileType === "habits" && i.tileProps.list.length === 1))).toBe(true);
    });
  });
}

test("the Add widget menu lists the new widgets, and boards can use the new tile types", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => showCanvasContextMenu(500, 400, null));
  await page.evaluate(() => [...document.querySelectorAll(".ctx-item")].find((e) => /Add widget/.test(e.textContent)).click());
  const text = await page.locator("body").innerText();
  for (const n of ["Countdown", "Habits", "Headlines", "To-do list", "Tasks"]) expect(text).toContain(n);
  expect(await page.evaluate(() => Object.keys(TILE_TYPES))).toEqual(expect.arrayContaining(["countdown", "habits", "headlines", "tasks"]));
});

test("clicking inside a widget does not redraw the whole webtop (a tick must register)", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => addTileWidget("tasks", 60, 300));
  await page.locator(".t-tasks .t-input").fill("Buy milk"); await page.locator(".t-tasks .t-input").press("Enter");
  await expect(page.locator(".t-tasks .t-row")).toHaveCount(1);
  await page.locator(".t-tasks .t-row input").dispatchEvent("click");
  await expect.poll(() => page.evaluate(() => Store.getAppData("todo", "tasks").then((l) => l.find((x) => x.text === "Buy milk").done))).toBe(true);
});
