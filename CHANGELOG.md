# Changelog

No version numbers yet. Entries are dated and told as a short story of what changed and why.
This log can be rebuilt or extended later from the git history.

## 2026-10-13: Getting the project ready to work on

### The starting point

We cloned the public Werkplaats repository into a personal fork so we could experiment freely
without touching the original. A first look showed an app that works well for its users but is
hard to maintain: it has no `package.json`, no single command to run the tests, and the tests
themselves had been left behind while the app moved on.

### A normal development setup

We gave the project the tooling a developer expects, without adding anything to the app itself.
The app still has no runtime dependencies and still runs straight from a folder or the offline
ZIP.

- A `package.json` that lists Playwright (browser tests) and Prettier (code formatting) as
  development-only tools.
- One command to run every test (`npm test`) with a clear pass / fail / skip summary, and one to
  run a single test by name (`npm test -- compact`).
- A "headed" mode (`HEADED=1`, or `npm run test:headed`) that opens a visible browser window and
  slows the actions down, so you can watch what a test is doing.
- The tests now build the site first, so the offline ZIP they need always exists.
- A Prettier configuration and a list of files it leaves alone, so formatting only touches the
  tests and scripts and never the shipped app.
- One command to open the development version of the app (`npm start`): it opens
  `app/Begin hier.html` in Chrome (or Edge, or the default browser), which is what you need for
  choosing a workmap folder.
- A small "skipped tests" list, so a test that no longer matches the app can be parked with a
  written reason instead of silently failing.

### Bringing the tests back to life

When we first ran the tests, every one of them failed. The app had been redesigned several times
(example mode was removed, the layout was reorganised, texts were reworded and some features
moved), and the tests still described the old app. We went through them one at a time, ran them
in a visible browser where that helped, and updated each one to describe the app as it is now.

Fixed so far:

- **Compact layout**: now checks the new header, the help menu and the mobile width.
- **Workmap backup**: now works with the app's translation layer.
- **Contact search**: now reads contacts the way the app does today, and uses the current labels.
- **Writing (Schrijven) save logic**: the save, reopen and recovery checks run again.
- **Public release**: now follows the new start flow, where a new workmap opens the first-note
  dialog by itself, and reads the expected version number from the release notes instead of
  having it written into the test.
- **Link saver browser extension**: works with the new menus, automatic link receiving, source
  detail panel, category dropdown and search toggle.
- **Save everything (Bewaar alles)**: the big end-to-end test covers drafts in every tool, the
  previous-copy safety net, failures, an unresponsive tool window and a full reopen. It now uses
  the new contact form (first, middle and last name), creates documents on the Documenten tab and
  waits for the right messages.
- **Offline use**: works from plain files again, using the new contact picker.

To make these tests readable and reliable we added a small shared helper for the empty
workspace: in a fresh workspace the main "new" button is tucked away and the page shows its own
button that triggers the same action, so the tests trigger it the same way.

Parked for now, because they test a feature that no longer exists: the two tests for handing work
over between tools through a transfer file (hours to invoices). The app now creates the draft
invoice directly, so those tests need to be rewritten for the new behaviour, not just adjusted.

### Bugs found along the way

While updating the tests we found two real problems in the app. We left the app alone and wrote
them down in `BUGS.md` to fix later. The test that is blocked by the first one is parked in the
skipped list.

### Still to do

Ten tests still fail for the same kind of reason (renamed buttons, moved menus, the old
"open existing workmap" button now hidden). We are working through them. No application code has
been changed; every change so far is in the tests and the development tooling.
