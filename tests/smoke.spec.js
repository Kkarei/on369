const { test, expect } = require("./fixtures");

test("the app starts with no JavaScript errors and shows its default icons", async ({ openApp }) => {
  const page = await openApp("laptop");
  const labels = await page.locator("#gridLayer > .icon .icon-label").allTextContents();
  expect(labels.map((l) => l.trim())).toEqual(expect.arrayContaining(["Calculator", "Todo", "Getting Started"]));
});
