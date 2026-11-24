// On a phone, icons grow with the screen like a home screen, and fill each row evenly.
const { test, expect, addBookmarks } = require("./fixtures");

const metrics = (page) => page.evaluate(() => {
  const ic = [...document.querySelectorAll("#gridLayer > .icon")], g = ic.map((e) => e.querySelector(".icon-glyph").getBoundingClientRect()), r = ic.map((e) => e.getBoundingClientRect());
  return { icon: Math.round(g[0].width), cols: new Set(r.map((e) => Math.round(e.left))).size, rightmost: Math.round(Math.max(...r.map((e) => e.right))), leftmost: Math.round(Math.min(...r.map((e) => e.left))), vw: innerWidth,
    labelOverflow: ic.some((e) => { const l = e.querySelector(".icon-label"); return l.scrollWidth > l.clientWidth + 1; }), hscroll: document.documentElement.scrollWidth > innerWidth + 1 || webtop.scrollWidth > webtop.clientWidth + 1 };
});

for (const [w, h, icon, cols] of [[320, 568, 49, 4], [360, 740, 55, 4], [390, 780, 60, 4], [430, 900, 67, 4], [600, 900, 76, 5]]) {
  test(`icons at ${w}px wide: about ${icon}px, ${cols} across, filling the row`, async ({ openApp }) => {
    const page = await openApp({ width: w, height: h, touch: true });
    await addBookmarks(page, Array.from({ length: 10 }, (_, i) => "Long bookmark name " + i));
    const m = await metrics(page);
    expect(Math.abs(m.icon - icon)).toBeLessThanOrEqual(2);
    expect(m.cols).toBe(cols);
    expect(m.leftmost).toBe(12);
    expect(m.vw - m.rightmost).toBeLessThanOrEqual(24);       // the row reaches (almost) the right margin
    expect(m.labelOverflow).toBe(false); expect(m.hscroll).toBe(false);
  });
}

test("on desktop the icons keep the normal size", async ({ openApp }) => {
  const page = await openApp("laptop");
  expect((await metrics(page)).icon).toBe(56);
});

test("the Larger icons setting never makes a phone grid run off the screen", async ({ openApp }) => {
  const page = await openApp("phone390");
  await addBookmarks(page, Array.from({ length: 10 }, (_, i) => "B" + i));
  for (const scale of [0.7, 1.6]) {
    await page.evaluate((s) => setIconScale(s), scale); await page.waitForTimeout(200);
    const m = await metrics(page);
    expect(m.hscroll, "scale " + scale).toBe(false); expect(m.rightmost).toBeLessThanOrEqual(m.vw);
  }
});

test("an open folder keeps all its icons inside the panel on a phone", async ({ openApp }) => {
  const page = await openApp("phone390");
  await page.evaluate(() => {
    const s = nextFreeSlot(null), f = createItem("folder", { label: "F", x: s.x, y: s.y, parentId: null }); state.icons.push(f);
    for (let i = 0; i < 14; i++) { const t = nextFreeSlot(f.id); state.icons.push(createItem("bookmark", { label: "L" + i, url: "https://e.com/" + i, x: t.x, y: t.y, parentId: f.id })); }
    render(); openItem(f);
  });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const fb = document.getElementById("folderBody"), fr = fb.getBoundingClientRect(), ic = [...fb.querySelectorAll(".icon")].map((e) => e.getBoundingClientRect()); return { right: Math.max(...ic.map((x) => x.right)), panelRight: fr.right, hscroll: fb.scrollWidth > fb.clientWidth + 1 }; });
  expect(r.right).toBeLessThanOrEqual(r.panelRight + 1); expect(r.hscroll).toBe(false);
});
