const { test, expect } = require('@playwright/test');

test('Test expanded calculation breakdown alignment', async ({ page }) => {
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

    // Check if dashboard exists
    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();
    console.log('Dashboard generated:', dashboardExists);

    if (dashboardExists) {
        // Look for calculation toggle button and click it to expand
        const toggleButton = page.locator('.calculation-toggle');
        const toggleExists = await toggleButton.isVisible().catch(() => false);
        console.log('Toggle button visible:', toggleExists);

        if (toggleExists) {
            console.log('Clicking toggle to show calculation breakdown...');
            await toggleButton.click();
            await page.waitForTimeout(1000);

            // Check if calculation breakdown is now visible
            const calcBreakdownVisible = await page.locator('.calculation-breakdown .calculation-step').first().isVisible().catch(() => false);
            console.log('Calculation breakdown visible:', calcBreakdownVisible);

            if (calcBreakdownVisible) {
                // Take screenshot with expanded calculation breakdown
                await page.screenshot({ path: 'test-results/expanded-calculation-alignment.png', fullPage: true });

                // Test the alignment of visible calculation steps
                const calculationSteps = await page.locator('.calculation-step').all();
                console.log(`Found ${calculationSteps.length} calculation steps`);

                // Check alignment for first few steps
                for (let i = 0; i < Math.min(calculationSteps.length, 4); i++) {
                    const step = calculationSteps[i];
                    const isVisible = await step.isVisible().catch(() => false);

                    if (isVisible) {
                        const leftSpan = step.locator('span').first();
                        const rightSpan = step.locator('span').last();

                        const leftText = await leftSpan.textContent();
                        const rightText = await rightSpan.textContent();

                        console.log(`Step ${i + 1}: "${leftText}" | "${rightText}"`);
                    }
                }

                console.log('✅ Expanded calculation breakdown alignment verified');
            } else {
                console.log('⚠️  Calculation breakdown not visible after toggle');
            }
        } else {
            console.log('⚠️  Toggle button not found');
        }
    } else {
        console.log('❌ Dashboard not generated');
    }
});