const { test, expect } = require('@playwright/test');

test('Generate final 3 screenshots for README', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. LANDING PAGE SCREENSHOT
    console.log('📸 Capturing landing page...');
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Start a conversation to get the bot questions
    await page.fill('#chat-input', 'What is my capacity for October 2025?');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: 'screenshots/01-landing.png',
        fullPage: true
    });

    // 2. DASHBOARD (PDF-style) SCREENSHOT
    console.log('📊 Generating dashboard screenshot...');

    // Complete the conversation to get dashboard
    await page.fill('#chat-input', '25 team members');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '22 working days');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '85% availability');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '8 hours per task');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // Style it like a professional report
    await page.evaluate(() => {
        const dashboard = document.querySelector('.capacity-dashboard');
        if (dashboard) {
            // Add professional report styling
            const title = document.createElement('h1');
            title.textContent = 'Capacity Forecast Report';
            title.style.cssText = 'text-align: center; color: #2d3748; margin: 2rem 0; font-size: 1.8rem; font-weight: 600;';
            dashboard.parentElement.insertBefore(title, dashboard);

            const date = document.createElement('p');
            date.textContent = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            date.style.cssText = 'text-align: center; color: #718096; margin-bottom: 2rem; font-size: 1.1rem;';
            dashboard.parentElement.insertBefore(date, dashboard);
        }
    });

    await page.waitForTimeout(1000);

    await page.screenshot({
        path: 'screenshots/02-dashboard.png',
        fullPage: false,
        clip: { x: 0, y: 100, width: 1440, height: 700 }
    });

    // 3. WHAT-IF SCENARIOS SCREENSHOT
    console.log('🤔 Generating what-if scenarios screenshot...');

    // Reset for new scenario
    const resetButton = page.locator('button:has-text("Calculate Another Scenario")');
    const resetExists = await resetButton.isVisible();

    if (resetExists) {
        await resetButton.click();
        await page.waitForTimeout(2000);

        // Ask what-if question
        await page.fill('#chat-input', 'What if I had 30 team members instead of 25?');
        await page.click('#send-button');
        await page.waitForTimeout(4000);

        // Another what-if to show comparison
        await page.fill('#chat-input', 'And what if availability was 90%?');
        await page.click('#send-button');
        await page.waitForTimeout(4000);

        await page.screenshot({
            path: 'screenshots/03-what-if-scenarios.png',
            fullPage: true
        });
    }

    console.log('✅ All 3 final screenshots generated!');
});