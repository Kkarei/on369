// Nothing should overflow, get cut off by the screen edge, or overlap, on any screen size, in any of the main views.
const { test, expect, DEVICES, press, audit } = require("./fixtures");

for (const device of Object.keys(DEVICES)) {
  test(`layout is clean on ${device} in every main view`, async ({ openApp }) => {
    const page = await openApp(device, { keepWindows: true });
    const check = async (step) => { await page.waitForTimeout(250); expect.soft(await audit(page), step).toEqual([]); };
    const closeAll = async () => { await page.keyboard.press("Escape"); await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id))); };

    await check("first load (Getting Started open)");
    await closeAll(); await check("main view");

    for (const [name, sel] of [["settings", "#settingsBtn"], ["cloud backup", "#cloudBtn"], ["backup window", "#backupBtn"], ["calendar popup", "#clock"], ["add menu", "#fab"]]) {
      await press(page, page.locator(sel).first());
      await check(name);
      if (name === "settings") {
        const tabs = page.locator("#settingsTabs button");
        for (let i = 0; i < await tabs.count(); i++) { await press(page, tabs.nth(i)); await check(`settings tab ${i}`); }
      }
      await page.keyboard.press("Escape");
      await page.mouse.click(device.startsWith("phone") || device === "tablet" ? 5 : 1270, 400).catch(() => {});
    }
    await closeAll();

    const views = [
      ["calculator", () => AppManager.launch("calculator")], ["todo", () => AppManager.launch("todo")], ["notes", () => AppManager.launch("notes")],
      ["clock app", () => AppManager.launch("clock")], ["calendar app", () => AppManager.launch("calendar")], ["link checker", () => AppManager.launch("linkcheck")],
      ["web app picker", () => openWebAppPicker({})], ["utility apps picker", () => openAppPicker(null)],
      ["add bookmark dialog", () => openItemModal({ mode: "create", type: "bookmark" })], ["new webtop dialog", () => openWebtopDialog()],
      ["command palette", () => openCommandPalette()],
    ];
    for (const [name, fn] of views) {
      await page.evaluate(fn); await check(name);
      await closeAll();
      await page.evaluate(() => document.querySelectorAll("[id$=Overlay].open").forEach((o) => o.classList.remove("open")));
      await page.evaluate(() => { document.querySelectorAll(".cloud-modal-back, .cmdk-overlay").forEach((o) => { if (o.classList.contains("cmdk-overlay")) o.hidden = true; else o.remove(); }); });
    }

    await page.evaluate(() => {   // a folder, and one of each free widget
      const s = nextFreeSlot(null), f = createItem("folder", { label: "F", x: s.x, y: s.y, parentId: null }); state.icons.push(f);
      for (let i = 0; i < 12; i++) { const t = nextFreeSlot(f.id); state.icons.push(createItem("bookmark", { label: "L" + i, url: "https://e.com/" + i, x: t.x, y: t.y, parentId: f.id })); }
      render(); openItem(f);
    });
    await check("an open folder");
    await page.evaluate(() => { currentFolderId = null; folderOverlay.classList.remove("open"); render(); });
    await page.evaluate(() => { addClockWidget(20, 140); addCalendarWidget(300, 140); addWidget(20, 520, []); addTileWidget("habits", 40, 700); render(); });
    await check("free widgets");
    for (const [x, y] of [[device === "desktop1920" ? 1900 : DEVICES[device].width - 8, DEVICES[device].height - 60], [DEVICES[device].width / 2, DEVICES[device].height / 2]]) {
      await page.evaluate(([x, y]) => { closeCtxMenu(); showCanvasContextMenu(x, y, null); }, [x, y]);
      await check(`right-click menu at ${x},${y}`);
      await page.evaluate(() => closeCtxMenu());
    }

    if (DEVICES[device].touch) {   // fingers need room: top bar buttons and the + button
      const small = await page.evaluate(() => [...document.querySelectorAll("#topbar .iconbtn, #fab, #searchGo")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 32 || r.height < 32); }).map((e) => e.id || e.className));
      expect(small, "controls too small to tap").toEqual([]);
    }
  });
}

test("windows stay on screen when the phone is rotated", async ({ openApp }) => {
  const page = await openApp("phone390");
  await page.evaluate(() => ["calculator", "todo", "notes"].forEach((a) => AppManager.launch(a)));
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(600);
  expect(await audit(page), "after rotating to landscape").toEqual([]);
  await page.setViewportSize({ width: 390, height: 780 }); await page.waitForTimeout(600);
  expect(await audit(page), "after rotating back").toEqual([]);
});
