const { test, expect } = require('@playwright/test');

test('Check PDF download functionality', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8080');

    // Wait a bit for the page to load
    await page.waitForTimeout(2000);

    // Take a screenshot to see what we're working with
    await page.screenshot({ path: 'test-results/page-loaded.png' });

    // Check if the main elements are present
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Look for input fields by different selectors
    const teamInput = await page.locator('input').first();
    const isTeamInputVisible = await teamInput.isVisible().catch(() => false);
    console.log('Team input visible:', isTeamInputVisible);

    if (isTeamInputVisible) {
        // Fill in test data
        await teamInput.fill('25');

        const inputs = await page.locator('input').all();
        if (inputs.length >= 2) await inputs[1].fill('22');
        if (inputs.length >= 3) await inputs[2].fill('85');

        // Click Calculate button
        const calculateBtn = page.locator('button:has-text("Calculate")');
        const isCalculateBtnVisible = await calculateBtn.isVisible().catch(() => false);
        console.log('Calculate button visible:', isCalculateBtnVisible);

        if (isCalculateBtnVisible) {
            await calculateBtn.click();
            await page.waitForTimeout(2000);

            // Look for PDF download button
            const pdfBtn = page.locator('button:has-text("Download PDF")');
            const isPdfBtnVisible = await pdfBtn.isVisible().catch(() => false);
            console.log('PDF button visible:', isPdfBtnVisible);

            if (isPdfBtnVisible) {
                // Listen for console messages
                const consoleMessages = [];
                page.on('console', msg => {
                    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
                });

                // Try clicking PDF button
                await pdfBtn.click();
                await page.waitForTimeout(3000);

                // Print console messages
                console.log('Console messages after PDF click:');
                consoleMessages.forEach(msg => console.log('  ', msg));

                // Check if button is still enabled (not blocked)
                const isEnabled = await pdfBtn.isEnabled();
                console.log('PDF button still enabled after click:', isEnabled);
            }
        }
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png' });
});