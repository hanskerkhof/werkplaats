# Known bugs

Bugs found in the app while bringing the tests up to date. They are not fixed yet. The tests
that expose them are parked in `tests/skipped.json` with a pointer to the entry here.

Source note: `app/` is generated from the author's private Master (`scripts/check.py` compares it
with `release/master-bestanden.json`), so a fix may have to go upstream first.

## BUG-001: "[object Object]" in the form dialog's save status

- **Found:** 2026-10-13, while updating `tests/werkruimte-ui.cjs`.
- **Where:** `app/bewaar-alles.js`, the `say()` helper (line 10).
- **What happens:** with a form dialog open (for example a new contact), choosing Bewaar alles
  shows `[object Object]` in the dialog's status line instead of "Alles bewaard." or the error
  text.
- **Cause:** `say()` receives a translation object (`I18n.ui(...)`). The main message
  (`#wm-message`) is set with `I18n.assign(...)`, which handles it, but the dialog status lines
  (`.all-dialog-status`) are set with plain `el.textContent = text`.
- **Likely fix:** set the dialog status lines with `I18n.assign(el, text)` as well.
- **Test:** `tests/werkruimte-ui.cjs` waits for "Alles bewaard" in that status line.

## BUG-002: Bewaar alles no longer refuses when a tool is open twice

- **Found:** 2026-10-13, while updating `tests/bewaar-alles.cjs`.
- **Where:** `app/bewaar-alles.js`, `save` (`saveWithStatus` / `saveAll`) and `askTool`.
- **What happens:** with the same tool open in two browser tabs, `BewaarAlles.readTool(...)`
  still fails with "<tool> staat in meerdere vensters. Sluit het dubbele venster.", but
  `BewaarAlles.save()` finishes without an error. The old test expected save to refuse, so that
  conflicting tabs are never silently merged.
- **Unclear:** whether save now skips, merges or overwrites the duplicate tool's data. This
  needs checking before it is trusted.
- **Test:** `tests/bewaar-alles.cjs` now only asserts that `readTool` refuses (see the NOTE in
  the test). The original save assertion should come back once this is settled.
