const { test, expect, press } = require("./fixtures");

for (const device of ["laptop", "phone390"]) {
  test(`link checker flags dead and silent sites, deletes with confirmation, and Undo restores (${device})`, async ({ openApp }) => {
    test.setTimeout(90_000);
    const page = await openApp(device), ctx = page.context();
    await ctx.route("https://good.example.com/**", (r) => r.fulfill({ status: 200, body: "hi", headers: { "access-control-allow-origin": "*" } }));
    await ctx.route("https://dead.example.com/**", (r) => r.abort("failed"));
    await ctx.route("https://dead2.example.com/**", (r) => r.abort("failed"));
    await ctx.route("https://hang.example.com/**", () => {});                      // never answers
    await page.evaluate(() => {
      for (const [l, u] of [["Good", "https://good.example.com/"], ["Dead", "https://dead.example.com/"], ["Dead2", "https://dead2.example.com/"], ["Hang", "https://hang.example.com/"]]) {
        const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: l, url: u, x: s.x, y: s.y, parentId: null }));
      }
      save(); render(); AppManager.launch("linkcheck");
    });
    await expect(page.locator(".lc-app")).toContainText("Check 4 links");
    await expect(page.locator(".lc-app")).toContainText("can't see a page");                 // it is upfront about its limits
    await press(page, page.locator(".lc-bar .primary"));
    await expect(page.locator(".lc-bar .primary")).toHaveText("Check again", { timeout: 25000 });      // finished: the silent site needs its full 8 seconds
    await expect(page.locator(".lc-chips")).toContainText("Not reachable 2");
    const statuses = await page.locator(".lc-row").evaluateAll((rows) => Object.fromEntries(rows.map((r) => [r.querySelector("b").textContent, r.className.replace("lc-row lc-", "")])));
    expect(statuses).toMatchObject({ Good: "ok", Dead: "down", Dead2: "down", Hang: "slow" });

    await press(page, page.locator(".lc-chips .clk-chip", { hasText: "Not reachable" }));
    await expect(page.locator(".lc-row")).toHaveCount(2);
    const n0 = await page.evaluate(() => state.icons.filter((i) => i.type === "bookmark").length);
    await press(page, page.locator(".lc-app button.danger"));
    await expect.poll(() => page.evaluate(() => deleteConfirmOverlay.classList.contains("open"))).toBe(true);
    expect(await page.evaluate(() => state.icons.filter((i) => i.type === "bookmark").length), "nothing deleted before you confirm").toBe(n0);
    await page.evaluate(() => document.getElementById("deleteConfirmConfirm").click());
    await expect.poll(() => page.evaluate(() => state.icons.filter((i) => i.type === "bookmark").length)).toBe(n0 - 2);
    await expect(page.locator(".lc-row b", { hasText: /^Dead/ })).toHaveCount(0);        // the list updates itself
    await page.keyboard.press("Control+z");
    await expect.poll(() => page.evaluate(() => state.icons.some((i) => i.label === "Dead"))).toBe(true);
  });
}

test("the palette offers the link checker", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.keyboard.press("Control+k"); await page.keyboard.type("dead links");
  await expect.poll(() => page.locator(".cmdk-row .cmdk-title").allTextContents()).toContain("Check my links for dead ones");
});
