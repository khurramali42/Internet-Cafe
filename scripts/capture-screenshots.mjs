/**
 * Capture genuine application screenshots from a fresh browser context.
 * Uses only the built-in fictional demo dataset (never a production backend).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173';
const out = 'docs/screenshots';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Welcome Back' }).waitFor();
  await page.screenshot({ path: out + '/01-login.png', fullPage: true });

  await page.getByPlaceholder('Enter username').fill('admin');
  await page.locator('input[type="password"]').fill('123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.getByRole('heading', { name: 'Cabin Overview' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);

  const screens = [
    ['/', '02-dashboard.png', 'Cabin Overview'],
    ['/customers', '03-customers.png', 'Customers'],
    ['/inventory', '04-inventory.png', 'Inventory'],
    ['/reports', '05-reports.png', 'Reports']
  ];
  for (const [route, file, title] of screens) {
    await page.goto(base + '/#' + route, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: title, exact: false }).first().waitFor({ timeout: 15000 }).catch(async () => {
      // The header is responsive and some sections use a different heading.
      await page.locator('main').waitFor();
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: out + '/' + file, fullPage: true });
    console.log('Captured', file);
  }
} finally {
  await browser.close();
}
