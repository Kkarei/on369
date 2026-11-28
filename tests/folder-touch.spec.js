// A folder opens on tap even when its icon sits outside the folder panel's area (the phone's follow-up "mousedown" must not
// land on the dark backdrop and close it again), and the backdrop still closes the folder when tapped later.
const { test, expect } = require("./fixtures");

const addFolderAt = (page, x, y) => page.evaluate(([x, y]) => {
  state.icons.length = 0;
  const f = createItem("folder", { label: "Docs", color: COLORS[0], x, y, parentId: null });
  state.icons.push(f, createItem("bookmark", { label: "Inside", url: "https://example.com", color: COLORS[1], x: 0, y: 0, parentId: f.id }));
  save(); render();
}, [x, y]);
const isOpen = (page) => page.evaluate(() => folderOverlay.classList.contains("open"));

for (const [name, x, y] of [["top row", 0, 0], ["bottom row", 0, 6]]) {
  test(`a tap opens a folder in the ${name}, outside the panel's area`, async ({ openApp }) => {
    const page = await openApp("phone390");
    await addFolderAt(page, x, y);
    await page.locator("#gridLayer > .icon", { hasText: "Docs" }).tap();
    await page.waitForTimeout(700);
    expect(await isOpen(page)).toBe(true);
  });
}

test("a quick double tap leaves the folder open", async ({ openApp }) => {
  const page = await openApp("phone390");
  await addFolderAt(page, 0, 0);
  const icon = page.locator("#gridLayer > .icon", { hasText: "Docs" });
  await icon.tap(); await page.waitForTimeout(120); await page.touchscreen.tap(58, 171);
  await page.waitForTimeout(700);
  expect(await isOpen(page)).toBe(true);
});

test("tapping the dark backdrop later still closes the folder", async ({ openApp }) => {
  const page = await openApp("phone390");
  await addFolderAt(page, 0, 0);
  await page.locator("#gridLayer > .icon", { hasText: "Docs" }).tap();
  await page.waitForTimeout(800);
  expect(await isOpen(page)).toBe(true);
  await page.touchscreen.tap(58, 60);            // backdrop, above the panel
  await page.waitForTimeout(300);
  expect(await isOpen(page)).toBe(false);
});
