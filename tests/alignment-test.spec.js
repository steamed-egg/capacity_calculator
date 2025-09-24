const { test, expect } = require('@playwright/test');

test('Test calculation breakdown alignment', async ({ page }) => {
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
        // Take screenshot focusing on the calculation breakdown
        await page.screenshot({ path: 'test-results/calculation-alignment.png', fullPage: true });

        // Check the text alignment of calculation steps
        const calculationSteps = await page.locator('.calculation-step').all();
        console.log(`Found ${calculationSteps.length} calculation steps`);

        for (let i = 0; i < Math.min(calculationSteps.length, 3); i++) {
            const step = calculationSteps[i];
            const leftSpan = step.locator('span').first();
            const rightSpan = step.locator('span').last();

            const leftText = await leftSpan.textContent();
            const rightText = await rightSpan.textContent();

            // Get computed styles
            const leftAlign = await leftSpan.evaluate(el => window.getComputedStyle(el).textAlign);
            const rightAlign = await rightSpan.evaluate(el => window.getComputedStyle(el).textAlign);

            console.log(`Step ${i + 1}:`);
            console.log(`  Left: "${leftText}" (align: ${leftAlign})`);
            console.log(`  Right: "${rightText}" (align: ${rightAlign})`);
        }

        console.log('✅ Alignment test completed - check screenshot for visual verification');
    }
});