// The everyday things: add, open, delete and undo, search, themes, icon size, webtops, folders, and saving across a reload.
const { test, expect, DEVICES, press, iconCentre } = require("./fixtures");

const stubOpen = (page) => page.addInitScript(() => { window.__opens = []; window.open = (u) => { window.__opens.push(u); return null; }; });

for (const device of ["laptop", "phone390", "tablet"]) {
  test.describe(device, () => {
    test("add a bookmark from the + menu, open it, delete it, and bring it back with Undo", async ({ openApp }) => {
      const page = await openApp(device); await stubOpen(page); await page.reload(); await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
      const n0 = await page.evaluate(() => state.icons.length);
      await press(page, page.locator("#fab")); await page.locator(".ctx-menu .ctx-item", { hasText: "ookmark" }).first().click();
      await expect(page.locator("#itemOverlay.open")).toHaveCount(1);
      await page.fill("#itemLabel", "Example"); await page.fill("#itemUrl", "example.com");
      await press(page, page.locator("#itemSave"));
      await expect.poll(() => page.evaluate(() => state.icons.length)).toBe(n0 + 1);
      expect(await page.evaluate(() => state.icons.at(-1).url)).toMatch(/^https?:\/\//);

      const el = page.locator("#gridLayer .icon", { hasText: "Example" }).first();
      if (page.isTouch) await el.tap(); else await el.dblclick();
      await expect.poll(() => page.evaluate(() => window.__opens.length)).toBeGreaterThan(0);

      await page.evaluate(() => { const it = state.icons.at(-1), e = document.querySelector(`.icon[data-id='${it.id}']`), r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 })); });
      const menu = await page.locator(".ctx-menu .ctx-item").allTextContents();
      expect(menu.length).toBeGreaterThanOrEqual(4);
      await page.evaluate(() => [...document.querySelectorAll(".ctx-menu .ctx-item")].find((e) => e.textContent.startsWith("Delete")).click());
      if (await page.evaluate(() => deleteConfirmOverlay.classList.contains("open"))) await press(page, page.locator("#deleteConfirmConfirm"));
      await expect.poll(() => page.evaluate(() => state.icons.length)).toBe(n0);
      await page.keyboard.press("Control+z");
      await expect.poll(() => page.evaluate(() => state.icons.length)).toBe(n0 + 1);
    });

    test("search: Web mode opens the engine, App mode finds an icon", async ({ openApp }) => {
      const page = await openApp(device); await stubOpen(page); await page.reload(); await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
      await page.evaluate(() => [...document.querySelectorAll("#searchMode button, #searchMode [data-mode]")].find((b) => /web/i.test(b.textContent)).click());
      await page.fill("#searchInput", "hello world"); await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => window.__opens[0] || "")).toContain("hello%20world");
      await page.evaluate(() => [...document.querySelectorAll("#searchMode button, #searchMode [data-mode]")].find((b) => /app/i.test(b.textContent)).click());
      await page.fill("#searchInput", "calc");
      await expect.poll(() => page.evaluate(() => document.body.innerText.toLowerCase().includes("calculator"))).toBe(true);
    });

    test("webtops: create an empty one through the dialog, switch, delete", async ({ openApp }) => {
      const page = await openApp(device);
      const tabs0 = await page.locator("#webtopTabs .wt-tab").count();
      await press(page, page.locator("#webtopTabs .wt-add"));
      const box = page.locator(".webtop-dialog");
      const r = await box.evaluate((e) => { const b = e.getBoundingClientRect(); return [b.top, b.bottom, b.left, b.right, innerHeight, innerWidth]; });
      expect(r[0]).toBeGreaterThanOrEqual(0); expect(r[1]).toBeLessThanOrEqual(r[4] + 1); expect(r[2]).toBeGreaterThanOrEqual(0); expect(r[3]).toBeLessThanOrEqual(r[5] + 1);
      await press(page, page.locator(".wt-template", { has: page.locator(".wt-tpl-name:text-is('Empty')") }));
      await page.fill(".wt-empty-form input", "Work"); await press(page, page.locator(".wt-empty-form .primary"));
      await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe("Work");
      expect(await page.locator("#webtopTabs .wt-tab").count()).toBe(tabs0 + 1);
      expect(await page.evaluate(() => childrenOf(null).length)).toBe(0);
      await page.evaluate(() => { deleteWebtop(state.activeWebtop); });
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Delete webtop")?.click());
      await expect.poll(() => page.locator("#webtopTabs .wt-tab").count()).toBe(tabs0);
    });

    test("settings: every theme applies and the icon size buttons work", async ({ openApp }) => {
      const page = await openApp(device);
      await press(page, page.locator("#settingsBtn"));
      const themes = await page.evaluate(() => [...document.querySelectorAll("#themeGrid [data-theme]")].map((e) => e.dataset.theme));
      expect(themes.length).toBeGreaterThan(3);
      for (const t of themes) {
        await page.evaluate((t) => document.querySelector(`#themeGrid [data-theme="${t}"]`).click(), t);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(t);
      }
      const before = await page.evaluate(() => state.iconScale);
      await page.evaluate(() => iconSizeUp.click()); await page.evaluate(() => iconSizeUp.click());
      expect(await page.evaluate(() => state.iconScale)).toBeGreaterThan(before);
      for (let i = 0; i < 8; i++) await page.evaluate(() => iconSizeDown.click());
      expect(await page.evaluate(() => state.iconScale)).toBeLessThan(before);
    });

    test("what you create is still there after a reload", async ({ openApp }) => {
      const page = await openApp(device);
      await page.evaluate(() => { const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: "Keep me", url: "https://keep.example.com", x: s.x, y: s.y, parentId: null })); save(); });
      await page.waitForTimeout(800); await page.reload();
      await page.waitForFunction(() => state.icons.some((i) => i.label === "Keep me"));
    });
  });
}

test("dragging an icon onto a folder puts it inside (mouse)", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => { const s = nextFreeSlot(null); state.icons.push(createItem("folder", { label: "Fold", x: s.x, y: s.y, parentId: null })); render(); });
  const a = await iconCentre(page, "Todo"), f = await iconCentre(page, "Fold");
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(f.x, f.y, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => { const fo = state.icons.find((i) => i.label === "Fold"), t = state.icons.find((i) => i.label === "Todo"); return t.parentId === fo.id; })).toBe(true);
});
