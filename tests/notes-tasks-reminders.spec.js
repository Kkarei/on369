const { test, expect, press } = require("./fixtures");

const when = (minutesFromNow) => { const d = new Date(Date.now() + minutesFromNow * 60000), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

for (const device of ["laptop", "phone390"]) {
  test.describe(device, () => {
    test("notes: Markdown preview, scripts shown as text, pin as a live widget, open from the widget", async ({ openApp }) => {
      const page = await openApp(device);
      await page.evaluate(() => AppManager.launch("notes"));
      await press(page, page.locator(".notes-new"));
      await page.fill(".notes-title", "Plan");
      await page.fill(".notes-text", "# Goals\n\nBe **bold** and `code`\n\n- [ ] one\n- [x] two\n\n<script>alert(1)</script>");
      await page.waitForTimeout(600);
      await press(page, page.locator(".notes-mode"));
      const html = await page.locator(".notes-preview").innerHTML();
      expect(html).toContain("<h1>Goals</h1>"); expect(html).toContain("<strong>bold</strong>"); expect(html).toContain('type="checkbox"');
      expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;");
      await press(page, page.locator(".notes-mode")); await expect(page.locator(".notes-text")).toBeVisible();

      await press(page, page.locator(".notes-pin"));
      await expect(page.locator(".t-pinnote .t-pn-body h1")).toBeVisible();
      await expect(page.locator(".t-pinnote .t-title")).toContainText("Plan");
      await page.fill(".notes-text", "# Goals changed");
      await expect(page.locator(".t-pinnote .t-pn-body")).toContainText("Goals changed");
      await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
      await page.locator(".t-pn-open").dispatchEvent("click");
      await expect(page.locator(".notes-title")).toHaveValue("Plan");
    });

    test("the Tasks widget and the To-do app share one list", async ({ openApp }) => {
      const page = await openApp(device);
      await page.evaluate(() => addTileWidget("tasks", 40, 150));
      await page.locator(".t-tasks .t-input").fill("Buy milk"); await page.locator(".t-tasks .t-input").press("Enter");
      await expect(page.locator(".t-tasks .t-todo")).toContainText("Buy milk");
      await page.evaluate(() => AppManager.launch("todo"));
      await expect(page.locator(".todo-list, .todo-app").first()).toContainText("Buy milk");
      await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
      await page.locator(".t-tasks .t-row input").first().dispatchEvent("click");
      await expect.poll(() => page.evaluate(() => Store.getAppData("todo", "tasks").then((l) => l.find((x) => x.text === "Buy milk").done))).toBe(true);
    });

    test("reminders: an overdue task fires once; finished and future tasks stay quiet", async ({ openApp }) => {
      const page = await openApp(device);
      const due = when(-2);
      await page.evaluate((due) => Store.setAppData("todo", "tasks", [{ id: "r1", text: "Call Sam", done: false, due }, { id: "r2", text: "Finished one", done: true, due }, { id: "r3", text: "Later", done: false, due: "2999-01-01T09:00" }]), due);
      await page.evaluate(() => remCheck());
      await expect(page.locator("#appBanners [data-id=reminder]")).toContainText("Call Sam");
      await page.evaluate(() => { hideAppBanner("reminder"); return remCheck(); });
      await page.waitForTimeout(500);
      await expect(page.locator("#appBanners [data-id=reminder]")).toHaveCount(0);
      expect(await page.evaluate(() => Object.keys(remLoadFired()))).toEqual(["r1"]);
    });

    test("the palette finds tasks and notes, and Enter opens the note", async ({ openApp }) => {
      const page = await openApp(device);
      await page.evaluate(() => Store.setAppData("todo", "tasks", [{ id: "t9", text: "Renew passport", done: false, due: "2999-05-01T09:00" }]));
      await page.evaluate(() => Store.setAppData("notes", "notes", [{ id: "n1", title: "Trip", text: "Pack the umbrella and chargers", updated: Date.now() }]));
      await page.evaluate(() => openCommandPalette()); await page.keyboard.type("passport");
      await expect.poll(() => page.locator(".cmdk-row .cmdk-title").allTextContents()).toContain("Renew passport");
      await page.keyboard.press("Escape");
      await page.evaluate(() => openCommandPalette()); await page.keyboard.type("umbrella");
      await expect.poll(() => page.locator(".cmdk-row .cmdk-title").allTextContents()).toContain("Trip");
      await page.keyboard.press("Enter");
      await expect(page.locator(".notes-title")).toHaveValue("Trip");
    });
  });
}
