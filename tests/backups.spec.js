// Backups: encrypted files, reminders, and the optional encrypted cloud copy (with a mocked Supabase).
// Key derivation is deliberately slow (to resist guessing), so the encryption tests are tagged @slow.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { test, expect } = require("./fixtures");

const SB = "https://zvtbcyzeiypoelqxfpke.supabase.co";
async function withItems(page) {
  await page.evaluate(() => {
    for (const l of ["Zebra Bank", "Alpha", "Beta", "Gamma", "Delta", "Echo"]) { const s = nextFreeSlot(null); state.icons.push(createItem("bookmark", { label: l, url: "https://" + l.replace(" ", "").toLowerCase() + ".example.com", x: s.x, y: s.y, parentId: null })); }
    save(); render();
  });
}
const message = (page) => page.evaluate(() => document.querySelector(".cloud-msg")?.textContent || "");

test("@slow an encrypted backup file is unreadable, needs its passphrase, and restores everything", async ({ openApp }) => {
  test.setTimeout(150_000);
  const page = await openApp("laptop"); await withItems(page);
  await page.evaluate(() => AppManager.launch("backup"));
  await page.locator(".bk-check input[type=checkbox]").first().check();
  const pass = page.locator(".bk-enc input"), exportBtn = page.getByRole("button", { name: /Export everything \(JSON\)/ });
  await pass.nth(0).fill("short"); await pass.nth(1).fill("short"); await exportBtn.click();
  await expect.poll(() => message(page)).toContain("at least 8");
  await pass.nth(0).fill("correct horse"); await pass.nth(1).fill("something else"); await exportBtn.click();
  await expect.poll(() => message(page)).toContain("don't match");
  await pass.nth(0).fill("correct horse"); await pass.nth(1).fill("correct horse");
  const [download] = await Promise.all([page.waitForEvent("download"), exportBtn.click()]);
  expect(download.suggestedFilename()).toMatch(/\.encrypted\.json$/);
  const file = path.join(os.tmpdir(), "on369-test-backup.encrypted.json"); await download.saveAs(file);
  const text = fs.readFileSync(file, "utf8");
  expect(text).not.toContain("Zebra"); expect(JSON.parse(text)).toMatchObject({ encrypted: true, enc: "aes-gcm-256" });

  // a plain export is still plain
  await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); AppManager.launch("backup"); });
  const [plain] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export everything \(JSON\)/ }).click()]);
  expect(plain.suggestedFilename()).not.toMatch(/encrypted/);
  const plainFile = path.join(os.tmpdir(), "on369-test-backup.json"); await plain.saveAs(plainFile);
  expect(fs.readFileSync(plainFile, "utf8")).toContain("Zebra Bank");

  // restore: delete an item, then import the encrypted file
  await page.evaluate(() => { const i = state.icons.find((x) => x.label === "Zebra Bank"); state.icons.splice(state.icons.indexOf(i), 1); save(); render(); });
  await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); AppManager.launch("backup"); });
  await page.setInputFiles(".backup-app input[type=file]", file);
  await expect(page.locator(".backup-app")).toContainText("is encrypted");
  await page.fill(".backup-app .pass-input", "wrong passphrase"); await page.getByRole("button", { name: "Unlock" }).click();
  await expect.poll(() => message(page), { timeout: 20000 }).toContain("doesn't open");
  await page.fill(".backup-app .pass-input", "correct horse"); await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.locator(".backup-app")).toContainText("Ready to import", { timeout: 20000 });
  await page.locator(".backup-app .bk-check input").uncheck();
  await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: /Replace my webtop with this file/ }).click()]);
  await page.waitForFunction(() => typeof state !== "undefined" && state.icons.length);
  await page.evaluate(() => windows.slice().forEach((w) => closeWindowNow(w.id)));
  expect(await page.evaluate(() => state.icons.some((i) => i.label === "Zebra Bank"))).toBe(true);
});

test("backup reminders: fire after a long gap, can be snoozed or turned off, stay quiet after a fresh backup", async ({ openApp }) => {
  const page = await openApp("laptop"); await withItems(page);
  const old = () => page.evaluate(() => { localStorage.setItem("on369.lastExport", new Date(Date.now() - 40 * 86400000).toISOString()); localStorage.removeItem("on369.backupSnooze"); localStorage.removeItem("on369.backupRemind"); hideAppBanner("backupremind"); brCheck(); });
  const banner = page.locator("#appBanners [data-id=backupremind]");
  await old();
  await expect(banner).toContainText("40 days");
  await page.evaluate(() => [...document.querySelectorAll("#appBanners [data-id=backupremind] button")].find((b) => /week/.test(b.textContent)).click());
  await page.evaluate(() => brCheck()); await expect(banner).toHaveCount(0);                                  // snoozed
  await page.evaluate(() => { localStorage.removeItem("on369.backupSnooze"); localStorage.setItem("on369.lastExport", new Date().toISOString()); brCheck(); });
  await expect(banner).toHaveCount(0);                                                                         // fresh backup
  await old(); await page.evaluate(() => { brSetMode("off"); brCheck(); });
  await expect(banner).toHaveCount(0);                                                                         // turned off
});

test("@slow the cloud copy can be encrypted: the upload is ciphertext, the passphrase is never sent, and a lost passphrase pauses backups", async ({ openApp }) => {
  test.setTimeout(150_000);
  const page = await openApp("laptop"), ctx = page.context(); await withItems(page);
  const server = { data: null };
  await ctx.route(SB + "/**", (route) => {
    const req = route.request(), h = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: h });
    if (req.url().includes("/rest/v1/backups") && req.method() === "GET" && !req.url().includes("history")) return route.fulfill({ status: 200, contentType: "application/json", headers: h, body: JSON.stringify(server.data ? [{ data: server.data, updated_at: "2026-11-22T00:00:00Z" }] : []) });
    if (req.url().includes("/rest/v1/backups") && req.method() === "POST") { server.data = JSON.parse(req.postData()).data; return route.fulfill({ status: 201, headers: h, body: "" }); }
    return route.fulfill({ status: 404, headers: h, body: "{}" });
  });
  await page.evaluate(() => { sess = { email: "me@example.com", user_id: "u1", access_token: "t", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 99999, synced: true, lastSync: null, needsResolve: false }; saveSess(); localStorage.setItem("on369.cloudMode", "manual"); });

  await page.evaluate(() => cloudPush(true));
  await expect.poll(() => JSON.stringify(server.data || {})).toContain("Zebra Bank");                        // no encryption yet: readable
  await page.evaluate(() => { cloudPass = "correct horse"; setCloudEnc(true); });
  await page.evaluate(() => cloudPush(true));
  await expect.poll(() => server.data && server.data.enc, { timeout: 30000 }).toBe("aes-gcm-256");
  const sent = JSON.stringify(server.data);
  expect(sent).not.toContain("Zebra"); expect(sent).not.toContain("correct horse"); expect(server.data.items).toBeUndefined();

  await page.evaluate(() => { windows.slice().forEach((w) => closeWindowNow(w.id)); AppManager.launch("cloud"); });
  await expect(page.locator(".cloud-app")).toContainText("Encrypted with your passphrase");
  await expect(page.locator(".cloud-app")).toContainText("Turn off encryption");
  expect(await page.evaluate((d) => cloudDataOf({ data: d }).then((x) => x.items.length), server.data)).toBeGreaterThan(6);

  // after a reload the passphrase is gone: pushing is refused and a banner asks for it
  await page.evaluate(() => { cloudPass = null; });
  expect(await page.evaluate(() => cloudPush().then(() => "pushed", (e) => e.message))).toContain("passphrase");
  await expect(page.locator("#appBanners [data-id=cloudpass]")).toBeVisible();
  await page.evaluate((d) => { window.__r = null; cloudDataOf({ data: d }).then(() => { window.__r = "ok"; }, (e) => { window.__r = e.message; }); }, server.data);
  await page.fill(".pin-dialog .pass-input", "nope nope nope"); await page.locator(".pin-dialog .primary").click();
  await expect(page.locator(".pin-error")).toContainText("isn't right", { timeout: 20000 });
  await page.fill(".pin-dialog .pass-input", "correct horse"); await page.locator(".pin-dialog .primary").click();
  await expect.poll(() => page.evaluate(() => window.__r), { timeout: 20000 }).toBe("ok");
  expect(await page.evaluate(() => cloudPass)).toBe("correct horse");
});
