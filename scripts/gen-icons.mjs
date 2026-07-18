// Generates native brand assets (app icon, Android adaptive-icon foreground,
// splash) from inline SVG via headless Chrome. Run: node scripts/gen-icons.mjs
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

// The FitPlan mark: concentric "target" rings (matches the in-app brand mark).
const rings = (cx, cy, scale, color) => `
  <circle cx="${cx}" cy="${cy}" r="${170 * scale}" fill="none" stroke="${color}" stroke-width="${34 * scale}"/>
  <circle cx="${cx}" cy="${cy}" r="${104 * scale}" fill="none" stroke="${color}" stroke-width="${30 * scale}"/>
  <circle cx="${cx}" cy="${cy}" r="${44 * scale}" fill="${color}"/>
`;

const targets = [
  {
    out: 'assets/images/icon.png',
    width: 1024,
    height: 1024,
    transparent: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#EAFFA8"/>
          <stop offset="0.5" stop-color="#D8FF72"/>
          <stop offset="1" stop-color="#AEE84A"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      ${rings(512, 512, 1.5, '#090A09')}
    </svg>`,
  },
  {
    out: 'assets/images/adaptive-icon.png',
    width: 1024,
    height: 1024,
    transparent: true,
    // Android safe zone: keep the mark within the central ~66%.
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      ${rings(512, 512, 1.1, '#090A09')}
    </svg>`,
  },
  {
    out: 'assets/images/splash-icon.png',
    width: 1024,
    height: 1024,
    transparent: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      ${rings(512, 400, 1.0, '#D8FF72')}
      <text x="512" y="720" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="96" letter-spacing="26" fill="#F5F7F2">FITPLAN</text>
      <text x="512" y="790" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="34" letter-spacing="10" fill="#737C73">TRAIN FOR THE LIFE YOU LIVE</text>
    </svg>`,
  },
];

const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.width, height: t.height });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;${t.transparent ? 'background:transparent;' : ''}">${t.svg}</body></html>`,
  );
  await page.screenshot({ path: t.out, omitBackground: t.transparent });
  console.log('wrote', t.out);
}
await browser.close();
