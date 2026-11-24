const { test, expect, press } = require("./fixtures");

async function makeSecret(page) {
  await page.evaluate(() => {
    const id = addWebtop("Secret", "🔐"); switchWebtop(id);
    const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: "Diary", url: "https://diary.example.com", x: s.x, y: s.y, parentId: null }));
    save(); render(); openItem(state.icons.find((i) => i.label === "Diary"));
  });
  return page.evaluate(() => state.activeWebtop);
}
async function setPin(page, pin) {
  await page.evaluate((id) => { promptSetPin(id); }, await page.evaluate(() => state.activeWebtop));      // not awaited: it resolves when the dialog is answered
  const inputs = page.locator(".pin-dialog input");
  await inputs.nth(0).fill(pin); await inputs.nth(1).fill(pin);
  await press(page, page.locator(".pin-dialog .primary"));
  await expect(page.locator(".wt-tab.active .wt-lock")).toBeVisible({ timeout: 10000 });
}

for (const device of ["laptop", "phone390"]) {
  test.describe(device, () => {
    test("setting a PIN: validates it, shows a lock on the tab, and stores only a hash", async ({ openApp }) => {
      const page = await openApp(device); await makeSecret(page);
      await page.evaluate(() => openWebtopMenu(state.activeWebtop, 300, 80));
      await expect(page.locator(".ctx-item", { hasText: "Set a PIN" })).toBeVisible();
      await page.evaluate(() => [...document.querySelectorAll(".ctx-item")].find((e) => e.textContent.includes("Set a PIN")).click());
      const inputs = page.locator(".pin-dialog input");
      await inputs.nth(0).fill("12"); await inputs.nth(1).fill("12"); await press(page, page.locator(".pin-dialog .primary"));
      await expect(page.locator(".pin-error")).toContainText("4 to 16");
      await inputs.nth(0).fill("1234"); await inputs.nth(1).fill("9999"); await press(page, page.locator(".pin-dialog .primary"));
      await expect(page.locator(".pin-error")).toContainText("don't match");
      await inputs.nth(1).fill("1234"); await press(page, page.locator(".pin-dialog .primary"));
      await expect(page.locator(".wt-tab.active .wt-lock")).toBeVisible({ timeout: 10000 });
      const stored = await page.evaluate(() => JSON.stringify(state.webtops));
      expect(stored).not.toContain("1234"); expect(stored).toContain('"hash"');
    });

    test("lock now, wrong PIN, right PIN", async ({ openApp }) => {
      const page = await openApp(device); const id = await makeSecret(page); await setPin(page, "1234");
      await page.evaluate((id) => { lockWebtopNow(id); }, id);
      await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).not.toBe("Secret");
      await page.evaluate((id) => { switchWebtop(id); }, id);
      await expect(page.locator(".pin-dialog")).toBeVisible();
      expect(await page.evaluate(() => activeWebtopObj().name)).not.toBe("Secret");
      await page.locator(".pin-dialog input").fill("0000"); await press(page, page.locator(".pin-dialog .primary"));
      await expect(page.locator(".pin-error")).toContainText("isn't right");
      await page.locator(".pin-dialog input").fill("1234"); await press(page, page.locator(".pin-dialog .primary"));
      await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).toBe("Secret");
    });

    test("a locked webtop's icons stay out of the palette and the most-used list", async ({ openApp }) => {
      const page = await openApp(device); const id = await makeSecret(page); await setPin(page, "1234");
      await page.evaluate((id) => { lockWebtopNow(id); }, id);
      await expect.poll(() => page.evaluate(() => activeWebtopObj().name)).not.toBe("Secret");
      await page.evaluate(() => openCommandPalette()); await page.keyboard.type("diary");
      await page.waitForTimeout(400);
      expect(await page.locator(".cmdk-row .cmdk-title").allTextContents()).not.toContain("Diary");
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => usageRanked("recent", 20, true).some((r) => r.item.label === "Diary"))).toBe(false);
    });

    test("a new browser session starts behind the lock screen, with a 30-second wait after five wrong tries", async ({ openApp }) => {
      const page = await openApp(device); const id = await makeSecret(page); await setPin(page, "1234");
      await page.evaluate(() => sessionStorage.clear());
      await page.waitForTimeout(900); await page.reload();
      await expect(page.locator("#lockScreen")).toBeVisible();
      const r = await page.locator("#lockScreen").evaluate((e) => { const b = e.getBoundingClientRect(); return b.width >= innerWidth - 1 && b.height >= innerHeight - 1; });
      expect(r, "the lock screen covers everything").toBe(true);
      for (let i = 0; i < 5; i++) { await page.fill("#lockScreen input", "0000"); await page.keyboard.press("Enter"); await page.waitForTimeout(450); }
      await expect(page.locator("#lockScreen .pin-error")).toContainText("30 seconds");
      await page.fill("#lockScreen input", "1234"); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
      await expect(page.locator("#lockScreen"), "even the right PIN waits").toBeVisible();
      await press(page, page.locator("#lockScreen .lock-other").first());
      await expect(page.locator("#lockScreen")).toHaveCount(0);
      expect(await page.evaluate(() => activeWebtopObj().name)).not.toBe("Secret");
    });

    test("removing a PIN needs the current PIN", async ({ openApp }) => {
      const page = await openApp(device); const id = await makeSecret(page); await setPin(page, "1234");
      await page.evaluate((id) => { promptRemovePin(id); }, id);
      await page.locator(".pin-dialog input").fill("0000"); await press(page, page.locator(".pin-dialog .primary"));
      await expect(page.locator(".pin-error")).toContainText("isn't right");
      await page.locator(".pin-dialog input").fill("1234"); await press(page, page.locator(".pin-dialog .primary"));
      await expect.poll(() => page.evaluate((id) => webtopIsLocked(id), id)).toBe(false);
    });
  });
}
