const { test, expect } = require("./fixtures");

test("a shared link opens the Add bookmark form, filled in, and saving adds it once", async ({ openApp }) => {
  const page = await openApp("phone390", { keepWindows: true, url: "/index.html?title=Hello%20World&text=look%20at%20https%3A%2F%2Fexample.com%2Fpage%3Fa%3D1%20wow" });
  await expect(page.locator("#itemOverlay.open")).toHaveCount(1);
  expect(await page.evaluate(() => [itemLabel.value, itemUrl.value])).toEqual(["Hello World", "https://example.com/page?a=1"]);
  expect(await page.evaluate(() => location.search)).toBe("");                       // cleaned, so a reload doesn't add it again
  expect(await page.evaluate(() => windows.length)).toBe(0);                          // Getting Started doesn't cover it
  const n0 = await page.evaluate(() => state.icons.length);
  await page.click("#itemSave");
  await expect.poll(() => page.evaluate(() => state.icons.length)).toBe(n0 + 1);
  expect(await page.evaluate(() => state.icons.at(-1))).toMatchObject({ label: "Hello World", url: "https://example.com/page?a=1" });
  await page.waitForTimeout(700); await page.reload();
  await page.waitForFunction(() => state.icons.some((i) => i.label === "Hello World"));
  expect(await page.evaluate(() => state.icons.filter((i) => i.label === "Hello World").length)).toBe(1);
});

test("a link alone is enough", async ({ openApp }) => {
  const page = await openApp("phone390", { keepWindows: true, url: "/index.html?url=https%3A%2F%2Fa.example.org%2F" });
  expect(await page.evaluate(() => itemUrl.value)).toBe("https://a.example.org/");
});

test("text with no link is ignored and the normal first-visit window opens", async ({ openApp }) => {
  const page = await openApp("phone390", { keepWindows: true, url: "/index.html?text=just%20some%20words" });
  expect(await page.evaluate(() => itemOverlay.classList.contains("open"))).toBe(false);
  expect(await page.evaluate(() => windows.length)).toBe(1);
});

for (const bad of ["?url=javascript%3Aalert(1)", "?text=javascript%3Aalert(1)", "?url=data%3Atext%2Fhtml%2C%3Cscript%3E"]) {
  test(`an unsafe link is refused: ${bad}`, async ({ openApp }) => {
    const page = await openApp("phone390", { keepWindows: true, url: "/index.html" + bad });
    expect(await page.evaluate(() => itemOverlay.classList.contains("open"))).toBe(false);
  });
}

test("the manifest declares the share target", async ({ request }) => {
  const m = await (await request.get("/manifest.json")).json();
  expect(m.share_target.params.url).toBe("url"); expect(m.display).toBe("standalone");
});
