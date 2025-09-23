// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Capacity Forecast Chatbot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage with correct title', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Capacity Forecast Chatbot/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Capacity Forecast Chatbot');

    // Check subtitle
    await expect(page.locator('header p')).toContainText('Get quick capacity forecasts for your operations team');
  });

  test('should display initial bot message', async ({ page }) => {
    // Check that the initial bot message is displayed
    const botMessage = page.locator('.bot-message .message-content');
    await expect(botMessage.first()).toContainText('Hi! I can help you forecast your team\'s capacity');
  });

  test('should allow user to input messages', async ({ page }) => {
    // Check that input field is present and functional
    const chatInput = page.locator('#chat-input');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toHaveAttribute('placeholder', 'Ask about your capacity forecast...');

    // Check send button
    const sendButton = page.locator('#send-button');
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toContainText('Send');
  });

  test('should handle basic capacity forecast flow', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    // Send initial message
    await chatInput.fill('I need a capacity forecast for next month');
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.locator('.user-message').last()).toContainText('I need a capacity forecast for next month');

    // Wait for bot response (with timeout for processing)
    await expect(page.locator('.bot-message').last()).toBeVisible({ timeout: 5000 });

    // Check that bot asks for missing information
    const lastBotMessage = page.locator('.bot-message').last();
    await expect(lastBotMessage).toContainText(/How many staff members|What's the average time|What's your expected availability/);
  });

  test('should complete full forecast with all parameters', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    // Complete capacity forecast flow
    await chatInput.fill('I need a capacity forecast for next month with 5 staff members, 8 hours per implementation, and 80% availability');
    await sendButton.click();

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check if dashboard appears
    const dashboard = page.locator('.capacity-dashboard');
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Check dashboard components
    await expect(page.locator('.dashboard-title')).toContainText('Capacity Forecast');
    await expect(page.locator('.capacity-number')).toBeVisible();
    await expect(page.locator('.metric-card')).toHaveCount(4); // Team Members, Working Days, Availability, Available Hours
  });

  test('should toggle calculation breakdown', async ({ page }) => {
    // First complete a forecast to get the dashboard
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    await chatInput.fill('Forecast for next month: 3 staff, 6 hours per task, 75% availability');
    await sendButton.click();

    // Wait for dashboard
    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });

    // Find and click the calculation toggle button
    const toggleButton = page.locator('.calculation-toggle');
    await expect(toggleButton).toBeVisible();

    // Initially should show "Hide Details"
    await expect(toggleButton).toContainText('Hide Details');

    // Click to hide
    await toggleButton.click();
    await expect(toggleButton).toContainText('Show Details');

    // Click to show again
    await toggleButton.click();
    await expect(toggleButton).toContainText('Hide Details');

    // Verify calculation content is visible
    await expect(page.locator('#calculationContent')).toBeVisible();
  });

  test('should handle follow-up questions', async ({ page }) => {
    const chatInput = page.locator('#chat-input');
    const sendButton = page.locator('#send-button');

    // Complete initial forecast
    await chatInput.fill('Forecast: 4 staff, 10 hours per implementation, 85% availability, next month');
    await sendButton.click();

    // Wait for dashboard
    await expect(page.locator('.capacity-dashboard')).toBeVisible({ timeout: 10000 });

    // Ask follow-up question
    await chatInput.fill('What if I add 2 more staff members?');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should get updated forecast or scenarios
    const messages = page.locator('.bot-message');
    await expect(messages.last()).toBeVisible({ timeout: 5000 });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that elements are still visible and functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeVisible();

    // Check that chat container adapts
    const chatContainer = page.locator('.chat-container');
    await expect(chatContainer).toBeVisible();
  });
});