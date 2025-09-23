# Testing Guide

This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

## Prerequisites

- Node.js installed
- Playwright installed (already done if you followed setup)

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with browser visible
npm run test:headed

# Run tests with UI mode (interactive)
npm run test:ui

# Debug specific test
npm run test:debug

# View test report
npm run test:report

# Start local server (for manual testing)
npm run serve
```

### Test Coverage

The test suite covers:

1. **Basic UI Loading**
   - Page title and headers
   - Initial bot message display
   - Input field functionality

2. **Core Functionality**
   - Complete capacity forecast flow
   - Parameter collection process
   - Dashboard generation

3. **Interactive Features**
   - Calculation breakdown toggle
   - Follow-up question handling
   - Message input/output

4. **Responsive Design**
   - Mobile viewport compatibility
   - Element visibility across screen sizes

### Test Structure

- **Test files**: Located in `tests/` directory
- **Configuration**: `playwright.config.js`
- **Browsers tested**: Chromium, Firefox, WebKit
- **Local server**: Automatically started on `localhost:8080`

### Writing New Tests

```javascript
test('should do something', async ({ page }) => {
  await page.goto('/');

  // Your test logic here
  await expect(page.locator('selector')).toBeVisible();
});
```

### Debugging Failed Tests

1. Use `npm run test:debug` to step through tests
2. Use `npm run test:headed` to see browser actions
3. Check `test-results/` folder for screenshots and traces
4. Use `npm run test:report` to view detailed HTML report