const { test, expect } = require('@playwright/test');

test('Generate README screenshots', async ({ page }) => {
    // Configure viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // 1. Landing Page Screenshot
    console.log('Capturing landing page...');
    await page.screenshot({
        path: 'screenshots/01-landing-page.png',
        fullPage: false
    });

    // 2. Generate a complete dashboard
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

    // 3. Desktop View with Complete Dashboard
    console.log('Capturing desktop view...');
    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();

    if (dashboardExists) {
        await page.screenshot({
            path: 'screenshots/09-desktop-view.png',
            fullPage: true
        });

        // 4. Capture focused dashboard area
        console.log('Capturing dashboard detail...');
        await page.locator('.capacity-dashboard').screenshot({
            path: 'screenshots/dashboard-detail.png'
        });

        // 5. Capture calculation breakdown (if visible)
        const calcBreakdownVisible = await page.locator('.calculation-step').first().isVisible().catch(() => false);
        if (calcBreakdownVisible) {
            console.log('Capturing calculation breakdown...');
            await page.locator('.calculation-breakdown').screenshot({
                path: 'screenshots/calculation-breakdown.png'
            });
        }

        // 6. Test follow-up scenario
        console.log('Testing follow-up scenario...');
        await page.click('button:has-text("Calculate Another Scenario")');
        await page.waitForTimeout(2000);

        // Ask a follow-up question
        await page.fill('#chat-input', 'What if I had 30 team members instead?');
        await page.click('#send-button');
        await page.waitForTimeout(3000);

        const followupVisible = await page.locator('.capacity-dashboard').isVisible().catch(() => false);
        if (followupVisible) {
            await page.screenshot({
                path: 'screenshots/07-follow-up-scenarios.png',
                fullPage: true
            });
        }
    }

    // 7. Mobile View
    console.log('Capturing mobile view...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Go back to landing for mobile view
    await page.reload();
    await page.waitForSelector('#chat-input', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
        path: 'screenshots/08-mobile-view.png',
        fullPage: false
    });

    // Generate mobile dashboard
    await page.fill('#chat-input', 'Capacity for November with 20 team members?');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', 'November 2025');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '6 hours');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '80%');
    await page.click('#send-button');
    await page.waitForTimeout(3000);

    const mobileDashboard = await page.locator('.capacity-dashboard').isVisible().catch(() => false);
    if (mobileDashboard) {
        console.log('Capturing mobile dashboard...');
        await page.screenshot({
            path: 'screenshots/mobile-dashboard.png',
            fullPage: true
        });
    }

    console.log('✅ All README screenshots captured successfully!');
});

test('Generate feature showcase screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate dashboard for feature showcase
    await page.fill('#chat-input', 'Show me capacity for December 2025 with 15 staff, 4 hour tasks, 90% availability');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();
    if (dashboardExists) {
        // Capture 4-column metrics layout
        console.log('Capturing 4-column metrics...');
        await page.locator('.metrics-row-top').screenshot({
            path: 'screenshots/4-column-metrics.png'
        });

        // Capture PDF export functionality
        console.log('Testing PDF export...');
        const pdfButton = page.locator('button:has-text("Download PDF")');
        const pdfExists = await pdfButton.isVisible().catch(() => false);

        if (pdfExists) {
            // Highlight the PDF button area
            await page.evaluate(() => {
                const button = document.querySelector('button:contains("Download PDF")') ||
                             document.querySelector('.download-button') ||
                             document.querySelector('[class*="pdf"]') ||
                             document.querySelector('button[class*="green"]');
                if (button) {
                    button.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.5)';
                    button.style.transform = 'scale(1.05)';
                }
            });

            await page.waitForTimeout(500);
            await page.screenshot({
                path: 'screenshots/pdf-export-feature.png',
                fullPage: false
            });
        }
    }

    console.log('✅ Feature showcase screenshots completed!');
});