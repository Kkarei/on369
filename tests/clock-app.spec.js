const { test, expect } = require("./fixtures");

async function openClock(page) { await page.evaluate(() => AppManager.launch("clock")); await expect(page.locator(".clockapp")).toBeVisible(); }

test("clock tab, world clocks and persistence", async ({ openApp }) => {
  const page = await openApp("laptop"); await openClock(page);
  expect(await page.locator('[data-pane="clock"] .clk-face > *').count()).toBeGreaterThan(0);
  await page.click("[data-tab=world]");
  await page.fill(".clk-world-input", "tokyo"); await page.click(".clk-world-addbtn");
  await page.click(".clk-chip >> text=+ London");
  await expect(page.locator(".clk-world-row")).toHaveCount(2);
  expect(await page.locator(".clk-world-row b").allTextContents()).toEqual(["Tokyo", "London"]);
  await page.click(".clk-world-row .clk-x"); await expect(page.locator(".clk-world-row")).toHaveCount(1);
  await page.evaluate(() => clkSave()); await page.reload();
  await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); AppManager.launch("clock"); });
  await page.click("[data-tab=world]"); await expect(page.locator(".clk-world-row")).toHaveCount(1);
});

test("stopwatch counts, records laps and resets", async ({ openApp }) => {
  const page = await openApp("laptop"); await openClock(page);
  await page.click("[data-tab=stopwatch]"); await page.click("[data-sw-toggle]"); await page.waitForTimeout(700); await page.click("[data-sw-lap]");
  await expect(page.locator(".clk-laps li")).toHaveCount(1);
  expect(await page.locator("[data-sw-display]").textContent()).not.toBe("00:00.00");
  await page.click("[data-sw-toggle]"); await page.click("[data-sw-reset]");
  await expect(page.locator("[data-sw-display]")).toHaveText("00:00.00");
});

test("timer: presets, custom time, finishing raises an alert, and it finishes even with the window closed", async ({ openApp }) => {
  const page = await openApp("laptop"); await openClock(page);
  await page.click("[data-tab=timer]");
  await page.click("[data-sec='600']"); await expect(page.locator("[data-timer-display]")).toHaveText("10:00");
  await page.fill("[data-th]", "1"); await page.fill("[data-tm]", "2"); await page.fill("[data-ts]", "3"); await page.click("[data-timer-set]");
  await expect(page.locator("[data-timer-display]")).toHaveText("1:02:03");
  await page.evaluate(() => { clkState.timer.total = 2; clkState.timer.left = 2; clkState.timer.endsAt = null; });
  await page.click("[data-timer-toggle]");
  await expect(page.locator("[data-timer-toggle]")).toHaveText("Pause");
  await expect(page.locator(".clk-toast")).toContainText("Timer finished", { timeout: 6000 });
  expect(await page.evaluate(() => clkState.timer.endsAt)).toBeNull();
  // again, with the window closed
  await page.evaluate(() => { document.querySelectorAll(".clk-toast").forEach((t) => t.remove()); clkState.timer.total = 2; clkState.timer.left = 2; });
  await page.click("[data-timer-toggle]");
  await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
  await expect(page.locator(".clk-toast")).toBeVisible({ timeout: 6000 });
});

test("pomodoro moves focus -> break -> focus and takes a long break every fourth round", async ({ openApp }) => {
  const page = await openApp("laptop"); await openClock(page);
  await page.click("[data-tab=pomodoro]");
  await expect(page.locator("[data-pomo-display]")).toHaveText("25:00"); await expect(page.locator("[data-pomo-phase]")).toHaveText("Focus");
  await page.click("[data-pomo-toggle]"); await page.evaluate(() => { clkState.pomo.endsAt = Date.now() + 1500; });
  await expect.poll(() => page.evaluate(() => clkState.pomo.phase), { timeout: 6000 }).toBe("short");
  expect(await page.evaluate(() => clkState.pomo.endsAt)).toBeNull();           // waits for you to press Start
  await page.click("[data-pomo-skip]");
  expect(await page.evaluate(() => [clkState.pomo.phase, clkState.pomo.round])).toEqual(["work", 2]);
  await page.evaluate(() => { clkState.pomo.round = 4; clkState.pomo.phase = "work"; clkState.pomo.endsAt = Date.now() + 800; });
  await expect.poll(() => page.evaluate(() => clkState.pomo.phase), { timeout: 6000 }).toBe("long");
});
