// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('PDF Generation Testing', () => {
  test('test PDF generation layout', async ({ page }) => {
    // Go to homepage
    await page.goto('/');

    // Complete a forecast to get dashboard
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    await chatInput.fill('Forecast for next month: 4 staff, 8 hours per task, 80% availability');
    await sendButton.click();

    // Wait for dashboard to appear
    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });

    // Screenshot the dashboard for reference
    await page.screenshot({
      path: 'screenshots/dashboard-before-pdf.png',
      fullPage: true
    });

    // Intercept console messages to see PDF generation debug info
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Click PDF download button
    const downloadButton = page.locator('.download-button');
    await expect(downloadButton).toBeVisible();

    // Click and wait for response (including any alerts/confirms)
    await downloadButton.click();

    // Wait for potential PDF generation
    await page.waitForTimeout(3000);

    // Check for any temporary PDF containers in DOM
    const tempContainers = await page.locator('div[style*="position: fixed"][style*="-9999px"]').count();
    console.log('Temporary containers found:', tempContainers);

    // Check if print dialog or new tab opened
    const pages = page.context().pages();
    console.log('Number of pages/tabs:', pages.length);

    // Capture any dialogs that appeared
    page.on('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.type(), dialog.message());
      await dialog.accept();
    });

    // Log all console messages from the page
    console.log('Console messages during PDF generation:');
    consoleLogs.forEach(log => console.log(log));

    // Take a screenshot after PDF attempt
    await page.screenshot({
      path: 'screenshots/after-pdf-attempt.png',
      fullPage: true
    });

    // Try to access the PDF container if it exists
    const pdfContainer = page.locator('div[style*="width: 800px"]');
    if (await pdfContainer.count() > 0) {
      console.log('PDF container found');
      await pdfContainer.screenshot({
        path: 'screenshots/pdf-container-layout.png'
      });

      // Check the metrics layout inside PDF container
      const metricsGrid = pdfContainer.locator('div[style*="grid-template-columns"]');
      if (await metricsGrid.count() > 0) {
        const gridStyle = await metricsGrid.getAttribute('style');
        console.log('Metrics grid style:', gridStyle);
      }

      // Check calculation breakdown layout
      const calcSteps = pdfContainer.locator('div[style*="display: flex"][style*="justify-content: space-between"]');
      const calcStepCount = await calcSteps.count();
      console.log('Calculation steps with flex layout:', calcStepCount);

      if (calcStepCount > 0) {
        for (let i = 0; i < Math.min(calcStepCount, 3); i++) {
          const stepStyle = await calcSteps.nth(i).getAttribute('style');
          console.log(`Calc step ${i} style:`, stepStyle);
        }
      }
    } else {
      console.log('No PDF container found - might have been cleaned up or generation failed');
    }
  });

  test('inspect dashboard layout directly', async ({ page }) => {
    await page.goto('/');

    // Complete forecast
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    await chatInput.fill('Test: 3 staff, 10 hours per implementation, 75% availability, next month');
    await sendButton.click();

    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });

    // Check current dashboard metrics layout
    const metricsRowTop = page.locator('.metrics-row-top');
    const gridStyle = await metricsRowTop.getAttribute('style');
    console.log('Dashboard metrics grid style:', gridStyle);

    const metricCards = page.locator('.metric-card');
    const cardCount = await metricCards.count();
    console.log('Number of metric cards:', cardCount);

    // Check calculation breakdown layout
    const calcSteps = page.locator('.calculation-step');
    const stepCount = await calcSteps.count();
    console.log('Number of calculation steps:', stepCount);

    if (stepCount > 0) {
      const firstStepStyle = await calcSteps.first().getAttribute('style');
      console.log('First calculation step style:', firstStepStyle);
    }

    // Take detailed screenshot of just the dashboard
    const dashboard = page.locator('.capacity-dashboard');
    await dashboard.screenshot({
      path: 'screenshots/dashboard-layout-detailed.png'
    });
  });
});