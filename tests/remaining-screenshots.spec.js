const { test, expect } = require('@playwright/test');

test('Capture remaining key screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate a clean dashboard
    console.log('📸 Generating clean dashboard...');
    await page.fill('#chat-input', 'What is my capacity for October 2025 with 25 team members, 22 working days, 85% availability, 8 hour tasks?');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // Check if dashboard exists (use first() to avoid multiple elements)
    const dashboardExists = await page.locator('.capacity-dashboard').first().isVisible();

    if (dashboardExists) {
        // 1. DESKTOP VIEW - Main screenshot for README
        console.log('📸 Capturing main desktop view...');
        await page.screenshot({
            path: 'screenshots/09-desktop-view.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1440, height: 800 }
        });

        // 2. COMPLETE DASHBOARD - Full page
        console.log('📸 Capturing complete dashboard...');
        await page.screenshot({
            path: 'screenshots/04-complete-dashboard.png',
            fullPage: true
        });

        // 3. DASHBOARD COMPONENT - Just the dashboard card
        console.log('📸 Capturing dashboard component...');
        await page.locator('.capacity-dashboard').first().screenshot({
            path: 'screenshots/dashboard-component.png'
        });

        // 4. METRICS LAYOUT - 4-column metrics
        const metricsRow = page.locator('.metrics-row-top');
        const metricsExists = await metricsRow.isVisible();
        if (metricsExists) {
            console.log('📸 Capturing 4-column metrics...');
            await metricsRow.screenshot({
                path: 'screenshots/metrics-4-column.png'
            });
        }

        // 5. CALCULATION BREAKDOWN - Professional alignment
        const calcBreakdown = page.locator('.calculation-breakdown');
        const calcExists = await calcBreakdown.isVisible();
        if (calcExists) {
            console.log('📸 Capturing calculation breakdown...');
            await calcBreakdown.screenshot({
                path: 'screenshots/calculation-breakdown.png'
            });
        }

        // 6. FOLLOW-UP SCENARIO TEST
        console.log('📸 Testing follow-up scenario...');
        await page.click('button:has-text("Calculate Another Scenario")');
        await page.waitForTimeout(2000);

        await page.fill('#chat-input', 'What if I had 30 team members instead?');
        await page.click('#send-button');
        await page.waitForTimeout(4000);

        // Check for follow-up dashboard (use first())
        const followupExists = await page.locator('.capacity-dashboard').first().isVisible();
        if (followupExists) {
            await page.screenshot({
                path: 'screenshots/07-follow-up-scenarios.png',
                fullPage: true
            });
        }

        console.log('✅ Desktop screenshots completed!');
    }
});

test('Capture mobile screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate simple mobile dashboard
    console.log('📱 Generating mobile dashboard...');
    await page.fill('#chat-input', 'Capacity for November 2025: 15 staff, 18 days, 80% availability, 5 hour tasks');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // Check mobile dashboard (use first())
    const mobileDashboard = await page.locator('.capacity-dashboard').first().isVisible();
    if (mobileDashboard) {
        console.log('📱 Capturing mobile dashboard...');
        await page.screenshot({
            path: 'screenshots/mobile-dashboard.png',
            fullPage: true
        });

        // Mobile dashboard component
        await page.locator('.capacity-dashboard').first().screenshot({
            path: 'screenshots/mobile-dashboard-component.png'
        });

        console.log('✅ Mobile screenshots completed!');
    }
});