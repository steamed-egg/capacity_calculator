const { test, expect } = require('@playwright/test');

test('Capture comprehensive screenshots for README', async ({ page }) => {
    // Set high-quality viewport for desktop screenshots
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // 1. LANDING PAGE - Clean initial state
    console.log('📸 Capturing landing page...');
    await page.screenshot({
        path: 'screenshots/01-landing-page.png',
        fullPage: false,
    });

    // 2. START CONVERSATION - User typing
    console.log('📸 Capturing user input...');
    await page.fill('#chat-input', 'What is my team capacity for October 2025?');
    await page.screenshot({
        path: 'screenshots/02-user-input.png',
        fullPage: false,
    });

    // Send first message and wait for bot response
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // 3. BOT QUESTIONS - Bot asking for details
    console.log('📸 Capturing bot questions...');
    await page.screenshot({
        path: 'screenshots/03-bot-questions.png',
        fullPage: true,
    });

    // Complete the conversation flow
    console.log('📸 Completing conversation flow...');

    // Provide team members
    await page.fill('#chat-input', '25 team members');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Provide working days
    await page.fill('#chat-input', '22 working days');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Provide availability
    await page.fill('#chat-input', '85% availability');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Provide implementation time
    await page.fill('#chat-input', '8 hours average implementation time');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // 4. COMPLETE DASHBOARD - Full desktop view
    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();
    if (dashboardExists) {
        console.log('📸 Capturing complete dashboard...');
        await page.screenshot({
            path: 'screenshots/04-complete-dashboard.png',
            fullPage: true,
            });

        // 5. DESKTOP VIEW - Main hero screenshot
        console.log('📸 Capturing desktop view (hero shot)...');
        await page.screenshot({
            path: 'screenshots/09-desktop-view.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1440, height: 800 },
            });

        // 6. METRICS LAYOUT - 4-column metrics detail
        console.log('📸 Capturing 4-column metrics layout...');
        const metricsRow = page.locator('.metrics-row-top');
        if (await metricsRow.isVisible()) {
            await metricsRow.screenshot({
                path: 'screenshots/metrics-4-column.png',
                    });
        }

        // 7. CALCULATION BREAKDOWN - Professional alignment
        console.log('📸 Capturing calculation breakdown...');
        const calcBreakdown = page.locator('.calculation-breakdown');
        if (await calcBreakdown.isVisible()) {
            await calcBreakdown.screenshot({
                path: 'screenshots/calculation-breakdown.png',
                    });
        }

        // 8. DASHBOARD COMPONENT - Just the dashboard card
        console.log('📸 Capturing dashboard component...');
        const dashboard = page.locator('.capacity-dashboard');
        await dashboard.screenshot({
            path: 'screenshots/dashboard-component.png',
            });

        // 9. TEST FOLLOW-UP SCENARIO
        console.log('📸 Testing follow-up scenarios...');
        await page.click('button:has-text("Calculate Another Scenario")');
        await page.waitForTimeout(2000);

        // Ask follow-up question
        await page.fill('#chat-input', 'What if I had 30 team members instead?');
        await page.click('#send-button');
        await page.waitForTimeout(4000);

        const followupDashboard = await page.locator('.capacity-dashboard').isVisible();
        if (followupDashboard) {
            await page.screenshot({
                path: 'screenshots/07-follow-up-scenarios.png',
                fullPage: true,
                    });
        }
    }

    console.log('✅ Desktop screenshots completed!');
});

test('Capture mobile screenshots', async ({ page }) => {
    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // 1. MOBILE LANDING
    console.log('📱 Capturing mobile landing page...');
    await page.screenshot({
        path: 'screenshots/08-mobile-view.png',
        fullPage: false,
    });

    // 2. Generate mobile dashboard
    console.log('📱 Generating mobile dashboard...');
    await page.fill('#chat-input', 'Capacity for November 2025 with 20 staff?');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '15 working days');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '80% availability');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    await page.fill('#chat-input', '6 hours per task');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // 3. MOBILE DASHBOARD
    const mobileDashboard = await page.locator('.capacity-dashboard').isVisible();
    if (mobileDashboard) {
        console.log('📱 Capturing mobile dashboard...');
        await page.screenshot({
            path: 'screenshots/mobile-dashboard.png',
            fullPage: true,
            });

        // Mobile dashboard component
        await page.locator('.capacity-dashboard').screenshot({
            path: 'screenshots/mobile-dashboard-component.png',
            });
    }

    console.log('✅ Mobile screenshots completed!');
});

test('Capture feature-specific screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate a dashboard for feature testing
    console.log('🎯 Setting up dashboard for feature screenshots...');
    await page.fill('#chat-input', 'Show capacity for December 2025 with 18 team members, 20 working days, 90% availability, 5 hour tasks');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    const dashboardExists = await page.locator('.capacity-dashboard').isVisible();
    if (dashboardExists) {
        // PDF EXPORT BUTTON - Highlight the feature
        console.log('🎯 Capturing PDF export feature...');
        const pdfButton = page.locator('button:has-text("Download PDF")');
        const pdfExists = await pdfButton.isVisible();

        if (pdfExists) {
            // Highlight the PDF button
            await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (let button of buttons) {
                    if (button.textContent.includes('PDF') || button.textContent.includes('DOWNLOAD')) {
                        button.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.6)';
                        button.style.transform = 'scale(1.02)';
                        button.style.border = '2px solid #22c55e';
                        break;
                    }
                }
            });

            await page.waitForTimeout(500);
            await page.screenshot({
                path: 'screenshots/pdf-export-feature.png',
                fullPage: false,
                    });
        }

        // TOGGLE CALCULATION BREAKDOWN
        console.log('🎯 Capturing calculation toggle feature...');
        const toggleButton = page.locator('.calculation-toggle');
        const toggleExists = await toggleButton.isVisible();

        if (toggleExists) {
            // First show expanded state
            const toggleText = await toggleButton.locator('.toggle-text').textContent();

            if (toggleText === 'Hide Details') {
                // Already expanded - capture it
                await page.screenshot({
                    path: 'screenshots/calculation-expanded.png',
                    fullPage: false,
                    clip: { x: 0, y: 300, width: 1440, height: 600 },
                            });

                // Now collapse it
                await toggleButton.click();
                await page.waitForTimeout(1000);

                await page.screenshot({
                    path: 'screenshots/calculation-collapsed.png',
                    fullPage: false,
                    clip: { x: 0, y: 300, width: 1440, height: 400 },
                            });
            }
        }

        // ACTION BUTTONS - Both reset and PDF
        console.log('🎯 Capturing action buttons...');
        const actionsSection = page.locator('.dashboard-actions, .capacity-dashboard').last();
        if (await actionsSection.isVisible()) {
            await actionsSection.screenshot({
                path: 'screenshots/action-buttons.png',
                    });
        }
    }

    console.log('✅ Feature screenshots completed!');
});

test('Capture conversation flow screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    console.log('💬 Capturing conversation flow...');

    // Step 1: Initial question
    await page.fill('#chat-input', 'What\'s my team capacity for Q1 2026?');
    await page.screenshot({
        path: 'screenshots/conversation-step-1.png',
        fullPage: false,
    });

    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Step 2: Bot asking for details
    await page.screenshot({
        path: 'screenshots/conversation-step-2.png',
        fullPage: true,
    });

    // Continue conversation
    await page.fill('#chat-input', '12 team members');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Step 3: More questions
    await page.screenshot({
        path: 'screenshots/conversation-step-3.png',
        fullPage: true,
    });

    console.log('✅ Conversation flow screenshots completed!');
});