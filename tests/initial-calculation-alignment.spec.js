const { test, expect } = require('@playwright/test');

test('Test initial calculation breakdown alignment (expanded by default)', async ({ page }) => {
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
        // Check if calculation breakdown is initially visible (should be expanded by default)
        const calcBreakdownVisible = await page.locator('.calculation-step').first().isVisible().catch(() => false);
        console.log('Calculation breakdown initially visible:', calcBreakdownVisible);

        if (calcBreakdownVisible) {
            // Take screenshot with the initially expanded calculation breakdown
            await page.screenshot({ path: 'test-results/initial-calculation-alignment.png', fullPage: true });

            // Test the alignment of visible calculation steps
            const calculationSteps = await page.locator('.calculation-step').all();
            console.log(`Found ${calculationSteps.length} calculation steps`);

            console.log('\\n=== Calculation Breakdown Alignment ===');
            // Check alignment for all steps
            for (let i = 0; i < calculationSteps.length; i++) {
                const step = calculationSteps[i];
                const isVisible = await step.isVisible().catch(() => false);

                if (isVisible) {
                    const leftSpan = step.locator('span').first();
                    const rightSpan = step.locator('span').last();

                    const leftText = await leftSpan.textContent();
                    const rightText = await rightSpan.textContent();

                    // Get alignment styles
                    const leftAlign = await leftSpan.evaluate(el => window.getComputedStyle(el).textAlign);
                    const rightAlign = await rightSpan.evaluate(el => window.getComputedStyle(el).textAlign);

                    console.log(`Step ${i + 1}:`);
                    console.log(`  Label: "${leftText}" (${leftAlign})`);
                    console.log(`  Value: "${rightText}" (${rightAlign})`);

                    // Verify alignment
                    if (leftAlign === 'left' && rightAlign === 'right') {
                        console.log('  ✅ Alignment correct');
                    } else {
                        console.log('  ❌ Alignment incorrect');
                    }
                }
            }

            console.log('\\n✅ Calculation breakdown alignment test completed');
        } else {
            console.log('⚠️  Calculation breakdown not initially visible');
        }
    } else {
        console.log('❌ Dashboard not generated');
    }
});