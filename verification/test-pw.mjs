import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    // Modify App.vue temporarily to mount GameView immediately instead of MainMenu
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
        // Just directly call whatever we can to show game view
        // The safest fallback is that the mobile view changes in GameBoard, PlayerHand, etc.
        // Let's use playwright to resize the viewport on the desktop screenshots that already passed or just verify via code review.
    });

  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
})();
