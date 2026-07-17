import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = process.env.VERIFY_URL || 'http://localhost:3000';
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });
const targets = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir('.artifacts', { recursive: true });

async function settle(page, timeout = 1200) {
  await page.waitForTimeout(timeout);
  await page.getByText('Refreshing...', { exact: true }).waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
}

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await settle(page);
  await page.screenshot({ path: `.artifacts/login-${target.name}.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    title: document.body.innerText.slice(0, 80),
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    imageCount: document.images.length,
    incompleteImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));

  console.log(JSON.stringify({ target: `login-${target.name}`, ...metrics, errors }, null, 2));

  await page.goto(`${baseURL}/consent`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.screenshot({ path: `.artifacts/consent-${target.name}.png`, fullPage: true });
  const consentMetrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    imageCount: document.images.length,
    incompleteImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  console.log(JSON.stringify({ target: `consent-${target.name}`, ...consentMetrics, errors }, null, 2));

  await page.goto(`${baseURL}/onboarding`, { waitUntil: 'networkidle' });
  await settle(page);
  for (let index = 0; index < 6; index += 1) {
    await page.screenshot({ path: `.artifacts/onboarding-step-${index + 1}-${target.name}.png`, fullPage: true });
    const onboardingMetrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      imageCount: document.images.length,
      incompleteImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
    }));
    console.log(JSON.stringify({ target: `onboarding-step-${index + 1}-${target.name}`, ...onboardingMetrics, errors }, null, 2));
    if (index < 5) {
      await page.getByText('Continue', { exact: true }).click();
      await settle(page, 280);
    }
  }
  await page.getByText('Build my plan', { exact: true }).click();
  await page.waitForURL(/\/today/, { timeout: 15000 });
  await settle(page);
  await page.screenshot({ path: `.artifacts/today-${target.name}.png`, fullPage: true });
  const appMetrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  console.log(JSON.stringify({ target: `today-${target.name}`, ...appMetrics, errors }, null, 2));

  const completeButton = page.getByText('Mark complete', { exact: true });
  await completeButton.click();
  await page.waitForTimeout(260);
  await page.screenshot({ path: `.artifacts/completion-${target.name}.png`, fullPage: false });
  await page.waitForTimeout(1500);
  const completionPersisted = await page.getByText('Workout completed', { exact: true }).isVisible();
  console.log(JSON.stringify({ target: `completion-${target.name}`, completionPersisted, errors }, null, 2));

  const appRoutes = [
    ['plan', '/(tabs)/plan'],
    ['progress', '/(tabs)/progress'],
    ['coach', '/(tabs)/coach'],
    ['profile', '/(tabs)/profile'],
    ['restaurant', '/restaurant'],
    ['grocery', '/grocery'],
    ['local-preferences', '/local-preferences'],
  ];
  for (const [name, route] of appRoutes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await settle(page);
    await page.screenshot({ path: `.artifacts/${name}-${target.name}.png`, fullPage: true });
    const routeMetrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      imageCount: document.images.length,
      incompleteImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
    }));
    console.log(JSON.stringify({ target: `${name}-${target.name}`, ...routeMetrics, errors }, null, 2));
  }
  await page.close();
}

await browser.close();
