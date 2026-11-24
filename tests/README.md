# on369 automated tests

These tests open on369 in a real (headless) Chromium browser and use it the way a person would:
tap, click, swipe, type, resize the screen. Each test ends with a pass or a fail. If a new change
quietly breaks something that used to work, a test fails and tells you which one.

## One-time setup

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npx playwright install chromium
```

## Running them

```bash
npm test               # everything (about 5 minutes the first time)
npm run test:fast      # skips the slow encryption tests (about 3 minutes)
npx playwright test tests/templates.spec.js     # one file
npx playwright test -g "private"                # tests whose name contains "private"
npm run test:ui        # a window where you can watch tests run and step through them
npm run test:report    # opens the last HTML report (screenshots and traces of failures)
```

The tests start their own small web server (`tests/serve.js`) for the project folder, so there is nothing
else to run. They never touch the internet: anything that is not your own file is blocked, and the few
tests that need a server (news feeds, cloud backup, link checking) use pretend ones.

## On GitHub

`.github/workflows/tests.yml` runs the whole suite on every push and pull request. Open the **Actions**
tab to see the results. When a run fails, download the `playwright-report` artifact: it has screenshots and
a recording of each failing step.

## What is covered

| File | What it checks |
|---|---|
| `layout.spec.js` | On 6 screen sizes (small phone to big desktop), in every main view: no sideways scrolling, nothing cut off by the screen edge, no top-bar overlap; windows stay on screen after rotating |
| `touch.spec.js` | Swipe scrolls, tap opens, hold-and-drag moves, long-press opens the menu, widget resizing on a phone, scroll position kept |
| `touch-targets.spec.js` | Every tappable control on a phone is big enough for a thumb |
| `mouse-and-menus.spec.js` | Mouse drag/click/double-click, right-click menu (also with icons hidden), Esc closes dialogs, Next background |
| `core-flows.spec.js` | Add/open/delete/undo, search, webtops, themes, icon size, folders, saving across reloads (laptop, phone, tablet) |
| `phone-icons.spec.js` | Icons scale with the phone screen and fill each row; folders fit |
| `templates.spec.js` | Starter webtops: apps inside the shelf, centred, evenly spaced, equal rows; the gallery; palette and board entries |
| `command-palette.spec.js` | Ctrl+K, search ranking, other webtops, web search, phone use |
| `tile-widgets.spec.js` | Countdown, habits, headlines (with a pretend feed), tasks, settings, reload |
| `recents-widget.spec.js` | The "Most used" shelf |
| `notes-tasks-reminders.spec.js` | Markdown notes, pinned notes, shared tasks, reminders, palette search of notes and tasks |
| `clock-app.spec.js` | World clocks, stopwatch, timer (including with the window closed), Pomodoro |
| `custom-icons.spec.js` | Emoji and picture icons |
| `share-target.spec.js` | Shared links: accepted, filled in, unsafe ones refused |
| `private-webtops.spec.js` | PIN set/change/remove, lock screen, wrong-try limit, nothing leaks into search |
| `link-checker.spec.js` | Finds dead and silent sites, deletes with confirmation, Undo |
| `backups.spec.js` | Encrypted backup files, reminders, the encrypted cloud copy (pretend Supabase). The encryption ones are tagged `@slow` |

## Adding a test

Copy a small existing test, for example in `core-flows.spec.js`. The helpers in `tests/fixtures.js` do the
repetitive work:

```js
const { test, expect, press } = require("./fixtures");

test("my new thing works on a phone", async ({ openApp }) => {
  const page = await openApp("phone390");              // a fresh browser on a 390px phone
  await press(page, page.locator("#fab"));              // tap on phones, click on desktops
  await expect(page.locator(".ctx-menu")).toBeVisible();
});
```

Devices you can pass to `openApp`: `phone320`, `phone390`, `phoneLandscape`, `tablet`, `laptop`, `desktop1920`.
Every test also fails automatically if the app throws a JavaScript error while it runs.

## When a test fails

1. Read the message: it says what was expected and what happened.
2. Run just that test with `npx playwright test -g "part of its name"`.
3. `npm run test:ui` lets you watch it and step back and forth.
4. If the change was intentional (you meant the app to behave differently), update the test.

## Add these lines to your `.gitignore`

```
node_modules/
test-results/
playwright-report/
```
