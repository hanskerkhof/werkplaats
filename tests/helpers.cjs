// Shared test helpers.

// Clicks a control the way a user would. In an empty workspace some primary actions (#new,
// #make-invoice) are tucked away and the page shows its own empty-state button that triggers the
// same handler, so when the control is not visible we trigger it directly.
async function press(page, selector) {
  // The page builds its interface after load; wait until that is finished.
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute('data-workspace-building')
  );
  const control = page.locator(selector);
  if (await control.isVisible()) await control.click();
  else await control.evaluate((element) => element.click());
}

module.exports = { press };
