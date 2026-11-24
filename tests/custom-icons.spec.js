const path = require("path");
const { test, expect, press } = require("./fixtures");
const fs = require("fs");
const os = require("os");

// A small test picture, written on the fly so no binary file is needed in the repository.
function makePng() {
  const file = path.join(os.tmpdir(), "on369-test-icon.png");
  // 1x1 red PNG
  fs.writeFileSync(file, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  return file;
}

for (const device of ["laptop", "phone320"]) {
  test(`custom icons: emoji, picture, back to automatic, kept after reload (${device})`, async ({ openApp }) => {
    const page = await openApp(device);
    await page.evaluate(() => openItemModal({ mode: "create", type: "bookmark" }));
    const box = await page.locator("#itemOverlay .modal").evaluate((e) => { const b = e.getBoundingClientRect(); return [b.top, b.bottom, b.left, b.right, innerHeight, innerWidth]; });
    expect(box[0]).toBeGreaterThanOrEqual(0); expect(box[1]).toBeLessThanOrEqual(box[4] + 1); expect(box[3]).toBeLessThanOrEqual(box[5] + 1);

    await page.fill("#itemLabel", "Rocket"); await page.fill("#itemUrl", "example.com/rocket");
    await press(page, page.locator("#iconKindSeg [data-kind=emoji]")); await page.fill("#iconEmojiInput", "🚀");
    await expect(page.locator("#iconPreview")).toHaveText("🚀");
    await press(page, page.locator("#itemSave"));
    await expect.poll(() => page.evaluate(() => state.icons.find((i) => i.label === "Rocket").metadata.customIcon)).toEqual({ kind: "emoji", value: "🚀" });
    await expect(page.locator("#gridLayer .icon", { hasText: "Rocket" }).locator(".emoji-glyph")).toHaveText("🚀");

    await page.evaluate(() => openItemModal({ mode: "edit", item: state.icons.find((i) => i.label === "Rocket") }));
    await expect(page.locator("#iconKindSeg .active")).toHaveAttribute("data-kind", "emoji");
    await press(page, page.locator("#iconKindSeg [data-kind=image]"));
    await page.setInputFiles("#iconFile", makePng());
    await expect.poll(() => page.evaluate(() => modalIcon && modalIcon.value.startsWith("data:image/") && modalIcon.value.length < 130000)).toBe(true);
    await press(page, page.locator("#itemSave"));
    await expect(page.locator("#gridLayer .icon", { hasText: "Rocket" }).locator("img.custom-img")).toHaveCount(1);

    await page.waitForTimeout(700); await page.reload();
    await expect(page.locator("#gridLayer .icon", { hasText: "Rocket" }).locator("img.custom-img")).toHaveCount(1);

    await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); openItemModal({ mode: "edit", item: state.icons.find((i) => i.label === "Rocket") }); });
    await press(page, page.locator("#iconKindSeg [data-kind=auto]")); await press(page, page.locator("#itemSave"));
    await expect.poll(() => page.evaluate(() => state.icons.find((i) => i.label === "Rocket").metadata.customIcon)).toBeUndefined();
    await expect(page.locator("#gridLayer .icon", { hasText: "Rocket" }).locator(".custom-img, .emoji-glyph")).toHaveCount(0);
  });
}

test("a folder with a custom icon still shows its item count", async ({ openApp }) => {
  const page = await openApp("laptop");
  await page.evaluate(() => {
    const s = nextFreeSlot(null), f = createItem("folder", { label: "Fx", x: s.x, y: s.y, parentId: null, metadata: { customIcon: { kind: "emoji", value: "📁" } } }); state.icons.push(f);
    const t = nextFreeSlot(f.id); state.icons.push(createItem("bookmark", { label: "in", url: "https://e.com", x: t.x, y: t.y, parentId: f.id })); render();
  });
  await expect(page.locator("#gridLayer .icon", { hasText: "Fx" }).locator(".count-badge")).toHaveText("1");
});
