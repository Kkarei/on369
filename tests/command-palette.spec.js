const { test, expect, press } = require("./fixtures");

const titles = (page) => page.locator(".cmdk-row .cmdk-title").allTextContents();
const stubOpen = (page) => page.evaluate(() => { window.__o = []; window.open = (u) => { window.__o.push(u); return null; }; });

test("Ctrl+K opens it with focus in the box; Esc and Ctrl+K close it", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.keyboard.press("Control+k");
  await expect(page.locator(".cmdk-input")).toBeFocused();
  await page.keyboard.press("Escape"); await expect(page.locator(".cmdk-overlay")).toBeHidden();
  await page.keyboard.press("Control+k"); await page.keyboard.press("Control+k"); await expect(page.locator(".cmdk-overlay")).toBeHidden();
});

test("letters typed straight after Ctrl+K are not lost", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.keyboard.press("Control+k"); await page.keyboard.type("new book");
  await expect(page.locator(".cmdk-input")).toHaveValue("new book");
  expect((await titles(page))[0]).toBe("New bookmark");
});

test("search ranks the best match first and Enter runs it", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.keyboard.press("Control+k"); await page.keyboard.type("calc");
  await expect.poll(async () => (await titles(page))[0]).toBe("Calculator");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => windows.some((w) => w.appId === "calculator"))).toBe(true);
  await expect(page.locator(".cmdk-overlay")).toBeHidden();
});

test("actions, arrow keys, themes", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.keyboard.press("Control+k"); await page.keyboard.type("new book"); await page.keyboard.press("Enter");
  await expect(page.locator("#itemOverlay.open")).toHaveCount(1); await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.keyboard.type("new");
  const active = () => page.locator(".cmdk-row.active .cmdk-title").textContent();
  const a0 = await active(); await page.keyboard.press("ArrowDown"); const a1 = await active(); await page.keyboard.press("ArrowUp");
  expect(a1).not.toBe(a0); expect(await active()).toBe(a0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.keyboard.type("theme daylight"); await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => state.theme)).toBe("daylight");
});

test("icons on other webtops are found, and choosing one switches to that webtop", async ({ openApp }) => {
  const page = await openApp("laptop"); await stubOpen(page);
  await page.evaluate(() => { const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: "Zedbook", url: "https://zed.example.com", x: s.x, y: s.y, parentId: null })); const id = addWebtop("Work", "💼"); save(); switchWebtop(id); });
  await page.keyboard.press("Control+k"); await page.keyboard.type("zed");
  await expect.poll(async () => (await titles(page))[0]).toBe("Zedbook");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__o.join(" "))).toContain("https://zed.example.com");
  expect(await page.evaluate(() => activeWebtopObj().name)).not.toBe("Work");
});

test("web search and open-address fallbacks", async ({ openApp }) => {
  const page = await openApp("laptop"); await stubOpen(page);
  await page.keyboard.press("Control+k"); await page.keyboard.type("example.org/x");
  await expect.poll(async () => (await titles(page)).some((t) => t.startsWith("Open example.org"))).toBe(true);
  expect((await titles(page)).some((t) => t.startsWith("Search the web"))).toBe(true);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.keyboard.type("xyzzyqq");
  await expect.poll(() => titles(page)).toEqual(["Search the web for “xyzzyqq”"]);
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__o.at(-1) || "")).toContain("xyzzyqq");
});

test("with nothing typed it lists what you opened recently, first", async ({ openApp }) => {
  const page = await openApp("laptop"); await stubOpen(page);
  await page.evaluate(() => openItem(state.icons.find((i) => i.label === "Todo")));
  await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
  await page.keyboard.press("Control+k");
  await expect(page.locator(".cmdk-group").first()).toHaveText("Recently opened");
});

test("Ctrl+K works even while typing in a form field", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => openItemModal({ mode: "create", type: "bookmark" }));
  await page.keyboard.press("Control+k");
  await expect(page.locator(".cmdk-overlay")).toBeVisible();
});

for (const device of ["phone390", "phone320"]) {
  test(`on a phone it opens from the + menu, fits the screen, and a tap runs a result (${device})`, async ({ openApp }) => {
    const page = await openApp(device);
    await press(page, page.locator("#fab"));
    await page.evaluate(() => [...document.querySelectorAll(".ctx-item")].find((e) => e.textContent.includes("Command palette")).click());
    const r = await page.locator(".cmdk").evaluate((e) => { const b = e.getBoundingClientRect(); return [b.top, b.bottom, b.left, b.right, innerHeight, innerWidth]; });
    expect(r[0]).toBeGreaterThanOrEqual(0); expect(r[1]).toBeLessThanOrEqual(r[4]); expect(r[2]).toBeGreaterThanOrEqual(0); expect(r[3]).toBeLessThanOrEqual(r[5]);
    await page.keyboard.type("todo");
    await page.locator(".cmdk-row").first().tap();
    await expect.poll(() => page.evaluate(() => windows.some((w) => w.appId === "todo"))).toBe(true);
  });
}
