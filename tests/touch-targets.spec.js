// On a phone every tappable control should be big enough for a thumb (at least 32px each way).
const { test, expect } = require("./fixtures");

const SMALL = () => {
  const out = [];
  const sel = "button, [role=button], a[href], select, input[type=text], input[type=password], input[type=date], input[type=number], .win-btn, .widget-btn, .ctx-item, .wt-tab, .wt-add, .mode-btn, .stab, .todo-filter, .wap-view-btn, .cmdk-row";
  document.querySelectorAll(sel).forEach((e) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width <= 0 || r.height <= 0 || cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.05) return;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    if (e.closest("#taskbar") && r.height >= 28) return;
    if (r.width < 32 || r.height < 32) out.push((e.id ? "#" + e.id : e.className ? "." + String(e.className).trim().split(/\s+/).join(".") : e.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  });
  return [...new Set(out)];
};

const VIEWS = {
  "main screen with widgets": (page) => page.evaluate(() => { addClockWidget(20, 140); addTileWidget("habits", 20, 480); render(); }),
  "calculator": (page) => page.evaluate(() => AppManager.launch("calculator")),
  "todo": (page) => page.evaluate(() => AppManager.launch("todo")),
  "notes": (page) => page.evaluate(() => AppManager.launch("notes")),
  "clock app": (page) => page.evaluate(() => AppManager.launch("clock")),
  "calendar app": (page) => page.evaluate(() => AppManager.launch("calendar")),
  "link checker": (page) => page.evaluate(() => { for (const l of ["A", "B"]) { const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: l, url: "https://" + l + ".example.com", x: s.x, y: s.y, parentId: null })); } AppManager.launch("linkcheck"); }),
  "settings": (page) => page.evaluate(() => document.getElementById("settingsBtn").click()),
  "web app picker": (page) => page.evaluate(() => openWebAppPicker({})),
  "new webtop gallery": (page) => page.evaluate(() => openWebtopDialog()),
  "add bookmark dialog": (page) => page.evaluate(() => openItemModal({ mode: "create", type: "bookmark" })),
  "command palette": (page) => page.evaluate(() => openCommandPalette()),
};

for (const [name, show] of Object.entries(VIEWS)) {
  test(`touch targets on a phone: ${name}`, async ({ openApp }) => {
    const page = await openApp("phone390");
    await show(page); await page.waitForTimeout(400);
    expect(await page.evaluate(SMALL)).toEqual([]);
  });
}
