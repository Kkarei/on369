// One-tap starter webtops: a board plus a labelled shelf of real catalog apps, neatly spaced.
const { test, expect, press } = require("./fixtures");

const shelfMetrics = (page) => page.evaluate(() => [...document.querySelectorAll("[data-shelf]")].filter((e) => e.querySelector(".icon")).map((b) => {
  const r = b.getBoundingClientRect(), ic = [...b.querySelectorAll(".icon")].map((e) => e.getBoundingClientRect());
  const xs = [...new Set(ic.map((e) => Math.round(e.left)))].sort((a, b) => a - b), ys = [...new Set(ic.map((e) => Math.round(e.top)))].sort((a, b) => a - b);
  const rowCounts = ys.map((y) => ic.filter((e) => Math.round(e.top) === y).length);
  return { n: ic.length, cols: xs.length, rows: ys.length, rowCounts, pitch: xs.length > 1 ? xs[1] - xs[0] : 0, leftGap: Math.round(Math.min(...ic.map((e) => e.left)) - r.left), rightGap: Math.round(r.right - Math.max(...ic.map((e) => e.right))),
    topGap: Math.round(Math.min(...ic.map((e) => e.top)) - r.top), bottomGap: Math.round(r.bottom - Math.max(...ic.map((e) => e.bottom))), overflow: b.scrollHeight - b.clientHeight };
}));

async function makeTemplate(page, name) {
  await press(page, page.locator("#webtopTabs .wt-add"));
  await press(page, page.locator(".wt-template", { has: page.locator(`.wt-tpl-name:text-is('${name}')`) }));
  await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe(name);
  await expect.poll(async () => (await shelfMetrics(page)).length, { timeout: 15000 }).toBe(1);
  await page.waitForTimeout(500);
}

for (const device of ["laptop", "desktop1920", "tablet", "phone390", "phone320"]) {
  for (const name of ["Student", "Developer", "Designer"]) {
    test(`${name} on ${device}: apps sit inside the shelf, centred, evenly spaced, in equal rows`, async ({ openApp }) => {
      const page = await openApp(device);
      await makeTemplate(page, name);
      const [m] = await shelfMetrics(page);
      expect(m.n).toBeGreaterThanOrEqual(8);
      expect(Math.abs(m.leftGap - m.rightGap), "centred left/right").toBeLessThanOrEqual(2);
      expect(Math.abs(m.topGap - m.bottomGap), "centred top/bottom").toBeLessThanOrEqual(2);
      const fullRows = m.rowCounts.slice(0, -1);                                   // every row but the last should hold the same number of icons
      if (fullRows.length) { expect(new Set(fullRows).size, "rows are balanced").toBe(1); expect(m.rowCounts.at(-1)).toBeLessThanOrEqual(fullRows[0]); }
      if (m.rowCounts.length > 1) expect(m.rowCounts.at(-1), "no lonely last icon").toBeGreaterThanOrEqual(2);
      expect(m.pitch, "icons not crowded").toBeGreaterThanOrEqual(80);
      expect(m.pitch, "icons not spread too far").toBeLessThanOrEqual(135);
      expect(m.overflow, "no scrollbar inside the shelf").toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => state.icons.filter((i) => i.type !== "widget" && i.parentId === null && inSpace(i)).length), "nothing loose on the webtop to overlap the board").toBe(0);
    });
  }
}

test.describe("the gallery", () => {
  test("lists the templates with app counts, fits the screen, and one tap creates and opens the webtop", async ({ openApp }) => {
    const page = await openApp("phone390");
    await press(page, page.locator("#webtopTabs .wt-add"));
    const names = await page.locator(".wt-template .wt-tpl-name").allTextContents();
    for (const n of ["Empty", "Student", "Developer", "Designer", "Work", "Writer", "Business", "Gaming", "Media"]) expect(names).toContain(n);
    expect(await page.locator(".wt-tpl-tag").allTextContents()).toContain("8 apps");
    const r = await page.locator(".webtop-dialog").evaluate((e) => { const b = e.getBoundingClientRect(); return [b.top, b.bottom, b.left, b.right, innerHeight, innerWidth]; });
    expect(r[0]).toBeGreaterThanOrEqual(0); expect(r[1]).toBeLessThanOrEqual(r[4] + 1); expect(r[3]).toBeLessThanOrEqual(r[5] + 1);
    const n0 = await page.evaluate(() => state.webtops.length);
    await press(page, page.locator(".wt-template", { has: page.locator(".wt-tpl-name:text-is('Student')") }));
    await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe("Student");
    expect(await page.evaluate(() => state.webtops.length)).toBe(n0 + 1);
    expect(await page.evaluate(() => activeWebtopObj().icon)).toBe("🎓");
    const apps = await page.evaluate(() => { const sh = state.icons.find((i) => i.type === "widget" && i.embedded && i.autoFlow && inSpace(i)); return state.icons.filter((i) => i.parentId === sh.id).map((i) => i.label); });
    expect(apps).toHaveLength(8); expect(apps).toContain("Khan Academy");
  });

  test("a name typed under Empty is kept when you then tap a template", async ({ openApp }) => {
    const page = await openApp("laptop");
    await press(page, page.locator("#webtopTabs .wt-add"));
    await page.locator(".wt-template", { has: page.locator(".wt-tpl-name:text-is('Empty')") }).click();
    await page.fill(".wt-empty-form input", "My Code");
    await page.locator(".wt-template", { has: page.locator(".wt-tpl-name:text-is('Developer')") }).click();
    await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe("My Code");
  });

  test("Add a board > Designer on an existing webtop also fills the shelf, and the palette can make a Writer webtop", async ({ openApp }) => {
    const page = await openApp("laptop");
    await page.evaluate(() => { const id = addWebtop("Blank", "⭐"); switchWebtop(id); });
    await page.evaluate(() => startAddBoard(allBoardPresets().find((p) => p.id === "creative")));
    await expect.poll(() => page.evaluate(() => { const sh = state.icons.find((i) => i.type === "widget" && i.embedded && i.autoFlow && inSpace(i)); return !!sh && state.icons.filter((i) => i.parentId === sh.id).length; })).toBe(8);
    await page.keyboard.press("Control+k"); await page.keyboard.type("new writer");
    await expect(page.locator(".cmdk-row .cmdk-title").first()).toHaveText("New Writer webtop");
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe("Writer");
  });

  test("moving an icon by hand turns auto-arrange off for that shelf", async ({ openApp }) => {
    const page = await openApp("laptop");
    await makeTemplate(page, "Student");
    const bb = await page.locator("[data-shelf] .icon").first().boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + 30); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 260, bb.y + 30, { steps: 10 }); await page.mouse.up();
    await expect.poll(() => page.evaluate(() => state.icons.find((i) => i.type === "widget" && i.embedded && inSpace(i)).autoFlow)).toBe(false);
  });

  test("templates survive a reload", async ({ openApp }) => {
    const page = await openApp("laptop");
    await makeTemplate(page, "Student");
    await page.waitForTimeout(800); await page.reload();
    await page.waitForFunction(() => state.webtops.some((w) => w.name === "Student"));
  });
});
