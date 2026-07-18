// Crawls EVERY screen in the app as a real signed-in user and captures
// desktop + mobile screenshots, console errors, and horizontal overflow.
// Usage: node scripts/crawl-all.mjs   (expects web on :3000 and API on :4000)
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = process.env.VERIFY_URL || 'http://localhost:3000';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EMAIL = process.env.CRAWL_EMAIL || 'demo@fitplan.app';
const PASSWORD = process.env.CRAWL_PASSWORD || 'FitPlan#2026';
const OUT = process.env.CRAWL_OUT || '.artifacts/crawl';

const ROUTES = [
  ['today', '/today'],
  ['plan', '/plan'],
  ['progress', '/progress'],
  ['coach', '/coach'],
  ['profile', '/profile'],
  ['repair', '/repair'],
  ['restaurant', '/restaurant'],
  ['grocery', '/grocery'],
  ['local-preferences', '/local-preferences'],
  ['food-camera', '/food-camera'],
  ['form-check', '/form-check'],
  ['menu-scanner', '/menu-scanner'],
  ['voice-log', '/voice-log'],
  ['progress-photo', '/progress-photo'],
  ['measurements', '/measurements'],
  ['milestones', '/milestones'],
  ['digital-twin', '/digital-twin'],
  ['weekly-review', '/weekly-review'],
  ['experts', '/experts'],
  ['devices', '/devices'],
  ['coach-dashboard', '/coach-dashboard'],
  ['replace-meal', '/replace-meal?day=mon&slot=breakfast'],
  ['exercise-detail', '/exercise/ex_squat'],
];

const targets = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ executablePath, headless: true });
await mkdir(OUT, { recursive: true });
const report = [];

async function settle(page, timeout = 1100) {
  await page.waitForTimeout(timeout);
}

async function metrics(page) {
  return page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    imageCount: document.images.length,
    incompleteImages: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
  }));
}

for (const target of targets) {
  const context = await browser.newContext({ viewport: { width: target.width, height: target.height } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${target.name}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${target.name}] ${e.message}`));
  const snap = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}-${target.name}.png`, fullPage: true });
    const m = await metrics(page);
    const entry = { screen: name, viewport: target.name, overflow: Math.max(0, m.contentWidth - m.viewportWidth), ...m };
    report.push(entry);
    console.log(JSON.stringify(entry));
  };

  // --- 1. Login screen + real sign-in as the test user -----------------------
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await settle(page, 1500);
  await snap('login-register-mode');
  await page.getByText('Sign in', { exact: true }).first().click();
  await settle(page, 600);
  await snap('login-signin-mode');
  await page.getByPlaceholder('you@example.com').fill(EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByText('Sign in', { exact: true }).last().click();
  await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 15000 });
  await settle(page, 900);

  // --- 2. Consent (first run only) -------------------------------------------
  if (page.url().includes('/consent')) {
    await snap('consent');
    await page.getByText('I understand and accept the privacy notice and health disclaimer.').click();
    await settle(page, 300);
    await page.getByText('Accept and continue', { exact: true }).click();
    await page.waitForURL((u) => !String(u).includes('/consent'), { timeout: 15000 });
    await settle(page, 800);
  }

  // --- 3. Onboarding (first run only) -----------------------------------------
  if (page.url().includes('/onboarding')) {
    for (let step = 1; step <= 6; step += 1) {
      await snap(`onboarding-step-${step}`);
      if (step < 6) {
        await page.getByText('Continue', { exact: true }).click();
        await settle(page, 350);
      }
    }
    await page.getByText('Build my plan', { exact: true }).click();
    await page.waitForURL(/today/, { timeout: 20000 });
    await settle(page, 900);
  }

  // --- 4. Every app route ------------------------------------------------------
  for (const [name, route] of ROUTES) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await settle(page);
    await snap(name);
  }

  report.push({ viewport: target.name, consoleErrors: errors });
  console.log(JSON.stringify({ viewport: target.name, consoleErrors: errors }));
  await context.close();
}

await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(`\nDone. Screenshots + report.json in ${OUT}/`);
