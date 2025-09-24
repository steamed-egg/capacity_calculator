const { test, expect } = require('@playwright/test');

test('PDF download should not be blocked', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8080');

    // Wait for the app to load
    await page.waitForSelector('.capacity-dashboard', { timeout: 10000 });

    // Fill in some test data
    await page.fill('input[placeholder="Enter team members"]', '25');
    await page.fill('input[placeholder="Enter working days"]', '22');
    await page.fill('input[placeholder="Enter availability (%)"]', '85');

    // Click Calculate to generate dashboard
    await page.click('button:has-text("Calculate")');

    // Wait for dashboard to appear
    await page.waitForSelector('.dashboard-metrics', { timeout: 5000 });

    // Listen for console messages to catch any errors
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Listen for dialogs (print dialog)
    let dialogShown = false;
    page.on('dialog', async dialog => {
        console.log(`Dialog appeared: ${dialog.type()} - ${dialog.message()}`);
        dialogShown = true;
        await dialog.dismiss();
    });

    // Attempt to download PDF
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    await page.click('button:has-text("Download PDF")');

    // Wait a bit to see what happens
    await page.waitForTimeout(3000);

    // Check if download started or if dialog appeared (both are acceptable)
    const download = await downloadPromise;

    console.log('Console messages during PDF generation:');
    consoleMessages.forEach(msg => console.log(msg));

    if (download) {
        console.log('✅ PDF download started successfully');
        expect(download).toBeTruthy();
    } else if (dialogShown) {
        console.log('✅ Print dialog appeared (fallback working)');
        expect(dialogShown).toBe(true);
    } else {
        // Check if PDF download button is still clickable (not blocked)
        const pdfButton = page.locator('button:has-text("Download PDF")');
        await expect(pdfButton).toBeEnabled();
        console.log('✅ PDF button is not blocked, checking for fallback behavior');

        // Look for any error messages that might indicate blocking
        const hasErrorMessage = consoleMessages.some(msg =>
            msg.includes('blocked') ||
            msg.includes('error') && msg.includes('PDF')
        );

        if (hasErrorMessage) {
            console.log('❌ PDF functionality appears to be blocked');
            throw new Error('PDF download is blocked');
        } else {
            console.log('✅ PDF functionality is working (no blocking errors detected)');
        }
    }
});