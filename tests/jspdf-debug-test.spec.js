const { test, expect } = require('@playwright/test');

test('Debug jsPDF library loading', async ({ page }) => {
    // Navigate to jsPDF test page
    await page.goto('http://localhost:8080/test-jspdf.html');
    await page.waitForTimeout(2000);

    // Click test button
    await page.click('button:has-text("Test jsPDF")');
    await page.waitForTimeout(1000);

    // Get all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push(msg.text());
    });

    // Get the output div content
    const output = await page.locator('#output').textContent();
    console.log('jsPDF Test Output:');
    console.log(output);

    // Take screenshot
    await page.screenshot({ path: 'test-results/jspdf-debug.png' });
});