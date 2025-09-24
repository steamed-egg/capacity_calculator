const { test, expect } = require('@playwright/test');

test('Complete chatbot conversation and test PDF', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // First message: capacity forecast request
    console.log('Sending first message...');
    await page.fill('#chat-input', 'What is my team capacity for October with 25 team members, 22 working days, and 85% availability?');
    await page.click('#send-button');
    await page.waitForTimeout(2000);

    // Second message: provide time period
    console.log('Providing time period...');
    await page.fill('#chat-input', 'October 2025');
    await page.click('#send-button');
    await page.waitForTimeout(3000);

    // Check for dashboard
    let dashboardExists = await page.locator('.capacity-dashboard').isVisible().catch(() => false);
    console.log('Dashboard visible after first exchange:', dashboardExists);

    if (!dashboardExists) {
        // Try asking about average implementation time if needed
        console.log('Asking about implementation time...');
        await page.fill('#chat-input', '8 hours average implementation time');
        await page.click('#send-button');
        await page.waitForTimeout(3000);

        dashboardExists = await page.locator('.capacity-dashboard').isVisible().catch(() => false);
        console.log('Dashboard visible after implementation time:', dashboardExists);
    }

    // Take screenshot of current state
    await page.screenshot({ path: 'test-results/chatbot-state.png' });

    if (dashboardExists) {
        console.log('✅ Dashboard generated successfully');

        // Look for PDF button
        const pdfButton = page.locator('button:has-text("Download PDF")');
        const pdfButtonExists = await pdfButton.isVisible().catch(() => false);
        console.log('PDF button visible:', pdfButtonExists);

        if (pdfButtonExists) {
            // Set up console monitoring
            const consoleMessages = [];
            page.on('console', msg => {
                const text = msg.text();
                consoleMessages.push(`${msg.type()}: ${text}`);
            });

            // Set up dialog monitoring
            let dialogShown = false;
            page.on('dialog', async dialog => {
                console.log(`Dialog appeared: ${dialog.type()}`);
                dialogShown = true;
                await dialog.dismiss();
            });

            // Click PDF download
            console.log('Testing PDF download...');
            await pdfButton.click();
            await page.waitForTimeout(5000);

            // Analyze results
            console.log('\\n=== PDF Test Results ===');

            // Check if PDF generation was blocked
            const blockingMessages = consoleMessages.filter(msg =>
                msg.toLowerCase().includes('pdf libraries not loaded') ||
                msg.toLowerCase().includes('error') && msg.toLowerCase().includes('pdf')
            );

            if (blockingMessages.length > 0) {
                console.log('❌ PDF generation is BLOCKED');
                console.log('Blocking messages:');
                blockingMessages.forEach(msg => console.log('  -', msg));
            } else {
                console.log('✅ PDF generation is NOT blocked');

                // Check what happened
                const jsPDFMessages = consoleMessages.filter(msg =>
                    msg.toLowerCase().includes('jspdf') ||
                    msg.toLowerCase().includes('pdf')
                );

                console.log('PDF-related console messages:');
                jsPDFMessages.forEach(msg => console.log('  -', msg));

                if (dialogShown) {
                    console.log('✅ Print dialog fallback activated');
                } else {
                    console.log('ℹ️  No print dialog - PDF may have generated successfully');
                }
            }

            // Check button state
            const buttonEnabled = await pdfButton.isEnabled();
            console.log('PDF button enabled after click:', buttonEnabled);

        } else {
            console.log('❌ PDF download button not found');
        }

    } else {
        console.log('❌ Dashboard was not generated');

        // Show chat content for debugging
        const chatContent = await page.locator('#chat-messages').textContent();
        console.log('Chat content:', chatContent);
    }
});