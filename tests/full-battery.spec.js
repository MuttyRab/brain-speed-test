const { test, expect } = require('@playwright/test');

test('complete cognitive battery works end to end', async ({ page }) => {
  test.setTimeout(90000);

  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?e2e=1');
  await expect(page.locator('#screen-intro')).toHaveClass(/screen-active/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.click('#start-battery');
  await page.click('#begin-srt');
  for (let i = 0; i < 5; i += 1) {
    await page.locator('#srt-target:not(.hidden)').waitFor({ state: 'visible' });
    await page.dispatchEvent('#srt-target', 'pointerdown');
  }

  await expect(page.locator('#screen-crt')).toHaveClass(/screen-active/);
  await page.click('#begin-crt');
  for (let i = 0; i < 6; i += 1) {
    await page.locator('.choice-button.active').waitFor({ state: 'visible' });
    await page.dispatchEvent('.choice-button.active', 'pointerdown');
    await page.waitForTimeout(30);
  }

  await expect(page.locator('#screen-stroop')).toHaveClass(/screen-active/);
  await page.click('#begin-stroop');
  for (let i = 0; i < 8; i += 1) {
    await page.waitForFunction(() => Boolean(document.querySelector('#stroop-word').dataset.answer));
    const answer = await page.getAttribute('#stroop-word', 'data-answer');
    await page.dispatchEvent(`.stroop-options button[data-color="${answer}"]`, 'pointerdown');
    await page.waitForTimeout(30);
  }

  await expect(page.locator('#screen-memory')).toHaveClass(/screen-active/);
  await page.click('#begin-memory');
  await page.waitForFunction(() => window.__BST_DEBUG__.memoryPhase === 'input');
  const firstSequence = await page.evaluate(() => window.__BST_DEBUG__.memorySequence);
  for (const index of firstSequence) {
    await page.dispatchEvent(`.memory-cell[data-index="${index}"]`, 'pointerdown');
  }
  for (let life = 0; life < 3; life += 1) {
    await page.waitForFunction(() => window.__BST_DEBUG__.memoryPhase === 'input');
    const sequence = await page.evaluate(() => window.__BST_DEBUG__.memorySequence);
    const count = await page.locator('.memory-cell').count();
    const wrong = (sequence[0] + 1) % count;
    await page.dispatchEvent(`.memory-cell[data-index="${wrong}"]`, 'pointerdown');
    await page.waitForTimeout(60);
  }

  await expect(page.locator('#screen-gng')).toHaveClass(/screen-active/);
  await page.click('#begin-gng');
  for (let completed = 0; completed < 15; completed += 1) {
    await page.locator('#gng-target:not(.hidden)').waitFor({ state: 'visible' });
    const mode = await page.getAttribute('#gng-target', 'data-mode');
    if (mode === 'go') await page.dispatchEvent('#gng-target', 'pointerdown');
    await page.waitForFunction(expected => {
      const round = document.querySelector('#gng-round');
      const current = round ? Number.parseInt(round.textContent, 10) : 0;
      return current >= expected || document.querySelector('#screen-results')?.classList.contains('screen-active');
    }, completed + 1);
    await page.waitForTimeout(25);
  }

  await expect(page.locator('#screen-results')).toHaveClass(/screen-active/);
  await expect(page.locator('.result-card')).toHaveCount(5);
  await expect(page.locator('#score-number')).toBeVisible();
  await page.click('#research-toggle');
  await expect(page.locator('#research-body')).toHaveClass(/open/);
  await page.click('#restart-top');
  await expect(page.locator('#screen-intro')).toHaveClass(/screen-active/);
  await page.click('#theme-toggle');
  await expect(page.locator('html')).toHaveClass(/light/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(errors).toEqual([]);
});
