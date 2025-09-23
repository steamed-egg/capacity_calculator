// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('App Screenshots', () => {
  test('capture main app screens', async ({ page }) => {
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');

    // Go to homepage
    await page.goto('/');

    // 1. Initial landing screen
    await expect(page.locator('h1')).toContainText('Capacity Forecast Chatbot');
    await page.screenshot({
      path: path.join(screenshotsDir, '01-landing-page.png'),
      fullPage: true
    });

    // 2. User sends initial message
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    await chatInput.fill('I need a capacity forecast for next month');
    await page.screenshot({
      path: path.join(screenshotsDir, '02-user-input.png'),
      fullPage: true
    });

    await sendButton.click();
    await page.waitForTimeout(2000);

    // 3. Bot asking for parameters
    await expect(page.locator('.bot-message').last()).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, '03-bot-questions.png'),
      fullPage: true
    });

    // 4. Complete the conversation with all parameters
    await chatInput.fill('We have 5 staff members');
    await sendButton.click();
    await page.waitForTimeout(1500);

    await chatInput.fill('8 hours per implementation');
    await sendButton.click();
    await page.waitForTimeout(1500);

    await chatInput.fill('80% availability');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // 5. Dashboard view - full forecast result
    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(screenshotsDir, '04-dashboard-full.png'),
      fullPage: true
    });

    // 6. Focus on just the dashboard component
    const dashboard = page.locator('.capacity-dashboard');
    await dashboard.screenshot({
      path: path.join(screenshotsDir, '05-dashboard-component.png')
    });

    // 7. Hide calculation breakdown to show cleaner view
    const toggleButton = page.locator('.calculation-toggle');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(500);
      await dashboard.screenshot({
        path: path.join(screenshotsDir, '06-dashboard-clean.png')
      });
    }

    // 8. Follow-up question example
    await chatInput.fill('What if I need to deliver 20 more implementations?');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Wait for scenarios or analysis to appear
    await expect(page.locator('.bot-message').last()).toBeVisible({ timeout: 8000 });
    await page.screenshot({
      path: path.join(screenshotsDir, '07-follow-up-scenarios.png'),
      fullPage: true
    });

    // 9. Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, '08-mobile-view.png'),
      fullPage: true
    });

    // 10. Desktop view with larger screen
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Complete a quick forecast for desktop view
    await chatInput.fill('Forecast for next month: 4 staff, 10 hours per task, 75% availability');
    await sendButton.click();
    await page.waitForTimeout(4000);

    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(screenshotsDir, '09-desktop-view.png'),
      fullPage: true
    });
  });
});