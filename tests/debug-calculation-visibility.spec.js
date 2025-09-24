const { test, expect } = require('@playwright/test');

test('Debug calculation breakdown visibility', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate dashboard through chatbot
    console.log('Generating dashboard...');
    await page.fill('#chat-input', 'What is my team capacity for October with 25 team members, 22 working days, and 85% availability?');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', 'October 2025');
    await page.click('#send-button');
    await page.waitForTimeout(3000);

    await page.fill('#chat-input', '8 hours average implementation time');
    await page.click('#send-button');
    await page.waitForTimeout(3000);

    // Check dashboard
    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();
    console.log('Dashboard generated:', dashboardExists);

    if (dashboardExists) {
        // Look for the calculation breakdown section
        const calcBreakdown = page.locator('.calculation-breakdown');
        const calcBreakdownExists = await calcBreakdown.isVisible().catch(() => false);
        console.log('Calculation breakdown section exists:', calcBreakdownExists);

        // Look for calculation toggle button
        const toggleButton = page.locator('.calculation-toggle');
        const toggleExists = await toggleButton.isVisible().catch(() => false);
        console.log('Toggle button exists:', toggleExists);

        if (toggleExists) {
            const toggleText = await toggleButton.locator('.toggle-text').textContent().catch(() => 'not found');
            console.log('Toggle button text:', toggleText);

            // Look for calculation content div
            const calcContent = page.locator('#calculationContent');
            const calcContentExists = await calcContent.isVisible().catch(() => false);
            console.log('Calculation content exists:', calcContentExists);

            if (calcContentExists) {
                // Check if it has the hidden class
                const hasHiddenClass = await calcContent.evaluate(el => el.classList.contains('calculation-hidden'));
                console.log('Has calculation-hidden class:', hasHiddenClass);

                // Get all calculation steps regardless of visibility
                const allSteps = await page.locator('.calculation-step').all();
                console.log('Total calculation steps found:', allSteps.length);

                // Check visibility of each step
                for (let i = 0; i < allSteps.length; i++) {
                    const stepVisible = await allSteps[i].isVisible().catch(() => false);
                    const stepText = await allSteps[i].textContent().catch(() => 'error');
                    console.log(`Step ${i + 1} visible: ${stepVisible} - Text: "${stepText}"`);
                }

                // If hidden, try clicking toggle to show
                if (hasHiddenClass || toggleText === 'Show Details') {
                    console.log('\\nAttempting to show calculation breakdown...');
                    await toggleButton.click();
                    await page.waitForTimeout(1000);

                    // Check again after clicking
                    const newToggleText = await toggleButton.locator('.toggle-text').textContent();
                    console.log('New toggle text:', newToggleText);

                    const nowVisible = await calcContent.isVisible();
                    console.log('Calculation content now visible:', nowVisible);

                    // Take screenshot after expanding
                    await page.screenshot({ path: 'test-results/debug-expanded-calculations.png', fullPage: true });
                } else {
                    // Take screenshot of current state
                    await page.screenshot({ path: 'test-results/debug-initial-calculations.png', fullPage: true });
                }
            }
        }
    }
});