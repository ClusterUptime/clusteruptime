import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('ClusterUptime Smoke Tests', () => {

    test('Full System Flow & Edge Cases', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const setupPage = new SetupPage(page);
        const dashboardPage = new DashboardPage(page);

        // 1. Initial Load
        await dashboardPage.goto();

        // 2. Handle Setup or Login
        if (await setupPage.isVisible()) {
            console.log('>> Setup Required.');
            await setupPage.completeSetup();
        } else if (await loginPage.isVisible()) {
            console.log('>> Login Required.');
            await loginPage.login();
        } else {
            console.log('>> Already authenticated.');
        }

        // 3. Verify Dashboard Access
        await expect(page).toHaveURL(/.*dashboard|.*\/$/);

        // 4. Edge Case: Invalid URL
        console.log('>> Testing Edge Case: Invalid URL...');
        await dashboardPage.createInvalidMonitor(`Invalid Mon ${Date.now()}`, 'not-a-url');

        // 5. Create Group
        console.log('>> Creating Group...');
        const groupName = `E2E Group ${Date.now()}`;
        await dashboardPage.createGroup(groupName);

        // 6. UX Verify: Pre-selection
        console.log('>> Verifying Pre-selection...');
        await dashboardPage.openNewMonitorSheet();
        await dashboardPage.verifyGroupSelected(groupName);

        // 7. Create Valid Monitor
        console.log('>> Creating Valid Monitor...');
        const monitorName = `Google Test ${Date.now()}`;
        // Note: Sheet is already open from step 6, but our createMonitor function clicks the trigger again.
        // We might need to close it or adjust logic. The `createMonitor` helper currently assumes starting from closed.
        // Let's close it first to be safe and use component's clean state.
        await page.getByRole('button', { name: 'Cancel' }).click();

        await dashboardPage.createMonitor(monitorName, 'https://google.com');

        // 8. Verify Status
        console.log('>> Verifying Status...');
        await dashboardPage.verifyMonitorStatus('Operational');

        console.log('>> Smoke Test Passed.');
    });

});
