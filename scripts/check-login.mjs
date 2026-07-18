import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
for (const target of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: target.width, height: target.height } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `.artifacts/login-wow-early-${target.name}.png` });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `.artifacts/login-wow-${target.name}.png` });

  if (target.name === 'desktop') {
    // Sign in and grab a frame mid route-transition to catch the sweep.
    await page.getByText('Sign in', { exact: true }).first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `.artifacts/login-wow-signin-${target.name}.png` });
    await page.getByPlaceholder('you@example.com').fill('demo@fitplan.app');
    await page.getByPlaceholder('Enter your password').fill('FitPlan#2026');
    await page.getByText('Sign in', { exact: true }).last().click();
    await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `.artifacts/transition-frame.png` });
  }
  console.log(JSON.stringify({ target: target.name, errors }));
  await context.close();
}
await browser.close();
