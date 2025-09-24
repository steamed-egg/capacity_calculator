const { test, expect } = require('@playwright/test');

test('Generate PDF screenshot and what-if scenarios', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate dashboard for PDF
    console.log('📊 Generating dashboard for PDF...');
    await page.fill('#chat-input', 'What is my capacity for October 2025 with 25 team members, 22 working days, 85% availability, 8 hour tasks?');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    // Check if dashboard exists
    const dashboardExists = await page.locator('.capacity-dashboard').first().isVisible();

    if (dashboardExists) {
        console.log('📄 Attempting PDF download...');

        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        // Click PDF download button
        const pdfButton = page.locator('button:has-text("Download PDF")');
        const pdfExists = await pdfButton.isVisible();

        if (pdfExists) {
            await pdfButton.click();
            await page.waitForTimeout(3000);

            // Check if download started
            const download = await downloadPromise;

            if (download) {
                console.log('✅ PDF download successful');

                // Save the download
                await download.saveAs('screenshots/dashboard-pdf.pdf');

                // Take screenshot during PDF generation process
                await page.screenshot({
                    path: 'screenshots/pdf-generation.png',
                    fullPage: false
                });

            } else {
                console.log('📄 No PDF download, capturing dashboard screenshot instead');
                await page.screenshot({
                    path: 'screenshots/dashboard-screenshot.png',
                    fullPage: false,
                    clip: { x: 0, y: 150, width: 1440, height: 600 }
                });
            }
        }

        // Generate What-If Scenarios
        console.log('🤔 Testing what-if scenarios...');

        // Click calculate another scenario
        const resetButton = page.locator('button:has-text("Calculate Another Scenario")');
        const resetExists = await resetButton.isVisible();

        if (resetExists) {
            await resetButton.click();
            await page.waitForTimeout(2000);

            // Ask what-if question
            await page.fill('#chat-input', 'What if I had 30 team members instead of 25?');
            await page.click('#send-button');
            await page.waitForTimeout(4000);

            // Check for new dashboard
            const whatIfDashboard = await page.locator('.capacity-dashboard').first().isVisible();
            if (whatIfDashboard) {
                console.log('📸 Capturing what-if scenario...');
                await page.screenshot({
                    path: 'screenshots/what-if-scenarios.png',
                    fullPage: true
                });

                // Also capture just the comparison if there are multiple dashboards
                const dashboards = await page.locator('.capacity-dashboard').count();
                if (dashboards > 1) {
                    console.log('📸 Multiple dashboards found, capturing comparison...');
                    await page.screenshot({
                        path: 'screenshots/scenario-comparison.png',
                        fullPage: true
                    });
                }
            }

            // Try another what-if scenario
            await page.fill('#chat-input', 'What if availability was 90% instead?');
            await page.click('#send-button');
            await page.waitForTimeout(4000);

            const secondWhatIf = await page.locator('.capacity-dashboard').first().isVisible();
            if (secondWhatIf) {
                console.log('📸 Capturing second what-if scenario...');
                await page.screenshot({
                    path: 'screenshots/what-if-availability.png',
                    fullPage: true
                });
            }
        }

        console.log('✅ PDF and what-if screenshots completed!');
    }
});

test('Capture PDF as image', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // Generate clean dashboard
    console.log('📊 Generating dashboard for PDF conversion...');
    await page.fill('#chat-input', 'Show capacity for November 2025: 20 staff, 20 days, 80% availability, 6 hour tasks');
    await page.click('#send-button');
    await page.waitForTimeout(4000);

    const dashboardExists = await page.locator('.capacity-dashboard').first().isVisible();

    if (dashboardExists) {
        // Try to trigger PDF generation and capture the result
        const pdfButton = page.locator('button:has-text("Download PDF")');
        const pdfExists = await pdfButton.isVisible();

        if (pdfExists) {
            console.log('📄 Generating PDF view...');

            // Add some styling to make it look more like a PDF report
            await page.evaluate(() => {
                // Add a title to make it look like a PDF report
                const dashboard = document.querySelector('.capacity-dashboard');
                if (dashboard) {
                    const title = document.createElement('h1');
                    title.textContent = 'Capacity Forecast Report';
                    title.style.cssText = 'text-align: center; color: #2d3748; margin: 2rem 0; font-size: 1.8rem;';
                    dashboard.parentElement.insertBefore(title, dashboard);

                    // Add date
                    const date = document.createElement('p');
                    date.textContent = `Generated on: ${new Date().toLocaleDateString()}`;
                    date.style.cssText = 'text-align: center; color: #718096; margin-bottom: 2rem;';
                    dashboard.parentElement.insertBefore(date, dashboard);
                }
            });

            await page.waitForTimeout(1000);

            // Capture the report-style view
            await page.screenshot({
                path: 'screenshots/dashboard-report.png',
                fullPage: false,
                clip: { x: 0, y: 100, width: 1440, height: 700 }
            });

            console.log('✅ Dashboard report screenshot captured');
        }
    }
});